// The living mark: the logo's layers (public/logo, the night set) placed by layout.json, shown whole, never cropped.
// Left alone it keeps moving: the waves bob, the birds fly their loops, the palms sway, the frangipani pulses, the pavilion
// breathes. It leans with the pointer, each layer at its own depth. Touch any part and it answers with a spring and a note on
// the Media Lab's instruments: the pavilion rings the gong, the gates the kempur, the palms and flowers the kettles, the sea the
// drum, the birds the highest kettles. Touches are found by the layers' own pixels, so a tap between the palms lands on what is there.
// While the Media Lab plays the mark's reel for the welcome film, `live()` hands in each layer's reveal and the ensemble's
// levels, and the mark builds itself to its own gamelan: waves on the kendang, gates on the kempur, the pavilion on the kakula.
import React, { useEffect, useRef } from 'react';

const LAYOUT = [['mountains', .0156, .4844, .9531, .1719], ['gate-left', .3438, .125, .1094, .2031], ['gate-right', .5469, .125, .1094, .2031], ['palm-left', .1406, .25, .2031, .2031], ['palm-right', .6406, .25, .2188, .2031],
  ['pier', .0313, .6094, .1719, .0938], ['railing', .7969, .625, .1719, .0781], ['pebbles', 0, .3711, 1, .4287], ['pavilion', .2188, .1875, .5625, .5625], ['flower-left', .125, .4375, .1563, .3125], ['flower-right', .7188, .4375, .1563, .3125],
  ['wave-left', .0156, .6875, .375, .1094], ['wave-right', .6094, .6875, .3594, .1094], ['bird-a', .1094, .4219, .0625, .0469], ['bird-b', .0781, .4844, .0469, .0313], ['bird-c', .8281, .4219, .0781, .0469]];
const TOP = 0.125, HGT = 0.675; // the scene without the wordmark spans this much of the logo's square
const LABEL = { mountains: 'The mountains', 'gate-left': 'Candi bentar', 'gate-right': 'Candi bentar', 'palm-left': 'A palm', 'palm-right': 'A palm', pier: 'The pier', railing: 'The railing', pebbles: 'The pebbles', pavilion: 'The pavilion',
  'flower-left': 'Frangipani', 'flower-right': 'Frangipani', 'wave-left': 'The sea', 'wave-right': 'The sea', 'bird-a': 'A bird', 'bird-b': 'A bird', 'bird-c': 'A bird' };
const DEPTH = { mountains: .35, pebbles: .6, pier: .7, railing: .7, 'gate-left': .8, 'gate-right': .8, 'palm-left': .9, 'palm-right': .9, pavilion: 1, 'flower-left': 1.2, 'flower-right': 1.2, 'wave-left': 1.3, 'wave-right': 1.3, 'bird-a': 1.1, 'bird-b': 1.05, 'bird-c': 1.1 };
const ORIGIN = { 'palm-left': '50% 100%', 'palm-right': '50% 100%', 'flower-left': '50% 100%', 'flower-right': '50% 100%', pavilion: '50% 90%', 'gate-left': '50% 100%', 'gate-right': '50% 100%', pier: '0% 100%', railing: '100% 100%' };
// what each part does when touched: a spring impulse (s scale, r turn, y lift, x push, fly) and the notes it rings
const TOUCH = {
  pavilion: { s: .09, y: -6, evs: [{ k: 'gong', n: 0, v: .45 }, { k: 'kettle', n: 0, v: .35, at: .2 }, { k: 'kettle', n: 4, v: .3, at: .4 }] },
  'gate-left': { x: -10, y: -4, evs: [{ k: 'gong', n: 1, v: .4 }] }, 'gate-right': { x: 10, y: -4, evs: [{ k: 'gong', n: 1, v: .4 }] },
  'palm-left': { r: -.28, evs: [{ k: 'kettle', n: 3, v: .45 }, { k: 'kettle', n: 4, v: .25, at: .15, soft: true }] }, 'palm-right': { r: .28, evs: [{ k: 'kettle', n: 4, v: .45 }, { k: 'kettle', n: 3, v: .25, at: .15, soft: true }] },
  'flower-left': { s: .3, evs: [{ k: 'kettle', n: 5, v: .45, oct: true }] }, 'flower-right': { s: .3, evs: [{ k: 'kettle', n: 2, v: .45, oct: true }] },
  'wave-left': { y: -8, s: .08, evs: [{ k: 'drum', n: 'dum', v: .5 }, { k: 'kettle', n: 1, v: .25, at: .1, soft: true }] }, 'wave-right': { y: -8, s: .08, evs: [{ k: 'drum', n: 'dum', v: .5 }, { k: 'kettle', n: 2, v: .25, at: .1, soft: true }] },
  mountains: { y: -4, evs: [{ k: 'gong', n: 0, v: .5 }] },
  pebbles: { y: -2, s: .02, evs: [{ k: 'drum', n: 'mute', v: .4 }, { k: 'drum', n: 'dum', v: .3, at: .12 }] },
  pier: { r: .08, evs: [{ k: 'kettle', n: 0, v: .4 }] }, railing: { r: -.08, evs: [{ k: 'kettle', n: 1, v: .4 }] },
  'bird-a': { fly: 1, evs: [{ k: 'kettle', n: 6, v: .35, oct: true }, { k: 'kettle', n: 5, v: .25, at: .12, oct: true, soft: true }] },
  'bird-b': { fly: 1, evs: [{ k: 'kettle', n: 5, v: .35, oct: true }] },
  'bird-c': { fly: -1, evs: [{ k: 'kettle', n: 6, v: .35, oct: true }, { k: 'kettle', n: 4, v: .25, at: .12, oct: true, soft: true }] },
};
const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ZERO7 = [0, 0, 0, 0, 0, 0, 0];
const eo = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);

function spring(st, key, k, c, dt) { // one damped spring per property, settling back to rest
  const v = (st[key + 'v'] || 0) + (-k * (st[key] || 0) - c * (st[key + 'v'] || 0)) * dt;
  st[key + 'v'] = v; st[key] = (st[key] || 0) + v * dt;
}
// the idle life of each layer at time t (seconds): x, y in % of the layer, s scale, r radians, sy a vertical scale for the birds' wings
function idle(name, t) {
  const o = { x: 0, y: 0, s: 1, r: 0, sy: 1 };
  if (reduceMotion) return o;
  switch (name) {
    case 'wave-left': o.x = Math.sin(t * 1.1) * 1.6; o.y = Math.sin(t * 2.2) * 2; break;
    case 'wave-right': o.x = -Math.sin(t * 1.1 + .6) * 1.6; o.y = Math.sin(t * 2.2 + 1) * 2; break;
    case 'mountains': o.y = Math.sin(t * .5) * .4; break;
    case 'pavilion': o.s = 1 + Math.sin(t * 1.6) * .006; break;
    case 'gate-left': case 'gate-right': o.y = Math.sin(t * .8) * .5; break;
    case 'palm-left': o.r = Math.sin(t * .9) * .035; break;
    case 'palm-right': o.r = -Math.sin(t * .9 + 1.2) * .035; break;
    case 'flower-left': o.s = 1 + Math.sin(t * 1.3) * .025; break;
    case 'flower-right': o.s = 1 + Math.sin(t * 1.3 + 2) * .025; break;
    case 'bird-a': o.x = Math.sin(t * .35) * 90; o.y = -Math.abs(Math.sin(t * .7)) * 40; o.sy = 1 + Math.sin(t * 9) * .14; break;
    case 'bird-b': o.x = Math.cos(t * .28) * 70; o.y = Math.sin(t * .56) * 30; o.sy = 1 + Math.sin(t * 8 + 1) * .14; break;
    case 'bird-c': o.x = -Math.sin(t * .32 + 1) * 80; o.y = -Math.abs(Math.sin(t * .64 + 1)) * 36; o.sy = 1 + Math.sin(t * 9.5 + 2) * .14; break;
    default: break;
  }
  return o;
}
// how a layer arrives while the reel reveals it (e = eased reveal), and how it moves with the ensemble (k kettles, g gongs, dr drum)
function arrive(name, e, k, g, dr) {
  const o = { x: 0, y: 0, s: 1, r: 0 };
  switch (name) {
    case 'mountains': o.y = (1 - e) * 55; o.s = 1 + g[0] * .02; break;
    case 'pebbles': o.y = (1 - e) * 12; break;
    case 'wave-left': o.x = -(1 - e) * 70; o.y = -dr * 12; break;
    case 'wave-right': o.x = (1 - e) * 70; o.y = -dr * 12; break;
    case 'pier': case 'railing': o.y = (1 - e) * 35; break;
    case 'pavilion': o.y = (1 - e) * 27; o.s = 1 + Math.max(k[0], k[1], k[2]) * .015; break;
    case 'gate-left': o.x = (1 - e) * 60; o.y = -g[1] * 5; break;
    case 'gate-right': o.x = -(1 - e) * 60; o.y = -g[1] * 5; break;
    case 'palm-left': o.s = e; o.r = -(k[3] + k[4]) * .05; break;
    case 'palm-right': o.s = e; o.r = (k[3] + k[4]) * .05; break;
    case 'flower-left': o.s = e * (1 + k[5] * .04); break;
    case 'flower-right': o.s = e * (1 + k[2] * .04); break;
    case 'bird-a': case 'bird-b': o.x = -(1 - e) * 550; o.y = -k[6] * 15; break;
    case 'bird-c': o.x = (1 - e) * 550; o.y = -k[6] * 15; break;
    default: break;
  }
  return o;
}

export function LiveLogo({ className, onTap, onHold, live, label, set }) {
  const art = set === 'day' ? 'day' : 'night';
  const box = useRef(null), inner = useRef(null), els = useRef({}), S = useRef({ px: 0, py: 0, tx: 0, ty: 0, t0: 0, st: {}, pix: {}, holdTm: 0, R: null, lv: {} });

  useEffect(() => {
    const el = box.current; if (!el) return undefined;
    const st = S.current; LAYOUT.forEach((L) => { st.st[L[0]] = st.st[L[0]] || {}; });
    let raf = 0, last = 0;
    const loop = (now) => {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!st.t0) st.t0 = now; const t = (now - st.t0) / 1000;
      st.px += (st.tx - st.px) * .08; st.py += (st.ty - st.py) * .08;
      const L = live ? live() : null, lv = L && L.lv ? L.lv : null, sm = st.lv;
      // the ensemble's levels, smoothed so the layers move like things, not meters
      const K = [0, 1, 2, 3, 4, 5, 6].map((i) => { const tgt = lv ? lv.kettle[i] : 0; sm['k' + i] = (sm['k' + i] || 0) + (tgt - (sm['k' + i] || 0)) * .3; return sm['k' + i]; });
      const G = [0, 1].map((i) => { const tgt = lv ? lv.gong[i] : 0; sm['g' + i] = (sm['g' + i] || 0) + (tgt - (sm['g' + i] || 0)) * .2; return sm['g' + i]; });
      sm.dr = (sm.dr || 0) + ((lv ? lv.drum : 0) - (sm.dr || 0)) * .3;
      st.R = L ? L.R : null;
      if (inner.current) inner.current.style.transform = L && L.breath ? 'scale(' + (1 + sm.dr * .012).toFixed(4) + ')' : '';
      LAYOUT.forEach((Lr) => {
        const name = Lr[0], node = els.current[name]; if (!node) return;
        const sp = st.st[name], fly = sp.fly || 0, slow = name.indexOf('bird') === 0;
        spring(sp, 's', 90, 9, dt); spring(sp, 'r', 70, 8, dt); spring(sp, 'y', 110, 10, dt); spring(sp, 'x', slow ? 10 : 110, slow ? 3.2 : 10, dt);
        const r = L ? (L.R[name] || 0) : 1, e = L ? eo(Math.min(1, r)) : 1, alpha = L ? (L.ghost ? L.ghost : Math.min(1, r * 1.5)) : 1;
        const i = idle(name, t), a = L ? arrive(name, L.ghost ? 1 : e, K, G, sm.dr) : { x: 0, y: 0, s: 1, r: 0 };
        const px = st.px * DEPTH[name] * 1.4, py = st.py * DEPTH[name] * .9;
        sp.ix = i.x * e + a.x + px; sp.iy = i.y * e + a.y + py; // where the idle life, the reel and the lean have taken it, for the hit test
        const x = sp.ix + (sp.x || 0) + fly, y = sp.iy + (sp.y || 0), s = (i.s - 1) * e + a.s + (sp.s || 0), rr = i.r * e + a.r + (sp.r || 0);
        node.style.opacity = alpha.toFixed(3);
        node.style.transform = 'translate(' + x.toFixed(2) + '%,' + y.toFixed(2) + '%) rotate(' + rr.toFixed(3) + 'rad) scale(' + s.toFixed(3) + ',' + (s * i.sy).toFixed(3) + ')';
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live]);
  useEffect(() => { S.current.pix = {}; }, [art]); // the pixels change with the set

  // which part is under a point: the top-most layer whose own pixels are opaque there
  function hit(clientX, clientY) {
    const st = S.current, r = box.current.getBoundingClientRect(), nx = (clientX - r.left) / r.width, ny = (clientY - r.top) / r.height;
    let inside = null, insideArea = 1e9; // the smallest part whose outline holds the point: a tap through the pavilion's arch still means the pavilion
    for (let i = LAYOUT.length - 1; i >= 0; i--) {
      const L = LAYOUT[i], name = L[0], x0 = L[1], y0 = (L[2] - TOP) / HGT, w = L[3], h = L[4] / HGT;
      if (st.R && !(st.R[name] > 0)) continue; // not revealed yet
      const sp = st.st[name], fx = ((sp.x || 0) + (sp.fly || 0) + (sp.ix || 0)) / 100 * w, fy = ((sp.y || 0) + (sp.iy || 0)) / 100 * h; // a part is where it is now, not where it started
      const lx = (nx - x0 - fx) / w, ly = (ny - y0 - fy) / h; if (lx < 0 || lx > 1 || ly < 0 || ly > 1) continue;
      if (w * h < insideArea) { inside = name; insideArea = w * h; }
      const img = els.current[name]; if (!img || !img.naturalWidth) continue;
      let pix = st.pix[name];
      if (!pix) { try { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); pix = st.pix[name] = { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }; } catch (e) { pix = st.pix[name] = null; } }
      if (!pix) return name; // if the pixels cannot be read, the box will do
      const a = pix.d[((Math.min(pix.h - 1, Math.floor(ly * pix.h)) * pix.w) + Math.min(pix.w - 1, Math.floor(lx * pix.w))) * 4 + 3];
      if (a > 24) return name;
    }
    return inside;
  }
  function touch(name, e) {
    const st = S.current, sp = st.st[name], tc = TOUCH[name]; if (!sp || !tc) return;
    if (tc.s) sp.sv = (sp.sv || 0) + tc.s * 14; if (tc.r) sp.rv = (sp.rv || 0) + tc.r * 12; if (tc.y) sp.yv = (sp.yv || 0) + tc.y * 16; if (tc.x) sp.xv = (sp.xv || 0) + tc.x * 16;
    if (tc.fly) sp.xv = (sp.xv || 0) + tc.fly * 260;
    if (onTap) onTap(name, LABEL[name], tc.evs, e);
  }
  const hold = (on) => { const st = S.current; clearTimeout(st.holdTm); if (on) { if (onHold) onHold(true); } else st.holdTm = setTimeout(() => { if (onHold) onHold(false); }, 1500); };

  return (
    <div ref={box} className={'w-logo' + (className ? ' ' + className : '')} role="img" tabIndex={0}
      aria-label={label || 'Marea Dvīpa: a pavilion by the sea. Touch its parts to hear them.'}
      onPointerMove={(e) => { const r = box.current.getBoundingClientRect(); S.current.tx = ((e.clientX - r.left) / r.width - .5) * 2; S.current.ty = ((e.clientY - r.top) / r.height - .5) * 2; hold(true); }}
      onPointerEnter={() => hold(true)} onPointerLeave={() => { S.current.tx = 0; S.current.ty = 0; hold(false); }}
      onPointerDown={(e) => { hold(true); const name = hit(e.clientX, e.clientY); if (name) { e.stopPropagation(); touch(name, e); } }}
      onPointerUp={() => hold(false)}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const r = box.current.getBoundingClientRect(); touch('pavilion', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }); } }}>
      <div ref={inner} className="w-logo-in">
        {LAYOUT.map((L) => (
          <img key={L[0]} ref={(n) => { els.current[L[0]] = n; }} src={'logo/' + art + '/' + L[0] + '.png'} alt="" draggable="false" data-layer={L[0]}
            style={{ left: L[1] * 100 + '%', top: (L[2] - TOP) / HGT * 100 + '%', width: L[3] * 100 + '%', height: L[4] / HGT * 100 + '%', transformOrigin: ORIGIN[L[0]] || '50% 50%' }} />
        ))}
      </div>
    </div>
  );
}
