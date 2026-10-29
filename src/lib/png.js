// Save PNG: redraws the stage at 2x (isen texture, lines, rebung ribbons, motifs with rotation and flip).
import { rebungToCanvas, rebungRibbon } from '../engine';
import { LINE_HEX } from '../data/catalog';
import { compute, srcOf, texSrc } from './compute';

const cache = {};
function load(src) {
  if (!cache[src]) cache[src] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
  return cache[src];
}

export async function renderPatternPng(state, vw, vh, k = 2) {
  const cv = document.createElement('canvas');
  cv.width = vw * k; cv.height = vh * k;
  const g = cv.getContext('2d');
  g.fillStyle = state.ground; g.fillRect(0, 0, cv.width, cv.height);
  const res = compute(state, vw, vh);
  const imgs = await Promise.all(res.items.map((it) => load(srcOf(it.m, state))));
  const ts = texSrc(state), tex = ts ? await load(ts) : null;
  if (tex && tex.naturalWidth) {
    const size = Math.round(120 * state.scale * k), tc = document.createElement('canvas');
    tc.width = size; tc.height = size; tc.getContext('2d').drawImage(tex, 0, 0, size, size);
    g.save(); g.globalAlpha = 0.38; g.fillStyle = g.createPattern(tc, 'repeat'); g.fillRect(0, 0, cv.width, cv.height); g.restore();
  }
  if (res.lines.length && state.lines !== 'off') {
    g.save(); g.scale(k, k); g.strokeStyle = LINE_HEX[state.lines]; g.lineCap = 'round';
    res.lines.forEach((l) => { g.globalAlpha = Math.max(0, l.o); g.lineWidth = l.w; g.stroke(new Path2D(l.d)); });
    g.restore();
  }
  if (res.bands.length) { g.save(); g.scale(k, k); res.bands.forEach((b) => rebungToCanvas(g, rebungRibbon(b.pts, b.h, state.sigInk, b.phase))); g.restore(); }
  res.items.forEach((it, i) => {
    g.save();
    g.translate((it.x + it.w / 2) * k, (it.y + it.h / 2) * k);
    if (it.rot) g.rotate((it.rot * Math.PI) / 180);
    if (it.flip) g.scale(-1, 1);
    if (imgs[i].naturalWidth) g.drawImage(imgs[i], (-it.w * k) / 2, (-it.h * k) / 2, it.w * k, it.h * k);
    g.restore();
  });
  return new Promise((r) => cv.toBlob(r, 'image/png'));
}

// Inside a Claude artifact the downloads capability saves the file; anywhere else a normal download link does.
export async function saveBlob(blob, filename, downloads) {
  if (downloads) {
    const r = await downloads.save({ filename, data: blob });
    return r && r.status === 'saved' ? 'PNG saved' : 'PNG handed off';
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'PNG downloaded';
}
