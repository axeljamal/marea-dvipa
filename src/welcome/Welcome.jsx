// Welcome to Marea Dvīpa: a full-screen film that plays the Pattern Studio's features in a 3D scene drawn by the
// studio's own engine (motifs landing one by one with kakula notes, repeats gliding into each other, grounds
// changing by Albers' rule, the signatures), then hands over to the Media Lab for the Bomba Rose growing its petal
// rings, with its score. Captions run right to left as a ticker; the controls float at the bottom and can be hidden.
// Tilt the scene with the pointer (or the phone), drag to turn it further, tap a motif to ring it.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GROUNDS, LINE_HEX } from '../data/catalog';
import { nameOf } from '../lib/color';
import { compute, geometryKey, srcOf, texSrc, ribbonMarkup } from '../lib/compute';
import { useElementSize } from '../hooks/useElementSize';
import { buildTimeline, CLIP } from './timeline';
import { createRose, drawRoseStage, roseDown, roseMove, roseUp, hearAll } from './roseStage';

const TL = buildTimeline();
const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const GA = Math.PI * (3 - Math.sqrt(5));
const gseq = (i) => Math.floor((((i * GA) % (Math.PI * 2)) / (Math.PI * 2)) * 7) % 7;
const NAMES = {
  'barong-mask': 'Barong', 'large-floral-ornament': 'Large floral', 'lotus-floral-motif': 'Lotus floral', 'lotus-flower': 'Lotus flower', 'lotus-bud': 'Lotus bud',
  'wave-cloud-ornament': 'Wave cloud', 'scroll-ornament': 'Scroll', 'split-gate-candi-bentar': 'Candi bentar', 'traditional-boat': 'Perahu', 'border-filler-ornament': 'Border filler',
  'bomba-rose': 'Bomba rose', 'bomba-rosette': 'Bomba rosette', 'cengkeh-sprig': 'Cengkeh sprig', 'dua-pulau-medallion': 'Dua Pulau medallion', 'ketupat-lattice': 'Ketupat lattice',
  'ntina-mark': 'Ntina mark', 'ntina-tile': 'Ntina tile', 'ntina-line': 'Ntina line',
};

function viewAt(t) {
  let v = {};
  for (const b of TL.beats) { if (b.t > t + 1e-6) break; v = { ...v, ...b.view }; }
  return v;
}
const nextIndex = (t) => { const i = TL.beats.findIndex((b) => b.t > t + 1e-6); return i < 0 ? TL.beats.length : i; };

// The pattern as a 3D relief: isen ground deepest, flow lines above it, each motif lifted to its own depth.
function Scene({ view, size, sceneRef }) {
  const lk = view.look;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const res = useMemo(() => (lk && size.w && size.h ? compute(lk, size.w, size.h) : null), [lk && geometryKey(lk), size.w, size.h]);
  const items = useMemo(() => {
    if (!res) return [];
    const seen = {}, cx = size.w / 2, cy = size.h / 2;
    const out = res.items.map((it) => { seen[it.m] = (seen[it.m] || 0) + 1; return { ...it, key: it.m + '#' + seen[it.m], d: Math.hypot(it.x + it.w / 2 - cx, it.y + it.h / 2 - cy) }; });
    out.slice().sort((a, b) => a.d - b.d).forEach((it, i) => { it.rank = i; });
    const big = Math.max(1, ...out.map((it) => it.w * it.h));
    out.forEach((it) => { it.z = Math.round(30 + 90 * Math.sqrt((it.w * it.h) / big) + (it.rank % 3) * 14); }); // larger motifs stand nearer
    return out;
  }, [res, size.w, size.h]);

  const prev = useRef(new Map());
  const [ghosts, setGhosts] = useState([]);
  useEffect(() => {
    const cur = new Map(items.map((it) => [it.key, it])), gone = [];
    prev.current.forEach((it, k) => { if (!cur.has(k)) gone.push(it); });
    prev.current = cur; setGhosts(gone);
    if (!gone.length) return undefined;
    const tm = setTimeout(() => setGhosts([]), 900);
    return () => clearTimeout(tm);
  }, [items]);

  const ribbons = useMemo(() => (res && res.bands.length ? ribbonMarkup(res.bands, lk.sigInk) : ''), [res, lk && lk.sigInk]);
  const tx = lk ? texSrc(lk) : null;
  const lines = res && lk.lines !== 'off' ? res.lines : [];
  const box = (it) => ({
    left: it.x, top: it.y, width: it.w, height: it.h,
    transform: 'translateZ(' + it.z + 'px)' + (it.rot ? ' rotate(' + it.rot.toFixed(1) + 'deg)' : '') + (it.flip ? ' scaleX(-1)' : ''),
  });

  return (
    <div className="w-scene" ref={sceneRef}>
      <div className="w-drift">
        <div className="w-ground" />
        {tx && <div className="w-texture" style={{ backgroundImage: `url("${tx}")`, backgroundSize: Math.round(120 * lk.scale) + 'px' }} />}
        {(lines.length > 0 || ribbons) && (
          <svg className="w-lines" key={lk.layout + lk.seed} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
            {lines.map((l, i) => <path key={i} d={l.d} pathLength="1" fill="none" stroke={LINE_HEX[lk.lines]} strokeWidth={l.w} strokeOpacity={Math.max(0, l.o)} strokeLinecap="round" />)}
            {ribbons && <g className="w-ribbons" dangerouslySetInnerHTML={{ __html: ribbons }} />}
          </svg>
        )}
        {ghosts.map((it) => (
          <div key={'g' + it.key} className="w-m gone" style={box(it)}><img src={srcOf(it.m, lk)} alt="" /></div>
        ))}
        {items.map((it) => {
          const hidden = view.reveal != null && it.rank >= view.reveal;
          return (
            <div key={it.key} className={'w-m' + (hidden ? ' hide' : '')} style={box(it)} data-m={it.m} data-rank={it.rank}>
              <img src={srcOf(it.m, lk)} alt="" draggable="false" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlbersCard({ alb }) {
  if (!alb) return null;
  const mask = 'url("motifs/ntina-mark--black.png")';
  return (
    <div className="w-alb" aria-hidden="true">
      <div className="w-alb-pair">
        {[alb.a, alb.b].map((g, i) => (
          <div key={i + g} className="w-alb-sw" style={{ background: g }}>
            <div className="w-alb-mark" style={{ WebkitMaskImage: mask, maskImage: mask }} />
          </div>
        ))}
        <div className="w-alb-bridge" />
      </div>
      <div className="w-alb-names"><span>{nameOf(GROUNDS, alb.a)}</span><span>{nameOf(GROUNDS, alb.b)}</span></div>
    </div>
  );
}

const Icon = {
  play: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>,
  pause: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>,
  soundOn: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  soundOff: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  fs: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z" /></svg>,
  hide: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  show: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

export function Welcome({ active, getLab, onGo }) {
  const stageRef = useRef(null), sceneRef = useRef(null), clipRef = useRef(null), canvasRef = useRef(null);
  const barRef = useRef(null), timeRef = useRef(null), tickRef = useRef(null);
  const size = useElementSize(stageRef);
  const [view, setView] = useState(() => viewAt(0));
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [dock, setDock] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [ticks, setTicks] = useState([]);
  const [ctaGone, setCtaGone] = useState(false);
  const T = useRef({ t: 0, next: 0, last: 0, clip: false, playing: false, sound: false });
  const P = useRef({ tx: 0, ty: 0, rx: 0, ry: 0, down: null, moved: false, lastPointer: 0, tilt: null });
  const K = useRef({ items: [], id: 0 }); // the ticker's running captions
  const RS = useRef(createRose()); // the Media Lab chapter's rose: spin, flashes, sparks
  const [turn, setTurn] = useState(1);

  const lab = () => (getLab ? getLab() : null);
  const fire = (b) => {
    if (b.view) setView((v) => ({ ...v, ...b.view }));
    if (b.sound && T.current.sound) { const l = lab(); if (l) l.strike(b.sound); }
    if (b.clip) startClip(0);
  };
  function startClip(offset) {
    const l = lab(); if (!l) return;
    const ok = l.startClip({ ...CLIP, offset, noDraw: true, sound: T.current.sound, onEnd: (finished) => {
      T.current.clip = false;
      if (finished) T.current.t = Math.max(T.current.t, TL.clipAct.start + TL.clipAct.dur);
    } });
    T.current.clip = !!ok;
  }
  function stopClip() { const l = lab(); if (T.current.clip && l) l.stopClip(); T.current.clip = false; }
  function seek(t) {
    stopClip();
    const S = T.current; S.t = Math.max(0, Math.min(TL.total - 0.01, t)); S.next = nextIndex(S.t);
    K.current.items = []; setTicks([]);
    setView(viewAt(S.t));
    const c = TL.clipAct;
    if (S.playing && S.t >= c.start && S.t < c.start + c.dur) startClip(S.t - c.start);
  }
  function play(on) {
    const S = T.current; S.playing = on; setPlaying(on);
    const l = lab();
    if (!on) { if (S.clip && l) l.pauseClip(); return; }
    S.last = 0;
    const c = TL.clipAct;
    if (S.clip && l) l.resumeClip();
    else if (S.t >= c.start && S.t < c.start + c.dur) startClip(S.t - c.start);
  }
  function setSoundOn(on) {
    const S = T.current, l = lab();
    if (on && l && !l.unlock()) on = false; // must run inside the tap, or phones stay silent
    S.sound = on; setSound(on);
    if (l) l.clipSound(on);
  }
  function playWithSound() { setSoundOn(true); seek(0); play(true); }

  // full screen: the stage itself, or a fixed overlay where the browser has no element full screen (iPhone)
  function toggleFs() {
    const el = stageRef.current; if (!el) return;
    const on = document.fullscreenElement === el || document.webkitFullscreenElement === el || el.classList.contains('pseudo-fs');
    if (on) {
      if (el.classList.contains('pseudo-fs')) { el.classList.remove('pseudo-fs'); setIsFs(false); return; }
      (document.exitFullscreen || document.webkitExitFullscreen).call(document); return;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { const p = req.call(el); if (p && p.catch) p.catch(() => { el.classList.add('pseudo-fs'); setIsFs(true); }); }
    else { el.classList.add('pseudo-fs'); setIsFs(true); }
  }
  useEffect(() => {
    const on = () => setIsFs(!!(document.fullscreenElement || document.webkitFullscreenElement) || (stageRef.current && stageRef.current.classList.contains('pseudo-fs')));
    document.addEventListener('fullscreenchange', on); document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);

  // each new caption enters the ticker from the right while the one before fades as it runs on
  const cap = view.caption;
  useEffect(() => {
    if (!cap) return;
    const K0 = K.current, W = tickRef.current ? tickRef.current.clientWidth : 1000;
    // captions still waiting give way; the ones on screen hurry off so the new one arrives while it is current
    K0.items = K0.items.filter((it) => it.x != null && it.x < W && !it.out);
    K0.items.forEach((it) => { it.out = true; });
    K0.items.push({ id: ++K0.id, cap, x: null, w: 0 });
    setTicks(K0.items.map((it) => ({ id: it.id, cap: it.cap, out: it.out })));
    const tm = setTimeout(() => { K0.items = K0.items.filter((it) => !it.out); setTicks(K0.items.map((it) => ({ id: it.id, cap: it.cap }))); }, 700);
    return () => clearTimeout(tm);
  }, [cap]);

  // one requestAnimationFrame loop while the welcome is showing: film clock, ticker, 3D tilt and the Media Lab mirror
  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    const loop = (now) => {
      const S = T.current;
      const dt = S.last ? Math.min(0.25, (now - S.last) / 1000) : 0;
      if (S.playing) {
        const l = lab(), el = S.clip && l ? l.clipElapsed() : null;
        S.t = el != null ? TL.clipAct.start + el : S.t + dt;
        while (S.next < TL.beats.length && TL.beats[S.next].t <= S.t) fire(TL.beats[S.next++]);
        if (S.t >= TL.total) { stopClip(); S.t = 0; S.next = 0; }
      }
      S.last = now;
      if (barRef.current) barRef.current.style.width = (S.t / TL.total) * 100 + '%';
      if (timeRef.current) timeRef.current.textContent = fmt(S.t) + ' / ' + fmt(TL.total);

      // ticker
      const K0 = K.current, box = tickRef.current;
      if (box) {
        const W = box.clientWidth, v = Math.max(110, Math.min(240, W * 0.16)), step = S.playing ? dt : 0;
        let dropped = false;
        K0.items.forEach((it) => {
          const el = box.querySelector('[data-tick="' + it.id + '"]'); if (!el) return;
          if (it.x == null) { it.w = el.offsetWidth; it.x = W * 0.92; } // enters from the right as soon as it is current
          else it.x -= v * step;
          el.style.transform = 'translate3d(' + it.x.toFixed(1) + 'px,0,0)';
          if (it.x + it.w < -40) { it.done = true; dropped = true; }
        });
        if (dropped) { K0.items = K0.items.filter((it) => !it.done); setTicks(K0.items.map((it) => ({ id: it.id, cap: it.cap, out: it.out }))); }
      }

      // 3D tilt: follows the pointer or the phone, sways gently when left alone
      const Pp = P.current;
      if (!reduceMotion) {
        const idle = now - Pp.lastPointer > 2500 && !Pp.tilt;
        const tx = idle ? Math.sin(now / 5200) * 5 : Pp.tx, ty = idle ? Math.cos(now / 6100) * 3.5 : Pp.ty;
        Pp.ry += (tx - Pp.ry) * 0.07; Pp.rx += (ty - Pp.rx) * 0.07;
        const tf = 'rotateX(' + Pp.rx.toFixed(2) + 'deg) rotateY(' + Pp.ry.toFixed(2) + 'deg)';
        if (sceneRef.current) sceneRef.current.style.transform = tf;
        if (clipRef.current) clipRef.current.style.transform = 'rotateX(' + (Pp.rx * 0.5).toFixed(2) + 'deg) rotateY(' + (Pp.ry * 0.5).toFixed(2) + 'deg)';
      }

      // the Media Lab chapter: only the rose being made, centred, with the ensemble lit by the score
      const cv = canvasRef.current, l = lab(), m = S.clip && l ? l.clipMotif() : null;
      if (cv && m) {
        const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        RS.current.m = m;
        drawRoseStage(cv.getContext('2d'), W, H, dpr, RS.current, m, l.levels(), l, now, dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    if (!reduceMotion && !T.current.playing) play(true);
    return () => { cancelAnimationFrame(raf); if (T.current.playing) play(false); stopClip(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // phones: tilt by holding the phone at an angle (where the browser sends orientation without asking)
  useEffect(() => {
    if (!active || reduceMotion) return undefined;
    const on = (e) => {
      if (e.gamma == null || e.beta == null) return;
      P.current.tilt = true; P.current.tx = Math.max(-12, Math.min(12, e.gamma / 3)); P.current.ty = Math.max(-10, Math.min(10, (45 - e.beta) / 4));
    };
    window.addEventListener('deviceorientation', on);
    return () => window.removeEventListener('deviceorientation', on);
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === ' ' && (e.target === document.body || e.target === stageRef.current)) { e.preventDefault(); play(!T.current.playing); }
      else if (k === 'f' || k === 'F') toggleFs();
      else if (k === 'h' || k === 'H') setDock((d) => !d);
      else if (k === 'ArrowRight' || k === 'ArrowLeft') {
        const i = TL.acts.findIndex((a) => a.id === viewAt(T.current.t).act), n = TL.acts[Math.max(0, Math.min(TL.acts.length - 1, i + (k === 'ArrowRight' ? 1 : -1)))];
        e.preventDefault(); seek(n.start + 0.01);
      } else if (k === 'Escape' && stageRef.current && stageRef.current.classList.contains('pseudo-fs')) toggleFs();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // pointer: hover tilts, drag turns further, a tap on a motif rings it, a tap elsewhere shows or hides the dock
  const inClip = () => view.overlay === 'clip' && T.current.clip && RS.current.m;
  const local = (e) => { const r = canvasRef.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const ring = (evs) => { const l = lab(); if (evs && evs.length && T.current.sound && l) l.strike(evs); };
  const onPointerMove = (e) => {
    if (RS.current.drag) { const [x, y] = local(e); roseMove(RS.current, x, y); P.current.moved = true; return; }
    const r = stageRef.current.getBoundingClientRect(), Pp = P.current, k = Pp.down ? 2.2 : 1;
    if (e.pointerType === 'touch' && !Pp.down) return;
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    Pp.tx = Math.max(-26, Math.min(26, nx * 14 * k)); Pp.ty = Math.max(-20, Math.min(20, -ny * 10 * k)); Pp.lastPointer = performance.now(); Pp.tilt = null;
    if (Pp.down && Math.hypot(e.clientX - Pp.down[0], e.clientY - Pp.down[1]) > 8) Pp.moved = true;
  };
  const onPointerDown = (e) => {
    P.current.moved = false;
    if (inClip() && !e.target.closest('button, .w-dock, .w-rose-ui')) {
      const [x, y] = local(e);
      if (roseDown(RS.current, x, y)) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } return; }
    }
    P.current.down = [e.clientX, e.clientY];
  };
  const onPointerUp = (e) => {
    if (RS.current.drag) { const [x, y] = local(e); ring(roseUp(RS.current, x, y, RS.current.m)); P.current.moved = true; return; }
    P.current.down = null; if (P.current.lastPointer) P.current.lastPointer = performance.now();
  };
  function onStageClick(e) {
    if (P.current.moved) { P.current.moved = false; return; }
    if (e.target.closest('button, a, .w-dock, .w-rose-ui')) return;
    if (inClip()) { const [x, y] = local(e); const evs = roseUp(RS.current, x, y, RS.current.m); if (evs) { ring(evs); return; } } // kettles and gongs
    const m = e.target.closest('.w-m');
    if (m && !m.classList.contains('hide') && !m.classList.contains('gone')) {
      m.classList.remove('ping'); void m.offsetWidth; m.classList.add('ping');
      const rank = Number(m.dataset.rank) || 0;
      const l = lab();
      if (T.current.sound && l) l.strike([{ k: 'kettle', n: gseq(rank), v: 0.42, oct: rank % 2 === 1 }, { k: 'kettle', n: gseq(rank + 2), v: 0.22, at: 0.14, soft: true }]);
      const name = NAMES[m.dataset.m] || m.dataset.m;
      setTapped({ name, x: e.clientX, y: e.clientY, id: Date.now() });
      return;
    }
    setDock((d) => !d);
  }
  const [tapped, setTapped] = useState(null);
  useEffect(() => { if (!tapped) return undefined; const tm = setTimeout(() => setTapped(null), 1400); return () => clearTimeout(tm); }, [tapped]);

  const actIdx = Math.max(0, TL.acts.findIndex((a) => a.id === view.act));
  const groundHex = view.look ? view.look.ground : '#0E0C09';
  const veil = view.overlay === 'clip' ? 1 : view.dim ? 0.66 : 0;
  const stageBox = stageRef.current ? stageRef.current.getBoundingClientRect() : { left: 0, top: 0 };

  return (
    <div className="welcome">
      <section ref={stageRef} className={'w-stage' + (view.overlay === 'clip' ? ' clip' : '') + (dock ? '' : ' undocked')} style={{ '--ground': groundHex }}
        aria-label="Welcome film" tabIndex={-1}
        onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onPointerLeave={() => { P.current.lastPointer = 0; P.current.down = null; }} onClick={onStageClick}>
        <div className="w-3d">
          <Scene view={view} size={size} sceneRef={sceneRef} />
        </div>
        <div className="w-veil" style={{ opacity: veil }} />
        <div className="w-3d w-clip-wrap" aria-hidden="true">
          <div className="w-clip-plane" ref={clipRef}><canvas ref={canvasRef} className="w-clip" /></div>
        </div>
        <p className="sr" aria-live="polite">{cap ? cap.head + '. ' + (cap.body || '') : ''}</p>

        {view.overlay === 'title' && (
          <div className="w-title">
            <img src="motifs/ntina-mark--gold.png" alt="" />
            <div className="w-eyebrow">Batik Pattern Studio · Batik Media Lab</div>
            <h1>Marea Dvīpa</h1>
          </div>
        )}
        {view.overlay === 'end' && (
          <div className="w-end">
            <div className="w-eyebrow">Two rooms, one studio</div>
            <h2>Make a pattern. Watch how it was made.</h2>
            <div className="w-end-go">
              <button className="w-btn solid" type="button" onClick={() => onGo('studio')}>Enter the Pattern Studio</button>
              <button className="w-btn" type="button" onClick={() => onGo('lab')}>Open the Media Lab</button>
            </div>
          </div>
        )}
        <AlbersCard alb={view.act === 'albers' ? view.alb : null} />
        {view.overlay === 'clip' && (
          <div className="w-rose-ui" role="group" aria-label="Play with the Bomba Rose">
            <div className="w-eyebrow">Media Lab · make the Bomba Rose</div>
            <p>Drag the rose to spin it. Tap a ring to hear its petals, the heart for a gong, or any kettle and gong around it.{!sound && ' Turn the sound on to hear them.'}</p>
            <div className="w-rose-row">
              <span className="lbl">Turn between rings</span>
              {[[1, 'Golden 137.5°'], [0, 'No turn']].map(([v, n]) => (
                <button key={v} type="button" className={'w-pill' + (turn === v ? ' on' : '')} aria-pressed={turn === v}
                  onClick={() => { setTurn(v); RS.current.spinTarget = v; }}>{n}</button>
              ))}
            </div>
            <button className="w-pill solid" type="button" onClick={() => { if (!T.current.sound) { setSoundOn(true); setCtaGone(true); } const m = RS.current.m; if (m) ring(hearAll(RS.current, m)); }}>Hear the rings</button>
          </div>
        )}

        <div className="w-ticker" ref={tickRef} aria-hidden="true">
          {ticks.map(({ id, cap: c, out }) => (
            <div key={id} className={'w-tick' + (out ? ' out' : '')} data-tick={id}>
              <span className="h">{c.head}</span>
              <span className="e">{c.eyebrow}</span>
              {c.body && <span className="b">{c.body}</span>}
              <span className="sep">✦</span>
            </div>
          ))}
        </div>

        {tapped && <div key={tapped.id} className="w-tapped" style={{ left: tapped.x - stageBox.left, top: tapped.y - stageBox.top }}>{tapped.name}</div>}

        {!sound && !ctaGone && (
          <button className="w-sound-cta" type="button" onClick={playWithSound}>{Icon.soundOn} Play with sound</button>
        )}

        <div className="w-dock" role="group" aria-label="Film controls" hidden={!dock}>
          <button className="w-ic solid" type="button" onClick={() => play(!playing)} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause (Space)' : 'Play (Space)'}>{playing ? Icon.pause : Icon.play}</button>
          <div className="w-acts" role="group" aria-label="Chapters">
            {TL.acts.map((a, i) => (
              <button key={a.id} type="button" className={'w-act' + (i === actIdx ? ' now' : i < actIdx ? ' done' : '')}
                aria-current={i === actIdx ? 'step' : undefined} title={a.label}
                onClick={() => { seek(a.start + 0.01); if (!T.current.playing) play(true); }}>
                <i /><span>{a.label}</span>
              </button>
            ))}
            <div className="w-bar" aria-hidden="true"><i ref={barRef} /></div>
          </div>
          <span className="w-time" ref={timeRef}>0:00</span>
          <button className={'w-ic' + (sound ? ' on' : '')} type="button" aria-pressed={sound} aria-label="Sound" title={sound ? 'Sound on' : 'Sound off'} onClick={() => { setSoundOn(!sound); setCtaGone(true); }}>{sound ? Icon.soundOn : Icon.soundOff}</button>
          <button className="w-ic" type="button" aria-label={isFs ? 'Exit full screen' : 'Full screen'} title="Full screen (F)" onClick={toggleFs}>{Icon.fs}</button>
          <span className="w-div" aria-hidden="true" />
          <button className="w-room-btn" type="button" onClick={() => onGo('studio')}>Pattern Studio</button>
          <button className="w-room-btn" type="button" onClick={() => onGo('lab')}>Media Lab</button>
          <button className="w-ic ghost" type="button" aria-label="Hide controls" title="Hide controls (H)" onClick={() => setDock(false)}>{Icon.hide}</button>
        </div>
        {!dock && (
          <button className="w-handle" type="button" aria-label="Show controls" title="Show controls (H)" onClick={(e) => { e.stopPropagation(); setDock(true); }}>{Icon.show}</button>
        )}
        <div className="w-scroll-hint" aria-hidden="true">Scroll for the two rooms</div>
      </section>

      <section className="w-rooms" aria-label="The two rooms">
        <article className="w-room studio">
          <div className="w-eyebrow">Room one</div>
          <h2>Pattern Studio</h2>
          <p>Build batik repeats and Fibonacci flows from the Bali master motifs and the Dua Pulau and Ntina signatures.</p>
          <ul>
            <li>10 repeats and 5 Fibonacci flows, with direction, scale and seed</li>
            <li>Signature inks, isen-isen grounds and rebung ribbons</li>
            <li>Ink contrast readouts and the Albers colour test</li>
            <li>Katagami stencil check, Origins and credit lines</li>
            <li>Claude as a design partner, Save PNG and Copy recipe</li>
          </ul>
          <button className="w-btn solid" type="button" onClick={() => onGo('studio')}>Enter the Pattern Studio</button>
        </article>
        <article className="w-room lab">
          <div className="w-eyebrow">Room two</div>
          <h2>Media Lab</h2>
          <p>Animated reels showing how the Ntina mark and the Bomba Rose were made, step by step, from listening to the source to the finished system.</p>
          <ul>
            <li>The Ntina and Bomba Rose reels, with a process checklist</li>
            <li>Original scores for a synthesized Central Sulawesi ensemble</li>
            <li>Explore a step: seed heads, petal rings, sizes and stencils</li>
            <li>Tap tempo, solo a layer, record the reel as video</li>
          </ul>
          <button className="w-btn" type="button" onClick={() => onGo('lab')}>Open the Media Lab</button>
        </article>
      </section>
      <p className="w-credit">Dua Pulau and Ntina are original designs inspired by the Bomba flower of the Kaili people and the taiganja of the Kaili and Kulawi peoples of Central Sulawesi, and by Balinese ornament, with gratitude to the weavers, batik makers and musicians who keep these traditions alive. The colour test follows Josef Albers, <i>Interaction of Color</i> (1963). The scores are original compositions; no traditional piece is quoted.</p>
    </div>
  );
}
