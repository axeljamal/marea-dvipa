// Cengkeh sprig: the Dua Pulau clove sprig, drawn in code so it can grow, sway and ripen.
// A stem, two dotted leaves (one dark, one teal), and a fan of five branches, each ending in a clove bud: a tapered tube
// (the calyx), four sepals and the round unopened flower. Five is a Fibonacci number. Geometry is in the master
// drawing's pixels (public/motifs/cengkeh-sprig*.png, 880 × 1024), measured from the base of the stem.
var CENGKEH_INKS = {
  'dua-pulau': { stem: '#1E4157', branch: '#A88860', tube: '#C39B65', tubeLine: '#8A6B45', sepal: '#1E4157', ball: '#D1B285', dot: '#FAF7F2', leafA: '#1E4157', leafB: '#4F7580', rib: '#02213D', leafDot: '#D1B285', line: '#02213D' },
  'buya-bomba': { stem: '#1B1712', branch: '#9C7A3C', tube: '#C9A35A', tubeLine: '#8F6E38', sepal: '#1B1712', ball: '#E0C27E', dot: '#F3E3B5', leafA: '#1B1712', leafB: '#6B5A35', rib: '#0E0C09', leafDot: '#E0C27E', line: '#0E0C09' },
  // night: our own variant for black grounds, where the buya ink's black stem and leaf vanish; the dark parts keep their
  // colour but take a gold outline, and the stem turns bronze
  'malam': { stem: '#8F6E38', branch: '#9C7A3C', tube: '#C9A35A', tubeLine: '#8F6E38', sepal: '#2A241B', ball: '#E0C27E', dot: '#F3E3B5', leafA: '#2A241B', leafB: '#6B5A35', rib: '#C9A35A', leafDot: '#E0C27E', line: '#C9A35A' }
};
var CG = { base: [445, 995], joint: [445, 532], spread: 56, leaves: [
  { base: [434, 800], tip: [150, 660], w: 200 },   // the dark leaf, left and lower
  { base: [460, 722], tip: [712, 580], w: 170 } ] }; // the teal leaf, right and higher
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// one bud at the canvas origin pointing up (-y), in master px: tube from 0 to -95, head centred at -133.
// o.open 0..1 spreads the sepals, o.tube / o.ball override colours (ripening)
function budAt(g, C, o) {
  var open = o.open == null ? 1 : o.open, lw = o.lw || 3;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.lineTo(21, -92); g.quadraticCurveTo(0, -100, -21, -92); g.closePath();
  g.fillStyle = o.tube || C.tube; g.fill(); g.strokeStyle = C.line; g.lineWidth = lw; g.stroke();
  g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -84); g.strokeStyle = C.tubeLine; g.lineWidth = lw * .7; g.stroke();
  g.save(); g.translate(0, -133);
  for (var k = 0; k < 4; k++) { g.save(); g.rotate(Math.PI / 4 + k * Math.PI / 2); g.translate(0, -(16 + 9 * open)); g.beginPath(); g.ellipse(0, 0, 15 + 4 * open, 19, 0, 0, Math.PI * 2); g.fillStyle = o.sepal || C.sepal; g.fill(); g.strokeStyle = C.line; g.lineWidth = lw; g.stroke(); g.restore(); }
  g.beginPath(); g.arc(0, 0, 16 + 6 * open, 0, Math.PI * 2); g.fillStyle = o.ball || C.ball; g.fill();
  g.beginPath(); g.arc(0, 0, 5 + 1.5 * open, 0, Math.PI * 2); g.fillStyle = C.dot; g.fill();
  g.restore();
}
// a single bud drawn on its own: (x, y) the foot of the tube, size = the bud's full length in px, angle in radians from upright
function cengkehBud(g, x, y, size, angle, inkName, o) {
  o = o || {}; var C = CENGKEH_INKS[inkName] || CENGKEH_INKS['dua-pulau'], s = size / 171;
  g.save(); g.translate(x, y); g.rotate(angle || 0); g.scale(s, s); budAt(g, C, Object.assign({ lw: 3 / Math.max(s, .5) * Math.min(1, s * 2) }, o)); g.restore();
}
function leafPts(L, grow) {
  var bx = L.base[0], by = L.base[1], tx = bx + (L.tip[0] - bx) * grow, ty = by + (L.tip[1] - by) * grow, dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, W = L.w * grow, top = [], bot = [];
  for (var i = 0; i <= 24; i++) { var u = i / 24, w = W * Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .75) * (1 + .025 * Math.sin(u * 40)); top.push([bx + dx * u + nx * w * .5, by + dy * u + ny * w * .5]); bot.push([bx + dx * u - nx * w * .5, by + dy * u - ny * w * .5]); }
  return { outline: top.concat(bot.reverse()), bx: bx, by: by, dx: dx, dy: dy, nx: nx, ny: ny, W: W };
}
// the whole sprig. (x, y) = the foot of the stem, h = height of the master drawing in px.
// o: stem, leaves, branches, buds (0..1 growth stages, default 1), open (sepals), n (bud count, default 5),
//    spread (half-angle of the fan in degrees, default 56), sway (radians added to every branch), swayEach (fn(i) -> extra radians),
//    budStyle(i) -> {tube, ball, sepal, hidden} (ripening, picking), alpha, dots (leaf cecek, default true)
function cengkehSprig(g, x, y, h, inkName, o) {
  o = o || {}; var C = CENGKEH_INKS[inkName] || CENGKEH_INKS['dua-pulau'], s = h / 1024;
  var stem = o.stem == null ? 1 : o.stem, lv = o.leaves == null ? 1 : o.leaves, br = o.branches == null ? 1 : o.branches, bd = o.buds == null ? 1 : o.buds;
  var n = o.n || 5, spread = (o.spread == null ? CG.spread : o.spread) * Math.PI / 180;
  g.save(); g.globalAlpha *= o.alpha == null ? 1 : o.alpha; g.translate(x, y); g.scale(s, s); g.translate(-CG.base[0], -CG.base[1]);
  g.lineJoin = 'round'; g.lineCap = 'round';
  var jx = CG.joint[0], jy = CG.base[1] + (CG.joint[1] - CG.base[1]) * clamp01(stem);
  // leaves first, behind the stem
  CG.leaves.forEach(function (L, k) {
    var gr = clamp01(lv * 1.6 - k * .6); if (gr <= 0 || stem < (k ? .55 : .4)) return; var P = leafPts(L, .2 + .8 * gr);
    g.beginPath(); P.outline.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
    g.fillStyle = k ? C.leafB : C.leafA; g.fill(); g.strokeStyle = C.line; g.lineWidth = 3.5; g.stroke();
    g.beginPath(); g.moveTo(P.bx + P.dx * .1, P.by + P.dy * .1); g.lineTo(P.bx + P.dx * .9, P.by + P.dy * .9); g.strokeStyle = C.rib; g.lineWidth = 4; g.stroke();
    if (o.dots !== false) { g.fillStyle = C.leafDot; for (var d = 0; d < 10; d++) { var u = .17 + d * .072, side = d % 2 ? 1 : -1, w = P.W * .22 * Math.sin(Math.PI * u) * (d % 3 === 2 ? .45 : 1); g.beginPath(); g.arc(P.bx + P.dx * u + P.nx * w * side, P.by + P.dy * u + P.ny * w * side, 6.5, 0, Math.PI * 2); g.fill(); } }
  });
  // stem
  g.beginPath(); g.moveTo(CG.base[0], CG.base[1]); g.quadraticCurveTo(CG.base[0] - 6, (CG.base[1] + jy) / 2, jx, jy);
  g.strokeStyle = C.stem; g.lineWidth = 22; g.stroke(); if (inkName === 'malam') { g.strokeStyle = C.line; g.lineWidth = 2; g.stroke(); }
  if (stem < 1 || br <= 0) { g.restore(); return; }
  // the fan: branch i at angle a_i from upright; it leaves the joint steeply, elbows, and carries its bud along a_i
  var mid = (n - 1) / 2, ranks = Math.ceil(mid) + 1;
  for (var i = 0; i < n; i++) {
    var t = n > 1 ? (i - mid) / mid : 0, a = t * spread + (o.sway || 0) + (o.swayEach ? o.swayEach(i) : 0), rank = Math.abs(i - mid);
    var reach = (405 - Math.abs(t) * 50) - 133, gb = clamp01(br * ranks - rank * .8);
    if (gb <= 0) continue;
    var r = reach * gb, ex = jx + Math.sin(a * .45) * r * .45, ey = CG.joint[1] - Math.cos(a * .45) * r * .45, bx = jx + Math.sin(a) * r, by = CG.joint[1] - Math.cos(a) * r;
    g.beginPath(); g.moveTo(jx, CG.joint[1]); g.lineTo(ex, ey); g.lineTo(bx, by); g.strokeStyle = C.branch; g.lineWidth = 10; g.stroke();
    var gu = clamp01(bd * ranks - rank) * (gb >= 1 ? 1 : 0), st = o.budStyle ? o.budStyle(i) : {}; if (gu <= 0 || st.hidden) continue; // hidden: the bud has been picked
    g.save(); g.translate(bx, by); g.rotate(a); g.scale(.3 + .7 * gu, .3 + .7 * gu); budAt(g, C, Object.assign({ open: (o.open == null ? 1 : o.open) * gu }, st)); g.restore();
  }
  g.restore();
}

// where bud i of a sprig drawn with the same (x, y, h, o) has its head, and its angle: for a scene that picks it
function cengkehBudPos(x, y, h, i, o) {
  o = o || {}; var s = h / 1024, n = o.n || 5, mid = (n - 1) / 2, spread = (o.spread == null ? CG.spread : o.spread) * Math.PI / 180;
  var t = n > 1 ? (i - mid) / mid : 0, a = t * spread + (o.sway || 0) + (o.swayEach ? o.swayEach(i) : 0), r = (405 - Math.abs(t) * 50) - 133 + 133;
  return { x: x + (CG.joint[0] - CG.base[0] + Math.sin(a) * r) * s, y: y + (CG.joint[1] - CG.base[1] - Math.cos(a) * r) * s, a: a, s: s };
}

export { CENGKEH_INKS, cengkehSprig, cengkehBud, cengkehBudPos };
