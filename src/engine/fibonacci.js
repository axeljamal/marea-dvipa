// Ported to an ES module from the published Batik Pattern Studio (contract 0.2.91). Logic unchanged.
import { AR, placeLayout } from './layouts.js';

// Fibonacci flows & abstracts for Bali Batik Motifs. Deterministic: the same options + seed always give the same pattern.
var PHI = (1 + Math.sqrt(5)) / 2;
var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // 137.508 degrees
var FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
var FIB_COUNTS = [13, 21, 34, 55, 89];

function seeded(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// motif ladder from heaviest to lightest
function ladder(o) {
  return o.ladder || [o.hero, o.crown, 'lotus-floral-motif', 'lotus-flower', 'wave-cloud-ornament', 'scroll-ornament', 'lotus-bud', 'lotus-bud'];
}
// index -> Fibonacci tier: tier t holds F(t) items (1, 1, 2, 3, 5, 8, 13 ...)
function fibTier(i) { var t = 0, acc = 1; while (i >= acc && t < 7) { t++; acc += FIB[t]; } return t; }
function jitter(R, amt) { return (R() - 0.5) * 2 * amt; }
function deg(rad) { return rad * 180 / Math.PI; }
function smoothPath(pts) {
  if (pts.length < 2) return '';
  var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  return d;
}
function item(m, cx, cy, w, rot, flip) { return { m: m, cx: cx, cy: cy, w: w, rot: rot || 0, flip: !!flip }; }

var GENERATORS = {
  // 1. Vogel phyllotaxis: golden angle + square-root radius, Fibonacci size tiers, 8/13 parastichies
  'fibonacci-bloom': {
    title: 'Fibonacci Bloom',
    note: 'A sunflower head of motifs: the barong at the heart, every motif after it turned by the golden angle.',
    rule: function (o) { return 'Each motif turns 137.5° (the golden angle) from the last and sits at radius ∝ √n. Sizes step down through Fibonacci tiers 1·1·2·3·5·8·13 by a factor of φ. Linework traces the 8 and 13 parastichy spirals a sunflower shows. ' + o.count + ' motifs.'; },
    make: function (o, vw, vh, R) {
      var a = o.articulation, n = o.count, cx = vw / 2 + jitter(R, a * vw * 0.06), cy = vh / 2 + jitter(R, a * vh * 0.06);
      var mot = ladder(o), heroW = Math.min(vw, vh) * 0.27 * o.scale;
      var heroR = heroW * 0.62, maxR = Math.hypot(vw, vh) / 2 * 1.04;
      var c = (maxR - heroR) / Math.sqrt(n);
      var pts = [], items = [item(o.hero, cx, cy, heroW * (1 + jitter(R, a * 0.1)), 0, false)];
      pts.push([cx, cy]);
      for (var i = 1; i < n; i++) {
        var t = Math.max(1, fibTier(i));
        var th = i * GOLDEN_ANGLE * (1 + jitter(R, a * 0.012)) + jitter(R, a * 0.22);
        var r = heroR + c * Math.sqrt(i) * (1 + jitter(R, a * 0.16));
        var x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
        pts.push([x, y]);
        var w = c * 1.45 * Math.pow(PHI, Math.max(0, 4 - t) * 0.3) * o.scale * (1 + jitter(R, a * 0.3));
        var rot = o.orient === 'flow' ? deg(th) + 90 : 0;
        rot += jitter(R, a * 25);
        items.push(item(mot[Math.min(t, mot.length - 1)], x, y, w, rot, a > 0.45 && R() < a * 0.5));
      }
      var lines = [];
      [8, 13].forEach(function (step, si) {
        for (var k = 1; k <= step; k++) {
          var chain = [];
          for (var j = k; j < pts.length; j += step) chain.push(pts[j]);
          if (chain.length > 2) lines.push({ d: smoothPath(chain), w: si ? 1.1 : 1.6, o: si ? 0.45 : 0.6 });
        }
      });
      return { items: items, lines: lines };
    }
  },
  // 2. Golden rectangles: square + remainder, quarter-arc golden spiral, motif size = square size
  'golden-section': {
    title: 'Golden Section',
    note: 'Golden rectangles split into squares, one motif per square, a golden spiral sweeping through them.',
    rule: function (o) { return 'Each panel is a 1 : φ rectangle, cut into a square and a smaller golden rectangle again and again. Squares shrink by φ (side lengths follow 89·55·34·21·13·8·5…), each holding a motif sized to fit, joined by the quarter-circle golden spiral. Strict articulation shows the construction lines.'; },
    make: function (o, vw, vh, R) {
      var a = o.articulation, depth = { 13: 5, 21: 6, 34: 7, 55: 8, 89: 9 }[o.count] || 7;
      var H = Math.max(140, Math.min(vh, vw / PHI) * 0.62 * o.scale), W = H * PHI;
      var cols = Math.ceil(vw / W) + 1, rows = Math.ceil(vh / H) + 1;
      var ox = (vw - Math.ceil(vw / W) * W) / 2, oy = (vh - Math.ceil(vh / H) * H) / 2;
      var mot = ladder(o), items = [], lines = [];
      var seq = ['L', 'T', 'R', 'B'];
      for (var j = -1; j < rows; j++) for (var i = -1; i < cols; i++) {
        var x0 = ox + i * W, y0 = oy + j * H;
        if (x0 > vw || y0 > vh || x0 + W < 0 || y0 + H < 0) continue;
        var mirror = (i + j) % 2 !== 0, turn = a > 0.5 && R() < (a - 0.5) * 1.2;
        var tx = function (x, wv) { return mirror ? x0 + W - (x - x0) - (wv || 0) : x; };
        var x = x0, y = y0, w = W, h = H, arc = '', sq = '';
        for (var d = 0; d < depth; d++) {
          var dir = seq[d % 4], s = Math.min(w, h), sx, sy, ax, ay, ex, ey;
          if (dir === 'L') { sx = x; sy = y; x += s; w -= s; ax = sx; ay = sy + s; ex = sx + s; ey = sy; }
          else if (dir === 'T') { sx = x; sy = y; y += s; h -= s; ax = sx; ay = sy; ex = sx + s; ey = sy + s; }
          else if (dir === 'R') { sx = x + w - s; sy = y; w -= s; ax = sx + s; ay = sy; ex = sx; ey = sy + s; }
          else { sx = x; sy = y + h - s; h -= s; ax = sx + s; ay = sy + s; ex = sx; ey = sy; }
          var m = mot[Math.min(d, mot.length - 1)], fit = s * 0.8 * o.motifFit;
          var mw = Math.min(fit, fit / AR[m]) * (1 + jitter(R, a * 0.25));
          var ccx = tx(sx + s / 2), ccy = sy + s / 2;
          // expressive: drift motifs toward the spiral arc
          ccx += jitter(R, a * s * 0.12); ccy += jitter(R, a * s * 0.12);
          var rot = o.orient === 'flow' ? (mirror ? -1 : 1) * d * 90 : 0;
          if (turn) rot += 180;
          rot += jitter(R, a * 20);
          items.push(item(m, ccx, ccy, mw, rot, mirror));
          var sweep = mirror ? 0 : 1;
          arc += (d === 0 ? 'M' + tx(ax).toFixed(1) + ' ' + ay.toFixed(1) : '') + 'A' + s.toFixed(1) + ' ' + s.toFixed(1) + ' 0 0 ' + sweep + ' ' + tx(ex).toFixed(1) + ' ' + ey.toFixed(1);
          if (a < 0.5) sq += 'M' + tx(sx, s).toFixed(1) + ' ' + sy.toFixed(1) + 'h' + s.toFixed(1) + 'v' + s.toFixed(1) + 'h' + (-s).toFixed(1) + 'Z';
        }
        lines.push({ d: arc, w: 2, o: 0.75 });
        if (sq) lines.push({ d: sq, w: 0.8, o: 0.35 * (1 - a * 2) });
        if (a < 0.5) lines.push({ d: 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'h' + W.toFixed(1) + 'v' + H.toFixed(1) + 'h' + (-W).toFixed(1) + 'Z', w: 1, o: 0.4 });
      }
      return { items: items, lines: lines };
    }
  },
  // 3. Flowing rows: sine currents, phase shifted by the golden angle, Fibonacci swell of motif sizes
  'fibonacci-river': {
    title: 'Fibonacci River',
    note: 'Currents of motifs that swell and ebb like a wave set: bud, scroll, lotus, barong, lotus, scroll, bud.',
    rule: function (o) { return 'Each current is a sine wave with wavelength 2φ × its row height; every row is phase-shifted by the golden angle so crests never line up. Along the current, motif sizes swell through the Fibonacci run 1·2·3·5·3·2·1, spaced by their own size. Follow-the-flow turns each motif along the current.'; },
    make: function (o, vw, vh, R) {
      var a = o.articulation, rowsN = { 13: 2, 21: 3, 34: 4, 55: 5, 89: 6 }[o.count] || 4;
      var Hr = vh / rowsN, lambda = Hr * 2 * PHI, unit = Hr * 0.13 * o.scale;
      var swell = [1, 2, 3, 5, 3, 2, 1];
      var pick = { 1: 'lotus-bud', 2: 'scroll-ornament', 3: null, 5: null };
      var items = [], lines = [], heroToggle = 0;
      for (var j = -1; j <= rowsN; j++) {
        var y0 = (j + 0.5) * Hr, phase = j * GOLDEN_ANGLE + jitter(R, a * 0.6);
        var A = Hr * 0.26 * (1 + jitter(R, a * 0.45));
        var f = function (x) { return y0 + A * Math.sin(2 * Math.PI * x / lambda + phase); };
        var fp = function (x) { return A * 2 * Math.PI / lambda * Math.cos(2 * Math.PI * x / lambda + phase); };
        var pts = []; for (var px = -40; px <= vw + 40; px += 16) pts.push([px, f(px)]);
        lines.push({ d: smoothPath(pts), w: 1.8, o: 0.7 });
        if (a > 0.35) { var p2 = pts.map(function (p) { return [p[0], p[1] + Hr * 0.06]; }); lines.push({ d: smoothPath(p2), w: 0.9, o: 0.4 }); }
        var x = -unit * 3 + (j % 2) * unit * 2.5 + jitter(R, a * unit * 2), k = (j * 3) & 7;
        while (x < vw + unit * 6) {
          var fib = swell[k % swell.length]; k++;
          var m = pick[fib];
          if (fib === 3) m = (k % 2) ? 'lotus-flower' : 'lotus-floral-motif';
          if (fib === 5) { m = heroToggle % 2 ? o.crown : o.hero; heroToggle++; }
          var w = unit * fib * (fib === 5 ? 1.15 : 1) * (1 + jitter(R, a * 0.25));
          var cx = x + w / 2, cy = f(cx) + jitter(R, a * Hr * 0.06);
          var rot = o.orient === 'flow' ? deg(Math.atan(fp(cx))) : 0;
          rot += jitter(R, a * 15);
          items.push(item(m, cx, cy, w, rot, a > 0.5 && fib < 3 && R() < 0.5));
          if (a > 0.6 && fib === 5 && R() < a) items.push(item('wave-cloud-ornament', cx + w * 0.7, f(cx + w * 0.7) + Hr * 0.3, unit * 2.5, rot, R() < 0.5));
          x += w * 0.92 + unit * 0.6;
        }
      }
      return { items: items, lines: lines };
    }
  },
  // 4. Logarithmic golden spiral arms: radius x phi every quarter turn, Fibonacci number of arms
  'golden-spiral': {
    title: 'Golden Spiral',
    note: 'Motifs riding golden spiral arms out from the centre, growing as the spiral opens.',
    rule: function (o) { var arms = { 13: 1, 21: 2, 34: 3, 55: 5, 89: 8 }[o.count] || 3; return 'Logarithmic spiral r = a·e^(bθ) with b = ln φ ÷ (π/2), so the radius grows by φ every quarter turn. Motif size grows with the radius, so each step is a fixed fraction larger. ' + arms + ' arm' + (arms > 1 ? 's' : '') + ' (a Fibonacci number). Expressive articulation adds counter-spirals.'; },
    make: function (o, vw, vh, R) {
      var a = o.articulation, arms = { 13: 1, 21: 2, 34: 3, 55: 5, 89: 8 }[o.count] || 3;
      var b = Math.log(PHI) / (Math.PI / 2), cx = vw / 2 + jitter(R, a * vw * 0.05), cy = vh / 2 + jitter(R, a * vh * 0.05);
      var maxR = Math.hypot(vw, vh) * 0.62, r0 = 22 * o.scale + 8, mot = ladder(o);
      var items = [], lines = [], wMax = maxR * 0.42 * o.scale;
      var counter = a > 0.55;
      var armList = [];
      for (var k = 0; k < arms; k++) armList.push({ off: k * 2 * Math.PI / arms + jitter(R, a * 0.3), dir: 1 });
      if (counter) for (var k2 = 0; k2 < Math.max(1, Math.round(arms * PHI) - arms); k2++) armList.push({ off: k2 * 2 * Math.PI / arms + Math.PI / arms, dir: -1 });
      armList.forEach(function (arm, ai) {
        var pts = [], th = 0, r = r0;
        while (r < maxR) {
          var ang = arm.dir * th + arm.off;
          pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
          th += 0.12; r = r0 * Math.exp(b * th);
        }
        lines.push({ d: smoothPath(pts), w: arm.dir > 0 ? 1.8 : 1, o: arm.dir > 0 ? 0.7 : 0.45 });
        th = 0.6 + ai * 0.37; r = r0 * Math.exp(b * th);
        var guard = 0;
        while (r < maxR && guard++ < 200) {
          var ang2 = arm.dir * th + arm.off;
          var w = Math.max(24, Math.min(wMax, r * 0.5 * o.scale)) * (arm.dir < 0 ? 0.7 : 1) * (1 + jitter(R, a * 0.3));
          var tier = Math.max(0, Math.min(mot.length - 1, Math.round(Math.log(wMax / w) / Math.log(PHI))));
          var x = cx + r * Math.cos(ang2), y = cy + r * Math.sin(ang2);
          var rot = o.orient === 'flow' ? deg(ang2) + 90 : 0;
          rot += jitter(R, a * 25);
          items.push(item(mot[tier], x, y, w, rot, arm.dir < 0));
          th += (w * 1.05) / (r * Math.sqrt(1 + b * b));
          r = r0 * Math.exp(b * th);
        }
      });
      return { items: items, lines: lines };
    }
  }
};

function placeGenerator(key, o, vw, vh) {
  var G = GENERATORS[key];
  var res = G.make(Object.assign({ motifFit: 1 }, o), vw, vh, seeded(o.seed || 1618));
  var items = res.items.map(function (it) {
    var h = it.w * AR[it.m];
    return { m: it.m, x: it.cx - it.w / 2, y: it.cy - h / 2, w: it.w, h: h, flip: it.flip, rot: it.rot };
  }).filter(function (it) {
    var pad = Math.max(it.w, it.h);
    return it.x + pad > -pad && it.x - pad < vw + pad && it.y + pad > -pad && it.y - pad < vh + pad && it.w > 6;
  });
  return { items: items, lines: res.lines };
}

// directions for the classic repeats
function applyDirection(res, dir, vw, vh, seed, opts) {
  if (!dir || dir === 'upright') return res;
  var R = seeded(seed || 1618);
  if (dir === 'tossed') { res.items.forEach(function (it) { it.rot = (R() - 0.5) * 360; }); return res; }
  if (dir === 'alternate') {
    var oy = (vh / 2) % res.th;
    res.items.forEach(function (it) { var row = Math.floor((it.y + it.h / 2 - oy + 12) / res.th); if (row % 2 !== 0) it.flip = !it.flip; });
    return res;
  }
  if (dir === 'diagonal') {
    var D = Math.ceil(Math.hypot(vw, vh));
    var big = placeLayout(opts, D, D), c = Math.cos(Math.PI / 4), s = Math.sin(Math.PI / 4);
    big.items.forEach(function (it) {
      var mx = it.x + it.w / 2 - D / 2, my = it.y + it.h / 2 - D / 2;
      var nx = vw / 2 + mx * c - my * s, ny = vh / 2 + mx * s + my * c;
      it.x = nx - it.w / 2; it.y = ny - it.h / 2; it.rot = 0;
    });
    big.items = big.items.filter(function (it) { return it.x + it.w > 0 && it.x < vw && it.y + it.h > 0 && it.y < vh; });
    return big;
  }
  return res;
}


export { PHI, GOLDEN_ANGLE, FIB, FIB_COUNTS, seeded, ladder, fibTier, smoothPath, GENERATORS, placeGenerator, applyDirection };
