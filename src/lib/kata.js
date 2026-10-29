// Katagami bridge check: can a motif be cut as one stencil? Ported from the published studio, logic unchanged.
// A one-ink stencil is paper with the ink areas cut away. Paper that ink fully surrounds falls out
// (an island); paper narrower than the minimum land tears; cuts narrower than the minimum close up.
import { KATA_WRAP, KATA_LAND, KATA_CUT, KATA_RES, KATA_COL } from '../data/catalog';
import { NTINA } from '../engine';

export function kataSrc(m) { return 'motifs/' + m + (NTINA.indexOf(m) >= 0 ? '--black' : '') + '.png'; }
const imgs = {};
export function kataImg(m) {
  if (!imgs[m]) imgs[m] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = kataSrc(m); });
  return imgs[m];
}

// grid helpers: a W x H field that may wrap on x and/or y
function Grid(W, H, wx, wy) { this.W = W; this.H = H; this.wx = wx; this.wy = wy; }
Grid.prototype.nb = function (i, dx, dy) { // neighbour index or -1
  var x = i % this.W + dx, y = (i / this.W | 0) + dy;
  if (x < 0 || x >= this.W) { if (!this.wx) return -1; x = (x + this.W) % this.W; }
  if (y < 0 || y >= this.H) { if (!this.wy) return -1; y = (y + this.H) % this.H; }
  return y * this.W + x;
};
var N4 = [[1,0],[-1,0],[0,1],[0,-1]], N8 = N4.concat([[1,1],[1,-1],[-1,1],[-1,-1]]);

function labelComps(G, on, nbs) {
  var n = G.W * G.H, lab = new Int32Array(n).fill(-1), area = [], st = new Int32Array(n);
  for (var i = 0; i < n; i++) {
    if (!on[i] || lab[i] >= 0) continue;
    var id = area.length, sp = 0, a = 0; lab[i] = id; st[sp++] = i;
    while (sp) { var p = st[--sp]; a++; for (var k = 0; k < nbs.length; k++) { var q = G.nb(p, nbs[k][0], nbs[k][1]); if (q >= 0 && on[q] && lab[q] < 0) { lab[q] = id; st[sp++] = q; } } }
    area.push(a);
  }
  return { lab: lab, area: area };
}
// bounded distance (px) from every pixel to the nearest target pixel, by nearest-source propagation
function distTo(G, isT, limit) {
  var n = G.W * G.H, d = new Float32Array(n).fill(limit + 1), ox = new Int16Array(n), oy = new Int16Array(n), seen = new Uint8Array(n), q = new Int32Array(n), qh = 0, qt = 0;
  for (var i = 0; i < n; i++) if (isT[i]) { d[i] = 0; seen[i] = 1; q[qt++] = i; }
  while (qh < qt) {
    var p = q[qh++];
    for (var k = 0; k < 8; k++) {
      var r = G.nb(p, N8[k][0], N8[k][1]); if (r < 0 || seen[r]) continue;
      var ax = ox[p] + N8[k][0], ay = oy[p] + N8[k][1], dd = Math.hypot(ax, ay);
      if (dd > limit + 1) continue;
      seen[r] = 1; ox[r] = ax; oy[r] = ay; d[r] = dd; q[qt++] = r;
    }
  }
  return d;
}

export function kataAnalyse(img, motif, sizeCm, layer) {
  var wrap = KATA_WRAP[motif] || '', wx = wrap.indexOf('x') >= 0, wy = wrap.indexOf('y') >= 0;
  var iw = img.naturalWidth, ih = img.naturalHeight, sc = KATA_RES / Math.max(iw, ih);
  var w = Math.max(8, Math.round(iw * sc)), h = Math.max(8, Math.round(ih * sc));
  var mmpp = sizeCm * 10 / w; // motif width maps to the chosen size
  var landPx = KATA_LAND / mmpp, cutPx = KATA_CUT / mmpp, P = Math.ceil(landPx) + 3;
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  var px = g.getImageData(0, 0, w, h).data;
  var W = w + (wx ? 0 : 2 * P), H = h + (wy ? 0 : 2 * P), offX = wx ? 0 : P, offY = wy ? 0 : P, n = W * H;
  var G = new Grid(W, H, wx, wy), ink = new Uint8Array(n), paper = new Uint8Array(n);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var j = (y * w + x) * 4, a = px[j + 3], R0 = px[j], B0 = px[j + 2], pearl = R0 > 228 && px[j + 1] > 222 && B0 > 212; // pearl keylines stay paper
    var on = a >= 128 && !pearl;
    if (on && layer === 'gold') on = R0 - B0 > 40;
    else if (on && layer === 'blue') on = R0 - B0 <= 40;
    if (on) ink[(y + offY) * W + x + offX] = 1;
  }
  for (var i = 0; i < n; i++) paper[i] = ink[i] ? 0 : 1;

  // 1. paper pieces: the anchor is the sheet itself; any other piece is held only by ink, so it falls out
  var pc = labelComps(G, paper, N4), anchor;
  if (!wx || !wy) anchor = pc.lab[0];
  else { anchor = 0; pc.area.forEach(function (a, k) { if (a > pc.area[anchor]) anchor = k; }); }
  var minPiece = Math.max(3, Math.pow(0.4 / mmpp, 2));
  var islands = [];
  pc.area.forEach(function (a, k) { if (k !== anchor && a >= minPiece) islands.push({ id: k, area: a }); });

  // 2. thin paper: core = paper at least one land width wide; a core piece cut off from the sheet hangs on a thin strand
  var dP = distTo(G, ink, landPx), core = new Uint8Array(n), half = (landPx + 1) / 2;
  for (i = 0; i < n; i++) core[i] = paper[i] && dP[i] >= half ? 1 : 0;
  var cc = labelComps(G, core, N4), mainCore = -1;
  if (!wx || !wy) mainCore = cc.lab[0];
  else { var best = -1; cc.area.forEach(function (a, k) { if (a > best) { best = a; mainCore = k; } }); }
  var thinMark = new Uint8Array(n), thinCount = 0, coreHit = {};
  for (i = 0; i < n; i++) if (cc.lab[i] >= 0) coreHit[pc.lab[i] + ':' + cc.lab[i]] = 1;
  var hanging = {};
  for (i = 0; i < n; i++) { var cl = cc.lab[i]; if (cl >= 0 && cl !== mainCore && pc.lab[i] === anchor && cc.area[cl] >= minPiece) hanging[cl] = 1; }
  var hangIds = Object.keys(hanging).map(Number); thinCount = hangIds.length;
  if (hangIds.length) { // grow each hanging core back out to its full paper piece
    var q = new Int32Array(n), qh = 0, qt = 0, depth = new Int16Array(n), lim = Math.ceil(landPx) + 1;
    for (i = 0; i < n; i++) if (hanging[cc.lab[i]] && pc.lab[i] === anchor) { thinMark[i] = 1; q[qt++] = i; }
    while (qh < qt) { var p = q[qh++]; if (depth[p] >= lim) continue; for (var k = 0; k < 4; k++) { var r = G.nb(p, N4[k][0], N4[k][1]); if (r >= 0 && paper[r] && !thinMark[r] && !core[r]) { thinMark[r] = 1; depth[r] = depth[p] + 1; q[qt++] = r; } } }
  }
  islands.forEach(function (isl) { isl.thin = !Object.keys(coreHit).some(function (key) { return key.indexOf(isl.id + ':') === 0; }); });

  // 3. cuts too fine: an ink piece whose widest point is under the minimum cut closes up
  var dI = distTo(G, paper, cutPx), ic = labelComps(G, ink, N8), icMax = new Float32Array(ic.area.length);
  for (i = 0; i < n; i++) if (ic.lab[i] >= 0 && dI[i] > icMax[ic.lab[i]]) icMax[ic.lab[i]] = dI[i];
  var fine = {}, fineCount = 0;
  icMax.forEach(function (m, k) { if (2 * m - 1 < cutPx) { fine[k] = 1; fineCount++; } });

  // 4. ties: tie the nearest loose piece to the anchored sheet, then treat it as anchored and repeat
  var src = new Uint8Array(n), ties = [], isl = {}, cap = 60;
  for (i = 0; i < n; i++) if (pc.lab[i] === anchor) src[i] = 1;
  islands.forEach(function (s) { isl[s.id] = s; s.sx = 0; s.sy = 0; s.cnt = 0; });
  for (i = 0; i < n; i++) { var s0 = isl[pc.lab[i]]; if (s0) { s0.sx += i % W; s0.sy += (i / W | 0); s0.cnt++; } }
  var pending = islands.slice(0, cap);
  while (pending.length) {
    var dist = new Int32Array(n).fill(-1), ox = new Int16Array(n), oy = new Int16Array(n), qq = new Int32Array(n), h0 = 0, t0 = 0;
    for (i = 0; i < n; i++) if (src[i]) { dist[i] = 0; qq[t0++] = i; }
    while (h0 < t0) { var pp = qq[h0++]; for (var k2 = 0; k2 < 8; k2++) { var rr = G.nb(pp, N8[k2][0], N8[k2][1]); if (rr < 0 || dist[rr] >= 0) continue; dist[rr] = dist[pp] + 1; ox[rr] = ox[pp] + N8[k2][0]; oy[rr] = oy[pp] + N8[k2][1]; qq[t0++] = rr; } }
    var bestI = -1, bestD = 1e9, bestP = -1;
    pending.forEach(function (s, si) { for (var z = 0; z < n; z++) if (pc.lab[z] === s.id && dist[z] >= 0 && dist[z] < bestD) { bestD = dist[z]; bestI = si; bestP = z; } });
    if (bestI < 0) break;
    var S = pending.splice(bestI, 1)[0], cx = S.sx / S.cnt, cy = S.sy / S.cnt;
    var tieAt = function (z) { var x1 = z % W, y1 = z / W | 0; return { x1: x1 - offX, y1: y1 - offY, x2: x1 - ox[z] - offX, y2: y1 - oy[z] - offY, mm: Math.hypot(ox[z], oy[z]) * mmpp }; };
    var t1 = tieAt(bestP); ties.push(t1);
    // a larger piece gets a second tie on the far side, as katagami were held from more than one point
    if (S.area > Math.pow(landPx * 4, 2)) {
      var a1 = Math.atan2(t1.y1 + offY - cy, t1.x1 + offX - cx), best2 = -1, bd2 = 1e9;
      for (var z = 0; z < n; z++) {
        if (pc.lab[z] !== S.id || dist[z] < 0) continue;
        var da = Math.abs(Math.atan2((z / W | 0) - cy, z % W - cx) - a1); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da >= 1.9 && dist[z] < bd2) { bd2 = dist[z]; best2 = z; }
      }
      if (best2 >= 0 && bd2 <= Math.max(2.5 * bestD, bestD + landPx * 6)) ties.push(tieAt(best2));
    }
    for (i = 0; i < n; i++) if (pc.lab[i] === S.id) src[i] = 1;
  }

  // paint maps for both views
  var view = { W: w, H: h, cells: new Uint8Array(w * h) }; // 0 paper, 1 cut, 2 island, 3 thin, 4 fine cut
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var gi = (y + offY) * W + x + offX, v = 0;
    if (ink[gi]) v = fine[ic.lab[gi]] ? 4 : 1;
    else if (pc.lab[gi] !== anchor && isl[pc.lab[gi]]) v = 2;
    else if (thinMark[gi]) v = 3;
    view.cells[y * w + x] = v;
  }
  return { view: view, islands: islands.length, thinIslands: islands.filter(function (s) { return s.thin; }).length, capped: islands.length > cap, thin: thinCount, fine: fineCount, ties: ties, mmpp: mmpp, landPx: landPx, wrap: wrap };
}

export function kataPaint(cv, R, view, scale) {
  var V = R.view, k = scale, g = cv.getContext('2d');
  cv.width = Math.round(V.W * k); cv.height = Math.round(V.H * k);
  var bm = document.createElement('canvas'); bm.width = V.W; bm.height = V.H;
  var bg = bm.getContext('2d'), id = bg.createImageData(V.W, V.H), d = id.data;
  var hex = function (h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; };
  var pal = view === 'print'
    ? [hex(KATA_COL.sheet), hex(KATA_COL.ink), hex(KATA_COL.sheet), hex(KATA_COL.sheet), hex('#B9B2A6')]
    : [hex(KATA_COL.paper), hex(KATA_COL.cut), hex(KATA_COL.island), hex(KATA_COL.thin), hex(KATA_COL.fine)];
  for (var i = 0; i < V.cells.length; i++) { var c = pal[V.cells[i]]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
  bg.putImageData(id, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(bm, 0, 0, cv.width, cv.height);
  g.save(); g.scale(k, k); g.lineCap = 'round';
  R.ties.forEach(function (t) {
    if (view === 'print') { // a paper bridge leaves a gap in the print
      g.strokeStyle = KATA_COL.sheet; g.lineWidth = Math.max(1, R.landPx); g.beginPath(); g.moveTo(t.x1 + .5, t.y1 + .5); g.lineTo(t.x2 + .5, t.y2 + .5); g.stroke();
    } else { // a silk thread across the cut
      g.strokeStyle = KATA_COL.thread; g.lineWidth = 1.4 / k * 1.6; g.beginPath(); g.moveTo(t.x1 + .5, t.y1 + .5); g.lineTo(t.x2 + .5, t.y2 + .5); g.stroke();
      g.fillStyle = KATA_COL.thread; [[t.x1, t.y1], [t.x2, t.y2]].forEach(function (p) { g.beginPath(); g.arc(p[0] + .5, p[1] + .5, 2.2 / k * 1.6, 0, Math.PI * 2); g.fill(); });
    }
  });
  g.restore();
}
