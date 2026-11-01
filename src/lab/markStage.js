// The Ntina chapter of the Media Lab stage: only the mark being made, in the centre of the screen, while the reel's own
// Lingkar Ntina score plays on. The lab's drawMark() grows it from the reel's progress: the body first, then twenty-one
// seeds landing one by one at the golden angle, then one continuous U for the horns, then the stem opening to the edge.
// Below it sits the kakula row, seven kettles and two gongs, lit by the score. Drag the seed head to spin it, tap a seed
// to hear its kettle, tap the body or the horns for a gong, tap any kettle or gong to play it.
const GA = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;
const GOLD = '#E0C27E', GOLD2 = '#C39B65', LINE2 = '#4A4032', PAPER = '#F4EEE3', INK = '#0E0C09';
export const SEEDS = 21;
const ZERO7 = [0, 0, 0, 0, 0, 0, 0];

export function createMark() {
  return { rot: 0, vel: 0, ang: GA, angTarget: GA, seedFlash: new Array(SEEDS).fill(0), kFlash: ZERO7.slice(), gFlash: [0, 0], bodyFlash: 0, hornFlash: 0,
    bursts: [], queue: [], drag: null, geo: null, clock: 0 };
}

// which kettle a seed strikes: its angle around the head picks one of the seven, the way the lab's seed song does.
// At the golden angle the tune never settles into a loop; at 90° only a few notes repeat.
export function seedNote(i, ang) { let a = (i * ang) % TAU; if (a < 0) a += TAU; return Math.floor((a / TAU) * 7) % 7; }
export function seedNotes(count, ang, start = 0, gap = 0.17) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ k: 'kettle', n: seedNote(i, ang), v: 0.4 - (i % 3) * 0.04, oct: i % 2 === 1, at: start + i * gap });
  return out;
}

function burst(R, x, y, n, spread, color) {
  for (let i = 0; i < n; i++) {
    const a = i * GA + Math.random() * 0.4, sp = spread * (0.5 + Math.random() * 0.8);
    R.bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, r: 1.5 + Math.random() * 2.5, color });
  }
  if (R.bursts.length > 500) R.bursts.splice(0, R.bursts.length - 500);
}

// the stage's ground: Bomba black with a golden-angle seed field turning behind everything, brightening with the kettles
export function drawField(g, W, H, dpr, cx, cy, reach, turn, kettle) {
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  const field = 420, c = Math.max(W, H) * 0.036, lit7 = kettle || ZERO7;
  g.fillStyle = GOLD2;
  for (let i = 1; i < field; i++) {
    const r = c * Math.sqrt(i), a = i * GA + turn;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
    const near = Math.max(0, 1 - r / reach), lit = lit7[i % 7];
    g.globalAlpha = 0.05 + near * 0.12 + lit * 0.35 * near;
    g.beginPath(); g.arc(x, y, (1 + near * 1.6 + lit * 1.5) * dpr, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// one frame, in device pixels; m is the mark's progress from the reel (body, seeds, horn, stem), lv the ensemble's live levels
export function drawMarkStage(g, W, H, dpr, R, m, lv, lab, now, dt) {
  R.clock += dt;
  const portrait = H > W * 1.1;
  // the mark's 1024-unit box drawn S pixels tall; on a wide screen the kakula row must clear the caption and the dock below
  const S = Math.max(120 * dpr, portrait ? Math.min(W * 0.6, H * 0.56) : Math.min(W * 0.6, H * 0.5, (H * 0.6 - 185 * dpr) / 0.76)), k = S / 1024;
  const cx = W / 2, cy = Math.round((portrait ? H * 0.36 : H * 0.4) + S * 0.26); // the seed head's centre; horns rise .91 S above it, the body falls .37 S below
  const kettle = lv ? lv.kettle : ZERO7, gong = lv ? lv.gong : [0, 0], drum = lv ? lv.drum : 0;

  // physics: the seed head keeps turning slowly, carries a flick, eases between the golden angle and right angles
  if (!R.drag) { R.rot += (R.vel + 0.02) * dt; R.vel *= Math.pow(0.94, dt * 60); }
  R.ang += (R.angTarget - R.ang) * Math.min(1, dt * 3);
  R.seedFlash = R.seedFlash.map((v) => Math.max(0, v - dt * 1.8));
  R.kFlash = R.kFlash.map((v) => Math.max(0, v - dt * 2.4));
  R.gFlash = R.gFlash.map((v) => Math.max(0, v - dt * 0.9));
  R.bodyFlash = Math.max(0, R.bodyFlash - dt * 1.2); R.hornFlash = Math.max(0, R.hornFlash - dt * 1.2);
  R.queue = R.queue.filter((q) => { if (R.clock >= q.at) { R.seedFlash[q.i] = 1; return false; } return true; });

  g.setTransform(1, 0, 0, 1, 0, 0);
  drawField(g, W, H, dpr, cx, cy, S * 1.3, R.rot * 0.25 + R.clock * 0.02, kettle);

  // the gongs bloom a halo behind the head
  const halo = Math.max(gong[0], gong[1], R.gFlash[0], R.gFlash[1], R.bodyFlash * 0.8, R.hornFlash * 0.6);
  const hg = g.createRadialGradient(cx, cy, S * 0.08, cx, cy, S * (0.5 + halo * 0.15));
  hg.addColorStop(0, `rgba(224,194,126,${0.1 + halo * 0.22})`); hg.addColorStop(1, 'rgba(224,194,126,0)');
  g.fillStyle = hg; g.beginPath(); g.arc(cx, cy, S * 0.7, 0, TAU); g.fill();

  // the head guide while the seeds are landing
  const headR = 130 * k;
  if (m.body > 0 && m.seeds < SEEDS) {
    g.save(); g.strokeStyle = GOLD2; g.globalAlpha = 0.3; g.lineWidth = 1 * dpr; g.setLineDash([3 * dpr, 6 * dpr]);
    g.beginPath(); g.arc(cx, cy, headR * 1.12 * m.body, 0, TAU); g.stroke(); g.restore();
  }

  // the mark, as the reel grows it, breathing with the drum
  const pulse = 1 + drum * 0.02 + R.bodyFlash * 0.03;
  g.save(); g.translate(cx, cy); g.scale(pulse, pulse);
  lab.drawMark(g, 0, 0, S, { body: m.body, seeds: m.seeds, horn: m.horn, stem: m.stem, rot: R.rot, ang: R.ang });
  g.restore();

  // flashes: the horns' U, the body's oval, each struck seed
  const hx = cx, hy = cy - 618 * k, hrx = 368 * k, hry = 315 * k, bx = cx, by = cy + 50 * k, brx = 292 * k, bry = 321 * k;
  if (R.hornFlash > 0.01 && m.horn > 0) { g.save(); g.globalAlpha = R.hornFlash * 0.9; g.strokeStyle = GOLD; g.lineWidth = (2 + R.hornFlash * 6) * dpr; g.beginPath(); g.ellipse(hx, hy, hrx * (1 + R.hornFlash * 0.04), hry * (1 + R.hornFlash * 0.04), 0, 0.05, Math.PI - 0.05); g.stroke(); g.restore(); }
  if (R.bodyFlash > 0.01 && m.body > 0) { g.save(); g.globalAlpha = R.bodyFlash * 0.9; g.strokeStyle = GOLD; g.lineWidth = (2 + R.bodyFlash * 6) * dpr; g.beginPath(); g.ellipse(bx, by, brx * (1 + R.bodyFlash * 0.05), bry * (1 + R.bodyFlash * 0.05), 0, 0, TAU); g.stroke(); g.restore(); }
  const shown = Math.min(SEEDS, Math.ceil(m.seeds - 1e-6)), seeds = [];
  for (let i = 0; i < SEEDS; i++) {
    const r = headR * 0.82 * Math.sqrt((i + 0.6) / SEEDS), a = i * R.ang + R.rot, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, sr = (5 + 10 * (r / headR)) * k;
    if (i < shown) seeds.push([x, y, sr]);
    const f = R.seedFlash[i];
    if (f > 0.01 && i < shown) { g.save(); g.globalAlpha = f * 0.8; g.strokeStyle = GOLD; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(x, y, sr + (2 + 5 * f) * dpr, 0, TAU); g.stroke(); g.restore(); }
  }

  // the ensemble: the kakula row below the mark, two gongs at its sides
  const ky = Math.min(H - 60 * dpr, cy + S * 0.5), sp = Math.min(S * 0.2, (W - 60 * dpr) / 7.5), kSize = Math.max(7 * dpr, S * 0.035), kettles = [];
  for (let i = 0; i < 7; i++) {
    const x = cx + (i - 3) * sp, y = ky + Math.abs(i - 3) * sp * 0.08, lvl = Math.max(kettle[i], R.kFlash[i]);
    kettles.push([x, y, kSize * 1.9]);
    g.fillStyle = LINE2; g.beginPath(); g.arc(x, y, kSize, 0, TAU); g.fill();
    g.strokeStyle = GOLD2; g.globalAlpha = 0.5; g.lineWidth = 1 * dpr; g.beginPath(); g.arc(x, y, kSize * 0.45, 0, TAU); g.stroke(); g.globalAlpha = 1;
    if (lvl > 0.01) {
      g.globalAlpha = lvl; g.fillStyle = GOLD; g.beginPath(); g.arc(x, y, kSize * (1 + lvl * 0.35), 0, TAU); g.fill();
      g.globalAlpha = lvl * 0.35; g.beginPath(); g.arc(x, y, kSize * (1.6 + lvl), 0, TAU); g.fill(); g.globalAlpha = 1;
    }
  }
  g.save(); g.strokeStyle = LINE2; g.lineWidth = 2 * dpr; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(cx - 3.4 * sp, ky + kSize * 1.5); g.lineTo(cx + 3.4 * sp, ky + kSize * 1.5); g.stroke(); g.restore();
  const gR = S * 0.085, gx = Math.min(S * 0.78, W / 2 - gR * 1.6), gy = cy - S * 0.3, gongs = [];
  [-1, 1].forEach((side, n) => {
    const x = cx + side * gx, y = gy, lvl = Math.max(gong[n], R.gFlash[n]);
    gongs.push([x, y, gR * 1.4]);
    g.strokeStyle = LINE2; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(x, y, gR, 0, TAU); g.stroke();
    g.beginPath(); g.arc(x, y, gR * 0.3, 0, TAU); g.fillStyle = LINE2; g.fill();
    if (lvl > 0.01) { g.globalAlpha = lvl; g.strokeStyle = GOLD; g.lineWidth = (2 + lvl * 3) * dpr; g.beginPath(); g.arc(x, y, gR * (1 + lvl * 0.4), 0, TAU); g.stroke(); g.globalAlpha = 1; }
  });

  // sparks from taps
  R.bursts.forEach((b) => {
    b.x += b.vx * dt * dpr; b.y += b.vy * dt * dpr; b.vx *= 0.96; b.vy = b.vy * 0.96 + 30 * dt; b.life -= dt * 0.9;
    if (b.life <= 0) return; g.globalAlpha = b.life; g.fillStyle = b.color || GOLD; g.beginPath(); g.arc(b.x, b.y, b.r * dpr * b.life, 0, TAU); g.fill();
  });
  R.bursts = R.bursts.filter((b) => b.life > 0); g.globalAlpha = 1;

  // where we are in the making
  const deg = (R.angTarget * 180 / Math.PI).toFixed(1) + '°';
  let label;
  if (m.phase === 'seeds') label = 'Seed ' + Math.max(1, shown) + ' of ' + SEEDS + ' · ' + deg;
  else if (m.phase === 'hold') label = SEEDS + ' seeds · ' + deg + ' · a Fibonacci number';
  else if (m.phase === 'horn') label = 'One continuous U · no moustache, no curls';
  else if (m.phase === 'stem') label = 'The stem opens to the edge';
  else label = 'Ntina · ' + SEEDS + ' seeds · ' + (R.angTarget === GA ? 'golden angle' : deg) + ' · open stem';
  const ly = Math.max(26 * dpr, hy - hry - 16 * dpr);
  g.font = `500 ${Math.round(13 * dpr)}px 'IBM Plex Mono', Menlo, monospace`; g.textAlign = 'center'; g.fillStyle = GOLD;
  g.fillText(label.toUpperCase(), cx, ly);
  g.fillStyle = PAPER; g.globalAlpha = 0.55; g.font = `400 ${Math.round(11 * dpr)}px 'IBM Plex Mono', Menlo, monospace`;
  g.fillText(((m.lt / m.dur) * 100).toFixed(0).padStart(2, '0') + ' % · ' + (m.scene || '').toUpperCase(), cx, ly + 18 * dpr); g.globalAlpha = 1;
  g.textAlign = 'left';

  R.geo = { cx: cx / dpr, cy: cy / dpr, headR: headR / dpr, seeds: seeds.map(([x, y, r]) => [x / dpr, y / dpr, r / dpr]),
    body: [bx / dpr, by / dpr, brx / dpr, bry / dpr], horn: [hx / dpr, hy / dpr, hrx / dpr, hry / dpr],
    kettles: kettles.map(([x, y, r]) => [x / dpr, y / dpr, r / dpr]), gongs: gongs.map(([x, y, r]) => [x / dpr, y / dpr, r / dpr]), dpr };
}

// pointer input, in CSS pixels relative to the canvas; returns true when the seed head took the gesture
export function markDown(R, x, y) {
  const G = R.geo; if (!G) return false;
  if (Math.hypot(x - G.cx, y - G.cy) > G.headR * 1.3) return false;
  const a = Math.atan2(y - G.cy, x - G.cx);
  R.drag = { a0: a, last: a, rot0: R.rot, t: performance.now(), moved: false, x, y };
  R.vel = 0;
  return true;
}
export function markMove(R, x, y) {
  const D = R.drag, G = R.geo; if (!D || !G) return;
  if (Math.hypot(x - D.x, y - D.y) > 6) D.moved = true;
  const a = Math.atan2(y - G.cy, x - G.cx), now = performance.now();
  let da = a - D.last; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
  R.rot += da; R.vel = R.vel * 0.6 + (da / Math.max(0.008, (now - D.t) / 1000)) * 0.4; D.last = a; D.t = now;
}
// a tap: on a seed plays its kettle, on the body or the horns rings a gong, on a kettle or gong plays it. Returns sound events.
export function markUp(R, x, y, m) {
  const D = R.drag; R.drag = null;
  if (D && D.moved) { R.vel = Math.max(-9, Math.min(9, R.vel)); return null; }
  return markTap(R, x, y, m);
}
export function markTap(R, x, y, m) {
  const G = R.geo; if (!G) return null;
  const dpr = G.dpr;
  for (let i = 0; i < G.kettles.length; i++) {
    const [kx, ky, kr] = G.kettles[i];
    if (Math.hypot(x - kx, y - ky) < kr) { R.kFlash[i] = 1; burst(R, kx * dpr, ky * dpr, 14, 140, GOLD); return [{ k: 'kettle', n: i, v: 0.5 }]; }
  }
  for (let n = 0; n < G.gongs.length; n++) {
    const [gx, gy, gr] = G.gongs[n];
    if (Math.hypot(x - gx, y - gy) < gr) { R.gFlash[n] = 1; burst(R, gx * dpr, gy * dpr, 22, 110, GOLD2); return [{ k: 'gong', n, v: 0.55 }]; }
  }
  if (Math.hypot(x - G.cx, y - G.cy) < G.headR * 1.3 && G.seeds.length) {
    let best = -1, bd = 1e9;
    G.seeds.forEach(([sx, sy, sr], i) => { const d = Math.hypot(x - sx, y - sy) - sr; if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < Math.max(14, G.seeds[best][2] * 1.5)) {
      const [sx, sy] = G.seeds[best]; R.seedFlash[best] = 1; burst(R, sx * dpr, sy * dpr, 10, 150, GOLD);
      return [{ k: 'kettle', n: seedNote(best, R.ang), v: 0.5, oct: best % 2 === 1 }];
    }
  }
  const [bx, by, brx, bry] = G.body;
  if (m.body > 0 && Math.pow((x - bx) / brx, 2) + Math.pow((y - by) / bry, 2) < 1) {
    R.bodyFlash = 1; burst(R, x * dpr, y * dpr, 30, 220, GOLD);
    return [{ k: 'gong', n: 0, v: 0.45 }, { k: 'kettle', n: 0, v: 0.35, at: 0.2 }, { k: 'kettle', n: 4, v: 0.3, at: 0.4 }];
  }
  const [hx, hy, hrx, hry] = G.horn;
  if (m.horn > 0 && y > hy && Math.pow((x - hx) / hrx, 2) + Math.pow((y - hy) / hry, 2) < 1.08) {
    R.hornFlash = 1; burst(R, x * dpr, y * dpr, 22, 180, GOLD2);
    return [{ k: 'gong', n: 1, v: 0.5 }];
  }
  return null;
}
// every seed so far, in the order they landed, each lighting as it plays
export function hearSeeds(R, m) {
  const count = Math.min(SEEDS, Math.ceil(m.seeds - 1e-6));
  for (let i = 0; i < count; i++) R.queue.push({ i, at: R.clock + i * 0.17 });
  return seedNotes(count, R.ang);
}
