// The Media Lab's stage: tap a pattern and the room goes dark; that pattern is made in the centre of the screen with its
// score, the way the welcome film shows the Bomba Rose. The lab plays a clip of its own reel (the clock and the sound) while
// this file draws the pattern from the clip's progress, lights the kakula and gongs from the score, and takes your taps and
// drags. The rose uses the same stage the Welcome page does; the Ntina mark has its own, in markStage.js.
// The stage can also play the whole reel: then it mirrors the lab's canvas full screen, with the lab's own clock, so the
// picture, the score and the player in the page are always one thing. A small readout says when sound and picture are in sync.
import { createRose, drawRoseStage, roseDown, roseMove, roseUp, hearAll } from '../welcome/roseStage';
import { createMark, drawMarkStage, markDown, markMove, markUp, hearSeeds, seedNote, drawField, SEEDS } from './markStage';

const GA = Math.PI * (3 - Math.sqrt(5));
const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

const KINDS = {
  rose: { create: createRose, draw: drawRoseStage, down: roseDown, move: roseMove, up: roseUp, hear: hearAll,
    turn: { label: 'Turn between rings', key: 'spinTarget', options: [[1, 'Golden 137.5°'], [0, 'No turn']] } },
  mark: { create: createMark, draw: drawMarkStage, down: markDown, move: markMove, up: markUp, hear: hearSeeds,
    turn: { label: 'Turn between seeds', key: 'angTarget', options: [[GA, 'Golden 137.5°'], [Math.PI / 2, 'Right angles 90°']] } },
};

// each pattern: the reel and the scene(s) that make it, the score that plays, and the words on the stage
export const PATTERNS = [
  { id: 'ntina', name: 'Ntina', kind: 'mark', reel: 'ntina', scene: 'seeds', through: 'horns', score: 'folk',
    sub: 'The seed head, one U, the open stem', music: 'Lingkar Ntina · folk ensemble', reelName: 'the Ntina reel',
    eyebrow: 'Media Lab · make the Ntina mark', head: 'Every seed turns 137.5° from the last.',
    hint: 'Drag the seed head to spin it. Tap a seed to hear its kettle, the body or the horns for a gong, or any kettle and gong below.', hear: 'Hear the seeds' },
  { id: 'bomba', name: 'Bomba Rose', kind: 'rose', reel: 'bomba', scene: 'b-rings', score: 'bomba',
    sub: 'Petal rings of 13, 8, 5 and 3', music: 'Bunga Kaili · 138 bpm', reelName: 'the Bomba Rose reel',
    eyebrow: 'Media Lab · make the Bomba Rose', head: 'Fibonacci petal rings: 13, 8, 5, 3.',
    hint: 'Drag the rose to spin it. Tap a ring to hear its petals, the heart for a gong, or any kettle and gong around it.', hear: 'Hear the rings' },
  // reel-only patterns: the stage plays their reel in full, with the ticker
  { id: 'marea', name: 'Marea Dvīpa', reelOnly: true, reel: 'marea', score: 'marea', thumb: 'logo/mark-night.png',
    sub: 'The mark, drawn by its own gamelan', music: 'Marea · gong kebyar · 112 bpm', reelName: 'the Marea Dvīpa reel', eyebrow: 'Media Lab · the Marea Dvīpa reel', head: 'A pavilion by the sea.', hint: '', hear: '' },
  { id: 'rebung', name: 'Rebung border', reelOnly: true, reel: 'rebung', score: 'rebung', thumb: 'motifs/rebung-border--buya.png',
    sub: 'Two rows of shoots, meeting at the spine', music: 'Pucuk Rebung · 100 bpm', reelName: 'the Rebung border reel', eyebrow: 'Media Lab · the Rebung border reel', head: 'A border that points inward.', hint: '', hear: '' },
  { id: 'ketupat', name: 'Ketupat lattice', reelOnly: true, reel: 'ketupat', score: 'ketupat', thumb: 'motifs/ketupat-lattice--buya.png',
    sub: 'Three tones and one heart, woven on the diagonal', music: 'Anyam Ketupat · 96 bpm', reelName: 'the Ketupat lattice reel', eyebrow: 'Media Lab · the Ketupat lattice reel', head: 'Diamonds in the head panel.', hint: '', hear: '' },
  { id: 'cengkeh', name: 'Cengkeh sprig', reelOnly: true, reel: 'cengkeh', score: 'cengkeh', thumb: 'motifs/cengkeh-sprig--buya.png',
    sub: 'Five buds, two leaves, one harvest', music: 'Lima Kuntum · 138 bpm in 3', reelName: 'the Cengkeh sprig reel', eyebrow: 'Media Lab · the Cengkeh sprig reel', head: 'A clove for the harvest.', hint: '', hear: '' },
  { id: 'medallion', name: 'Dua Pulau medallion', reelOnly: true, reel: 'medallion', score: 'medallion', thumb: 'motifs/dua-pulau-medallion--buya.png',
    sub: 'Two islands in one mark', music: 'Dua Pulau · 128 bpm', reelName: 'the Dua Pulau medallion reel', eyebrow: 'Media Lab · the Dua Pulau medallion reel', head: 'Sulawesi at the heart, Bali round the edge.', hint: '', hear: '' },
];
const IMAGE_PATTERN = { id: 'image', name: 'Your picture', reelOnly: true, reel: 'image', score: 'image', thumb: '',
  sub: 'Played left to right by the ensemble', music: 'Kakula ensemble · 106.7 bpm', reelName: 'your picture', eyebrow: 'Media Lab · your picture', head: 'A picture, played left to right.', hint: '', hear: '' };
const NEXT = [
];
const REEL_HINT = 'The whole reel, step by step, with its score. Tap the picture to pause, use the arrows to step, or scrub the bar.';

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zm12 0v12l-9-6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6h2v12h-2zM6 6l9 6-9 6z"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

// a tile's picture: the finished pattern, or the pattern part-made (p in 0..1) while the tile is hovered
function drawThumb(cv, lab, pat, p) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
  const W = Math.max(2, Math.round(r.width * dpr)), H = Math.max(2, Math.round(r.height * dpr));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0E0C09'; g.fillRect(0, 0, W, H);
  const seg = (a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  if (pat.kind === 'rose') {
    const prog = p >= 1 ? [1, 1, 1, 1] : [0, 1, 2, 3].map((k) => seg(k * 0.22, k * 0.22 + 0.2));
    lab.drawRose(g, W / 2, H / 2, W * 0.4, { ink: 'buya', prog, heart: p >= 1 ? 1 : seg(0.88, 0.98), stem: 0, leaves: [0, 0, 0] });
  } else {
    lab.drawMark(g, W / 2, H * 0.68, W * 0.66, p >= 1 ? {} : { body: seg(0, 0.08), seeds: SEEDS * seg(0.08, 0.58), horn: seg(0.62, 0.8), stem: seg(0.82, 0.96) });
  }
}

export function createStage(lab, root) {
  if (!root) return { open() {}, close() {}, isOpen: () => false };

  // ---------- the pattern tiles ----------
  const tiles = root.querySelector('#patterns');
  const thumbs = [];
  function makeTile(pat) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tile'; b.dataset.id = pat.id;
    const art = pat.reelOnly ? '<img alt="">' : '<canvas aria-hidden="true"></canvas>';
    b.innerHTML = '<span class="t-art">' + art + '</span><span class="t-name"></span><span class="t-sub"></span><span class="t-go">' + (pat.reelOnly ? 'Play it on the stage' : 'Make it on the stage') + '</span>';
    b.querySelector('.t-name').textContent = pat.name; b.querySelector('.t-sub').textContent = pat.sub + ' · ' + pat.music;
    b.setAttribute('aria-label', pat.name + ': ' + pat.sub + '. Opens the stage, with sound.');
    if (pat.reelOnly) b.querySelector('img').src = pat.thumb;
    b.addEventListener('click', () => open(pat.id));
    return b;
  }
  if (tiles) {
    PATTERNS.forEach((pat) => {
      const b = makeTile(pat); tiles.appendChild(b);
      if (pat.reelOnly) return;
      const th = { cv: b.querySelector('canvas'), pat, raf: 0, t0: 0 }; thumbs.push(th);
      const preview = () => {
        if (reduceMotion) return;
        cancelAnimationFrame(th.raf); th.t0 = performance.now();
        const loop = (now) => { const p = ((now - th.t0) / 3600) % 1; drawThumb(th.cv, lab, pat, p < 0.82 ? p / 0.82 : 1); th.raf = requestAnimationFrame(loop); };
        th.raf = requestAnimationFrame(loop);
      };
      const still = () => { cancelAnimationFrame(th.raf); th.raf = 0; drawThumb(th.cv, lab, pat, 1); };
      b.addEventListener('pointerenter', preview); b.addEventListener('pointerleave', still);
      b.addEventListener('focus', preview); b.addEventListener('blur', still);
    });
    NEXT.forEach((n) => {
      const d = document.createElement('div'); d.className = 'tile next';
      d.innerHTML = '<span class="t-art"><img alt=""></span><span class="t-name"><small>next</small></span><span class="t-sub"></span>';
      d.querySelector('img').src = n.img; d.querySelector('.t-name').prepend(n.name + ' '); d.querySelector('.t-sub').textContent = n.sub;
      tiles.appendChild(d);
    });
    const drawAll = () => thumbs.forEach((th) => { if (!th.raf) drawThumb(th.cv, lab, th.pat, 1); });
    requestAnimationFrame(drawAll);
    if (window.ResizeObserver) new ResizeObserver(drawAll).observe(tiles); else window.addEventListener('resize', drawAll);
  }
  // a loaded picture gets its own tile (before the "next" ones) and its own entry on the stage
  function imageReady(info) {
    IMAGE_PATTERN.thumb = info.url; IMAGE_PATTERN.sub = info.name;
    if (PATTERNS.indexOf(IMAGE_PATTERN) < 0) PATTERNS.push(IMAGE_PATTERN);
    if (tiles) {
      const old = tiles.querySelector('.tile[data-id="image"]'); const b = makeTile(IMAGE_PATTERN);
      if (old) old.replaceWith(b); else { const next = tiles.querySelector('.tile.next'); if (next) tiles.insertBefore(b, next); else tiles.appendChild(b); }
    }
    if (st.open) renderPanel();
  }

  // ---------- the stage ----------
  const el = document.createElement('section'); el.className = 'lab-stage'; el.hidden = true; el.tabIndex = -1; el.setAttribute('aria-label', 'Stage');
  el.innerHTML =
    '<div class="ls-3d"><div class="ls-plane"><canvas class="ls-canvas"></canvas></div></div>' +
    '<div class="ls-panel" role="group" aria-label="Play with the pattern">' +
      '<div class="ls-eyebrow"></div><h2 class="ls-head"></h2><p class="ls-hint"></p>' +
      '<div class="ls-row ls-pats" role="group" aria-label="Pattern"></div>' +
      '<div class="ls-row ls-show" role="group" aria-label="Show"></div>' +
      '<div class="ls-row ls-turn"></div>' +
      '<button class="ls-pill solid ls-hear" type="button"></button>' +
    '</div>' +
    '<div class="ls-ticker" aria-hidden="true"></div><p class="sr ls-said" aria-live="polite"></p>' +
    '<div class="ls-dock" role="group" aria-label="Stage controls">' +
      '<button class="ls-ic ls-prev" type="button" aria-label="Previous step" title="Previous step (←)"></button>' +
      '<button class="ls-ic solid ls-play" type="button" aria-label="Pause" title="Pause (Space)"></button>' +
      '<button class="ls-ic ls-next" type="button" aria-label="Next step" title="Next step (→)"></button>' +
      '<div class="ls-bar" aria-hidden="true"><i></i></div>' +
      '<label class="ls-scrub-wrap"><span class="sr">Reel position</span><input class="ls-scrub" type="range" min="0" max="1000" step="1" value="0"></label>' +
      '<span class="ls-time">0:00 / 0:00</span>' +
      '<span class="ls-sync" aria-live="off"></span>' +
      '<button class="ls-ic ls-sound" type="button" aria-pressed="false" aria-label="Sound"></button>' +
      '<button class="ls-ic ls-fs" type="button" aria-label="Full screen" title="Full screen (F)"></button>' +
      '<span class="ls-div" aria-hidden="true"></span>' +
      '<button class="ls-room ls-reel" type="button"></button>' +
    '</div>' +
    '<button class="ls-close" type="button" aria-label="Close the stage" title="Close (Esc)"></button>';
  root.appendChild(el);
  const q = (s) => el.querySelector(s);
  const cv = q('.ls-canvas'), plane = q('.ls-plane'), panel = q('.ls-panel'), dock = q('.ls-dock'), bar = q('.ls-bar i'), scrub = q('.ls-scrub'), timeEl = q('.ls-time'), syncEl = q('.ls-sync');
  const ticker = q('.ls-ticker'), said = q('.ls-said');
  const playBtn = q('.ls-play'), soundBtn = q('.ls-sound'), hearBtn = q('.ls-hear'), reelBtn = q('.ls-reel');
  q('.ls-fs').innerHTML = ICON.fs; q('.ls-close').innerHTML = ICON.close; q('.ls-prev').innerHTML = ICON.prev; q('.ls-next').innerHTML = ICON.next;

  const st = { pat: null, K: null, R: null, mode: 'make', open: false, clip: false, finished: false, sound: false, gen: 0, last: 0, raf: 0, motif: null,
    heard: 0, hornHeard: false, stemHeard: false, sceneId: null, icon: '', syncKey: '', fixes: 0, fixedAt: 0, scrubbing: false, moved: false, fieldTurn: 0,
    tilt: { tx: 0, ty: 0, rx: 0, ry: 0, lastPointer: 0 } };

  // the description runs along the bottom as a ticker, one line from right to left, the way the welcome film's captions do:
  // each scene's words enter from the right as the scene starts, while the words before them hurry off and fade
  const TK = { items: [], id: 0 };
  function tickerPush(sc) {
    const W = ticker.clientWidth || 1000;
    TK.items = TK.items.filter((it) => { if (it.x == null || it.x >= W || it.out) { it.el.remove(); return false; } return true; }); // words still waiting give way
    TK.items.forEach((it) => { it.out = true; it.outAt = performance.now(); it.el.classList.add('out'); });
    const d = document.createElement('div'); d.className = 'ls-tick';
    d.innerHTML = '<span class="h"></span><span class="e"></span><span class="b"></span><span class="sep">✦</span>';
    d.querySelector('.h').textContent = sc.head; d.querySelector('.e').textContent = sc.eyebrow; d.querySelector('.b').textContent = sc.body || '';
    if (!sc.body) d.querySelector('.b').remove();
    ticker.appendChild(d);
    TK.items.push({ id: ++TK.id, el: d, x: null, w: 0, out: false, outAt: 0 });
    said.textContent = sc.head + ' ' + (sc.body || '');
  }
  function tickerStep(dt, playing, now) {
    const W = ticker.clientWidth; if (!W) return;
    const v = Math.max(110, Math.min(240, W * 0.16)), step = playing ? dt : 0;
    TK.items = TK.items.filter((it) => {
      if (it.x == null) { it.w = it.el.offsetWidth; it.x = W * 0.92; } else it.x -= v * step;
      if ((it.out && now - it.outAt > 700) || it.x + it.w < -40) { it.el.remove(); return false; }
      it.el.style.transform = 'translate3d(' + it.x.toFixed(1) + 'px,0,0)';
      return true;
    });
  }
  function tickerClear() { TK.items.forEach((it) => it.el.remove()); TK.items = []; said.textContent = ''; }

  const ring = (evs) => { if (evs && evs.length && st.sound) lab.strike(evs); };
  function nudgeSound() { soundBtn.classList.remove('nudge'); void soundBtn.offsetWidth; soundBtn.classList.add('nudge'); }
  function setSound(on) {
    if (on && !lab.unlock()) on = false; // must happen inside the tap, or phones stay silent
    st.sound = on;
    soundBtn.innerHTML = on ? ICON.soundOn : ICON.soundOff; soundBtn.setAttribute('aria-pressed', String(on)); soundBtn.title = on ? 'Sound on' : 'Sound off'; soundBtn.classList.toggle('on', on);
    if (st.mode === 'reel') lab.setReelSound(on, st.pat.score); else lab.clipSound(on);
  }
  function pills(box, options, isOn, onPick, label) {
    box.innerHTML = '';
    if (label) { const l = document.createElement('span'); l.className = 'lbl'; l.textContent = label; box.appendChild(l); }
    options.forEach(([v, n]) => {
      const on = isOn(v), b = document.createElement('button'); b.type = 'button'; b.className = 'ls-pill' + (on ? ' on' : ''); b.setAttribute('aria-pressed', String(on)); b.textContent = n;
      b.addEventListener('click', () => onPick(v)); box.appendChild(b);
    });
  }
  function renderPanel() {
    const pat = st.pat, K = st.K, reel = st.mode === 'reel';
    el.dataset.mode = st.mode; el.dataset.only = pat.reelOnly ? 'reel' : '';
    q('.ls-eyebrow').textContent = reel ? 'Media Lab · ' + pat.reelName : pat.eyebrow;
    q('.ls-head').textContent = reel ? (pat.reelOnly ? pat.head : 'How the ' + pat.name + ' was made.') : pat.head;
    q('.ls-hint').textContent = reel ? REEL_HINT : pat.hint;
    hearBtn.textContent = pat.hear;
    reelBtn.textContent = reel ? 'Open in the Lab' : 'Play the full reel';
    pills(q('.ls-pats'), PATTERNS.map((p) => [p.id, p.name]), (v) => v === pat.id, (v) => { const p = PATTERNS.find((x) => x.id === v); if (p !== st.pat) { if (st.mode === 'reel' || p.reelOnly) playReel(p); else start(p); } });
    pills(q('.ls-show'), [['make', 'The making'], ['reel', 'Full reel']], (v) => v === st.mode, (v) => setMode(v), 'Show');
    if (K) pills(q('.ls-turn'), K.turn.options, (v) => st.R[K.turn.key] === v, (v) => { st.R[K.turn.key] = v; renderPanel(); }, K.turn.label); else q('.ls-turn').innerHTML = '';
  }
  function syncPlayIcon() {
    let key;
    if (st.mode === 'reel') { const rs = lab.reelState(); key = rs.ended ? 'again' : rs.playing ? 'pause' : 'play'; }
    else key = st.finished ? 'again' : lab.clipPlaying() ? 'pause' : 'play';
    if (key === st.icon) return; st.icon = key;
    playBtn.innerHTML = ICON[key]; const label = key === 'again' ? 'Play again' : key === 'pause' ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', label); playBtn.title = label + ' (Space)';
  }
  // the readout: are the score and the picture on one clock?
  function syncReadout(now) {
    const s = lab.sync();
    if (s.fixes !== st.fixes) { st.fixes = s.fixes; st.fixedAt = now; }
    const key = now - st.fixedAt < 1800 && st.fixedAt ? 'fixed' : s.held ? 'held' : s.live ? 'live' : s.sound ? 'quiet' : 'off';
    if (key === st.syncKey) return; st.syncKey = key;
    syncEl.dataset.state = key;
    syncEl.textContent = key === 'fixed' ? 'Re-synced' : key === 'held' ? 'Waiting for audio' : key === 'live' ? 'In sync' : key === 'quiet' ? 'Score ready' : 'Picture only';
    syncEl.title = key === 'live' ? 'The score’s clock drives the picture' : key === 'held' ? 'The audio output went quiet; the picture waits for it' : key === 'fixed' ? 'The score was re-anchored to the picture' : key === 'quiet' ? 'The score starts with play' : 'Sound is off';
  }
  // start (or restart) the making of a pattern: the lab plays the reel's scene as a clip, with the score if sound is on
  function start(pat) {
    const gen = ++st.gen;
    if (st.clip) lab.stopClip();
    st.mode = 'make'; lab.setStageOpen(true, false);
    st.pat = pat; st.K = KINDS[pat.kind]; st.R = st.K.create(); st.finished = false; st.motif = null; st.clip = false;
    st.heard = 0; st.hornHeard = false; st.stemHeard = false; st.sceneId = null; st.icon = '';
    el.dataset.kind = pat.kind;
    lab.selectReel(pat.reel);
    const ok = lab.startClip({ reel: pat.reel, scene: pat.scene, through: pat.through, score: pat.score, offset: 0, noDraw: true, sound: st.sound,
      onEnd: (finished) => { if (gen !== st.gen) return; st.clip = false; if (finished) st.finished = true; syncPlayIcon(); } });
    st.clip = !!ok;
    renderPanel(); syncPlayIcon(); tickerClear();
  }
  // the whole reel on the stage: the lab plays it, the stage mirrors the lab's canvas
  function playReel(pat) {
    st.gen++;
    if (st.clip) lab.stopClip(); st.clip = false;
    st.mode = 'reel'; st.pat = pat; st.K = KINDS[pat.kind] || null; if (st.K && (!st.R || el.dataset.kind !== pat.kind)) st.R = st.K.create(); if (!st.K) st.R = null; el.dataset.kind = pat.kind || '';
    st.finished = false; st.motif = null; st.icon = ''; st.sceneId = null;
    lab.setStageOpen(true, false);
    lab.playReel(pat.reel, st.sound ? pat.score : null);
    renderPanel(); syncPlayIcon(); tickerClear();
  }
  function setMode(mode) {
    if (mode === st.mode || (mode === 'make' && st.pat.reelOnly)) return;
    if (mode === 'reel') playReel(st.pat); else { lab.setReelPlaying(false); start(st.pat); }
  }
  function open(id) {
    if (lab.isRecording && lab.isRecording()) return;
    const pat = PATTERNS.find((p) => p.id === id) || PATTERNS[0];
    const wasOpen = st.open;
    if (!wasOpen) { st.open = true; el.hidden = false; document.body.classList.add('lab-stage-open'); lab.setStageOpen(true, false); setSound(true); }
    if (pat.reelOnly) playReel(pat); else start(pat);
    if (!wasOpen) {
      st.last = 0; cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(loop);
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }
  }
  function close() {
    if (!st.open) return;
    st.gen++; if (st.clip) lab.stopClip(); st.clip = false; // in full-reel mode the reel simply carries on in the page
    cancelAnimationFrame(st.raf); st.raf = 0;
    if (isFs()) exitFs();
    st.open = false; el.hidden = true; document.body.classList.remove('lab-stage-open'); lab.setStageOpen(false, false);
  }

  // one requestAnimationFrame loop while the stage is open: draw from the clip's progress (or mirror the reel), clock, caption, tilt
  function loop(now) {
    if (!st.open) return;
    const dt = st.last ? Math.min(0.25, (now - st.last) / 1000) : 0; st.last = now;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (W > 0 && H > 0 && (cv.width !== W || cv.height !== H)) { cv.width = W; cv.height = H; }
    const rs = st.mode === 'reel' ? lab.reelState() : null;
    if (st.mode === 'reel') {
      if (W > 0 && H > 0) { // the scene's own picture on the stage's ground, fitted between the panel, the ticker and the dock; the lab draws it from the clock the score runs on
        const g = cv.getContext('2d'), lv = lab.levels();
        g.setTransform(1, 0, 0, 1, 0, 0); st.fieldTurn += dt * 0.05;
        drawField(g, W, H, dpr, W / 2, H * 0.45, Math.min(W, H) * 0.7, st.fieldTurn, lv ? lv.kettle : null);
        const er = el.getBoundingClientRect(), pr = panel.getBoundingClientRect(), dr = dock.getBoundingClientRect(), tr = ticker.getBoundingClientRect();
        const panelAtTop = pr.top - er.top < er.height / 2, tickerAtTop = tr.top - er.top < er.height / 2;
        const top = Math.max(56, panelAtTop ? pr.bottom - er.top + 8 : 0, tickerAtTop ? tr.bottom - er.top + 4 : 0);
        const bottom = Math.min(dr.top - er.top, panelAtTop ? er.height : pr.top - er.top, tickerAtTop ? er.height : tr.top - er.top) - 6;
        const aw = W - 16 * dpr, ah = Math.max(60 * dpr, (bottom - top) * dpr), k = Math.min(aw / 1280, ah / 720), dw = 1280 * k, dh = 720 * k;
        lab.drawReelScene(g, (W - dw) / 2, top * dpr + (ah - dh) / 2, dw, dh);
      }
      if (!st.scrubbing) scrub.value = String(Math.round((rs.t / rs.total) * 1000));
      timeEl.textContent = fmt(rs.t) + ' / ' + fmt(rs.total) + (rs.number ? ' · step ' + String(rs.number).padStart(2, '0') + ' / ' + rs.steps : '');
      scrub.setAttribute('aria-valuetext', fmt(rs.t) + (rs.step ? ', ' + rs.step : ''));
    } else {
      const m = st.clip ? lab.clipMotif() : st.motif; if (m) st.motif = m;
      if (W > 0 && H > 0 && m) st.K.draw(cv.getContext('2d'), W, H, dpr, st.R, m, lab.levels(), lab, now, dt);
      if (m && m.kind === 'mark') cues(m);
      const el0 = st.clip ? lab.clipElapsed() : null, dur = m ? m.dur : 0, at = el0 != null ? el0 : (st.finished ? dur : 0);
      bar.style.width = dur ? Math.min(100, (at / dur) * 100) + '%' : '0%'; timeEl.textContent = fmt(at) + ' / ' + fmt(dur);
    }
    // the words: a new scene's description enters the ticker from the right
    const sc = st.mode === 'reel' ? rs : (st.clip ? lab.clipScene() : null);
    if (sc && sc.id !== st.sceneId) { st.sceneId = sc.id; if (sc.head) tickerPush(sc); }
    tickerStep(dt, st.mode === 'reel' ? rs.playing : lab.clipPlaying(), now);
    if (!reduceMotion) {
      const T = st.tilt, idle = now - T.lastPointer > 2500;
      const tx = idle ? Math.sin(now / 5200) * 2.5 : T.tx, ty = idle ? Math.cos(now / 6100) * 1.8 : T.ty;
      T.ry += (tx - T.ry) * 0.07; T.rx += (ty - T.rx) * 0.07;
      plane.style.transform = 'rotateX(' + T.rx.toFixed(2) + 'deg) rotateY(' + T.ry.toFixed(2) + 'deg)';
    }
    syncPlayIcon(); syncReadout(now);
    st.raf = requestAnimationFrame(loop);
  }
  // the mark's making rings as it goes, on the score's grid: a soft kettle as each seed lands, a gong when the U closes, a short run when the stem opens
  function cues(m) {
    const R = st.R, n = Math.min(SEEDS, Math.floor(m.seeds + 1e-6));
    if (n > st.heard) {
      for (let i = st.heard; i < n; i++) { R.seedFlash[i] = 1; if (i >= n - 2) ring([{ k: 'kettle', n: seedNote(i, R.ang), v: 0.3, soft: true, oct: i % 2 === 1 }]); }
      st.heard = n;
    } else if (n < st.heard) st.heard = n;
    if (m.horn >= 1 && !st.hornHeard) { st.hornHeard = true; R.hornFlash = 1; ring([{ k: 'gong', n: 1, v: 0.4 }]); }
    if (m.stem >= 1 && !st.stemHeard) { st.stemHeard = true; R.bodyFlash = 1; ring([{ k: 'gong', n: 0, v: 0.4 }, { k: 'kettle', n: 0, v: 0.3, at: 0.2 }, { k: 'kettle', n: 4, v: 0.28, at: 0.4 }]); }
  }

  // pointer: hover tilts the plane, drag turns the pattern, a tap plays what is under it; on the full reel a tap pauses and resumes
  const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onUi = (e) => !!e.target.closest('button, input, label, .ls-panel, .ls-dock');
  el.addEventListener('pointermove', (e) => {
    if (st.R && st.R.drag) { const [x, y] = local(e); st.K.move(st.R, x, y); st.moved = true; return; }
    if (e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect(), T = st.tilt, nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    T.tx = Math.max(-6, Math.min(6, nx * 7)); T.ty = Math.max(-5, Math.min(5, -ny * 5)); T.lastPointer = performance.now();
  });
  el.addEventListener('pointerdown', (e) => {
    st.moved = false; if (onUi(e) || st.mode === 'reel' || !st.R || !st.motif) return;
    const [x, y] = local(e);
    if (st.K.down(st.R, x, y)) { try { el.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } }
  });
  const onUp = (e) => { if (st.R && st.R.drag) { const [x, y] = local(e); const evs = st.K.up(st.R, x, y, st.motif); if (evs) { ring(evs); if (!st.sound) nudgeSound(); } st.moved = true; } };
  el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  el.addEventListener('pointerleave', () => { st.tilt.lastPointer = 0; });
  el.addEventListener('click', (e) => {
    if (st.moved) { st.moved = false; return; }
    if (onUi(e)) return;
    if (st.mode === 'reel') { playBtn.click(); return; }
    if (!st.R || !st.motif) return;
    const [x, y] = local(e), evs = st.K.up(st.R, x, y, st.motif);
    if (evs) { ring(evs); if (!st.sound) nudgeSound(); }
  });

  // the dock and the panel
  playBtn.addEventListener('click', () => {
    if (st.mode === 'reel') { const rs = lab.reelState(); if (rs.ended) lab.playReel(st.pat.reel, st.sound ? st.pat.score : null); else lab.setReelPlaying(!rs.playing); syncPlayIcon(); return; }
    if (st.finished) { start(st.pat); return; }
    if (lab.clipPlaying()) lab.pauseClip(); else { if (st.sound) lab.unlock(); lab.resumeClip(); }
    syncPlayIcon();
  });
  q('.ls-prev').addEventListener('click', () => lab.stepReel(-1));
  q('.ls-next').addEventListener('click', () => lab.stepReel(1));
  scrub.addEventListener('pointerdown', () => { st.scrubbing = true; });
  scrub.addEventListener('input', () => { const rs = lab.reelState(); lab.seekReel((Number(scrub.value) / 1000) * rs.total); });
  const scrubDone = () => { st.scrubbing = false; };
  scrub.addEventListener('change', scrubDone); scrub.addEventListener('pointerup', scrubDone); scrub.addEventListener('pointercancel', scrubDone); scrub.addEventListener('blur', scrubDone);
  soundBtn.addEventListener('click', () => setSound(!st.sound));
  hearBtn.addEventListener('click', () => { if (!st.sound) setSound(true); if (st.motif) ring(st.K.hear(st.R, st.motif)); });
  reelBtn.addEventListener('click', () => {
    if (st.mode === 'reel') { close(); try { lab.canvas.parentNode.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); } catch (e) { /* fine */ } }
    else setMode('reel');
  });
  q('.ls-close').addEventListener('click', close);
  q('.ls-fs').addEventListener('click', toggleFs);

  function isFs() { return document.fullscreenElement === el || document.webkitFullscreenElement === el; }
  function exitFs() { const f = document.exitFullscreen || document.webkitExitFullscreen; if (!f) return; try { const p = f.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) { /* fine */ } }
  function toggleFs() {
    if (isFs()) { exitFs(); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen; if (!req) return;
    try { const p = req.call(el); if (p && p.catch) p.catch(() => {}); } catch (e) { /* fine */ }
  }
  document.addEventListener('keydown', (e) => {
    if (!st.open) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === ' ' && (e.target === document.body || e.target === el)) { e.preventDefault(); playBtn.click(); }
    else if (k === 'Escape') { e.preventDefault(); if (isFs()) exitFs(); else close(); }
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      if (st.mode === 'reel') lab.stepReel(k === 'ArrowRight' ? 1 : -1);
      else { const i = PATTERNS.indexOf(st.pat), p = PATTERNS[(i + (k === 'ArrowRight' ? 1 : PATTERNS.length - 1)) % PATTERNS.length]; if (p.reelOnly) playReel(p); else start(p); }
    }
  });

  return { open, close, isOpen: () => st.open, imageReady };
}
