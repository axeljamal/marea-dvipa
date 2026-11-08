// Renders motion/index.html to MP4: drives the installed Chrome with puppeteer-core, seeks the deterministic
// timeline frame by frame, pipes JPEG frames into ffmpeg, then muxes the narration track.
//   VOICE=axelle node render.mjs        (VOICE=say for the stand-in voice; FPS=30 default)
import { createRequire } from 'node:module'; const puppeteer = createRequire(import.meta.url)('./tools/node_modules/puppeteer-core');
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
const root = dirname(fileURLToPath(import.meta.url));
const ffmpeg = resolve(root, 'tools/node_modules/ffmpeg-static/ffmpeg');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VOICE = process.env.VOICE || 'axelle';
const FPS = +(process.env.FPS || 30);
const LEAD = 0.6, GAP = 1.0;
const script = JSON.parse(readFileSync(resolve(root, 'script.json'), 'utf8'));

// 1. assets into motion/
const M = resolve(root, 'motion');
cpSync(resolve(root, 'shots'), resolve(M, 'shots'), { recursive: true });
mkdirSync(resolve(M, 'vo'), { recursive: true });
cpSync(resolve(root, 'vo'), resolve(M, 'vo'), { recursive: true });
for (const f of ['mark-night.png', 'isen-cecek.svg']) cpSync(resolve(root, 'site/web', f), resolve(M, f));
cpSync(resolve(root, 'script.json'), resolve(M, 'script.json'));

// 2. durations of the chosen voice (say voice: convert aiff -> m4a for the web player)
const dur = f => { const r = spawnSync(ffmpeg, ['-i', f], { encoding: 'utf8' }); const m = r.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/); return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]); };
const D = {}; const audioFiles = [];
for (const c of script) {
  let f = resolve(root, `vo/${VOICE}/${c.id}.${VOICE === 'say' ? 'aiff' : 'mp3'}`);
  if (!existsSync(f)) throw new Error('missing narration ' + f);
  if (VOICE === 'say') { const m4a = resolve(M, `vo/say/${c.id}.m4a`); if (!existsSync(m4a)) execFileSync(ffmpeg, ['-y', '-i', f, '-c:a', 'aac', '-b:a', '128k', m4a], { stdio: 'ignore' }); }
  D[c.id] = dur(f); audioFiles.push(f);
}
writeFileSync(resolve(M, 'durations.json'), JSON.stringify(D));
const chapters = []; let acc = 0; for (const c of script) { const d = LEAD + D[c.id] + GAP; chapters.push({ id: c.id, start: acc, dur: d }); acc += d; }
const TOTAL = acc; const FRAMES = Math.ceil(TOTAL * FPS);
console.log('chapters', chapters.length, 'total', TOTAL.toFixed(1) + 's', 'frames', FRAMES);

// 3. static server for motion/
const mime = { html: 'text/html', js: 'text/javascript', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', mp3: 'audio/mpeg', m4a: 'audio/mp4', aiff: 'audio/aiff', css: 'text/css' };
const server = http.createServer((req, res) => { const p = resolve(M, '.' + decodeURIComponent(req.url.split('?')[0])); try { const b = readFileSync(p); res.writeHead(200, { 'Content-Type': mime[p.split('.').pop()] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(8787);

// 4. capture
mkdirSync(resolve(root, 'out'), { recursive: true });
const silent = resolve(root, `out/motion-${VOICE}-silent.mp4`);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--disable-gpu', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto('http://localhost:8787/index.html?render=1&t=0', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.READY === true');
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 800));
const enc = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'ignore', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) {
  const t = i / FPS;
  await page.evaluate(tt => window.seek(tt), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
  if (i % (FPS * 30) === 0) console.log(`frame ${i}/${FRAMES} · ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
}
enc.stdin.end();
await new Promise(r => enc.on('close', r));
await browser.close(); server.close();

// 5. narration track: each chapter delayed to its start + LEAD, mixed
const inputs = []; const filters = [];
audioFiles.forEach((f, i) => { inputs.push('-i', f); filters.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round((chapters[i].start + LEAD) * 1000)}|${Math.round((chapters[i].start + LEAD) * 1000)}[a${i}]`); });
const bed = resolve(root, 'music/bed.wav'); const hasBed = existsSync(bed); if (hasBed) inputs.push('-i', bed);
const voice = `${filters.join(';')};${audioFiles.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audioFiles.length}:normalize=0:duration=longest,apad=whole_dur=${TOTAL.toFixed(2)}[v]`;
// the bed sits under the voice: -14 dB and ducked a further few dB whenever Axelle speaks
const mix = hasBed ? `${voice};[v]asplit[v1][v2];[${audioFiles.length + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.2[b0];[b0][v2]sidechaincompress=threshold=0.05:ratio=4:attack=40:release=600:makeup=1[bd];[v1][bd]amix=inputs=2:normalize=0:duration=first[a]` : voice.replace('[v]', '[a]');
console.log(hasBed ? 'mixing voice over the studio bed' : 'no bed found, voice only');
const final = resolve(root, `out/marea-dvipa-walkthrough-motion${VOICE === 'axelle' ? '' : '-' + VOICE}.mp4`);
execFileSync(ffmpeg, ['-y', '-i', silent, ...inputs, '-filter_complex', mix, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final], { stdio: 'ignore' });
console.log('done', final, Math.floor(TOTAL / 60) + 'm ' + Math.round(TOTAL % 60) + 's');
