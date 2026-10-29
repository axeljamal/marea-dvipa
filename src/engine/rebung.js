// Ported to an ES module from the published Batik Pattern Studio (contract 0.2.91). Logic unchanged.

// Rebung ribbon: draws the Dua Pulau rebung band continuously along any path.
// Two rows of bamboo shoots grow from the band edges toward a zigzag spine, each shoot bending with the curve.
var REBUNG_INKS = {
  'dua-pulau': { shoot: '#C39B65', shootLight: '#D1B285', line: '#02213D', chevron: '#02213D', spine: '#D1B285', dot: '#FAF7F2', edge: '#1E4157' },
  'buya-bomba': { shoot: '#C9A35A', shootLight: '#E0C27E', line: '#0E0C09', chevron: '#0E0C09', spine: '#E0C27E', dot: '#F3E3B5', edge: '#2A241B' }
};

function polyFromPath(d, step) {
  // sample an SVG path string into a dense polyline (browser only)
  var NS = 'http://www.w3.org/2000/svg';
  var svg = polyFromPath._svg || (polyFromPath._svg = (function () {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0');
    s.style.position = 'absolute'; s.style.visibility = 'hidden'; document.body.appendChild(s); return s;
  })());
  var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); svg.appendChild(p);
  var L = p.getTotalLength(), pts = [];
  // a path may contain several subpaths (M ... M ...): break where consecutive samples jump
  for (var s = 0; s <= L; s += step) { var q = p.getPointAtLength(s); pts.push([q.x, q.y]); }
  svg.removeChild(p);
  var runs = [[]];
  for (var i = 0; i < pts.length; i++) {
    var cur = runs[runs.length - 1];
    if (cur.length && Math.hypot(pts[i][0] - cur[cur.length - 1][0], pts[i][1] - cur[cur.length - 1][1]) > step * 3) runs.push([]);
    runs[runs.length - 1].push(pts[i]);
  }
  return runs.filter(function (r) { return r.length > 3; });
}

function Track(pts) {
  var cum = [0];
  for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  this.pts = pts; this.cum = cum; this.len = cum[cum.length - 1];
}
Track.prototype.at = function (s) {
  var c = this.cum, p = this.pts;
  s = Math.max(0, Math.min(this.len, s));
  var lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  var t = (s - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
  var x = p[lo][0] + (p[hi][0] - p[lo][0]) * t, y = p[lo][1] + (p[hi][1] - p[lo][1]) * t;
  // smoothed tangent over a short window
  var a = this._raw(Math.max(0, s - 4)), b = this._raw(Math.min(this.len, s + 4));
  var tx = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tx, ty) || 1;
  tx /= n; ty /= n;
  return { x: x, y: y, tx: tx, ty: ty, nx: -ty, ny: tx };
};
Track.prototype._raw = function (s) {
  var c = this.cum, p = this.pts, lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  var t = (s - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
  return [p[lo][0] + (p[hi][0] - p[lo][0]) * t, p[lo][1] + (p[hi][1] - p[lo][1]) * t];
};
// turning angle over a window: used to skip shoots where the curve is too tight for the band
Track.prototype.bend = function (s, w) {
  var a = this.at(s - w), b = this.at(s + w);
  return Math.acos(Math.max(-1, Math.min(1, a.tx * b.tx + a.ty * b.ty)));
};

function f1(v) { return v.toFixed(1); }
function polyD(pts, close) {
  if (!pts.length) return '';
  var d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
  for (var i = 1; i < pts.length; i++) d += 'L' + f1(pts[i][0]) + ' ' + f1(pts[i][1]);
  return d + (close ? 'Z' : '');
}

// Build the ribbon for one polyline. h = half-height of the band in px.
function rebungRibbon(pts, h, inkName, phase) {
  var C = REBUNG_INKS[inkName] || REBUNG_INKS['dua-pulau'];
  var T = new Track(pts), out = [];
  if (T.len < h * 2) return out;
  var spacing = h * 1.25, edge = h * 0.16, L = h * 0.86, w = spacing * 0.92;
  var maxBend = 0.75;
  function map(s0, u, v, side) { // local (u along, v from edge toward spine) -> world
    var f = T.at(s0 + u), off = side * (h - v);
    return [f.x + f.nx * off, f.y + f.ny * off];
  }
  // edge bands (offset ribbons) on both sides, broken where the curve is too tight
  [1, -1].forEach(function (side) {
    var seg = [];
    function flush() {
      if (seg.length > 2) {
        var outer = seg.map(function (q) { return [q.x + q.nx * side * (h + edge), q.y + q.ny * side * (h + edge)]; });
        var inner = seg.map(function (q) { return [q.x + q.nx * side * h, q.y + q.ny * side * h]; }).reverse();
        out.push({ d: polyD(outer.concat(inner), true), fill: C.edge });
      }
      seg = [];
    }
    for (var s = 0; s <= T.len; s += 3) { if (T.bend(s, h) > maxBend) { flush(); continue; } seg.push(T.at(s)); }
    flush();
  });
  // shoots: top row at k*spacing, bottom row offset half a step, both pointing to the spine
  var shape = [[-0.5, 0], [-0.43, 0.2], [-0.36, 0.4], [-0.24, 0.62], [-0.12, 0.82], [0, 1], [0.12, 0.82], [0.24, 0.62], [0.36, 0.4], [0.43, 0.2], [0.5, 0]];
  var start = (phase || 0) % spacing;
  [1, -1].forEach(function (side, row) {
    for (var s0 = start + (row ? spacing / 2 : 0); s0 <= T.len; s0 += spacing) {
      if (s0 - w / 2 < 0 || s0 + w / 2 > T.len || T.bend(s0, w) > maxBend) continue;
      var poly = shape.map(function (q) { return map(s0, q[0] * w, q[1] * L, side); });
      out.push({ d: polyD(poly, true), fill: C.shoot, stroke: C.line, sw: Math.max(0.8, h * 0.05) });
      // highlight sheath and nested chevrons
      var hi = [[-0.22, 0.18], [0, 0.66], [0.22, 0.18]].map(function (q) { return map(s0, q[0] * w, q[1] * L, side); });
      out.push({ d: polyD(hi, true), fill: C.shootLight });
      [0.28, 0.5, 0.72].forEach(function (fv) {
        var ww = 0.5 * (1 - fv) * 0.92 * w;
        var ch = [[-ww, fv * L - 0.06 * L], [0, fv * L + 0.06 * L], [ww, fv * L - 0.06 * L]].map(function (q) { return map(s0, q[0], q[1], side); });
        out.push({ d: polyD(ch, false), stroke: C.chevron, sw: Math.max(0.7, h * 0.055) });
      });
      var dp = map(s0, 0, L * 0.12, side);
      out.push({ dot: dp, r: Math.max(1, h * 0.05), fill: C.dot });
    }
  });
  // spine: a zigzag that follows the curve, with cecek dots alternating either side
  var zz = [], k = 0;
  for (var s = 0; s <= T.len; s += spacing / 2, k++) {
    if (T.bend(s, h) > maxBend) { if (zz.length > 1) out.push({ d: polyD(zz, false), stroke: C.spine, sw: Math.max(0.9, h * 0.08) }); zz = []; continue; }
    var f = T.at(s), o = (k % 2 ? 1 : -1) * h * 0.11;
    zz.push([f.x + f.nx * o, f.y + f.ny * o]);
    var od = (k % 2 ? -1 : 1) * h * 0.2;
    out.push({ dot: [f.x + f.nx * od, f.y + f.ny * od], r: Math.max(0.8, h * 0.045), fill: C.dot });
  }
  if (zz.length > 1) out.push({ d: polyD(zz, false), stroke: C.spine, sw: Math.max(0.9, h * 0.08) });
  return out;
}

// draw shapes into an SVG element or a canvas context
function rebungToSvg(svg, shapes) {
  var NS = 'http://www.w3.org/2000/svg';
  shapes.forEach(function (s) {
    var el;
    if (s.dot) { el = document.createElementNS(NS, 'circle'); el.setAttribute('cx', f1(s.dot[0])); el.setAttribute('cy', f1(s.dot[1])); el.setAttribute('r', f1(s.r)); el.setAttribute('fill', s.fill); }
    else {
      el = document.createElementNS(NS, 'path'); el.setAttribute('d', s.d);
      el.setAttribute('fill', s.fill || 'none');
      if (s.stroke) { el.setAttribute('stroke', s.stroke); el.setAttribute('stroke-width', f1(s.sw)); el.setAttribute('stroke-linejoin', 'round'); el.setAttribute('stroke-linecap', 'round'); }
    }
    svg.appendChild(el);
  });
}
function rebungToCanvas(g, shapes) {
  shapes.forEach(function (s) {
    if (s.dot) { g.fillStyle = s.fill; g.beginPath(); g.arc(s.dot[0], s.dot[1], s.r, 0, Math.PI * 2); g.fill(); return; }
    var p = new Path2D(s.d);
    if (s.fill) { g.fillStyle = s.fill; g.fill(p); }
    if (s.stroke) { g.strokeStyle = s.stroke; g.lineWidth = s.sw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(p); }
  });
}


export { REBUNG_INKS, polyFromPath, rebungRibbon, rebungToSvg, rebungToCanvas };
