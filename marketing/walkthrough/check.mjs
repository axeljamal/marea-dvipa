// Loop check: walks the timeline at STEP seconds and reports text elements that are clipped, run off the stage,
// or overlap another text element while both are visible. Exit code 1 when anything is found.
//   VOICE=axelle STEP=0.5 node check.mjs
import { createRequire } from 'node:module';
const puppeteer = createRequire(import.meta.url)('./tools/node_modules/puppeteer-core');
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const root = process.cwd(), M = path.resolve(root, 'motion');
const VOICE = process.env.VOICE || 'axelle', STEP = +(process.env.STEP || 0.5);
fs.cpSync('shots', path.join(M, 'shots'), { recursive: true }); fs.mkdirSync(path.join(M, 'vo'), { recursive: true }); fs.cpSync('vo', path.join(M, 'vo'), { recursive: true });
for (const f of ['mark-night.png', 'isen-cecek.svg']) fs.cpSync('site/web/' + f, path.join(M, f)); fs.cpSync('script.json', path.join(M, 'script.json'));
const ff = 'tools/node_modules/ffmpeg-static/ffmpeg'; const script = JSON.parse(fs.readFileSync('script.json', 'utf8')); const D = {};
for (const c of script) { const f = `vo/${VOICE}/${c.id}.${VOICE === 'say' ? 'aiff' : 'mp3'}`; const r = spawnSync(ff, ['-i', f], { encoding: 'utf8' }); const m = r.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/); D[c.id] = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]); }
fs.writeFileSync(path.join(M, 'durations.json'), JSON.stringify(D));
const mime = { html: 'text/html', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
const srv = http.createServer((req, res) => { const p = path.resolve(M, '.' + decodeURIComponent(req.url.split('?')[0])); try { const b = fs.readFileSync(p); res.writeHead(200, { 'Content-Type': mime[p.split('.').pop()] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(8788);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--disable-gpu'] });
const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
await page.goto('http://localhost:8788/index.html?render=1&t=0', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.READY===true', { timeout: 20000 }); await page.evaluate(() => document.fonts.ready);
const TOTAL = await page.evaluate(() => window.TOTAL); const CH = await page.evaluate(() => window.CHAPTERS);
const issues = {}; const add = (ch, key, t) => { issues[ch] ??= {}; issues[ch][key] ??= []; issues[ch][key].push(+t.toFixed(1)); };
const SAFE_BOTTOM = 1080 - 150; // caption band
for (let t = 0; t < TOTAL; t += STEP) {
  await page.evaluate(tt => window.seek(tt), t);
  const found = await page.evaluate(() => {
    const out = [];
    const vis = el => { let e = el; while (e && e !== document.body) { const cs = getComputedStyle(e); if (+cs.opacity < 0.06 || cs.visibility === 'hidden' || cs.display === 'none') return false; e = e.parentElement; } return true; };
    const sel = '#scene .t, #scene .chip, #scene .callout, #scene .cap, #scene .card, #scene .term, #scene .brandtag, #scene .gauge, #scene .frame, #scene svg, #scene img:not(.frame img), #scene .perk';
    const els = [...document.querySelectorAll(sel)].filter(vis).map(el => { const r = el.getBoundingClientRect(); const cls = (el.getAttribute('class') || el.tagName.toLowerCase()).split(' ')[0]; const text = (el.textContent || '').trim().slice(0, 40) || (el.tagName.toLowerCase() === 'img' ? 'img:' + (el.getAttribute('src') || '').split('/').pop() : el.tagName.toLowerCase() + '#' + Math.round(r.left) + ',' + Math.round(r.top)); return { el, r, text, cls, block: /^(frame|svg|img|gauge|term|card|perk)$/.test(cls) || el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'img' }; }).filter(x => x.r.width > 2 && x.r.height > 2);
    // record what reached full visibility, for the never-appeared report
    window.__seen ??= {}; for (const x of els) { const k = x.cls + ' "' + x.text.replace(/[\d£,.%]+/g, '#') + '"'; const o = +getComputedStyle(x.el).opacity; let pe = x.el.parentElement, po = 1; while (pe && pe.id !== 'scene') { po *= +getComputedStyle(pe).opacity || 1; pe = pe.parentElement; } window.__seen[k] = Math.max(window.__seen[k] || 0, o * po); }
    for (const x of els) {
      if (x.r.right > 1920 - 8 || x.r.bottom > 1080 - 8 || x.r.left < 0 || x.r.top < 0) out.push(`offstage ${x.cls} "${x.text}" (${Math.round(x.r.left)},${Math.round(x.r.top)} ${Math.round(x.r.right)},${Math.round(x.r.bottom)})`);
      if (x.el.scrollWidth > x.el.clientWidth + 2 && getComputedStyle(x.el).whiteSpace === 'nowrap' && x.cls !== 'cap') out.push(`clipped ${x.cls} "${x.text}"`);
    }
    // overlaps between distinct text elements (ignore nesting)
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j]; if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.cls === 'card' || b.cls === 'card') continue; // cards hold other text by design
      if ((a.cls === 'brandtag' || b.cls === 'brandtag')) continue; if (a.block && b.block && (a.cls === 'svg' || b.cls === 'svg') && (a.cls === 'img' || b.cls === 'img')) continue; // mark ring over the mark is by design
      if (a.cls === 'spot' || b.cls === 'spot') continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ix > 6 && iy > 6) out.push(`overlap ${a.cls} "${a.text}" × ${b.cls} "${b.text}"`);
    }
    return out;
  });
  const ch = CH.find(c => t < c.start + c.dur)?.id || '?';
  for (const f of found) add(ch, f, t - (CH.find(c => c.id === ch)?.start || 0));
}
const seen = await page.evaluate(() => window.__seen || {}); const never = Object.entries(seen).filter(([k, v]) => v < 0.9 && !k.startsWith('cap ') && !/"(div|svg|img)#/.test(k)).map(([k, v]) => `${k} peaked at opacity ${v.toFixed(2)}`); if (never.length) { issues['never fully visible'] = {}; never.forEach(n => issues['never fully visible'][n] = [0]); }
await browser.close(); srv.close();
let n = 0;
for (const ch of Object.keys(issues)) { console.log('\n== ' + ch); for (const [k, ts] of Object.entries(issues[ch])) { n++; console.log(`  ${k}  @ ${ts.slice(0, 6).join(', ')}${ts.length > 6 ? ' … (' + ts.length + ' frames)' : ''}`); } }
console.log(n ? `\n${n} issue types found` : 'clean: no clipped, offstage or overlapping text across the timeline');
process.exit(n ? 1 : 0);
