// Builds the soundtrack bed for the film from the studio's two scores: Marea (the mark's song) and Bunga Kaili,
// alternating with 3 s crossfades, trimmed of their silent tails, faded in and out, as long as the film.
//   node bed.mjs <seconds>   -> music/bed.wav and ../motion/vo/music-bed.mp3
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path'; import fs from 'node:fs';
const root = path.dirname(new URL(import.meta.url).pathname);
const ff = path.resolve(root, '../tools/node_modules/ffmpeg-static/ffmpeg');
const TOTAL = +(process.argv[2] || 561);
// usable lengths: last event + ring-out
const pieces = [['marea', 89], ['bomba', 143]];
const seq = []; let acc = 0; let i = 0;
while (acc < TOTAL + 10) { const [k, d] = pieces[i % 2]; seq.push({ k, d }); acc += d - 3; i++; }
const inputs = []; const filt = [];
seq.forEach((p, j) => { inputs.push('-t', String(p.d), '-i', path.join(root, p.k + '.wav')); filt.push(`[${j}:a]aformat=sample_rates=48000:channel_layouts=stereo[s${j}]`); });
let chain = '[s0]';
for (let j = 1; j < seq.length; j++) { filt.push(`${chain}[s${j}]acrossfade=d=3:c1=tri:c2=tri[x${j}]`); chain = `[x${j}]`; }
filt.push(`${chain}atrim=0:${TOTAL},afade=t=in:st=0:d=2,afade=t=out:st=${(TOTAL - 5).toFixed(2)}:d=5,loudnorm=I=-22:TP=-3:LRA=9[bed]`);
const out = path.join(root, 'bed.wav');
execFileSync(ff, ['-y', ...inputs, '-filter_complex', filt.join(';'), '-map', '[bed]', '-c:a', 'pcm_s16le', out], { stdio: ['ignore', 'ignore', 'inherit'] });
fs.mkdirSync(path.resolve(root, '../motion/vo'), { recursive: true });
execFileSync(ff, ['-y', '-i', out, '-c:a', 'libmp3lame', '-b:a', '112k', path.resolve(root, '../motion/vo/music-bed.mp3')], { stdio: 'ignore' });
const r = spawnSync(ff, ['-i', out, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
console.log('bed', TOTAL + 's', seq.map(p => p.k).join(' → '), (r.stderr.match(/mean_volume: [-\d.]+ dB/) || [''])[0]);
