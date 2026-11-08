// Ketupat lattice: the Dua Pulau nested-diamond lattice, drawn in code so it can be tiled, scaled and animated.
// One diamond: four sides waisted at the corners, three nested tones and a dark heart. Diamonds sit on a centred grid
// (the middle of each tile and its corners); a cecek cross of four pearl dots marks every point where four diamonds meet.
// Proportions are taken from the master drawing (public/motifs/ketupat-lattice*.png, 1024 px tile).
var KETUPAT_INKS = {
  'buya-bomba': { rings: ['#C9A35A', '#1B1712', '#E0C27E'], line: '#0E0C09', heart: '#0E0C09', cecek: '#F3E3B5', cecekHeart: '#9C7A3C' },
  'dua-pulau': { rings: ['#C39B65', '#1E4157', '#D1B285'], line: '#02213D', heart: '#02213D', cecek: '#FAF7F2', cecekHeart: '#A88860' }
};
var KETUPAT_R = 0.38;               // outer half-diagonal as a share of the tile
var KETUPAT_RINGS = [1, 0.654, 0.333]; // ring half-diagonals as a share of the outer one
var KETUPAT_HEART = 0.09;           // heart radius as a share of the outer half-diagonal

// the outline: n points per side, starting at the top vertex, clockwise. Each side runs nearly straight and pinches
// in a little near its corners, which gives the drawing its hand-cut look. With the default n = 7, ketupatPath's
// smoothing rounds each vertex the way the master drawing does; pass a larger n for a dense polyline to trace.
function ketupatPts(cx, cy, r, n) {
  n = n || 7; var V = [[0, -1], [1, 0], [0, 1], [-1, 0]], pts = [];
  for (var s = 0; s < 4; s++) {
    var a = V[s], b = V[(s + 1) % 4], nx = (a[0] + b[0]) / Math.SQRT2, ny = (a[1] + b[1]) / Math.SQRT2;
    for (var i = 0; i < n; i++) {
      var u = i / n, w = 0.01 * Math.sin(Math.PI * u) - 0.022 * Math.sin(3 * Math.PI * u);
      pts.push([cx + r * (a[0] + (b[0] - a[0]) * u + nx * w), cy + r * (a[1] + (b[1] - a[1]) * u + ny * w)]);
    }
  }
  return pts;
}
// a closed smooth path through the outline (midpoint quadratics round the four vertices a little)
function ketupatPath(g, pts) {
  var n = pts.length; function mid(p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
  var m = mid(pts[n - 1], pts[0]); g.beginPath(); g.moveTo(m[0], m[1]);
  for (var i = 0; i < n; i++) { var q = mid(pts[i], pts[(i + 1) % n]); g.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
  g.closePath();
}
// one diamond. o.rings: how many rings show (0..3, fractional grows the next one in); o.heart: 0..1;
// o.swell: [outer, middle, inner] extra scale per ring (for breathing); o.alpha; o.line: outline width
function ketupatDiamond(g, cx, cy, r, inkName, o) {
  o = o || {}; var C = KETUPAT_INKS[inkName] || KETUPAT_INKS['buya-bomba'];
  var shown = o.rings == null ? 3 : o.rings, sw = o.swell || [0, 0, 0], lw = o.line != null ? o.line : Math.max(0.8, r * 0.026);
  var base = g.globalAlpha * (o.alpha == null ? 1 : o.alpha); if (base <= 0 || r <= 0) return;
  g.save(); g.lineJoin = 'round';
  for (var k = 0; k < 3; k++) {
    var p = Math.max(0, Math.min(1, shown - k)); if (p <= 0) break;
    var rk = r * KETUPAT_RINGS[k] * (1 + (sw[k] || 0)) * (0.55 + 0.45 * p);
    g.globalAlpha = base * Math.min(1, p * 1.6);
    ketupatPath(g, ketupatPts(cx, cy, rk)); g.fillStyle = C.rings[k]; g.fill();
    g.strokeStyle = C.line; g.lineWidth = k ? lw * 0.55 : lw; g.stroke();
  }
  var h = o.heart == null ? (shown >= 3 ? 1 : 0) : o.heart;
  if (h > 0) { g.globalAlpha = base; g.fillStyle = C.heart; g.beginPath(); g.arc(cx, cy, r * KETUPAT_HEART * h * (1 + (sw[2] || 0)), 0, Math.PI * 2); g.fill(); }
  g.restore();
}
// a cecek cross for a tile of size P: four pearl dots round a darker heart dot. o.alpha, o.swell (dot scale)
function ketupatCross(g, x, y, P, inkName, o) {
  o = o || {}; var C = KETUPAT_INKS[inkName] || KETUPAT_INKS['buya-bomba'], a = o.alpha == null ? 1 : o.alpha; if (a <= 0) return;
  var r = P * 0.0176 * (1 + (o.swell || 0)), d = P * 0.056;
  g.save(); g.globalAlpha *= a;
  g.fillStyle = C.cecek; [[0, -d], [d, 0], [0, d], [-d, 0]].forEach(function (q) { g.beginPath(); g.arc(x + q[0], y + q[1], r, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = C.cecekHeart; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.restore();
}
// the lattice over a rectangle, tile size P. Grid points (i, j) step by P/2; i + j even is a diamond, odd is a cross.
// o.ox, o.oy: offset (drift); o.each(i, j, cx, cy) -> options for that diamond, or null to skip it;
// o.cross(i, j, x, y) -> options for that cross, or null; o.after(i, j, cx, cy) draws on top of a diamond
function ketupatField(g, x0, y0, w, h, P, inkName, o) {
  o = o || {}; var half = P / 2, r = P * KETUPAT_R, ox = ((o.ox || 0) % P + P) % P, oy = ((o.oy || 0) % P + P) % P;
  var i0 = -2, i1 = Math.ceil(w / half) + 2, j0 = -2, j1 = Math.ceil(h / half) + 2;
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  var crosses = [];
  for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
    var x = x0 + ox + i * half - P, y = y0 + oy + j * half - P; // shift by a whole tile so offsets never leave a gap
    if (x < x0 - r * 1.2 || x > x0 + w + r * 1.2 || y < y0 - r * 1.2 || y > y0 + h + r * 1.2) continue;
    if ((i + j) % 2 === 0) { var opt = o.each ? o.each(i, j, x, y) : {}; if (opt) { ketupatDiamond(g, x, y, r, inkName, opt); if (o.after) o.after(i, j, x, y, opt); } }
    else crosses.push([i, j, x, y]);
  }
  crosses.forEach(function (c) { var co = o.cross ? o.cross(c[0], c[1], c[2], c[3]) : {}; if (co) ketupatCross(g, c[2], c[3], P, inkName, co); });
  g.restore();
}

export { KETUPAT_INKS, KETUPAT_R, KETUPAT_RINGS, KETUPAT_HEART, ketupatPts, ketupatPath, ketupatDiamond, ketupatCross, ketupatField };
