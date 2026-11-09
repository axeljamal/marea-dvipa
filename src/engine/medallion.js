// Dua Pulau medallion: our emblem, drawn in code so its rings can be built, counted, turned and lit.
// From the centre out: a Bomba rose heart (drawn by the caller, so the rose keeps one master), a dark disc, 13 rebung rays
// with two chevrons each, a ring of 55 cecek dots, and 21 leaves alternating dark and teal. Every count is a Fibonacci number.
// Geometry is in the master drawing's units (public/motifs/dua-pulau-medallion*.png, 1024 px, centre 512): R = 500 at the leaf tips.
var MEDALLION_INKS = {
  'dua-pulau': { leafA: '#1E4157', leafB: '#4F7580', line: '#02213D', vein: '#D1B285', dot: '#D1B285', ray: '#C39B65', chevron: '#02213D', disc: '#1E4157', discLine: '#02213D' },
  'buya-bomba': { leafA: '#1B1712', leafB: '#6B5A35', line: '#0E0C09', vein: '#E0C27E', dot: '#E0C27E', ray: '#C9A35A', chevron: '#0E0C09', disc: '#1B1712', discLine: '#0E0C09' },
  // night: for black grounds, where the dark leaves and the disc would vanish: the same colours with gold outlines
  'malam': { leafA: '#2A241B', leafB: '#6B5A35', line: '#C9A35A', vein: '#E0C27E', dot: '#E0C27E', ray: '#C9A35A', chevron: '#0E0C09', disc: '#1B1712', discLine: '#C9A35A' }
};
var MEDALLION = { counts: { rays: 13, dots: 55, leaves: 21 }, r: { heart: 195, disc: 225, rayIn: 205, rayOut: 355, dots: 375, leaves: 450 } };
function c01(v) { return Math.max(0, Math.min(1, v)); }
// o.show: { heart, disc, rays, dots, leaves } each 0..1 (a ring grows its elements in order round the circle)
// o.counts: { rays, dots, leaves } · o.rot: { rays, dots, leaves } radians · o.light: { rays, dots, leaves } fn(i) -> 0..1 glow
// o.heart(g, cx, cy, r, show): draws the heart · o.alpha · o.lw: outline width in master units
function medallion(g, cx, cy, R, inkName, o) {
  o = o || {}; var C = MEDALLION_INKS[inkName] || MEDALLION_INKS['dua-pulau'], s = R / 500, M = MEDALLION.r;
  var sh = Object.assign({ heart: 1, disc: 1, rays: 1, dots: 1, leaves: 1 }, o.show || {}), N = Object.assign({}, MEDALLION.counts, o.counts || {}), rot = o.rot || {}, li = o.light || {};
  var lw = (o.lw || 3.5);
  g.save(); g.globalAlpha *= o.alpha == null ? 1 : o.alpha; g.translate(cx, cy); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  function shown(p, i, n) { return c01(p * n - i); } // element i of n appears as the ring's progress passes it
  // leaves
  for (var i = 0; i < N.leaves; i++) {
    var p = shown(sh.leaves, i, N.leaves); if (p <= 0) continue; var a = (rot.leaves || 0) + i * Math.PI * 2 / N.leaves, L = li.leaves ? li.leaves(i) : 0;
    g.save(); g.rotate(a); g.translate(0, -M.leaves); g.rotate(i % 2 ? -.3 : .3); g.scale(p * (1 + L * .12), p * (1 + L * .12));
    g.beginPath(); g.moveTo(0, -54); g.bezierCurveTo(48, -30, 48, 34, 0, 54); g.bezierCurveTo(-48, 34, -48, -30, 0, -54); g.closePath();
    g.fillStyle = i % 2 ? C.leafB : C.leafA; g.fill(); g.strokeStyle = C.line; g.lineWidth = lw; g.stroke();
    g.beginPath(); g.moveTo(0, -42); g.lineTo(0, 42); g.strokeStyle = C.vein; g.lineWidth = lw; g.stroke();
    g.beginPath(); g.arc(0, 0, 8 + L * 4, 0, Math.PI * 2); g.fillStyle = C.vein; g.fill();
    g.restore();
  }
  // cecek ring
  for (var d = 0; d < N.dots; d++) {
    var pd = shown(sh.dots, d, N.dots); if (pd <= 0) continue; var ad = (rot.dots || 0) + d * Math.PI * 2 / N.dots, Ld = li.dots ? li.dots(d) : 0;
    g.beginPath(); g.arc(Math.sin(ad) * M.dots, -Math.cos(ad) * M.dots, (6.5 + Ld * 5) * pd, 0, Math.PI * 2); g.fillStyle = C.dot; g.fill();
  }
  // rays, each a rebung: a gold triangle with two chevrons pointing out
  var half = Math.PI / N.rays * .98;
  for (var r = 0; r < N.rays; r++) {
    var pr = shown(sh.rays, r, N.rays); if (pr <= 0) continue; var ar = (rot.rays || 0) + r * Math.PI * 2 / N.rays, Lr = li.rays ? li.rays(r) : 0, tip = M.rayIn + (M.rayOut - M.rayIn) * pr * (1 + Lr * .08);
    g.save(); g.rotate(ar);
    g.beginPath(); g.moveTo(Math.sin(-half) * M.rayIn, -Math.cos(-half) * M.rayIn); g.lineTo(0, -tip); g.lineTo(Math.sin(half) * M.rayIn, -Math.cos(half) * M.rayIn); g.closePath();
    g.fillStyle = C.ray; g.fill(); g.strokeStyle = C.line === '#C9A35A' ? '#0E0C09' : C.line; g.lineWidth = lw; g.stroke();
    if (Lr > .02) { g.globalAlpha *= Lr * .5; g.fillStyle = '#FFF0C8'; g.fill(); g.globalAlpha /= Lr * .5; }
    if (pr >= 1) [[268, 26], [306, 16]].forEach(function (cv) { g.beginPath(); g.moveTo(-cv[1], -cv[0] + cv[1] * .55); g.lineTo(0, -cv[0] - cv[1] * .2); g.lineTo(cv[1], -cv[0] + cv[1] * .55); g.strokeStyle = C.chevron; g.lineWidth = lw * 1.1; g.stroke(); });
    g.restore();
  }
  // disc
  if (sh.disc > 0) { g.beginPath(); g.arc(0, 0, M.disc * (.6 + .4 * c01(sh.disc)), 0, Math.PI * 2); g.globalAlpha *= c01(sh.disc * 1.5); g.fillStyle = C.disc; g.fill(); g.strokeStyle = C.discLine; g.lineWidth = lw; g.stroke(); g.globalAlpha /= c01(sh.disc * 1.5) || 1; }
  g.restore();
  // heart, in canvas units
  if (o.heart && sh.heart > 0) { g.save(); g.globalAlpha *= o.alpha == null ? 1 : o.alpha; o.heart(g, cx, cy, M.heart * s, sh.heart); g.restore(); }
}
// the centre of element i of a ring, in canvas units (for glows and labels)
function medallionAt(cx, cy, R, ring, i, o) {
  o = o || {}; var s = R / 500, N = Object.assign({}, MEDALLION.counts, o.counts || {}), rot = (o.rot || {})[ring] || 0, rad = ring === 'rays' ? (MEDALLION.r.rayIn + MEDALLION.r.rayOut) / 2 : MEDALLION.r[ring];
  var a = rot + i * Math.PI * 2 / N[ring]; return { x: cx + Math.sin(a) * rad * s, y: cy - Math.cos(a) * rad * s };
}

export { MEDALLION_INKS, MEDALLION, medallion, medallionAt };
