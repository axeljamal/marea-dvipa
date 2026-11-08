// Renders the studio's own scores offline through its patched engine: window.__OFF is an OfflineAudioContext the
// engine adopts instead of a live AudioContext; every event is scheduled at once and the buffer is encoded as WAV.
//   node render-music.mjs marea 92   -> music/marea.wav   (kind, seconds)
import { createRequire } from 'node:module';
const puppeteer = createRequire(import.meta.url)('../tools/node_modules/puppeteer-core');
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const kind = process.argv[2] || 'marea', secs = +(process.argv[3] || 92);
const root = path.dirname(new URL(import.meta.url).pathname);
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', svg: 'image/svg+xml', webmanifest: 'application/manifest+json' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; try { const b = fs.readFileSync(path.join(root, p)); res.writeHead(200, { 'Content-Type': mime[p.split('.').pop()] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(8791);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.evaluateOnNewDocument((secs) => { window.__OFF = new OfflineAudioContext(2, Math.ceil(44100 * secs), 44100); try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {} window.location.reload = () => {}; }, secs);
page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('navigated to', f.url()); });
await page.goto('http://localhost:8791/index.html#lab', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__lab && window.__lab.SND', { timeout: 30000 });
const info = await page.evaluate(async (kind) => {
  const L = window.__lab; const c = L.ensureCtx(); if (c !== window.__OFF) return { error: 'engine did not adopt the offline context' };
  L.SND.kind = kind; L.SND.rate = 1; L.indexScore(); L.newBus();
  const ev = L.SND.ev; const anchor = 0.1; L.SND.anchor = anchor;
  for (const e of ev) L.play(e, anchor + e.t / L.SND.rate);
  const buf = await window.__OFF.startRendering();
  // encode 16-bit PCM WAV
  const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate; const out = new ArrayBuffer(44 + n * ch * 2); const v = new DataView(out);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const chans = []; for (let k = 0; k < ch; k++) chans.push(buf.getChannelData(k)); let o = 44; let peak = 0;
  for (let i = 0; i < n; i++) for (let k = 0; k < ch; k++) { const x = Math.max(-1, Math.min(1, chans[k][i])); peak = Math.max(peak, Math.abs(x)); v.setInt16(o, x < 0 ? x * 32768 : x * 32767, true); o += 2; }
  const bytes = new Uint8Array(out); let bin = ''; const CH = 0x8000; for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return { events: ev.length, last: ev.length ? ev[ev.length - 1].t : 0, peak, b64: btoa(bin) };
}, kind);
await browser.close(); srv.close();
if (info.error) { console.error(info.error); process.exit(1); }
fs.writeFileSync(path.join(root, kind + '.wav'), Buffer.from(info.b64, 'base64'));
console.log(kind, 'events', info.events, 'last event at', info.last.toFixed(1) + 's', 'peak', info.peak.toFixed(2), '->', kind + '.wav');
