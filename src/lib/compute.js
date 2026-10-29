// Turns studio state into placed motifs, construction lines and continuous rebung bands for a stage of vw x vh.
import {
  LAYOUTS, GENERATORS, placeLayout, placeGenerator, applyDirection, polyFromPath, rebungRibbon, SIGNATURE, NTINA,
} from '../engine';
import { lum } from './color';
import { isGen } from './state';

export function srcOf(m, state) {
  if (NTINA.indexOf(m) >= 0) return 'motifs/' + m + '--' + (lum(state.ground) < 0.22 ? 'gold' : 'black') + '.png';
  return 'motifs/' + m + (SIGNATURE.indexOf(m) >= 0 && state.sigInk === 'buya-bomba' ? '--buya' : '') + '.png';
}
export function texSrc(state) {
  return state.texture === 'none' ? null : 'isen/isen-' + state.texture + (state.sigInk === 'buya-bomba' ? '--buya' : '') + '.svg';
}

// Rebung rows in a repeat become continuous bands that run with the pattern's direction.
function repeatBands(state, res, opts, vw, vh, isPanel) {
  const dir = isPanel ? 'upright' : state.direction;
  let src = res, D = 0;
  if (dir === 'diagonal') { D = Math.ceil(Math.hypot(vw, vh)); src = placeLayout(opts, D, D); }
  const rows = {};
  src.items.forEach((it) => { if (it.m === 'rebung-border') rows[Math.round(it.y + it.h / 2)] = it.h; });
  const ys = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const span = dir === 'diagonal' ? D : vw, oy = (vh / 2) % (res.th || 1);
  return ys.map((y) => {
    let pts = [];
    for (let x = -80; x <= span + 80; x += 6) pts.push([x, y]);
    if (dir === 'diagonal') {
      const c = Math.cos(Math.PI / 4), sn = Math.sin(Math.PI / 4);
      pts = pts.map((p) => { const mx = p[0] - D / 2, my = p[1] - D / 2; return [vw / 2 + mx * c - my * sn, vh / 2 + mx * sn + my * c]; });
    }
    // mirrored rows run the other way, so their shoots swap sides and the half-step flips
    const row = Math.floor((y - oy + 12) / (res.th || 1));
    if (dir === 'alternate' && row % 2 !== 0) pts.reverse();
    return { pts, h: rows[y] * 0.42, phase: 0 };
  });
}

// Sampling an SVG path is the costly step for rebung ribbons; flow lines rarely change when only a motif changes, so cache by path.
const polyCache = new Map();
function samplePath(d) {
  let v = polyCache.get(d);
  if (!v) { v = polyFromPath(d, 3); polyCache.set(d, v); if (polyCache.size > 400) polyCache.delete(polyCache.keys().next().value); }
  return v;
}

export function compute(state, vw, vh) {
  let res;
  if (isGen(state.layout)) {
    res = placeGenerator(state.layout, { hero: state.hero, crown: state.crown, scale: state.scale, articulation: state.articulation, count: state.count, orient: state.orient, seed: state.seed }, vw, vh);
    Object.assign(res, { s: state.scale, key: state.layout, isPanel: false, gen: true, bands: [] });
    if (state.lineStyle === 'rebung') {
      // the main flow lines become continuous rebung ribbons; fine construction lines stay as lines
      const h = Math.max(8, 15 * state.scale), keep = [];
      res.lines.forEach((l) => {
        if (l.w >= 1.5) samplePath(l.d).forEach((pts) => res.bands.push({ pts, h }));
        else keep.push(l);
      });
      res.lines = keep;
    }
  } else {
    const isPanel = state.layout === 'reference-panel', key = isPanel ? 'temple-column' : state.layout;
    let s = state.scale;
    if (isPanel) s = Math.min(state.scale, (vh - 60) / ((state.rows * 390 + 80) * state.spacing), (vw - 40) / (760 * state.spacing));
    const opts = { layout: key, scale: s, spacing: state.spacing, hero: state.hero, crown: state.crown, mirror: state.boats === 'mirrored', panel: isPanel, rows: state.rows };
    res = placeLayout(opts, vw, vh);
    const bands = repeatBands(state, res, opts, vw, vh, isPanel);
    if (!isPanel) { const { tw, th } = res; res = applyDirection(res, state.direction, vw, vh, state.seed, opts); res.tw = tw; res.th = th; }
    res.items = res.items.filter((it) => it.m !== 'rebung-border');
    res.items.forEach((it) => { if (NTINA.indexOf(it.m) >= 0) it.rot = 0; }); // Ntina is always shown whole and upright
    Object.assign(res, { bands, lines: [], s, key, isPanel });
  }
  const L = res.gen ? GENERATORS[res.key] : LAYOUTS[res.key];
  res.title = res.isPanel ? 'Reference panel' : L.title;
  res.note = res.isPanel ? 'Your layout, rebuilt from the master motifs: floral crown over barong, temple gates over boats, lotus-bud finials.' : L.note;
  return res;
}

// Only these settings move motifs; ground, inks and isen are applied at draw time, so changing them is instant.
export const GEOMETRY_KEYS = ['layout', 'hero', 'crown', 'scale', 'spacing', 'rows', 'boats', 'direction', 'articulation', 'count', 'orient', 'seed', 'lineStyle'];
export const geometryKey = (state) => GEOMETRY_KEYS.map((k) => state[k]).join('|');

const f1 = (v) => v.toFixed(1);
// Rebung ribbons as one SVG string: thousands of small shapes render far faster this way than as separate elements.
let lastKey = '', lastOut = '';
export function ribbonMarkup(bands, sigInk) {
  // ribbons only depend on the band paths and the ink, so a motif or ground change reuses the last markup
  const key = sigInk + '|' + bands.map((b) => b.h.toFixed(2) + ':' + b.pts.length + ':' + b.pts[0] + ':' + b.pts[b.pts.length - 1]).join(';');
  if (key === lastKey) return lastOut;
  let out = '';
  bands.forEach((b) => rebungRibbon(b.pts, b.h, sigInk, b.phase).forEach((s) => {
    if (s.dot) out += `<circle cx="${f1(s.dot[0])}" cy="${f1(s.dot[1])}" r="${f1(s.r)}" fill="${s.fill}"/>`;
    else out += `<path d="${s.d}" fill="${s.fill || 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${f1(s.sw)}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>`;
  }));
  lastKey = key; lastOut = out;
  return out;
}
