// Batik Media Lab, carried over from the standalone web app. It now runs inside the combined Marea Dvīpa shell:
// startLab() is called once the lab markup is in the page; hooks.isActive() tells it whether the Media Lab view is showing,
// so its keys, drawing loop and autoplay stay quiet while you are in the Pattern Studio.
import { createStage } from './stage';
import { rebungRibbon, rebungToCanvas, REBUNG_INKS } from '../engine/rebung.js';
import { KETUPAT_R, ketupatPts, ketupatDiamond, ketupatCross, ketupatField } from '../engine/ketupat.js';
import { cengkehSprig, cengkehBud, cengkehBudPos } from '../engine/cengkeh.js';
import { medallion } from '../engine/medallion.js';

export function startLab(hooks) {
  hooks = hooks || {};
  var isActive = hooks.isActive || function () { return true; };
  // ---------- palette & helpers ----------
  var C = { ink: '#0E0C09', ink2: '#17140F', line: '#2A241B', line2: '#4A4032', gold: '#E0C27E', gold2: '#C39B65', paper: '#F4EEE3', mist: '#CFC3A8', muted: '#9A8E7A', flag: '#D9654B', pass: '#9FD3B6', teal: '#4FA8BD', kraft: '#8A5A2E' };
  var F = { display: "'Cormorant Garamond', Georgia, serif", body: "Karla, 'Helvetica Neue', Arial, sans-serif", mono: "'IBM Plex Mono', Menlo, monospace" };
  var GA = Math.PI * (3 - Math.sqrt(5)), PHI = (1 + Math.sqrt(5)) / 2;
  var W = 1280, H = 720, K = 1.5; // logical stage, drawn at 1920x1080
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ramp(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function $(id) { return document.getElementById(id); }
  var cv = $('stage'), g = cv.getContext('2d');

  // ---------- the Ntina mark, rebuilt as geometry (1024-unit box) ----------
  // p: horn 'u'|'moustache'|'antenna'|'none', open (opening scale), stem (0..1 slot length), seeds, seedScale, color
  function bodyPath(c) { c.beginPath(); c.ellipse(512, 668, 292, 321, 0, 0, Math.PI * 2); }
  function hornU(c) {
    c.beginPath(); c.ellipse(512, 0, 368, 315, 0, 0.05, Math.PI - 0.05, false);
    c.ellipse(512, 0, 345, 218, 0, Math.PI - 0.06, 0.06, true); c.closePath(); c.fill();
  }
  function hornMoustache(c) {
    c.save(); c.lineCap = 'round'; c.lineWidth = 58;
    [1, -1].forEach(function (s) {
      c.beginPath(); c.moveTo(512, 300);
      c.bezierCurveTo(512 - s * 120, 330, 512 - s * 300, 300, 512 - s * 330, 170);
      c.stroke();
      c.beginPath(); c.arc(512 - s * 285, 150, 48, 0, Math.PI * 2); c.lineWidth = 30; c.stroke(); c.lineWidth = 58;
    });
    c.restore();
  }
  function hornAntenna(c) {
    c.save(); c.lineCap = 'round'; c.lineWidth = 24;
    [1, -1].forEach(function (s) {
      c.beginPath(); c.moveTo(512 - s * 110, 380); c.bezierCurveTo(512 - s * 150, 250, 512 - s * 250, 170, 512 - s * 300, 110); c.stroke();
      c.beginPath(); c.arc(512 - s * 300, 85, 26, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }
  function seedPts(n, R) {
    var out = [];
    for (var i = 0; i < n; i++) { var r = R * Math.sqrt((i + .6) / Math.max(n, 1)), a = i * GA; out.push([Math.cos(a) * r, Math.sin(a) * r, r / R]); }
    return out;
  }
  var cache = {}, cacheN = 0;
  function sprite(key, px, drawFn) {
    var k = key + '@' + px;
    if (cache[k]) return cache[k];
    if (cacheN > 260) { cache = {}; cacheN = 0; }
    var c = document.createElement('canvas'); c.width = c.height = Math.max(1, Math.round(px));
    var x = c.getContext('2d'); x.scale(c.width / 1024, c.width / 1024); drawFn(x);
    cache[k] = c; cacheN++; return c;
  }
  function markSprite(p, px) {
    p = Object.assign({ horn: 'u', open: 1, stem: 1, seeds: 21, seedScale: 1, color: C.gold, body: true }, p);
    return sprite('m' + JSON.stringify(p), px, function (x) {
      x.fillStyle = x.strokeStyle = p.color;
      if (p.horn === 'u') hornU(x); else if (p.horn === 'moustache') hornMoustache(x); else if (p.horn === 'antenna') hornAntenna(x);
      if (!p.body) return;
      bodyPath(x); x.fill();
      x.globalCompositeOperation = 'destination-out';
      var R = 130 * p.open, cy = 618;
      if (R > 1) { x.beginPath(); x.arc(512, cy, R, 0, Math.PI * 2); x.fill(); }
      if (p.stem > 0) { var top = cy + R - 8, bot = top + (1000 - top) * p.stem; x.beginPath(); x.moveTo(484, top); x.lineTo(540, top); x.lineTo(540 + 3 * p.stem, bot); x.lineTo(484 - 3 * p.stem, bot); x.closePath(); x.fill(); }
      x.globalCompositeOperation = 'source-over';
      seedPts(p.seeds, R * .82).forEach(function (s) { x.beginPath(); x.arc(512 + s[0], cy + s[1], (5 + 10 * s[2]) * p.seedScale * Math.max(.4, p.open), 0, Math.PI * 2); x.fill(); });
    });
  }
  function lineSprite(px, color) {
    return sprite('line' + color, px, function (x) {
      x.strokeStyle = x.fillStyle = color; x.lineWidth = 18; x.lineCap = 'round';
      [[372, 262], [325, 205]].forEach(function (e) { x.beginPath(); x.ellipse(512, 30, e[0], e[1], 0, 0.04, Math.PI - 0.04); x.stroke(); });
      function ring(rx, ry, cy, gap) { var d = Math.asin(gap / rx); x.beginPath(); x.ellipse(512, cy, rx, ry, 0, Math.PI / 2 + d, Math.PI / 2 - d + Math.PI * 2); x.stroke(); }
      ring(300, 322, 668, 40); ring(222, 248, 690, 40);
      var dS = Math.asin(34 / 135); x.beginPath(); x.arc(512, 615, 135, Math.PI / 2 + dS, Math.PI / 2 - dS + Math.PI * 2); x.stroke();
      [478, 546].forEach(function (sx) { x.beginPath(); x.moveTo(sx, 745); x.lineTo(sx, 990); x.stroke(); });
      for (var i = 0; i < 13; i++) { var a = Math.PI * (0.75 + i * (1.5 / 12)) + Math.PI / 2; x.beginPath(); x.arc(512 + Math.cos(a) * 262, 680 + Math.sin(a) * 287, 11, 0, Math.PI * 2); x.fill(); }
      seedPts(9, 85).forEach(function (s) { x.beginPath(); x.arc(512 + s[0], 615 + s[1], 10, 0, Math.PI * 2); x.fill(); });
    });
  }
  function put(spr, cx, cy, size, alpha, rot) {
    g.save(); g.globalAlpha *= (alpha == null ? 1 : alpha); g.translate(cx, cy); if (rot) g.rotate(rot);
    g.drawImage(spr, -size / 2, -size / 2, size, size); g.restore();
  }
  // tiny renders shown enlarged with hard pixels, to judge real small sizes
  function putPixel(p, px, cx, cy, size) {
    var s = markSprite(p, px); g.save(); g.imageSmoothingEnabled = false; g.drawImage(s, cx - size / 2, cy - size / 2, size, size); g.restore();
  }

  // the mark drawn live for the stage, part by part: body 0..1 (the oval growing), seeds 0..21 (the last one still landing),
  // horn 0..1 (the U sweeping up from the bottom), stem 0..1 (the slot opening to the edge); rot turns the seed head and ang is
  // the turn between seeds. Drawn through a scratch canvas so the opening and the stem stay see-through over any ground.
  var scratch = {};
  function drawMark(c, cx, cy, s, o) {
    o = Object.assign({ body: 1, seeds: 21, horn: 1, stem: 1, open: 1, rot: 0, ang: GA, color: C.gold }, o);
    var k = s / 1024, w = Math.max(2, Math.ceil(740 * k)), h = Math.max(2, Math.ceil(1320 * k)), key = w + 'x' + h;
    if (!scratch[key]) { if (Object.keys(scratch).length > 4) scratch = {}; scratch[key] = document.createElement('canvas'); scratch[key].width = w; scratch[key].height = h; }
    var sc = scratch[key], x = sc.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
    x.scale(k, k); x.translate(-142, 315); // the mark's 1024-space (x 142..882, y -315..1005) fills the scratch; the seed head sits at (370, 933) k
    x.fillStyle = x.strokeStyle = o.color;
    if (o.horn > 0) { x.save(); var hk = Math.PI / 2 * Math.min(1, o.horn); x.beginPath(); x.moveTo(512, 0); x.arc(512, 0, 900, Math.PI / 2 - hk, Math.PI / 2 + hk); x.closePath(); x.clip(); hornU(x); x.restore(); }
    if (o.body > 0) {
      var b = Math.min(1, o.body), hy = 618, R = 130 * o.open * b;
      x.save(); x.translate(512, 668); x.scale(b, b); x.translate(-512, -668); bodyPath(x); x.fill(); x.restore();
      x.globalCompositeOperation = 'destination-out';
      if (R > 1) { x.beginPath(); x.arc(512, hy, R, 0, Math.PI * 2); x.fill(); }
      if (o.stem > 0) { var st = Math.min(1, o.stem), top = hy + R - 8, bot = top + (1000 - top) * st; x.beginPath(); x.moveTo(484, top); x.lineTo(540, top); x.lineTo(540 + 3 * st, bot); x.lineTo(484 - 3 * st, bot); x.closePath(); x.fill(); }
      x.globalCompositeOperation = 'source-over';
      var n = Math.min(21, Math.ceil(o.seeds - 1e-6)), rr0 = R * .82;
      for (var i = 0; i < n; i++) {
        var grow = Math.min(1, o.seeds - i), pop = grow < 1 ? eo(grow) * (1 + .4 * Math.sin(grow * Math.PI)) : 1;
        var r = rr0 * Math.sqrt((i + .6) / 21), a = i * o.ang + o.rot;
        x.beginPath(); x.arc(512 + Math.cos(a) * r, hy + Math.sin(a) * r, (5 + 10 * r / Math.max(1, R)) * pop * Math.max(.4, o.open), 0, Math.PI * 2); x.fill();
      }
    }
    c.drawImage(sc, cx - 370 * k, cy - 933 * k, w, h);
  }

  // ---------- redrawn sketchbook explorations ----------
  function oldSprite(id, px) {
    return sprite('old' + id, px, function (x) {
      x.fillStyle = x.strokeStyle = C.gold; x.lineCap = 'round';
      if (id === 'crown') {
        bodyPath(x); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(512, 640, 120, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over';
        for (var i = -1; i <= 1; i++) { x.beginPath(); x.ellipse(512 + i * 110, 200 - (i ? 0 : 40), 55, 95, i * .35, 0, 7); x.fill(); }
        x.fillRect(150, 520, 70, 170); x.fillRect(804, 520, 70, 170);
      } else if (id === 'bloom') {
        x.lineWidth = 26; bodyPath(x); x.stroke();
        for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; x.beginPath(); x.ellipse(512 + Math.cos(a) * 80, 660 + Math.sin(a) * 80, 70, 34, a, 0, 7); x.fill(); }
        x.fillStyle = C.ink; x.beginPath(); x.arc(512, 660, 34, 0, 7); x.fill(); x.fillStyle = C.gold; x.beginPath(); x.arc(512, 660, 16, 0, 7); x.fill();
      } else if (id === 'ripple') {
        x.lineWidth = 34; [1, .74, .48].forEach(function (s) { x.beginPath(); x.ellipse(512, 640, 292 * s, 321 * s, 0, 0, 7); x.stroke(); });
        x.beginPath(); x.arc(512, 640, 50, 0, 7); x.fill();
      } else if (id === 'engraved') {
        hornU(x); bodyPath(x); x.fill();
        x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(512, 618, 130, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over';
      } else if (id === 'cap') {
        x.lineWidth = 22; [[372, 262], [320, 200]].forEach(function (e) { x.beginPath(); x.ellipse(512, 30, e[0], e[1], 0, .04, Math.PI - .04); x.stroke(); });
        x.beginPath(); x.ellipse(512, 680, 250, 280, 0, 0, 7); x.stroke(); x.beginPath(); x.ellipse(512, 690, 150, 170, 0, 0, 7); x.stroke();
      } else if (id === 'void') {
        bodyPath(x); x.fill(); x.globalCompositeOperation = 'destination-out';
        x.beginPath(); x.moveTo(330, 330); x.lineTo(420, 420); x.lineTo(300, 430); x.fill(); x.beginPath(); x.moveTo(694, 330); x.lineTo(604, 420); x.lineTo(724, 430); x.fill();
        x.beginPath(); x.arc(512, 640, 120, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'; x.beginPath(); x.arc(512, 640, 46, 0, 7); x.fill();
      } else if (id === 'construct') {
        hornAntenna(x); bodyPath(x); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(512, 640, 140, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over';
        seedPts(21, 112).forEach(function (s) { x.beginPath(); x.arc(512 + s[0], 640 + s[1], 6 + 8 * s[2], 0, 7); x.fill(); });
      } else if (id === 'tile') {
        x.beginPath(); x.ellipse(512, 560, 270, 380, 0, 0, 7); x.fill(); x.globalCompositeOperation = 'destination-out';
        x.lineWidth = 46; x.beginPath(); x.moveTo(512, 220); x.bezierCurveTo(420, 420, 600, 700, 512, 900); x.stroke(); x.globalCompositeOperation = 'source-over';
      }
    });
  }
  function hatch(cx, cy, size, frac, seed) { // engraving strokes over the engraved round, falling away as frac drops
    var s = size / 1024; g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(s, s);
    g.beginPath(); g.ellipse(512, 668, 292, 321, 0, 0, 7); g.clip();
    g.strokeStyle = C.ink; g.lineWidth = 7;
    for (var i = 0; i < 70; i++) {
      var keep = ((i * 37 + seed) % 70) / 70 < frac; if (!keep) continue;
      var y = 340 + i * 9.5; g.beginPath(); g.moveTo(200, y); g.bezierCurveTo(400, y - 40, 620, y + 40, 830, y - 10); g.stroke();
    }
    g.restore();
  }

  // ---------- text ----------
  function wrapLines(text, font, maxW) {
    g.font = font; var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function text(str, x, y, font, color, alpha, align) {
    g.save(); g.globalAlpha *= alpha == null ? 1 : alpha; g.font = font; g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic'; g.fillText(str, x, y); g.restore();
  }
  function para(str, x, y, maxW, font, lh, color, alpha) {
    var ls = wrapLines(str, font, maxW); ls.forEach(function (l, i) { text(l, x, y + i * lh, font, color, alpha); }); return ls.length * lh;
  }
  // chapter caption: eyebrow, headline, body; lines rise in, then fade before the cut
  function caption(sc, lt, d, opt) {
    opt = opt || {};
    if (stageDraw) { g.translate((opt.w || 470) <= 520 ? -280 : 0, 0); return; } // the stage runs the words as a ticker; a picture that sat beside a caption column moves to the centre
    var x = opt.x || 72, y = opt.y || 150, w = opt.w || 470, out = 1 - ramp(lt, d - .45, d);
    var a1 = eo(ramp(lt, .1, .7)) * out, a2 = eo(ramp(lt, .35, 1.1)) * out, a3 = eo(ramp(lt, .7, 1.6)) * out;
    text(sc.eyebrow.toUpperCase(), x, y + (1 - a1) * 10, '500 13px ' + F.mono, C.gold2, a1);
    var hh = para(sc.head, x, y + 52 + (1 - a2) * 14, w, '600 44px ' + F.display, 46, C.paper, a2);
    if (sc.body) para(sc.body, x, y + 70 + hh + (1 - a3) * 10, w, '400 18px ' + F.body, 27, C.mist, a3);
  }
  function tag(str, x, y, color, alpha, filled) {
    g.save(); g.globalAlpha *= alpha; g.font = '500 12px ' + F.mono; var w = g.measureText(str).width + 18;
    g.fillStyle = filled ? color : 'transparent'; g.strokeStyle = color; g.lineWidth = 1.2;
    rr(x - w / 2, y - 13, w, 22, 4); if (filled) g.fill(); g.stroke();
    g.fillStyle = filled ? C.ink : color; g.textAlign = 'center'; g.fillText(str, x, y + 3); g.restore();
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function strike(cx, cy, r, alpha) { g.save(); g.globalAlpha *= alpha; g.strokeStyle = C.flag; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.moveTo(cx - r * .7, cy - r * .7); g.lineTo(cx + r * .7, cy + r * .7); g.stroke(); g.restore(); }
  function ghost(kind, cx, cy, s, alpha) { // the things a mark can be mistaken for
    g.save(); g.globalAlpha *= alpha; g.strokeStyle = C.flag; g.fillStyle = C.flag; g.lineWidth = 3; g.lineCap = 'round';
    if (kind === 'target') { [1, .66, .33].forEach(function (k) { g.beginPath(); g.arc(cx, cy, s * k, 0, 7); g.stroke(); }); }
    else if (kind === 'eye') { g.beginPath(); g.ellipse(cx, cy, s, s * .55, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, s * .3, 0, 7); g.fill(); }
    else if (kind === 'taurus') { g.beginPath(); g.arc(cx, cy + s * .3, s * .5, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy - s * .55, s * .62, .15, Math.PI - .15); g.stroke(); }
    else if (kind === 'venus') { g.beginPath(); g.arc(cx, cy - s * .3, s * .5, 0, 7); g.moveTo(cx, cy + s * .2); g.lineTo(cx, cy + s); g.moveTo(cx - s * .35, cy + s * .6); g.lineTo(cx + s * .35, cy + s * .6); g.stroke(); }
    else if (kind === 'face') { g.beginPath(); g.arc(cx, cy, s, 0, 7); g.stroke(); [[-.38, -.2], [.38, -.2]].forEach(function (e) { g.beginPath(); g.arc(cx + e[0] * s, cy + e[1] * s, s * .12, 0, 7); g.fill(); }); g.beginPath(); g.arc(cx, cy + s * .1, s * .45, .3, Math.PI - .3); g.stroke(); }
    else if (kind === 'lollipop') { g.beginPath(); g.arc(cx, cy - s * .35, s * .45, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx, cy + .1 * s); g.lineTo(cx, cy + s); g.stroke(); g.beginPath(); g.arc(cx, cy - s * .35, s * .22, 0, 5); g.stroke(); }
    else if (kind === 'antennae') { g.beginPath(); g.moveTo(cx - s * .2, cy + s * .4); g.quadraticCurveTo(cx - s * .5, cy - s * .2, cx - s * .7, cy - s * .7); g.moveTo(cx + s * .2, cy + s * .4); g.quadraticCurveTo(cx + s * .5, cy - s * .2, cx + s * .7, cy - s * .7); g.stroke(); [-1, 1].forEach(function (k) { g.beginPath(); g.arc(cx + k * s * .7, cy - s * .7, s * .12, 0, 7); g.fill(); }); }
    else if (kind === 'bean') { g.beginPath(); g.ellipse(cx, cy, s * .7, s, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx, cy - s * .8); g.bezierCurveTo(cx - s * .3, cy - s * .2, cx + s * .3, cy + s * .2, cx, cy + s * .8); g.stroke(); }
    g.restore();
  }
  function cecekGround(t) { // a faint isen-isen dot field that drifts, the reel's constant ground
    g.save(); g.fillStyle = C.line; var off = (t * 6) % 32;
    for (var y = -32; y < H + 32; y += 32) for (var x = (y / 32) % 2 ? 16 : 0; x < W + 32; x += 32) { g.beginPath(); g.arc(x, y + off, 1.4, 0, 7); g.fill(); }
    g.restore();
  }

  // ---------- the reel: scenes ----------
  var EX = null; // explore overrides for the current scene
  var NT = { horn: 'u', open: 1, stem: 1, seeds: 21 };
  var SCENES_NTINA = [
    { id: 'title', dur: 6, step: null,
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .5, d), cx = W / 2, cy = 300;
        var dot = eo(ramp(lt, 0, 1.2)), ring = ease(ramp(lt, 1.0, 3.0));
        g.save(); g.globalAlpha = out; g.fillStyle = C.gold;
        g.beginPath(); g.arc(cx, cy, 6 + 4 * dot, 0, 7); g.globalAlpha = out * dot * (1 - ring * .6); g.fill();
        g.globalAlpha = out; g.strokeStyle = C.gold; g.lineWidth = 3;
        g.beginPath(); g.ellipse(cx, cy, 100, 110, 0, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * ring); g.stroke(); g.restore();
        var a = eo(ramp(lt, 2.2, 3.2)) * out, b = eo(ramp(lt, 2.8, 3.8)) * out;
        text('BATIK MEDIA LAB · REEL 01', cx, 480, '500 13px ' + F.mono, C.gold2, a, 'center');
        text('Ntina', cx, 560 + (1 - a) * 12, '600 88px ' + F.display, C.paper, a, 'center');
        text('How a mark is made, from listening to a finished system', cx, 606, 'italic 500 24px ' + F.display, C.mist, b, 'center');
      } },
    { id: 'listen', dur: 11, step: 'Listen to the source', phase: 'Thinking',
      eyebrow: 'Step 1 · Listen to the source', head: 'It starts with listening, not drawing.',
      body: 'Taiganja is the open-oval ornament of the Kaili and Kulawi peoples of Central Sulawesi, given at weddings and kept as an heirloom. In Kaili, tai means womb and ganja means shape. Bomba means flower.',
      teach: 'Before any sketch, collect what the source means and who it belongs to. The meaning (origin, growth, the women who keep the custom) becomes the brief.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        var a = eo(ramp(lt, 1.2, 2.4)) * out, b = eo(ramp(lt, 2.6, 3.8)) * out, c = eo(ramp(lt, 5.5, 6.6)) * out;
        // note card 1: shape
        g.save(); g.globalAlpha = a; g.strokeStyle = C.gold; g.lineWidth = 3; g.setLineDash([10, 9]);
        g.beginPath(); g.ellipse(790, 330, 95, 120, 0, Math.PI / 2 + .25, Math.PI / 2 - .25 + Math.PI * 2); g.stroke(); g.restore();
        text('open oval · ganja, shape', 790, 500, '500 13px ' + F.mono, C.mist, a, 'center');
        // note card 2: flower
        g.save(); g.globalAlpha = b; g.fillStyle = C.gold;
        seedPts(21, 90).forEach(function (s, i) { var k = ramp(lt, 2.6 + i * .08, 3 + i * .08); g.beginPath(); g.arc(1070 + s[0], 330 + s[1], (3 + 6 * s[2]) * k, 0, 7); g.fill(); });
        g.restore(); text('bomba · flower', 1070, 500, '500 13px ' + F.mono, C.mist, b, 'center');
        // the rule
        g.save(); g.globalAlpha = c; g.strokeStyle = C.gold2; g.lineWidth = 1.5; rr(660, 560, 540, 78, 6); g.stroke(); g.restore();
        text('RULE', 684, 590, '500 12px ' + F.mono, C.gold2, c);
        text('Honour the ceremonial object. Never reproduce it.', 684, 620, 'italic 500 24px ' + F.display, C.paper, c);
      } },
    { id: 'brief', dur: 8, step: 'Set the brief', phase: 'Thinking',
      eyebrow: 'Step 2 · Set the brief', head: 'Write the rules before the first sketch.',
      body: 'Every later decision is checked against these four lines.',
      teach: 'A brief turns taste into tests. Each round of the sketchbook was judged against these four rules, which is why failures could be named precisely.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        var rules = ['Original, never a copy', 'Credits its origins', 'One ink, reproducible on any medium', 'Reads at a glance, rewards a closer look'];
        rules.forEach(function (r, i) {
          var a = eo(ramp(lt, 1 + i * .8, 1.6 + i * .8)) * out, tick = ease(ramp(lt, 1.4 + i * .8, 2 + i * .8)), y = 220 + i * 92;
          g.save(); g.globalAlpha = a; g.strokeStyle = C.line2; g.lineWidth = 1.5; rr(660, y, 540, 70, 8); g.stroke();
          g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.arc(700, y + 35, 14, 0, 7); g.stroke();
          g.lineWidth = 3; g.beginPath(); g.moveTo(693, y + 35); g.lineTo(693 + 5 * Math.min(1, tick * 2), y + 35 + 5 * Math.min(1, tick * 2));
          if (tick > .5) g.lineTo(698 + 10 * (tick - .5) * 2, y + 40 - 12 * (tick - .5) * 2); g.stroke(); g.restore();
          text(r, 734, y + 43, '500 22px ' + F.body, C.paper, a);
        });
      } },
    { id: 'round1', dur: 12, step: 'First ideas', phase: 'Ideation',
      eyebrow: 'Round 1 · First emblems', head: 'Three first ideas. One idea survives.',
      body: 'Crown and Ripple are retired. Bloom Within is parked: origin plus growth is the idea worth keeping.',
      teach: 'Retiring is not deleting. Each card keeps its lesson: ornament grows from the construction; a defining form must stay readable; keep the strongest concept even when its drawing fails.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        var items = [['crown', 'Crown', 680, 'RETIRED', 'crest floats free', 3.6], ['bloom', 'Bloom Within', 900, 'PARKED', 'origin + growth', 8.6], ['ripple', 'Ripple', 1120, 'RETIRED', 'reads as a target', 6.0]];
        items.forEach(function (it, i) {
          var a = eo(ramp(lt, .8 + i * .4, 1.6 + i * .4)) * out, st = ramp(lt, it[5], it[5] + .5), keep = it[3] === 'PARKED';
          var dim = keep ? 1 : 1 - st * .55;
          if (keep && st > 0) { g.save(); g.globalAlpha = st * out * .35; var gr = g.createRadialGradient(it[2], 340, 10, it[2], 340, 150); gr.addColorStop(0, C.gold); gr.addColorStop(1, 'rgba(224,194,126,0)'); g.fillStyle = gr; g.fillRect(it[2] - 160, 180, 320, 320); g.restore(); }
          put(oldSprite(it[0], 400), it[2], 340, 200, a * dim);
          text(it[1], it[2], 480, '600 26px ' + F.display, C.paper, a, 'center');
          if (st > 0) { tag(it[3], it[2], 520, keep ? C.gold : C.flag, st * out, keep); text(it[4], it[2], 556, '400 15px ' + F.body, C.mist, st * out, 'center'); }
          if (it[0] === 'ripple') ghost('target', it[2] + 90, 250, 26, ramp(lt, 5.2, 5.8) * (1 - ramp(lt, 7.5, 8)) * out);
        });
      } },
    { id: 'round2', dur: 10, step: 'Material study', phase: 'Ideation',
      eyebrow: 'Round 2 · Engraved metal', head: 'Rich detail, wrong medium.',
      body: 'A convincing cast-metal look, but simulated material cannot be printed, stamped or stitched. Reduce until it breaks, then add one thing back.',
      teach: 'Detail rewards a close look but fails the brief: one ink, any medium. The fix is subtraction, followed by one deliberate addition.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .6, 1.6)) * out;
        var frac = 1 - ease(ramp(lt, 3.5, 6.5)), cx = 930, cy = 360, s = 420;
        put(oldSprite('engraved', 600), cx, cy, s, a);
        g.save(); g.globalAlpha = a; hatch(cx, cy, s, frac, 3); g.restore();
        var add = eo(ramp(lt, 7, 7.8)) * out;
        if (add > 0) { g.save(); g.globalAlpha = add; g.fillStyle = C.gold; g.beginPath(); g.arc(cx, cy + s * (618 - 512) / 1024, 14 + 6 * Math.sin(lt * 6) * (1 - ramp(lt, 8, 9)), 0, 7); g.fill(); g.restore(); text('+ one thing back', cx + 150, cy + 70, '500 13px ' + F.mono, C.gold, add); }
        text(frac > .02 ? 'ENGRAVED · ' + Math.round(frac * 70) + ' STROKES' : 'SILHOUETTE · 0 STROKES', cx, 640, '500 13px ' + F.mono, C.mist, a, 'center');
      } },
    { id: 'round3', dur: 14, step: 'Reduce to flat marks', phase: 'Reduction',
      eyebrow: 'Round 3 · Reproducible marks', head: 'Five flat marks. Each one taught something.',
      teach: 'Misreadings are the main failure mode of a reduced mark: eye, ears, antennae, coffee bean. Ntina keeps what worked in two marks: the silhouette of Void and the golden-angle flower of Golden Construct.',
      draw: function (lt, d) {
        caption(this, lt, d, { w: 900 }); var out = 1 - ramp(lt, d - .45, d);
        var M = [['cap', 'D1 · Cap', 'Stamps well. Keep the horn strips separate.', null, 'developing'], ['void', 'D2 · Void', 'Strongest silhouette, but the dot reads as an eye.', 'eye', 'parked'], ['construct', 'D3 · Golden Construct', 'Elegant flower, but the horns read as antennae.', 'antennae', 'parked'], ['tile', 'D4 · Tile', 'Most original pattern idea. Alone, a coffee bean.', 'bean', 'developing'], [null, 'D5 · Ntina', 'Synthesis of Void’s silhouette and Construct’s flower.', null, 'developing']];
        var merge = ease(ramp(lt, 11.2, 12.6));
        M.forEach(function (m, i) {
          var x = 170 + i * 235, y = 400, on = ramp(lt, 1 + i * 1.9, 1.5 + i * 1.9), off = ramp(lt, 2.4 + i * 1.9, 2.85 + i * 1.9);
          var focus = i < 4 ? on * (1 - off) : on, a = eo(ramp(lt, .6 + i * .15, 1.4 + i * .15)) * out;
          var size = 150 + focus * 30;
          if (i === 4) { x = lerp(x, 1040, merge); y = lerp(y, 380, merge); size = lerp(size, 260, merge); }
          var dimmed = i < 4 ? 1 - merge * .65 : 1;
          put(m[0] ? oldSprite(m[0], 360) : markSprite(NT, 512), x, y, size, a * dimmed * (.55 + .45 * Math.max(focus, i === 4 ? 1 : 0)));
          text(m[1], x, y + 120, '600 22px ' + F.display, C.paper, a * dimmed, 'center');
          if (m[3]) ghost(m[3], x + 70, y - 80, 22, focus * out);
          if (focus > 0 && merge < .5) para(m[2], 72, 640, 900, 'italic 500 26px ' + F.display, 30, C.mist, focus * out * (1 - merge * 2));
        });
        if (merge > 0) {
          g.save(); g.globalAlpha = merge * out; g.strokeStyle = C.gold2; g.lineWidth = 2; g.setLineDash([6, 8]);
          [[405, 470], [640, 470]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1] + 30); g.quadraticCurveTo(p[0] + 180, 600, 900, 430); g.stroke(); }); g.restore();
          text('silhouette from Void + flower from Golden Construct', 1040, 560, '500 13px ' + F.mono, C.gold, merge * out, 'center');
        }
      } },
    { id: 'seeds', dur: 11, step: 'Grow the seed head', phase: 'Synthesis', explore: 'angle',
      eyebrow: 'Synthesis · Grow the seed head', head: 'Every seed turns 137.5° from the last.',
      body: 'The golden angle packs seeds without gaps or spokes, the way a sunflower does. Twenty-one seeds: a Fibonacci number.',
      teach: 'Drag the angle away from 137.5° and the seeds collapse into spokes. That visible order is why the golden angle reads as natural growth rather than a pattern someone placed.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        var ang = EX && EX.scene === 'seeds' ? EX.angle * Math.PI / 180 : GA;
        var n = EX && EX.scene === 'seeds' ? EX.n : Math.round(lerp(1, 21, ease(ramp(lt, .8, 7.5))));
        var cx = 930, cy = 360, R = 230, a = eo(ramp(lt, .4, 1.2)) * out;
        g.save(); g.globalAlpha = a; g.strokeStyle = C.line2; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.restore();
        var last = null;
        for (var i = 0; i < n; i++) {
          var r = R * .82 * Math.sqrt((i + .6) / (EX && EX.scene === 'seeds' ? n : 21)), th = i * ang, x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r;
          g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(x, y, 6 + 14 * r / R, 0, 7); g.fill(); g.restore(); last = [th, r];
        }
        if (last) { g.save(); g.globalAlpha = a * .8; g.strokeStyle = C.gold2; g.lineWidth = 1.5; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(last[0]) * R, cy + Math.sin(last[0]) * R); g.stroke(); g.restore(); }
        text('n = ' + n + ' · ' + (ang * 180 / Math.PI).toFixed(1) + '°', cx, cy + R + 50, '500 15px ' + F.mono, C.mist, a, 'center');
      } },
    { id: 'horns', dur: 9, step: 'Simplify the horns', phase: 'Refinement',
      eyebrow: 'Round 4 · Simplify the horns', head: 'One continuous U. No moustache, no curls.',
      body: 'Then the stem opens to the edge, so the seed head connects to the ground.',
      teach: 'Fewer parts, one gesture. The single crescent also stops the horns reading as a face feature, and the open stem becomes the mark’s signature.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .4, 1.2)) * out;
        var m = ease(ramp(lt, 2, 4)), stem = ease(ramp(lt, 5, 6.6)), cx = 930, cy = 360, s = 460;
        put(markSprite({ horn: 'moustache', open: 1, stem: 0, seeds: 21 }, 512), cx, cy, s, a * (1 - m));
        put(markSprite({ horn: 'u', open: 1, stem: Math.round(stem * 20) / 20, seeds: 21 }, 512), cx, cy, s, a * m);
        text(m < .5 ? 'moustache + curls' : stem < .95 ? 'one U' : 'one U · open stem', cx, 650, '500 13px ' + F.mono, C.mist, a, 'center');
      } },
    { id: 'misread', dur: 12, step: 'Check misreadings', phase: 'Refinement', explore: 'size',
      eyebrow: 'Test · Check misreadings', head: 'What else could it be read as?',
      body: 'At 16 px it nears the Taurus sign, five big seeds read as a face, and a circle on a stem can read as the Venus sign. The open stem keeps it ours; the small size drops the seeds.',
      teach: 'Look at the mark at the size people will really meet it. Toggle the seeds and the stem to see which readings appear and which disappear.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .4, 1.2)) * out;
        var exp = EX && EX.scene === 'misread';
        var fix = exp ? 0 : ease(ramp(lt, 7.5, 8.6));
        var seeds = exp ? (EX.seeds ? 21 : 0) : (fix > .5 ? 0 : 5), stem = exp ? (EX.stem ? 1 : 0) : 1;
        var big = { horn: 'u', open: 1, stem: stem, seeds: exp ? seeds : 21 };
        var small = { horn: 'u', open: 1, stem: stem, seeds: seeds, seedScale: seeds === 5 ? 2.2 : 1 };
        put(markSprite(big, 512), 720, 330, 240, a);
        text('200 px', 720, 490, '500 13px ' + F.mono, C.mist, a, 'center');
        putPixel(small, 48, 920, 330, 144); text('48 px · enlarged', 920, 490, '500 13px ' + F.mono, C.mist, a, 'center');
        var sz = exp ? EX.size : 16; putPixel(small, sz, 1110, 330, 144); text(sz + ' px · enlarged', 1110, 490, '500 13px ' + F.mono, C.mist, a, 'center');
        var g1 = exp ? (stem ? 0 : 1) : ramp(lt, 2.2, 2.8) * (1 - fix), g2 = exp ? (seeds ? 1 : 0) : ramp(lt, 3.6, 4.2) * (1 - fix), g3 = exp ? (stem ? 0 : 1) : ramp(lt, 5, 5.6) * (1 - fix);
        ghost('taurus', 1065, 570, 30, g1 * out); text('Taurus sign?', 1065, 640, '500 13px ' + F.mono, C.flag, g1 * out, 'center');
        ghost('face', 1195, 570, 30, g2 * out); text('a face?', 1195, 640, '500 13px ' + F.mono, C.flag, g2 * out, 'center');
        ghost('venus', 935, 570, 30, g3 * out); text('Venus sign?', 935, 640, '500 13px ' + F.mono, C.flag, g3 * out, 'center');
        if (!exp && fix > 0) { tag('FIX · EMPTY OPENING AT SMALL SIZE', 1010, 600, C.pass, fix * out, false); text('open stem + no seeds: pure silhouette', 1010, 640, '400 15px ' + F.body, C.mist, fix * out, 'center'); }
      } },
    { id: 'tanaka', dur: 10, step: 'Learn from a master', phase: 'Study',
      eyebrow: 'Master study · Ikko Tanaka', head: 'Build the small mark from three shapes.',
      body: 'Tanaka built a dancer’s face from squares and arcs on a grid: the most message from the fewest parts. Proposal: arc, ellipse and open stem on one 12-unit grid.',
      teach: 'This step is a proposal from the daily study, not yet in the sketchbook. Primitives that share one grid look inevitable and survive at 16 px.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        var cx = 930, cy = 370, U = 36, a = eo(ramp(lt, .4, 1.4)) * out; // 12 units of 36 px
        g.save(); g.globalAlpha = a * .9; g.strokeStyle = C.line2; g.lineWidth = 1;
        for (var i = 0; i <= 12; i++) { var k = ramp(lt, .4 + i * .05, .9 + i * .05); g.beginPath(); g.moveTo(cx - 6 * U + i * U, cy - 6 * U); g.lineTo(cx - 6 * U + i * U, cy - 6 * U + 12 * U * k); g.moveTo(cx - 6 * U, cy - 6 * U + i * U); g.lineTo(cx - 6 * U + 12 * U * k, cy - 6 * U + i * U); g.stroke(); }
        g.restore();
        var p1 = ease(ramp(lt, 2.4, 3.6)), p2 = ease(ramp(lt, 3.8, 5)), p3 = ease(ramp(lt, 5.2, 6.2));
        g.save(); g.globalAlpha = out; g.fillStyle = C.gold; g.strokeStyle = C.gold;
        g.lineWidth = U * 1.1; g.lineCap = 'butt'; g.beginPath(); g.arc(cx, cy - 6 * U, 4.2 * U, Math.PI * .08, Math.PI * .08 + Math.PI * .84 * p1); g.stroke();
        if (p2 > 0) { g.globalAlpha = out * p2; g.beginPath(); g.ellipse(cx, cy + 2 * U, 3.5 * U, 3.8 * U, 0, 0, 7); g.fill();
          g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(cx, cy + 1 * U, 1.5 * U, 1.5 * U, 0, 0, 7); g.fill();
          if (p3 > 0) g.fillRect(cx - U * .5, cy + 2 * U, U, 4 * U * p3);
          g.globalCompositeOperation = 'source-over'; }
        g.restore();
        text('ARC', cx + 5 * U, cy - 2.6 * U, '500 13px ' + F.mono, C.gold, p1 * out);
        text('ELLIPSE', cx + 4 * U, cy + 2 * U, '500 13px ' + F.mono, C.gold, p2 * out);
        text('OPEN STEM', cx + 1 * U, cy + 6.6 * U, '500 13px ' + F.mono, C.gold, p3 * out);
        text('PROPOSAL', cx - 6 * U, cy - 6.4 * U, '500 12px ' + F.mono, C.gold2, a);
      } },
    { id: 'katagami', dur: 12, step: 'Test production', phase: 'Production', explore: 'cut',
      eyebrow: 'Production test · Katagami', head: 'Can it be cut as one stencil?',
      body: 'Paper surrounded by ink falls out of a stencil. The open stem joins the seed head to the sheet, so Ntina passes at 8 cm. At 3 cm the seeds are too fine to cut.',
      teach: 'Results from the studio’s katagami bridge check. Passing as one stencil means the mark also works as a screen, a stamp, a laser cut or an embroidery outline.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .4, 1.2)) * out;
        var exp = EX && EX.scene === 'katagami', small = exp ? EX.cm === 3 : lt > 7.4;
        var x0 = 700, y0 = 110, sw = 460, sh = 500, cx = x0 + sw / 2, cy = y0 + sh / 2 - 10, s = 400;
        g.save(); g.globalAlpha = a; g.fillStyle = C.kraft; rr(x0, y0, sw, sh, 6); g.fill(); g.restore();
        // the cut: ink areas show the light behind the paper
        var cut = markSprite({ horn: 'u', open: 1, stem: 1, seeds: 21, color: C.paper }, 512);
        put(cut, cx, cy, s, a);
        // trace the join: seed-head paper flows down the stem to the sheet
        var tr = exp ? 1 : ease(ramp(lt, 2.6, 5));
        if (tr > 0 && !small) {
          g.save(); g.globalAlpha = out; g.strokeStyle = C.pass; g.lineWidth = 4; g.setLineDash([2, 9]); g.lineCap = 'round';
          var sy = cy + s * (618 - 512) / 1024, ey = y0 + sh; g.beginPath(); g.moveTo(cx, sy); g.lineTo(cx, lerp(sy, ey, tr)); g.stroke(); g.restore();
          tag('JOINED THROUGH THE OPEN STEM', cx, y0 + sh + 34, C.pass, tr * out, false);
        }
        var f = exp ? (small ? 1 : 0) : ramp(lt, 7.4, 8);
        if (f > 0) {
          var R = 130 * .82 * s / 1024, scy = cy + s * (618 - 512) / 1024;
          g.save(); g.globalAlpha = f * out; g.fillStyle = C.teal;
          seedPts(21, R).forEach(function (p) { g.beginPath(); g.arc(cx + p[0], scy + p[1], (5 + 10 * p[2]) * s / 1024 + 1.5, 0, 7); g.fill(); }); g.restore();
          tag('3 CM · SEEDS TOO FINE TO CUT', cx, y0 + sh + 34, C.teal, f * out, false);
        }
        text(small ? 'MOTIF WIDTH 3 CM' : 'MOTIF WIDTH 8 CM', x0, y0 - 16, '500 13px ' + F.mono, C.mist, a);
      } },
    { id: 'system', dur: 12, step: 'Build the system', phase: 'System',
      eyebrow: 'Round 4 · The system', head: 'One mark, four ways to use it.',
      teach: 'A mark becomes a system when each size and medium has its own drawing: primary mark, a dot-free small size, a line version from 48 px, and a pattern unit where each stem runs as cecek into the horns below.',
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .45, d), flow = ease(ramp(lt, 6, 8));
        if (flow > 0) { // the Ntina stream pattern fills the stage
          g.save(); g.globalAlpha = flow * out; var S = 150, off = (lt * 14) % S;
          for (var r = -1; r < 7; r++) for (var c = -1; c < 10; c++) {
            var x = c * S + (r % 2 ? S / 2 : 0) + 40, y = r * S - off + 40;
            put(markSprite({ horn: 'u', open: 1, stem: 1, seeds: 21, color: C.gold2 }, 128), x, y, 70, .5);
            g.fillStyle = C.gold2; for (var k = 1; k <= 5; k++) { g.beginPath(); g.arc(x, y + 34 + k * 14, 2.4, 0, 7); g.fill(); }
            g.beginPath(); g.moveTo(x + S / 2, y - 12); g.lineTo(x + S / 2 + 12, y); g.lineTo(x + S / 2, y + 12); g.lineTo(x + S / 2 - 12, y); g.closePath(); g.fill();
          }
          g.restore();
          g.save(); g.globalAlpha = flow * out * .82; g.fillStyle = C.ink; g.fillRect(0, 0, W, 250); g.restore();
        }
        caption(this, lt, d, { w: 900, y: 110 });
        var items = [['Primary mark', 'm'], ['Small size', 's'], ['Line version', 'l'], ['Pattern unit', 'p']];
        var lift = flow;
        items.forEach(function (it, i) {
          var a = eo(ramp(lt, 1 + i * .7, 1.8 + i * .7)) * out * (1 - lift), x = 230 + i * 270, y = 430;
          if (a <= 0) return;
          if (it[1] === 'm') put(markSprite(NT, 512), x, y, 200, a);
          if (it[1] === 's') { putPixel({ horn: 'u', open: 1, stem: 1, seeds: 0 }, 24, x, y, 120); }
          if (it[1] === 'l') put(lineSprite(512, C.gold), x, y, 200, a);
          if (it[1] === 'p') { put(markSprite(NT, 256), x, y - 30, 110, a); g.save(); g.globalAlpha = a; g.fillStyle = C.gold; for (var k = 1; k <= 3; k++) { g.beginPath(); g.arc(x, y + 24 + k * 13, 3, 0, 7); g.fill(); } g.restore(); put(markSprite(NT, 256), x, y + 90, 44, a * .7); }
          text(it[0], x, y + 140, '600 24px ' + F.display, C.paper, a, 'center');
          text(['primary', 'empty opening', 'from 48 px', 'cecek stream'][i], x, y + 166, '500 12px ' + F.mono, C.mist, a, 'center');
        });
      } },
    { id: 'keep', dur: 8, step: 'Credit and keep', phase: 'Archive',
      eyebrow: 'Credit · Keep every exploration', head: 'We keep what failed, so the next one is better.',
      body: 'Ntina: original designs inspired by taiganja of the Kaili and Kulawi peoples and the Bomba flower of Central Sulawesi, honouring the women who keep the custom.',
      teach: 'The credit travels with the mark, and every retired or parked exploration stays in the sketchbook with its lesson.',
      draw: function (lt, d) {
        caption(this, lt, d, { w: 520 }); var out = 1 - ramp(lt, d - .6, d);
        var trail = ['crown', 'bloom', 'ripple', 'engraved', 'cap', 'void', 'construct', 'tile'];
        trail.forEach(function (id, i) { var a = eo(ramp(lt, .6 + i * .18, 1.1 + i * .18)) * out * .55; put(oldSprite(id, 160), 700 + (i % 4) * 70, 560 + Math.floor(i / 4) * 80, 60, a); });
        var a = eo(ramp(lt, 2, 3.2)) * out; put(markSprite(NT, 512), 1080, 360, 300, a);
        text('NTINA · DEVELOPING', 1080, 560, '500 13px ' + F.mono, C.gold, a, 'center');
      } }
  ];
  // =================== Reel 02 · Bomba Rose ===================
  // The rose is redrawn procedurally from the studio master so every construction step can animate.
  var BPM_B = 138, BEAT_B = 60 / BPM_B, BAR_B = BEAT_B * 4; // 4/4; 80 bars = the whole reel; every scene is a whole number of bars
  var ROSE_INK = {
    dua: { a: '#C39B65', b: '#D1B285', c: '#A9875A', line: '#02213D', heart: '#1E3F57', spiral: '#D1B285', leaf: '#527582', rib: '#02213D', dot: '#D1B285', stem: '#1E3F57' },
    buya: { a: '#C9A35A', b: '#E0C27E', c: '#B08A45', line: '#0E0C09', heart: '#0E0C09', spiral: '#E0C27E', leaf: '#C9A35A', rib: '#0E0C09', dot: '#0E0C09', stem: '#C9A35A' },
    mono: { a: '#F4EEE3', b: '#F4EEE3', c: '#F4EEE3', line: '#F4EEE3', heart: '#F4EEE3', spiral: '#F4EEE3', leaf: '#F4EEE3', rib: '#F4EEE3', dot: '#F4EEE3', stem: '#F4EEE3' }
  };
  var IMGS = {};
  function img(path) { if (!IMGS[path]) { var i = new Image(); i.src = path; IMGS[path] = i; } return IMGS[path]; }
  function putImg(path, cx, cy, w, alpha, rot) { var i = img(path); if (!i.complete || !i.naturalWidth) return; var h = w * i.naturalHeight / i.naturalWidth; g.save(); g.globalAlpha *= alpha == null ? 1 : alpha; g.translate(cx, cy); if (rot) g.rotate(rot); g.drawImage(i, -w / 2, -h / 2, w, h); g.restore(); }
  function lens(c, len, wid) { c.beginPath(); c.moveTo(-len / 2, 0); c.quadraticCurveTo(0, -wid, len / 2, 0); c.quadraticCurveTo(0, wid, -len / 2, 0); c.closePath(); }
  // o: rings [13,8,5,3], prog [0..1 per ring], spin (1 = golden angle between rings), ink, tone (two-tone), veins, heart (0..1), heartGold, stem, leaves [0..1 x3], curve
  function drawRose(c, cx, cy, s, o) {
    o = Object.assign({ rings: [13, 8, 5, 3], prog: [1, 1, 1, 1], spin: 1, ink: 'dua', tone: 1, veins: 1, heart: 1, heartGold: false, stem: 1, leaves: [1, 1, 1], curve: 0, outline: 1 }, o);
    var K = ROSE_INK[o.ink], lw = Math.max(.8, s * .014);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    // stem and the three leaves (one stem, three leaves: the source's own rule)
    if (o.stem > 0) {
      var y0 = cy + s * .9, y1 = cy + s * (.9 + 1.45 * o.stem);
      c.strokeStyle = K.stem; c.lineWidth = s * .07; c.beginPath(); c.moveTo(cx, y0); c.quadraticCurveTo(cx + s * (.08 + o.curve * .35), (y0 + y1) / 2, cx + s * o.curve * .12, y1); c.stroke();
    }
    [[-1, 1.25, -.45], [1, 1.65, -.35], [0, 2.45, 1.571]].forEach(function (L, i) {
      var k = o.leaves[i]; if (!(k > 0)) return;
      var lx = cx + L[0] * s * .42 + (L[0] === 0 ? s * o.curve * .12 : 0), ly = cy + s * L[1];
      c.save(); c.translate(lx, ly); c.rotate(L[0] === 0 ? L[2] : (L[0] < 0 ? Math.PI + L[2] * -1 : L[2])); c.scale(k, k);
      lens(c, s * .62, s * .3); c.fillStyle = K.leaf; c.fill(); if (o.outline) { c.strokeStyle = K.line; c.lineWidth = lw; c.stroke(); }
      c.strokeStyle = K.rib; c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(-s * .26, 0); c.lineTo(s * .26, 0); c.stroke();
      if (o.veins) { c.fillStyle = K.dot; for (var d = 0; d < 6; d++) { c.beginPath(); c.arc(-s * .18 + d * s * .072, (d % 2 ? 1 : -1) * s * .07, s * .016, 0, 7); c.fill(); } }
      c.restore();
    });
    // petal rings, outer to inner, each turned by the golden angle from the ring outside it
    var R = [.84, .6, .38, .22], DEP = [.22, .19, .32, .26];
    o.rings.forEach(function (n, k) {
      var pr = o.prog[k]; if (!(pr > 0)) return;
      var r = R[k] * s, off = k * GA * o.spin - Math.PI / 2, shown = Math.ceil(n * pr - 1e-6);
      for (var j = 0; j < shown; j++) {
        var a = off + j * Math.PI * 2 / n, grow = Math.min(1, n * pr - j);
        c.save(); c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        if (k < 2) { c.rotate(a + Math.PI / 2); c.scale(grow, grow); var w = Math.PI * r / n * 1.12, h = DEP[k] * s * .5;
          c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, 7); c.fillStyle = K.a; c.fill(); if (o.outline) { c.strokeStyle = K.line; c.lineWidth = lw; c.stroke(); }
          if (o.tone) { c.beginPath(); c.ellipse(0, h * .15, w * .62, h * .55, 0, 0, 7); c.fillStyle = K.b; c.globalAlpha *= o.tone; c.fill(); c.globalAlpha /= o.tone; }
          if (o.veins) { c.fillStyle = K.line; c.globalAlpha *= o.veins; c.beginPath(); c.arc(0, h * .1, s * .014, 0, 7); c.fill(); c.globalAlpha /= o.veins; }
        } else { c.rotate(a + .35); c.scale(grow, grow); lens(c, DEP[k] * s * 1.15, DEP[k] * s * .55); c.fillStyle = K.c; c.fill(); if (o.outline) { c.strokeStyle = K.line; c.lineWidth = lw; c.stroke(); }
          if (o.tone) { lens(c, DEP[k] * s * .7, DEP[k] * s * .26); c.fillStyle = K.a; c.globalAlpha *= o.tone; c.fill(); c.globalAlpha /= o.tone; }
          if (o.veins) { c.fillStyle = K.line; c.globalAlpha *= o.veins; for (var v = -1; v <= 1; v++) { c.beginPath(); c.arc(v * DEP[k] * s * .18, 0, s * .012, 0, 7); c.fill(); } c.globalAlpha /= o.veins; }
        }
        c.restore();
      }
    });
    // the golden-spiral heart
    if (o.heart > 0) {
      var hr = s * .17 * Math.min(1, o.heart * 1.6);
      c.fillStyle = o.heartGold ? K.a : K.heart; c.beginPath(); c.arc(cx, cy, hr, 0, 7); c.fill(); if (o.outline) { c.strokeStyle = K.line; c.lineWidth = lw; c.stroke(); }
      var b = Math.log(PHI) / (Math.PI / 2), th = 0, maxT = 4.4 * Math.PI * Math.min(1, o.heart), pts = [];
      for (th = 0; th <= maxT; th += .08) { var rr0 = hr * .05 * Math.exp(b * th * .55); if (rr0 > hr * .82) break; pts.push([cx + Math.cos(th) * rr0, cy + Math.sin(th) * rr0]); }
      c.strokeStyle = o.heartGold ? K.line : K.spiral; c.lineWidth = Math.max(.8, s * .03); c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke();
    }
    c.restore();
  }
  function roseSprite(o, px) { // tiny renders for the size test; px = head diameter
    return sprite('rose' + JSON.stringify(o), px * 2.2, function (x) { x.setTransform(1, 0, 0, 1, 0, 0); drawRose(x, px * 1.1, px * .6, px * .5, o); });
  }
  function ikatField(x0, y0, w, h, t, alpha) { // an abstract woven ground: warp threads with feathered gold blocks (not a copy of any cloth)
    g.save(); g.globalAlpha *= alpha; g.fillStyle = '#0E0C09'; g.fillRect(x0, y0, w, h);
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (var x = x0; x < x0 + w; x += 4) {
      var col = Math.floor((x - x0) / 36), band = (col + Math.floor((t * .4))) % 2;
      for (var y = y0; y < y0 + h; y += 36) {
        var row = Math.floor((y - y0) / 36), on = (row + col) % 3 === 0;
        if (!on) continue; var jit = Math.sin(x * 1.7 + row * 3.1) * 5;
        g.fillStyle = band ? '#C9A35A' : '#E0C27E'; g.globalAlpha = alpha * .85; g.fillRect(x, y + 6 + jit, 3, 22 - Math.abs(jit));
      }
    }
    g.globalAlpha = alpha * .25; g.strokeStyle = '#2A241B'; g.lineWidth = 1; for (var yy = y0; yy < y0 + h; yy += 3) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + w, yy); g.stroke(); }
    g.restore();
  }
  function bars(n) { return n * BAR_B; }
  var SCENES_BOMBA = [
    { id: 'b-title', dur: bars(4), step: null,
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .5, d), h = ease(ramp(lt, .2, 3.2));
        drawRose(g, W / 2, 250, 120, { prog: [0, 0, 0, 0], heart: h, stem: 0, leaves: [0, 0, 0], ink: 'buya' });
        var a = eo(ramp(lt, 1.6, 2.6)) * out;
        text('BATIK MEDIA LAB · REEL 02', W / 2, 470, '500 13px ' + F.mono, C.gold2, a, 'center');
        text('Bomba Rose', W / 2, 550, '600 84px ' + F.display, C.paper, a, 'center');
        text('A flower from a woven cloth, grown by Fibonacci', W / 2, 596, 'italic 500 24px ' + F.display, C.mist, eo(ramp(lt, 2.2, 3.4)) * out, 'center');
      } },
    { id: 'b-listen', dur: bars(8), step: 'Listen to the cloth', phase: 'Thinking',
      eyebrow: 'Step 1 · Listen to the cloth', head: 'The flower comes from a woven cloth.',
      body: 'Bomba means flower in Kaili. The buya bomba of Donggala is ikat woven in silk and gold thread, gold on black. Its rose is drawn from above, with one stem and three leaves, and speaks of pure love for family, kingdom and God.',
      teach: 'Before drawing, learn the source’s grammar: the view (from above), the count (one stem, three leaves), the colours (gold on black) and the meaning. Most Donggala weavers were women.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, 1, 2.4)) * out, b = eo(ramp(lt, 5, 6.2)) * out, c = eo(ramp(lt, 9, 10.2)) * out;
        ikatField(660, 110, 540, 220, lt, a); text('ikat · gold on black (an abstract weave, not a copy)', 660, 352, '500 12px ' + F.mono, C.mist, a);
        g.save(); g.globalAlpha = b; g.strokeStyle = C.gold; g.lineWidth = 2; g.setLineDash([7, 7]);
        g.beginPath(); g.arc(800, 470, 60, 0, 7); g.stroke(); g.beginPath(); g.moveTo(800, 530); g.lineTo(800, 640); g.stroke();
        [[760, 575, -.5], [842, 600, .4], [800, 652, 1.57]].forEach(function (L) { g.save(); g.translate(L[0], L[1]); g.rotate(L[2]); lens(g, 52, 22); g.stroke(); g.restore(); });
        g.restore(); text('from above · 1 stem · 3 leaves', 800, 690, '500 12px ' + F.mono, C.mist, b, 'center');
        g.save(); g.globalAlpha = c; g.strokeStyle = C.gold2; g.lineWidth = 1.5; rr(900, 430, 300, 110, 6); g.stroke(); g.restore();
        text('RULE', 920, 460, '500 12px ' + F.mono, C.gold2, c); para('Learn the grammar. Redraw everything else.', 920, 492, 270, 'italic 500 22px ' + F.display, 26, C.paper, c);
      } },
    { id: 'b-brief', dur: bars(4), step: 'Set the brief', phase: 'Thinking',
      eyebrow: 'Step 2 · Set the brief', head: 'Two islands in one flower.',
      body: 'The rose belongs to the Dua Pulau signature, where Central Sulawesi meets Bali.',
      teach: 'The brief for the whole Dua Pulau set: our own drawing, credited origins, the two islands in conversation, and growth by Fibonacci and the golden angle.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        ['Our own drawing, never a copy of the cloth', 'Credit the weavers of Donggala', 'Bali palette meets Bomba gold', 'Grow by Fibonacci and the golden angle'].forEach(function (r, i) {
          var a = eo(ramp(lt, 1 + i * 1.2, 1.6 + i * 1.2)) * out, y = 210 + i * 92;
          g.save(); g.globalAlpha = a; g.strokeStyle = C.line2; g.lineWidth = 1.5; rr(660, y, 540, 70, 8); g.stroke(); g.fillStyle = C.gold; g.beginPath(); g.arc(700, y + 35, 6, 0, 7); g.fill(); g.restore();
          text(r, 730, y + 43, '500 21px ' + F.body, C.paper, a);
        });
      } },
    { id: 'b-above', dur: bars(4), step: 'Keep the grammar', phase: 'Ideation',
      eyebrow: 'Step 3 · Keep the grammar', head: 'From above, one stem, three leaves.',
      body: 'We keep the cloth’s rule and redraw the rest: a round head seen from above, a single stem, exactly three leaves.',
      teach: 'Keeping the counts and the viewpoint is how the rose stays recognisably Bomba while every line is ours.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .6, 1.6)) * out;
        var st = ease(ramp(lt, 1.6, 3.4)), l1 = ease(ramp(lt, 3.6, 4.4)), l2 = ease(ramp(lt, 4.8, 5.6)), l3 = ease(ramp(lt, 6, 6.8));
        g.save(); g.globalAlpha = a; g.strokeStyle = C.gold; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(930, 200, 96, 0, 7); g.stroke(); g.restore();
        g.save(); g.globalAlpha = out; drawRose(g, 930, 200, 120, { prog: [0, 0, 0, 0], heart: 0, stem: st, leaves: [l1, l2, l3], veins: 0 }); g.restore();
        [[l1, 860, 368, '1'], [l2, 1030, 410, '2'], [l3, 960, 520, '3']].forEach(function (n) { text(n[3], n[1], n[2], '600 30px ' + F.display, C.gold, n[0] * out, 'center'); });
      } },
    { id: 'b-rings', dur: bars(16), step: 'Grow the petal rings', phase: 'Synthesis', explore: 'rings',
      eyebrow: 'Synthesis · Grow the petal rings', head: 'Fibonacci petal rings: 13, 8, 5, 3.',
      body: 'Each ring turns by the golden angle from the one outside it, so no petal hides behind another. Listen: the kakula plays each ring, thirteen notes, then eight, five and three, spiralling into the heart.',
      teach: 'Change the counts or the turn between rings. Equal counts stack petals into spokes; the golden turn lets every petal show. Hear the rings plays each ring as notes.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), ex = EX && EX.scene === 'b-rings';
        var p = ex ? [1, 1, 1, 1] : [0, 1, 2, 3].map(function (k) { return ramp(lt, k * bars(4) + .05, (k + 1) * bars(4) - .3); });
        var rings = ex ? EX.rings : [13, 8, 5, 3], spin = ex ? EX.spin : 1;
        g.save(); g.globalAlpha = out; drawRose(g, 930, 330, 200, { rings: rings, prog: p, spin: spin, stem: 0, leaves: [0, 0, 0], heart: ex ? 1 : ramp(lt, d - 2.5, d - 1), tone: 0, veins: 0 }); g.restore();
        var k = ex ? -1 : Math.min(3, Math.floor(lt / bars(4)));
        if (k >= 0) text('RING ' + (k + 1) + ' · ' + rings[k] + ' PETALS', 930, 600, '500 15px ' + F.mono, C.gold, out, 'center');
        else text(rings.join(' · ') + (spin ? ' · golden turn' : ' · no turn'), 930, 600, '500 15px ' + F.mono, C.gold, out, 'center');
      } },
    { id: 'b-petals', dur: bars(4), step: 'Brush the petals', phase: 'Refinement',
      eyebrow: 'Refinement · Two tones and cecek', head: 'The hand of batik in every petal.',
      body: 'Each petal is brushed in two tones of gold, with cecek dots like the marks of a canting.',
      teach: 'Two tones give each petal a front and a back; the cecek dots borrow the isen-isen of hand-drawn batik so the rose rewards a close look.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), tn = ease(ramp(lt, 1, 3.5)), vn = ease(ramp(lt, 4, 6.5));
        g.save(); g.globalAlpha = out; drawRose(g, 930, 340, 230, { stem: 0, leaves: [0, 0, 0], heart: 0, tone: tn, veins: vn }); g.restore();
        text(vn > .5 ? 'TWO TONES · CECEK DOTS' : 'TWO TONES', 930, 640, '500 15px ' + F.mono, C.gold, out, 'center');
      } },
    { id: 'b-heart', dur: bars(4), step: 'Spiral the heart', phase: 'Refinement',
      eyebrow: 'Refinement · The heart', head: 'A golden spiral at the centre.',
      body: 'The spiral grows by φ every quarter turn, so the rose closes inward the way it was built outward.',
      teach: 'The heart repeats the construction in miniature: the same growth law that placed the rings draws the spiral.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), h = ease(ramp(lt, .8, 6));
        g.save(); g.globalAlpha = out; drawRose(g, 930, 340, 230, { stem: 0, leaves: [0, 0, 0], heart: h }); g.restore();
        g.save(); g.globalAlpha = out * .9; g.strokeStyle = C.gold; g.lineWidth = 1; g.setLineDash([3, 5]); g.beginPath(); g.arc(930, 340, 230 * .17 + 14, 0, 7); g.stroke(); g.restore();
        text('r × φ every quarter turn', 1110, 345, '500 14px ' + F.mono, C.gold, ramp(lt, 2, 3) * out);
      } },
    { id: 'b-leaves', dur: bars(4), step: 'Leaves from Bali', phase: 'Refinement',
      eyebrow: 'Two islands · The leaves', head: 'Leaves from the other island.',
      body: 'Bali teal and navy leaves meet Sulawesi gold: two islands in one flower.',
      teach: 'Colour carries the Dua Pulau idea: the head keeps Bomba’s gold, the leaves take Bali’s teal and navy.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), st = ease(ramp(lt, .5, 2)), l = [ramp(lt, 2, 3.2), ramp(lt, 3.4, 4.6), ramp(lt, 4.8, 6)].map(ease);
        g.save(); g.globalAlpha = out; drawRose(g, 930, 190, 120, { stem: st, leaves: l }); g.restore();
        text('Bali teal', 790, 360, '500 13px ' + F.mono, C.mist, l[0] * out, 'center'); text('navy midrib', 1090, 410, '500 13px ' + F.mono, C.mist, l[1] * out, 'center'); text('gold cecek', 1010, 520, '500 13px ' + F.mono, C.mist, l[2] * out, 'center');
      } },
    { id: 'b-inks', dur: bars(4), step: 'Choose the ink', phase: 'System', explore: 'inks',
      eyebrow: 'Two inks · Two homes', head: 'Back to the cloth’s own colours.',
      body: 'Dua Pulau ink sits on pearl for Bali grounds. Buya Bomba ink, gold on black, returns the rose to the two colours of the woven cloth.',
      teach: 'The same drawing, two inks: switch grounds to see which ink reads where.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .5, 1.5)) * out, b = eo(ramp(lt, 2.5, 3.5)) * out;
        var exI = EX && EX.scene === 'b-inks';
        var left = exI ? EX.ground : '#FAF7F2';
        g.save(); g.globalAlpha = a; g.fillStyle = left; rr(640, 80, 280, 560, 8); g.fill(); g.restore();
        g.save(); g.globalAlpha = a; drawRose(g, 780, 200, 80, { ink: exI ? EX.ink : 'dua' }); g.restore();
        g.save(); g.globalAlpha = b; g.fillStyle = '#0E0C09'; rr(940, 80, 280, 560, 8); g.fill(); g.strokeStyle = C.line2; g.stroke(); g.restore();
        g.save(); g.globalAlpha = b; drawRose(g, 1080, 200, 80, { ink: 'buya' }); g.restore();
        text(exI ? (EX.ink === 'buya' ? 'BUYA BOMBA INK' : 'DUA PULAU INK') : 'DUA PULAU · PEARL', 780, 670, '500 12px ' + F.mono, C.mist, a, 'center');
        text('BUYA BOMBA · GOLD ON BLACK', 1080, 670, '500 12px ' + F.mono, C.mist, b, 'center');
      } },
    { id: 'b-misread', dur: bars(8), step: 'Check misreadings', phase: 'Test', explore: 'roseSize',
      eyebrow: 'New check · October 2026', head: 'What else could it be read as?',
      body: 'Small, the dark spiral heart reads as an eye, and a round head on a straight stem nears a lollipop. Proposal: a gold heart and a gently curved stem at small sizes.',
      teach: 'This check is new: the rose had no recorded misreading test. Toggle the heart and stem at real sizes.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .4, 1.2)) * out;
        var ex = EX && EX.scene === 'b-misread', fix = ex ? 0 : ease(ramp(lt, 6.4, 7.6));
        var o = { heartGold: ex ? EX.gold : fix > .5, curve: ex ? (EX.curve ? 1 : 0) : fix, veins: 1 };
        g.save(); g.globalAlpha = a; drawRose(g, 700, 190, 70, o); g.restore(); text('large', 700, 600, '500 13px ' + F.mono, C.mist, a, 'center');
        var px = ex ? EX.px : 18;
        g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = a; var sp = roseSprite(o, px); g.drawImage(sp, 860, 130, 200, 200 * sp.height / sp.width); var sp2 = roseSprite(o, 40); g.drawImage(sp2, 1050, 130, 200, 200 * sp2.height / sp2.width); g.restore();
        text(px + ' px head · enlarged', 960, 600, '500 13px ' + F.mono, C.mist, a, 'center'); text('40 px head · enlarged', 1150, 600, '500 13px ' + F.mono, C.mist, a, 'center');
        var g1 = ex ? (EX.gold ? 0 : 1) : ramp(lt, 2, 2.6) * (1 - fix), g2 = ex ? (EX.curve ? 0 : 1) : ramp(lt, 3.4, 4) * (1 - fix);
        ghost('eye', 920, 470, 26, g1 * out); text('an eye?', 920, 520, '500 13px ' + F.mono, C.flag, g1 * out, 'center');
        ghost('lollipop', 1040, 470, 26, g2 * out); text('a lollipop?', 1040, 520, '500 13px ' + F.mono, C.flag, g2 * out, 'center');
        if (!ex && fix > 0) tag('PROPOSAL · GOLD HEART + CURVED STEM', 1000, 660, C.pass, fix * out, false);
      } },
    { id: 'b-stencil', dur: bars(8), step: 'Test production', phase: 'Production',
      eyebrow: 'Production test · Katagami check', head: 'Not one stencil, and that is the lesson.',
      body: 'At 8 cm the studio’s stencil check finds 21 loose pieces: the gaps between petals. The rose is a many-piece motif that belongs to weaving and multi-screen print. A one-ink stamp needs a bridged redraw (proposal).',
      teach: 'Real result from the Batik Pattern Studio bridge check: Bomba rose fails as one stencil at 3, 8 and 20 cm in every ink layer.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .4, 1.2)) * out, br = ease(ramp(lt, 6.2, 7.6));
        var x0 = 700, y0 = 110, w = 460, h = 500, cx = x0 + w / 2;
        g.save(); g.globalAlpha = a; g.fillStyle = C.kraft; rr(x0, y0, w, h, 6); g.fill();
        g.fillStyle = C.flag; g.globalAlpha = a * (1 - br); g.beginPath(); g.arc(cx, 250, 132 * .93, 0, 7); g.fill(); g.globalAlpha = a;
        drawRose(g, cx, 250, 132, { ink: 'mono', outline: 0, tone: 0, veins: 0, heart: 1, heartGold: true });
        if (br > 0) { g.strokeStyle = C.kraft; g.lineWidth = 7; g.globalAlpha = a * br; for (var k = 0; k < 13; k++) { var an = k * Math.PI * 2 / 13 - Math.PI / 2 + Math.PI / 13; g.beginPath(); g.moveTo(cx + Math.cos(an) * 30, 250 + Math.sin(an) * 30); g.lineTo(cx + Math.cos(an) * 128, 250 + Math.sin(an) * 128); g.stroke(); } }
        g.restore();
        tag(br > .5 ? 'PROPOSAL · BRIDGED PETALS FOR ONE INK' : '8 CM · 21 LOOSE PIECES', cx, y0 + h + 34, br > .5 ? C.pass : C.flag, a, false);
      } },
    { id: 'b-system', dur: bars(8), step: 'Where the rose lives', phase: 'System',
      eyebrow: 'The system · In use', head: 'A sarong row, then a garden.',
      body: 'In the Dua Pulau sarong the rose takes turns with its neighbours under rebung bands; in the Bomba Garden it grows on the golden angle, stems pointing home.',
      teach: 'These are the studio’s own master motifs in Buya Bomba ink.',
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .45, d), row = eo(ramp(lt, 1, 2)) * (1 - ramp(lt, 8, 9)), gar = eo(ramp(lt, 8.5, 10)) * out;
        if (row > 0) {
          g.save(); g.globalAlpha = row * out; g.fillStyle = '#0E0C09'; g.fillRect(0, 300, W, 330); g.restore();
          for (var x = -40; x < W + 200; x += 300) putImg('motifs/rebung-border--buya.png', x + 150 - (lt * 20) % 300, 330, 300, row * out);
          ['motifs/bomba-rose--buya.png', 'motifs/cengkeh-sprig--buya.png', 'motifs/bomba-rosette--buya.png', 'motifs/cengkeh-sprig--buya.png'].forEach(function (p, i) { for (var k = 0; k < 2; k++) putImg(p, 120 + i * 300 + k * 1200 - (lt * 20) % 1200, 480, i % 2 ? 90 : 150, row * out); });
        }
        if (gar > 0) {
          g.save(); g.globalAlpha = gar; g.fillStyle = '#0E0C09'; g.fillRect(0, 0, W, H); g.restore();
          for (var i = 1; i < 55; i++) { var th = i * GA + lt * .05, r = 30 * Math.sqrt(i), x2 = 900 + Math.cos(th) * r * 1.35, y2 = 430 + Math.sin(th) * r * .9; if (y2 > H - 60) continue; putImg(i % 3 ? 'motifs/bomba-rose--buya.png' : 'motifs/bomba-rosette--buya.png', x2, y2, 46 + i * .5, gar * .9, th - Math.PI / 2); }
          putImg('motifs/bomba-rose--buya.png', 900, 430, 120, gar);
          var gr2 = g.createLinearGradient(0, 0, 0, 260); gr2.addColorStop(0, 'rgba(14,12,9,.95)'); gr2.addColorStop(.75, 'rgba(14,12,9,.85)'); gr2.addColorStop(1, 'rgba(14,12,9,0)'); g.save(); g.globalAlpha = gar; g.fillStyle = gr2; g.fillRect(0, 0, W, 260); g.restore();
        }
        caption(this, lt, d, { w: 900, y: 90 });
      } },
    { id: 'b-keep', dur: bars(4), step: 'Credit and keep', phase: 'Archive',
      eyebrow: 'Credit · Keep every step', head: 'With gratitude to the weavers of Donggala.',
      body: 'Bomba Rose: our own drawing, inspired by the mawar of the Donggala buya bomba. Bomba means flower in Kaili.',
      teach: 'The credit travels with the rose; every construction step stays visible.',
      draw: function (lt, d) {
        caption(this, lt, d, { w: 520 }); var out = 1 - ramp(lt, d - .6, d);
        var steps = [{ stem: 0, leaves: [0, 0, 0], heart: 0, tone: 0, veins: 0 }, { stem: 0, leaves: [0, 0, 0], heart: 0, veins: 0 }, { stem: 0, leaves: [0, 0, 0], heart: 0 }, { stem: 0, leaves: [0, 0, 0] }, {}];
        steps.forEach(function (o, i) { var a = eo(ramp(lt, .6 + i * .3, 1.2 + i * .3)) * out * .7; g.save(); g.globalAlpha = a; drawRose(g, 100 + i * 70, 560, 24, o); g.restore(); });
        text('EVERY CONSTRUCTION STEP, KEPT', 72, 640, '500 12px ' + F.mono, C.muted, eo(ramp(lt, 1.6, 2.4)) * out);
        var a2 = eo(ramp(lt, 2, 3.2)) * out; putImg('motifs/bomba-rose--buya.png', 1060, 330, 250, a2);
        text('BOMBA ROSE · DUA PULAU SIGNATURE', 1060, 640, '500 13px ' + F.mono, C.gold, a2, 'center');
      } }
  ];

  // =================== Reel 03 · Marea Dvīpa, the mark ===================
  // The logo's layers (public/logo, the night set on the reel's black), placed by layout.json as fractions of a square.
  // Each layer moves with the ensemble: the waves ride the drum, the mountains and gates lift with the gongs, the pavilion
  // breathes with the kakula, the palms sway and the flowers pulse with the kettles, the birds bob on the high ones.
  var BPM_M = 112, BEAT_M = 60 / BPM_M, BAR_M = BEAT_M * 4; function barsM(n) { return n * BAR_M; } // the mark's own song: 40 bars at 112 bpm, one section per layer
  var LOGO = [['mountains', .0156, .4844, .9531, .1719], ['gate-left', .3438, .125, .1094, .2031], ['gate-right', .5469, .125, .1094, .2031], ['palm-left', .1406, .25, .2031, .2031], ['palm-right', .6406, .25, .2188, .2031],
    ['pier', .0313, .6094, .1719, .0938], ['railing', .7969, .625, .1719, .0781], ['pebbles', 0, .3711, 1, .4287], ['pavilion', .2188, .1875, .5625, .5625], ['flower-left', .125, .4375, .1563, .3125], ['flower-right', .7188, .4375, .1563, .3125],
    ['wave-left', .0156, .6875, .375, .1094], ['wave-right', .6094, .6875, .3594, .1094], ['bird-a', .1094, .4219, .0625, .0469], ['bird-b', .0781, .4844, .0469, .0313], ['bird-c', .8281, .4219, .0781, .0469], ['wordmark', 0, .8, 1, .2]];
  var LOGO_NAMES = LOGO.map(function (L) { return L[0]; });
  var LS = 600, LX = 930 - LS / 2, LY = 40; // the logo square on the 1280 × 720 stage, beside the caption column like every other scene (the stage recentres it)
  LOGO_NAMES.forEach(function (nm) { img('logo/night/' + nm + '.png'); }); // start loading the layers with the lab
  // one layer: o = { a: alpha, dx, dy: shift in stage px, s: scale about the layer's anchor (ax, ay in 0..1 of the layer; default bottom centre), rot }
  function logoLayer(L, o) {
    var i = img('logo/night/' + L[0] + '.png'); if (!i.complete || !i.naturalWidth) return;
    var x = LX + L[1] * LS + (o.dx || 0), y = LY + L[2] * LS + (o.dy || 0), w = L[3] * LS, h = L[4] * LS, ax = x + w * (o.ax == null ? .5 : o.ax), ay = y + h * (o.ay == null ? 1 : o.ay);
    g.save(); g.globalAlpha *= o.a == null ? 1 : o.a; g.translate(ax, ay); if (o.rot) g.rotate(o.rot); if (o.s != null) g.scale(o.s, o.s); g.drawImage(i, x - ax, y - ay, w, h); g.restore();
  }
  // the ensemble's live levels while a score plays (0 when sound is off), smoothed so the layers move like things, not meters
  var LM = {};
  function sm(key, target, rate) { LM[key] = LM[key] == null ? target : LM[key] + (target - LM[key]) * rate; return LM[key]; }
  function lvK(k, T) { return SND.kind === 'off' ? 0 : glow(SND.byK.kettle[k], T, .35); }
  function lvG(k, T) { return SND.kind === 'off' ? 0 : glow(SND.byK.gong[k], T, 1.4); }
  function lvD(T) { return SND.kind === 'off' ? 0 : glow(SND.byK.drum, T, .12); }
  // the logo with each layer revealed by R[name] (0..1; missing = hidden), moving with the music; breath: the whole mark breathes with the drum
  function drawLogo(T, R, alpha, breath) {
    var dr = sm('drum', lvD(T), .3), g0 = sm('g0', lvG(0, T), .2), g1 = sm('g1', lvG(1, T), .2), idle = Math.sin(T * 1.3);
    var k = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return sm('k' + i, lvK(i, T), .3); });
    g.save(); g.globalAlpha *= alpha;
    if (breath) { var b = 1 + dr * .012; g.translate(640, 360); g.scale(b, b); g.translate(-640, -360); }
    LOGO.forEach(function (L) {
      var nm = L[0], r = R[nm]; if (!(r > 0)) return; var e = eo(Math.min(1, r)), o = { a: Math.min(1, r * 1.5) };
      if (nm === 'mountains') { o.dy = (1 - e) * 60; o.s = 1 + g0 * .02; }
      else if (nm === 'pebbles') o.dy = (1 - e) * 30;
      else if (nm === 'wave-left') { o.dx = -(1 - e) * 160 + idle * 3; o.dy = -dr * 10; }
      else if (nm === 'wave-right') { o.dx = (1 - e) * 160 - idle * 3; o.dy = -dr * 10; }
      else if (nm === 'pier' || nm === 'railing') o.dy = (1 - e) * 20;
      else if (nm === 'pavilion') { o.dy = (1 - e) * 90; o.s = 1 + Math.max(k[0], k[1], k[2]) * .015; o.ay = .9; }
      else if (nm === 'gate-left') { o.dx = (1 - e) * 40; o.dy = -g1 * 6; }
      else if (nm === 'gate-right') { o.dx = -(1 - e) * 40; o.dy = -g1 * 6; }
      else if (nm === 'palm-left') { o.s = e; o.rot = -((k[3] + k[4]) * .05 + idle * .015); }
      else if (nm === 'palm-right') { o.s = e; o.rot = (k[3] + k[4]) * .05 + idle * .015; }
      else if (nm === 'flower-left') o.s = e * (1 + k[5] * .04);
      else if (nm === 'flower-right') o.s = e * (1 + k[2] * .04);
      else if (nm === 'bird-a') { o.dx = -(1 - e) * 220; o.dy = -Math.sin(T * 2) * 5 - k[6] * 8; }
      else if (nm === 'bird-b') { o.dx = -(1 - e) * 220; o.dy = -Math.sin(T * 2 + 1) * 4 - k[5] * 6; }
      else if (nm === 'bird-c') { o.dx = (1 - e) * 220; o.dy = -Math.sin(T * 2 + 2) * 5 - k[6] * 8; }
      else if (nm === 'wordmark') { o.dy = (1 - e) * 30; o.ay = .5; }
      logoLayer(L, o);
    });
    g.restore();
  }
  function allLayers(v) { var R = {}; LOGO_NAMES.forEach(function (nm) { R[nm] = v; }); return R; }
  // how far each layer has arrived at reel time T, and whether the mark breathes; the scenes draw from this and the welcome film builds its living mark from it
  function logoReveal(T) {
    var i = sceneAt(T), sc = SCENES[i], lt = T - starts[i], R = {}, out = { R: R, ghost: 0, breath: false, scene: sc.id };
    var done = function (names) { names.forEach(function (nm) { R[nm] = 1; }); };
    if (sc.id === 'm-title') { done(LOGO_NAMES); R.wordmark = 0; out.ghost = .14; }
    else if (sc.id === 'm-sea') { R.pebbles = ramp(lt, .3, 2); R['wave-left'] = R['wave-right'] = ramp(lt, 1.5, 3.5); R.mountains = ramp(lt, 4.2, 7); }
    else if (sc.id === 'm-pavilion') { done(['pebbles', 'wave-left', 'wave-right', 'mountains']); R.pier = ramp(lt, .5, 2); R.railing = ramp(lt, .7, 2.2); R.pavilion = ramp(lt, 1.5, 4.5); R['gate-left'] = R['gate-right'] = ramp(lt, 4.3, 7); out.breath = true; }
    else if (sc.id === 'm-garden') { done(['pebbles', 'wave-left', 'wave-right', 'mountains', 'pier', 'railing', 'pavilion', 'gate-left', 'gate-right']); R['palm-left'] = ramp(lt, .5, 3); R['palm-right'] = ramp(lt, 1, 3.5); R['flower-left'] = ramp(lt, 3.5, 6); R['flower-right'] = ramp(lt, 4, 6.5); out.breath = true; }
    else if (sc.id === 'm-birds') { done(LOGO_NAMES); R.wordmark = 0; R['bird-a'] = ramp(lt, .3, 2.5); R['bird-b'] = ramp(lt, .8, 3); R['bird-c'] = ramp(lt, 1.3, 3.5); out.breath = true; }
    else if (sc.id === 'm-mark') { done(LOGO_NAMES); R.wordmark = ramp(lt, .5, 2.5); out.breath = true; }
    else done(LOGO_NAMES);
    return out;
  }
  var SCENES_LOGO = [
    { id: 'm-title', dur: barsM(4), step: null,
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .5, d), T = t;
        g.save(); g.translate(640 - 930, 0); // no caption on the title: the mark sits in the middle
        drawLogo(T, allLayers(1), out * .14, false);
        g.globalAlpha = out; logoLayer(LOGO[16], { a: eo(ramp(lt, .3, 1.6)), dy: -130 + (1 - eo(ramp(lt, .3, 1.6))) * 16, ay: .5 }); g.restore();
        text('BATIK MEDIA LAB · REEL 03', 640, 300, '500 13px ' + F.mono, C.gold2, eo(ramp(lt, 1.2, 2.2)) * out, 'center');
        text('A pavilion by the sea, drawn by its gamelan', 640, 340, 'italic 500 24px ' + F.display, C.mist, eo(ramp(lt, 1.8, 2.8)) * out, 'center');
      } },
    { id: 'm-sea', dur: barsM(8), step: 'The sea', phase: 'Ground',
      eyebrow: 'Layer 1 · The sea', head: 'It starts with the tide.',
      body: 'The pebbles settle, the waves ride the kendang, and the mountains rise with the gong ageng.',
      teach: 'The ground comes first. Everything after it stands on the pebbles and in front of the hills.',
      draw: function (lt, d) { caption(this, lt, d); var o = logoReveal(t); drawLogo(t, o.R, 1 - ramp(lt, d - .45, d), o.breath); } },
    { id: 'm-pavilion', dur: barsM(8), step: 'The pavilion', phase: 'Structure',
      eyebrow: 'Layer 2 · The pavilion', head: 'A bandstand between two gates.',
      body: 'The pier and the railing take their places, the pavilion rises from the pebbles and breathes with the ugal and the kotekan, and the candi bentar gates part behind it on the kempur.',
      teach: 'Structure before ornament. The pavilion is the mark’s centre; the split gate behind it is Bali, the sea in front is Sulawesi.',
      draw: function (lt, d) { caption(this, lt, d); var o = logoReveal(t); drawLogo(t, o.R, 1 - ramp(lt, d - .45, d), o.breath); } },
    { id: 'm-garden', dur: barsM(8), step: 'The garden', phase: 'Ornament',
      eyebrow: 'Layer 3 · The garden', head: 'Palms sway, frangipani opens.',
      body: 'The palms grow from their roots and sway with the reyong; the frangipani blooms and pulses with the ceng-ceng and the kettles.',
      teach: 'Ornament grows from the construction (Owen Jones): the palms stand on the ground, the flowers frame the pavilion.',
      draw: function (lt, d) { caption(this, lt, d); var o = logoReveal(t); drawLogo(t, o.R, 1 - ramp(lt, d - .45, d), o.breath); } },
    { id: 'm-birds', dur: barsM(4), step: 'The birds', phase: 'Life',
      eyebrow: 'Layer 4 · The birds', head: 'Three birds on the suling.',
      body: 'They fly in from the sea while the suling sings, and bob on the highest kettles.',
      teach: 'A sign of life keeps a mark from being a diagram.',
      draw: function (lt, d) { caption(this, lt, d); var o = logoReveal(t); drawLogo(t, o.R, 1 - ramp(lt, d - .45, d), o.breath); } },
    { id: 'm-mark', dur: barsM(8), step: 'The mark', phase: 'Mark',
      eyebrow: 'Marea Dvīpa', head: 'The mark, drawn by its music.',
      body: 'The name arrives and the whole set plays kebyar: waves on the kendang, gates on the gongs, the pavilion on the ugal, palms and flowers on the kotekan, a breath on the angsel.',
      teach: 'Marea Dvīpa: a pavilion by the sea, with gratitude to the places it draws on. Keep the mark whole and upright.',
      draw: function (lt, d) { caption(this, lt, d); var o = logoReveal(t); drawLogo(t, o.R, 1 - ramp(lt, d - .6, d), o.breath); } }
  ];

  // =================== Your picture · the ensemble reads an image ===================
  // Load a PNG or JPG and the lab scans it in 128 columns over 16 bars: the brightest row of each column picks one of the seven
  // kettles, dark masses ring the gongs on the bar lines, edges drive the drum, a change of colour scrapes. The picture stays
  // in this browser; nothing is uploaded anywhere.
  var IMG = null, IMG_BPM = 6400 / 60, IMG_BEAT = 60 / IMG_BPM, IMG_E8 = IMG_BEAT / 2, IMG_COLS = 128, IMG_ROWS = 32, IMG_BARS = 16;
  function readImage(el) {
    var c = document.createElement('canvas'); c.width = IMG_COLS; c.height = IMG_ROWS; var x = c.getContext('2d'); x.drawImage(el, 0, 0, IMG_COLS, IMG_ROWS);
    var d = x.getImageData(0, 0, IMG_COLS, IMG_ROWS).data, cols = [];
    function lum(p) { return (.2126 * d[p] + .7152 * d[p + 1] + .0722 * d[p + 2]) / 255; }
    for (var i = 0; i < IMG_COLS; i++) {
      var sumL = 0, bestL = 0, best = 0, cy = 0, sat = 0, warm = 0, edge = 0, dark = 0;
      for (var j = 0; j < IMG_ROWS; j++) {
        var p = (j * IMG_COLS + i) * 4, L = lum(p), mx = Math.max(d[p], d[p + 1], d[p + 2]), mn = Math.min(d[p], d[p + 1], d[p + 2]);
        sumL += L; cy += L * j; sat += mx ? (mx - mn) / mx : 0; if (d[p] > d[p + 2]) warm++; if (L > bestL) { bestL = L; best = j; } if (L < .25) dark++;
        if (i > 0) edge += Math.abs(L - lum(p - 4));
      }
      cols.push({ mean: sumL / IMG_ROWS, bright: bestL, brightRow: best / (IMG_ROWS - 1), sat: sat / IMG_ROWS, warm: warm / IMG_ROWS, edge: edge / IMG_ROWS, dark: dark / IMG_ROWS });
    }
    return cols;
  }
  function composeImage(cols) {
    var E = [], prevSat = cols[0].sat;
    cols.forEach(function (c, i) {
      var tt = i * IMG_E8;
      if (c.bright > .08) E.push({ t: tt, k: 'kettle', n: clamp(Math.floor((1 - c.brightRow) * 7), 0, 6), v: .16 + .38 * c.bright, oct: c.bright > .8 && c.warm > .5, soft: c.sat < .12 });
      if (i % 8 === 0) E.push({ t: tt, k: 'gong', n: c.dark > .5 ? 0 : 1, v: .22 + .36 * c.dark });
      if (i % 2 === 0) { if (c.edge > .07) E.push({ t: tt, k: 'drum', n: 'dum', v: Math.min(.6, .18 + c.edge * 2.2) }); else if (i % 4 === 2) E.push({ t: tt, k: 'drum', n: 'mute', v: .16 }); }
      if (Math.abs(c.sat - prevSat) > .22) E.push({ t: tt, k: 'scrape', v: .22, d: .3 }); prevSat = c.sat;
    });
    return E.sort(function (a, b) { return a.t - b.t; });
  }
  var SCENES_IMAGE = [
    { id: 'i-scan', dur: IMG_BARS * IMG_BEAT * 4, step: 'Hear your picture', phase: 'Listening',
      eyebrow: 'Your picture · the ensemble reads it', head: 'A picture, played left to right.',
      body: 'One eighth note per column. The brightest row picks the kettle, dark masses ring the gongs, edges drive the drum, a change of colour scrapes.',
      teach: 'Load any PNG or JPG. The lab scans it in 128 columns over 16 bars and composes a score for its kakula ensemble from the light in each column.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d); if (!IMG) return;
        var i = IMG.el, k = Math.min(640 / i.naturalWidth, 520 / i.naturalHeight), w = i.naturalWidth * k, h = i.naturalHeight * k, x = 930 - w / 2, y = 360 - h / 2;
        var p = clamp(lt / d, 0, 1), sx = x + w * p, T = t, kk = Math.max(lvK(0, T), lvK(1, T), lvK(2, T), lvK(3, T), lvK(4, T), lvK(5, T), lvK(6, T));
        g.save(); g.globalAlpha = out * .3; g.drawImage(i, x, y, w, h); g.restore();
        g.save(); g.beginPath(); g.rect(x, y, Math.max(0, sx - x), h); g.clip(); g.globalAlpha = out; g.drawImage(i, x, y, w, h); g.restore();
        g.save(); g.globalAlpha = out; g.strokeStyle = C.gold; g.lineWidth = 2 + kk * 3; g.shadowColor = C.gold; g.shadowBlur = 12 + kk * 20; g.beginPath(); g.moveTo(sx, y - 8); g.lineTo(sx, y + h + 8); g.stroke(); g.restore();
        text('COLUMN ' + String(Math.min(IMG_COLS, Math.floor(p * IMG_COLS) + 1)).padStart(3, '0') + ' / ' + IMG_COLS + ' · ' + IMG.name.toUpperCase(), 930, y + h + 34, '500 12px ' + F.mono, C.mist, out, 'center');
      } }
  ];

  // ---------- score: Bunga Kaili (Kaili flower song) ----------
  // Kakula-led Kaili ensemble: kakula (lead, soft for thinking), a second kakula for harmony, gamba-gamba (the wooden forerunner
  // of kakula) for chords, tawa-tawa gongs, gimba drums as in the kakula ensemble, and the loom: the cloth being woven.
  // A minor on the Kaili seven-tone set la do re mi sol la si; 92 bpm; 60 bars. Melody in the ring section is generated
  // from the rose's own petal rings (13, 8, 5, 3) by the golden angle.
  var LB = (function () {
    var PITCH = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25, 587.33, 659.26, 783.99, 880.00, 987.77];
    var PCS = [9, 0, 2, 4, 7, 9, 11, 0, 2, 4, 7, 9, 11], DR = [2, -3, 4, -2, 3, 2, -3, 3, -2, 4, -3, 2, -2];
    var CHP = { Am: [9, 0, 4], F: [5, 9, 0], C: [0, 4, 7], G: [7, 11, 2], Dm: [2, 5, 9], E7: [4, 8, 11, 2], Em: [4, 7, 11], A: [9, 1, 4] };
    function pcF(pc, oct) { return 261.63 * Math.pow(2, pc / 12) * Math.pow(2, oct - 4); }
    var VERSE = [[[0, 9, 1], [1, 7, .5], [1.5, 9, .5], [2, 11, 1.5], [3.5, 10, .5]], [[0, 11, 1], [1, 7, 1], [2, 5, 2]], [[0, 9, 1], [1, 10, .5], [1.5, 9, .5], [2, 7, 2]], [[0, 8, 1], [1, 6, 1], [2, 10, 1], [3, 8, 1]],
      [[0, 9, 1], [1, 11, .5], [1.5, 12, .5], [2, 11, 1], [3, 9, 1]], [[0, 8, 1.5], [1.5, 7, .5], [2, 5, 2]], [[0, 6, 1], [1, 8, 1], [2, 9, 1.5], [3.5, 8, .5]], [[0, 5, 3]]];
    var VERSE_CH = ['Am', 'F', 'C', 'G', 'Am', 'Dm', 'E7', 'Am'];
    var VERSE2 = VERSE.slice(0, 4).concat([[[0, 8, 1], [1, 5, 1], [2, 8, 2]], [[0, 9, 1], [1, 7, 1], [2, 9, 2]], [[0, 11, 1], [1, 9, .5], [1.5, 7, .5], [2, 11, 2]], [[0, 12, 1.5], [1.5, 11, .5], [2, 9, 2]]]);
    var VERSE2_CH = ['Am', 'F', 'C', 'G', 'Dm', 'Am', 'F', 'E7'];
    var RING_CH = ['Am', 'F', 'C', 'G', 'Am', 'F', 'E7', 'E7'];
    var CHORUS = [[[0, 11, 1.5], [1.5, 10, .5], [2, 7, 1], [3, 11, 1]], [[0, 12, 1.5], [1.5, 11, .5], [2, 10, 2]], [[0, 10, 1], [1, 9, 1], [2, 6, 1], [3, 9, 1]], [[0, 9, 2.5], [2.5, 8, .5], [3, 7, 1]],
      [[0, 8, 1], [1, 11, 1], [2, 8, .5], [2.5, 7, .5], [3, 5, 1]], [[0, 6, 1], [1, 8, 1], [2, 10, 2]], [[0, 9, 1], [1, 7, 1], [2, 10, 1], [3, 9, 1]], [[0, 6, 2], [2, 8, 1], [3, 9, 1]]];
    var CHORUS_CH = ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'E7'];
    var BRIDGE = [[[0, 2, 1], [1, 5, 1], [2, 8, 2]], [[0, 7, 1], [1, 5, 1], [2, 3, 2]], [[0, 6, 1.5], [1.5, 3, .5], [2, 6, 1], [3, 8, 1]], [[0, 7, 2], [2, 5, 2]],
      [[0, 5, 1], [1, 8, 1], [2, 11, 2]], [[0, 10, 1], [1, 8, 1], [2, 6, 2]], [[0, 7, 1], [1, 9, 1], [2, 10, 2]], [[0, 6, .5], [.5, 8, .5], [1, 9, .5], [1.5, 8, .5], [2, 6, .5], [2.5, 8, .5], [3, 9, .5], [3.5, 12, .5]]];
    var BRIDGE_CH = ['Dm', 'Am', 'E7', 'Am', 'Dm', 'G', 'C', 'E7'];
    var OUTRO = [[[0, 9, 1], [1, 7, 1], [2, 5, 2]], [[0, 5, 1], [1, 7, 1], [2, 11, 2]], [[0, 6, 2], [2, 9, 2]], [[0, 5, 4]]];
    var OUTRO_CH = ['Am', 'F', 'E7', 'A'];
    var TIMELINE = [].concat(VERSE_CH, VERSE_CH, RING_CH, VERSE2_CH, CHORUS_CH, BRIDGE_CH, CHORUS_CH, OUTRO_CH);
    function chordTones(bar) { var ch = CHP[TIMELINE[bar]] || []; return ch.map(function (pc) { return pcF(pc, 4); }); }
    function ctIdx(ch) { var set = CHP[ch]; var out = []; PCS.forEach(function (pc, i) { if (set.indexOf(pc) >= 0) out.push(i); }); return out; }

    function compose(opt) {
      opt = opt || {}; var lilt = opt.feel === 'lilt' ? 1 / 6 : 0, E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR_B + beat * BEAT_B; }
      function F(p) { return PITCH[p] * Math.pow(2, DR[p] / 1200); }
      function K(time, p, v, beats, soft, stem) { E.push({ t: time, k: 'kettle', n: p % 7, f: F(p), v: v, soft: !!soft, d: clamp(beats * BEAT_B * (soft ? 2.8 : 2.2), .35, 2.4), s: stem || 'kakula' }); }
      function lead(bars_, at, v, soft) {
        var prev = null;
        bars_.forEach(function (bar, i) { bar.forEach(function (nt) {
          var t0 = T(at + i, nt[0]), beats = nt[2];
          if (beats >= 1 && prev !== null && prev !== nt[1] && nt[1] < 12 && nt[0] % 2 === 0 && !soft) K(t0 - .07, nt[1] + 1, v * .25, .25, false);
          K(t0, nt[1], v, beats, soft);
          if (beats >= 1.5) for (var q = BEAT_B * .75; q < beats * BEAT_B - BEAT_B * .4; q += BEAT_B / 3) K(t0 + q, nt[1], v * (soft ? .1 : .14), .3, soft);
          prev = nt[1];
        }); });
      }
      function harmony(bars_, chords, at, v) { bars_.forEach(function (bar, i) { var ct = ctIdx(chords[i]); bar.forEach(function (nt) { if (nt[2] < 1) return; var best = -1; ct.forEach(function (p) { if (p <= nt[1] - 2 && p >= nt[1] - 4 && p > best) best = p; }); if (best >= 0) K(T(at + i, nt[0]), best, v, nt[2], true, 'kakula2'); }); }); }
      // the rose plays itself: each ring's petals become notes, chosen by the golden angle and kept on the chord, moving by small steps
      function ringSong(at) {
        var prev = 9, plan = [[13, 0, 8], [8, 2, 8], [5, 4, 8], [3, 6, 8]], idx = 0;
        plan.forEach(function (pl, ring) {
          var n = pl[0], bar0 = at + pl[1], span = pl[2];
          for (var j = 0; j < n; j++) {
            var beatAbs = j * span / n, bar = bar0 + Math.floor(beatAbs / 4), beat = beatAbs % 4, ch = RING_CH[bar - at], ct = ctIdx(ch).filter(function (p) { return p >= 5; });
            var gi = 5 + Math.floor(((idx++ * GA) % (Math.PI * 2)) / (Math.PI * 2) * 8), best = ct[0], score = 1e9;
            ct.forEach(function (p) { var sc = Math.abs(p - gi) + .8 * Math.abs(p - prev); if (sc < score) { score = sc; best = p; } });
            K(T(bar, beat), best, .44 - ring * .03, span / n, ring >= 2); prev = best;
          }
        });
      }
      function gamba(at, chords, level, style) { // wooden chord figures, an octave under the kettles
        chords.forEach(function (c, i) { var pcs = CHP[c], seq = style === 'soft' ? [[0, 0], [2, 1]] : [[0, 0], [.5, 2], [1, 1], [1.5, 2], [2, 0], [2.5, 2], [3, 1], [3.5, 2]];
          seq.forEach(function (sq) { var pc = pcs[Math.min(sq[1], pcs.length - 1)], f = pcF(pc, 4); if (f > 400) f /= 2; E.push({ t: T(at + i, sq[0]), k: 'kolintang', n: pc % 7, f: f, v: (sq[0] % 1 ? .16 : .22) * level, s: 'gamba' }); }); });
      }
      function bassGong(at, chords, level, walk) { chords.forEach(function (c, i) { var f = pcF(CHP[c][0], 2); if (f < 80) f *= 2; E.push({ t: T(at + i, 0), k: 'bassgong', f: f, v: .42 * level, s: 'bass' }); if (walk) E.push({ t: T(at + i, 2), k: 'bassgong', f: f * 1.5 > 200 ? f * .75 : f * 1.5, v: .3 * level, s: 'bass' }); }); }
      function tawa(at, chords, dense) { chords.forEach(function (c, i) { if (i % 2 === 0) E.push({ t: T(at + i, 0), k: 'gong', n: 0, f: 110, v: .3, s: 'gongs' }); if (dense || i % 2 === 1) E.push({ t: T(at + i, 2), k: 'gong', n: 1, f: 164.81, v: .18, s: 'gongs' }); }); }
      function gimba(at, n, level, mode) { // kakula phrases stress the even beats
        for (var b = 0; b < n; b++) { var x = at + b;
          if (mode === 'half') { E.push({ t: T(x, 0), k: 'drum', n: 'dum', v: .4 * level, s: 'drums' }); E.push({ t: T(x, 3), k: 'drum', n: 'tak', v: .3 * level, s: 'drums' }); continue; }
          [[0, 'dum', .42], [1, 'tak', .4], [2, 'dum', .3], [3, 'tak', .42], [3.5, 'tak', .14], [1.5, 'tak', .12]].forEach(function (h) { if (mode === 'light' && h[2] < .2) return; E.push({ t: T(x, h[0]), k: 'drum', n: h[1], v: h[2] * level, s: 'drums' }); }); }
      }
      function loom(at, n, level) { level *= 1.8; for (var b = 0; b < n; b++) { E.push({ t: T(at + b, 0), k: 'beater', v: .4 * level, s: 'loom' }); E.push({ t: T(at + b, 2), k: 'beater', v: .3 * level, s: 'loom' }); E.push({ t: T(at + b, 1), k: 'shuttle', v: .16 * level, s: 'loom' }); E.push({ t: T(at + b, 3), k: 'shuttle', v: .16 * level, s: 'loom' }); } }

      // Intro 0-7: the kakula alone, softly, thinking; the loom starts at bar 4: the cloth begins
      lead(VERSE, 0, .42, true); loom(4, 4, .6); E.push({ t: T(4, 0), k: 'gong', n: 0, f: 110, v: .3, s: 'gongs' });
      // Verse 8-15: kakula leads; gimba, gong-bass, tawa-tawa join
      lead(VERSE, 8, .48); gimba(8, 8, .8, 'light'); bassGong(8, VERSE_CH, .9, true); tawa(8, VERSE_CH); loom(8, 8, .55);
      // Ring song 16-23: the rose plays itself, ring by ring, into the heart
      ringSong(16); gamba(16, RING_CH, .8, 'soft'); bassGong(16, RING_CH, .8, false); loom(16, 8, .6); gimba(16, 8, .55, 'half'); tawa(16, RING_CH);
      // Verse 24-31: the full lead with gamba-gamba chords
      lead(VERSE2, 24, .5); gamba(24, VERSE2_CH, .9); gimba(24, 8, .95); bassGong(24, VERSE2_CH, 1, true); tawa(24, VERSE2_CH); loom(24, 8, .45);
      // Chorus 32-39: the relative major opens; a second kakula sings below
      lead(CHORUS, 32, .54); harmony(CHORUS, CHORUS_CH, 32, .22); gamba(32, CHORUS_CH, 1); gimba(32, 8, 1); bassGong(32, CHORUS_CH, 1, true); tawa(32, CHORUS_CH, true);
      // Bridge 40-47: thinking and testing: soft kakula low, the loom returns, a roll builds on E7
      lead(BRIDGE.slice(0, 7), 40, .44, true); lead(BRIDGE.slice(7), 47, .44); gamba(40, BRIDGE_CH, .7, 'soft'); bassGong(40, BRIDGE_CH, .85, false); gimba(40, 6, .7, 'half'); loom(40, 8, .65); tawa(40, BRIDGE_CH);
      for (var rl = 0; rl < 16; rl++) E.push({ t: T(46 + Math.floor(rl / 8), (rl % 8) / 2), k: 'drum', n: rl % 4 === 0 ? 'dum' : 'tak', v: .12 + rl * .022, s: 'drums' });
      // Final chorus 48-55: everyone
      lead(CHORUS, 48, .56); harmony(CHORUS, CHORUS_CH, 48, .25); gamba(48, CHORUS_CH, 1.05); gimba(48, 8, 1.05); bassGong(48, CHORUS_CH, 1.05, true); tawa(48, CHORUS_CH, true); loom(48, 8, .4);
      // Outro 56-59: soft kakula, and a Picardy close: the last chord turns to A major
      lead(OUTRO, 56, .42, true); gamba(56, OUTRO_CH, .7, 'soft'); bassGong(56, OUTRO_CH, .8, false);
      [9, 1, 4].forEach(function (pc) { E.push({ t: T(59, 0), k: 'kolintang', n: pc % 7, f: pcF(pc, 4), v: .26, s: 'gamba' }); });
      E.push({ t: T(59, 0), k: 'gong', n: 0, f: 110, v: .55, s: 'gongs' }); E.push({ t: T(59, 0), k: 'drum', n: 'dum', v: .45, s: 'drums' });
      return E;
    }
    // ---------- Bunga Kaili 130: experimental, 80 bars at 130 bpm ----------
    // Every rhythm sits on one sixteenth-note grid; Fibonacci numbers become Euclidean rhythms (k onsets spread evenly over n steps).
    // The ring song plays each ring's count as a Euclidean pattern; the bridge phases a 13-step kakula loop against a 16-step one.
    function euclid(k, n, rot) { var out = []; for (var i = 0; i < n; i++) { var j = (i + (rot || 0)) % n; out.push(((j * k) % n) < k); } return out; }
    var V2 = {
      INTRO_CH: ['Am', 'Am', 'F', 'F', 'Am', 'Am', 'G', 'G', 'Am', 'F', 'E7', 'E7'],
      VERSE_CH: VERSE_CH, RING_CH: ['Am', 'Am', 'F', 'F', 'C', 'C', 'G', 'G', 'Am', 'Am', 'F', 'F', 'E7', 'E7', 'E7', 'E7'],
      VERSE2_CH: VERSE2_CH, CHORUS_CH: CHORUS_CH, BRIDGE_CH: ['Dm', 'Dm', 'Am', 'Am', 'E7', 'E7', 'Am', 'Am', 'Dm', 'Dm', 'G', 'G', 'C', 'C', 'E7', 'E7'], OUTRO_CH: OUTRO_CH
    };
    var TIMELINE2 = [].concat(V2.INTRO_CH, V2.VERSE_CH, V2.RING_CH, V2.VERSE2_CH, V2.CHORUS_CH, V2.BRIDGE_CH, V2.CHORUS_CH, V2.OUTRO_CH);
    function chordTones2(bar) { var ch = CHP[TIMELINE2[bar]] || []; return ch.map(function (pc) { return pcF(pc, 4); }); }
    function compose130(opt) {
      opt = opt || {}; var lilt = opt.feel === 'lilt' ? 1 / 6 : 0, E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR_B + beat * BEAT_B; }
      function F(p) { return PITCH[p] * Math.pow(2, DR[p] / 1200); }
      function K(time, p, v, beats, soft, stem) { E.push({ t: time, k: 'kettle', n: p % 7, f: F(p), v: v, soft: !!soft, d: clamp(beats * BEAT_B * (soft ? 2.6 : 2), .25, 2.2), s: stem || 'kakula' }); }
      function lead(bars_, at, v, soft, stretch) {
        stretch = stretch || 1;
        bars_.forEach(function (bar, i) { bar.forEach(function (nt) {
          var beatAbs = (i * 4 + nt[0]) * stretch, t0 = T(at + Math.floor(beatAbs / 4), beatAbs % 4), beats = nt[2] * stretch;
          K(t0, nt[1], v, beats, soft);
          if (beats >= 2) for (var q = BEAT_B; q < beats * BEAT_B - BEAT_B * .5; q += BEAT_B / 2) K(t0 + q, nt[1], v * (soft ? .1 : .13), .3, soft);
        }); });
      }
      function tones(ch, lo, hi) { return ctIdx(ch).filter(function (p) { return p >= lo && p <= hi; }); }
      // interlocking kakula: a second player fills the off-sixteenths with chord tones, so two simple parts make one fast line
      function interlock(at, chords, v, k, lo, hi) {
        chords.forEach(function (c, i) { var tn = tones(c, lo || 5, hi || 10), pat = euclid(k || 7, 16, 1);
          pat.forEach(function (on, s16) { if (!on || s16 % 4 === 0) return; K(T(at + i, s16 / 4), tn[(s16 + i) % tn.length], v, .25, true, 'kakula2'); }); });
      }
      function harmony(bars_, chords, at, v) { bars_.forEach(function (bar, i) { var ct = ctIdx(chords[i]); bar.forEach(function (nt) { if (nt[2] < 1) return; var best = -1; ct.forEach(function (p) { if (p <= nt[1] - 2 && p >= nt[1] - 4 && p > best) best = p; }); if (best >= 0) K(T(at + i, nt[0]), best, v, nt[2], true, 'kakula2'); }); }); }
      // the rose plays itself, now on the grid: ring n = Euclidean n-in-16, twice per ring (4 bars)
      function ringSong(at) {
        var prev = 9, idx = 0;
        [13, 8, 5, 3].forEach(function (n, ring) {
          var pat = euclid(n, 16, 0);
          for (var rep = 0; rep < 2; rep++) for (var s = 0; s < 16; s++) {
            if (!pat[s]) continue;
            var eighthAbs = rep * 16 + s, bar = at + ring * 4 + Math.floor(eighthAbs / 8), beat = (eighthAbs % 8) / 2, ch = TIMELINE2[bar], ct = tones(ch, 5, 12);
            var gi = 5 + Math.floor(((idx++ * GA) % (Math.PI * 2)) / (Math.PI * 2) * 8), best = ct[0], score = 1e9;
            ct.forEach(function (p) { var sc = Math.abs(p - gi) + .8 * Math.abs(p - prev); if (sc < score) { score = sc; best = p; } });
            K(T(bar, beat), best, (.42 - ring * .03) * (s === 0 ? 1.15 : 1), 2 / n * 4, ring >= 2); prev = best;
          }
          E.push({ t: T(at + ring * 4, 0), k: 'gong', n: ring % 2, f: ring % 2 ? 164.81 : 110, v: .32, s: 'gongs' });
        });
      }
      // phasing: a 13-step and a 16-step kakula loop on the same sixteenth grid drift apart and slowly realign
      function phase(at, n) {
        var A = [0, 2, 1, 3, 2, 0, 1, 3, 2, 1, 0, 2, 3], B = [3, 1, 2, 0, 1, 3, 2, 0, 3, 2, 1, 0, 2, 1, 3, 1];
        for (var s = 0; s < n * 16; s += 2) {
          var bar = at + Math.floor(s / 16), beat = (s % 16) / 4, tn = tones(TIMELINE2[bar], 5, 11);
          K(T(bar, beat), tn[A[(s / 2) % 13] % tn.length], .2, .5, true, 'kakula2');
          if ((s / 2) % 2 === 1) K(T(bar, beat + .25), tn[B[(s / 2) % 16] % tn.length], .14, .5, true, 'kakula');
        }
      }
      function gamba(at, chords, level, style) {
        chords.forEach(function (c, i) { var pcs = CHP[c], seq = style === 'soft' ? [[0, 0], [2, 1]] : [[0, 0], [.75, 2], [1.5, 1], [2, 0], [2.75, 2], [3.5, 1]];
          seq.forEach(function (sq) { var pc = pcs[Math.min(sq[1], pcs.length - 1)], f = pcF(pc, 4); if (f > 400) f /= 2; E.push({ t: T(at + i, sq[0]), k: 'kolintang', n: pc % 7, f: f, v: (sq[0] % 1 ? .16 : .22) * level, s: 'gamba' }); }); });
      }
      function bassGong(at, chords, level, style) { level *= .85; chords.forEach(function (c, i) { var f = pcF(CHP[c][0], 2); if (f < 80) f *= 2;
        E.push({ t: T(at + i, 0), k: 'bassgong', f: f, v: .42 * level, s: 'bass' });
        if (style === 'drive') { E.push({ t: T(at + i, 1.5), k: 'bassgong', f: f, v: .24 * level, s: 'bass' }); E.push({ t: T(at + i, 2.5), k: 'bassgong', f: f * 1.5 > 200 ? f * .75 : f * 1.5, v: .3 * level, s: 'bass' }); } }); }
      function tawa(at, chords, dense) { chords.forEach(function (c, i) { if (i % 2 === 0) E.push({ t: T(at + i, 0), k: 'gong', n: 0, f: 110, v: .22, s: 'gongs' }); if (dense || i % 2 === 1) E.push({ t: T(at + i, 2), k: 'gong', n: 1, f: 164.81, v: .12, s: 'gongs' }); }); }
      // gimba on the grid: low strokes as Euclidean 3-in-8, slaps on beats 2 and 4 (the kakula's even-beat stress), ghosts as 5-in-16
      function gimba(at, n, level, mode) {
        level *= .62; var low = euclid(3, 8, 0), ghost = euclid(5, 16, 3); // lighter: keep the beat, leave room for the kakula
        for (var b = 0; b < n; b++) { var x = at + b;
          if (mode === 'half') { E.push({ t: T(x, 0), k: 'drum', n: 'dum', v: .4 * level, s: 'drums' }); E.push({ t: T(x, 2), k: 'drum', n: 'tak', v: .3 * level, s: 'drums' }); continue; }
          low.forEach(function (on, e8) { if (on) E.push({ t: T(x, e8 / 2), k: 'drum', n: 'dum', v: (e8 === 0 ? .46 : .32) * level, s: 'drums' }); });
          [1, 3].forEach(function (bt) { E.push({ t: T(x, bt), k: 'drum', n: 'tak', v: .4 * level, s: 'drums' }); });
          if (mode === 'full') ghost.forEach(function (on, s16) { if (on && s16 % 4) E.push({ t: T(x, s16 / 4), k: 'drum', n: 'tak', v: .06 * level, s: 'drums' }); });
        }
      }
      function loom(at, n, level) { level *= 1.8; var beat = euclid(5, 8, 0);
        for (var b = 0; b < n; b++) { beat.forEach(function (on, e8) { if (on) E.push({ t: T(at + b, e8 / 2), k: e8 % 4 === 0 ? 'beater' : 'shuttle', v: (e8 % 4 === 0 ? .36 : .14) * level, s: 'loom' }); }); } }

      // Intro 0-11: one kakula, thinking (5-in-8 on A), the loom starts the cloth, then the interlock wakes up and the theme peeks in
      var think = euclid(5, 8, 0); for (var b0 = 0; b0 < 4; b0++) { var tn0 = tones(V2.INTRO_CH[b0], 5, 10); think.forEach(function (on, e8) { if (on) K(T(b0, e8 / 2), e8 === 0 ? tn0[0] : tn0[(e8 % 3) % tn0.length], e8 === 0 ? .36 : .22, .5, true); }); }
      loom(2, 10, .5); E.push({ t: T(4, 0), k: 'gong', n: 0, f: 110, v: .32, s: 'gongs' });
      interlock(4, V2.INTRO_CH.slice(4, 8), .2, 5); lead(VERSE.slice(0, 2), 8, .4, true); gamba(8, V2.INTRO_CH.slice(8), .6, 'soft');
      for (var r0 = 0; r0 < 4; r0++) E.push({ t: T(11, 3 + r0 / 4), k: 'drum', n: 'tak', v: .08 + r0 * .03, s: 'drums' });
      // Verse 12-19
      lead(VERSE, 12, .48); gimba(12, 8, .85, 'light'); bassGong(12, V2.VERSE_CH, .9, 'drive'); tawa(12, V2.VERSE_CH); loom(12, 8, .45);
      // Ring song 20-35: 13, 8, 5, 3 on the grid, into the heart
      ringSong(20); gamba(20, V2.RING_CH, .6, 'soft'); bassGong(20, V2.RING_CH, .75, 'whole'); loom(20, 16, .5); gimba(20, 12, .6, 'light'); gimba(32, 4, .5, 'half');
      // Verse 36-43, with the interlock under the lead
      lead(VERSE2, 36, .5); interlock(36, V2.VERSE2_CH, .13, 7); gamba(36, V2.VERSE2_CH, .85); gimba(36, 8, 1, 'light'); bassGong(36, V2.VERSE2_CH, 1, 'drive'); tawa(36, V2.VERSE2_CH); loom(36, 8, .35);
      // Chorus 44-51
      lead(CHORUS, 44, .54); harmony(CHORUS, V2.CHORUS_CH, 44, .2); interlock(44, V2.CHORUS_CH, .13, 9); gamba(44, V2.CHORUS_CH, 1); gimba(44, 8, 1.05, 'light'); bassGong(44, V2.CHORUS_CH, 1, 'drive'); tawa(44, V2.CHORUS_CH, true);
      // Bridge 52-67: the test: the soft lead at half speed over a 13-against-16 phase; the loom keeps weaving; a roll and a one-beat drop
      lead(BRIDGE.slice(0, 7), 52, .4, true, 2); phase(52, 14); gamba(52, V2.BRIDGE_CH, .55, 'soft'); bassGong(52, V2.BRIDGE_CH, .8, 'whole'); gimba(52, 14, .6, 'half'); loom(52, 14, .55); tawa(52, V2.BRIDGE_CH);
      for (var rl = 0; rl < 8; rl++) E.push({ t: T(67, 1 + rl / 4), k: 'drum', n: rl % 4 === 0 ? 'dum' : 'tak', v: .07 + rl * .02, s: 'drums' });
      lead([[[0, 6, .5], [.5, 8, .5], [1, 9, .5], [1.5, 8, .5], [2, 6, .5], [2.5, 8, .5], [3, 9, .5], [3.5, 12, .5]], [[0, 9, .5], [.5, 12, .5], [1, 11, .5], [1.5, 9, .5], [2, 8, .5], [2.5, 6, .5]]], 66, .44);
      // Final chorus 68-75
      lead(CHORUS, 68, .56); harmony(CHORUS, V2.CHORUS_CH, 68, .24); interlock(68, V2.CHORUS_CH, .14, 9); gamba(68, V2.CHORUS_CH, 1.05); gimba(68, 8, 1.1, 'full'); bassGong(68, V2.CHORUS_CH, 1.05, 'drive'); tawa(68, V2.CHORUS_CH, true); loom(68, 8, .35);
      // Outro 76-79: thinking again, then the bright A major
      lead(OUTRO, 76, .4, true); gamba(76, V2.OUTRO_CH, .6, 'soft'); bassGong(76, V2.OUTRO_CH, .75, 'whole'); loom(76, 3, .35);
      [9, 1, 4].forEach(function (pc) { E.push({ t: T(79, 0), k: 'kolintang', n: pc % 7, f: pcF(pc, 4), v: .26, s: 'gamba' }); });
      E.push({ t: T(79, 0), k: 'gong', n: 0, f: 110, v: .55, s: 'gongs' }); E.push({ t: T(79, 0), k: 'drum', n: 'dum', v: .45, s: 'drums' });
      return E;
    }
    return { compose: compose130, TIMELINE: TIMELINE2, chordTones: chordTones2, BAR: BAR_B, BPM: BPM_B };
  })();
  // ---------- score: Marea, the pavilion by the sea (an original for the mark, in the manner of Balinese gong kebyar) ----------
  // 40 bars at 112 bpm, one section per layer of the mark. The rules it keeps, so that it stays in tune with itself:
  //  1. One scale, exact octaves. Pelog selisir (ding dong deng dung dang) from ding = E4; every part, the gongs included, draws from it.
  //  2. One source melody per section. The pokok (core melody) is read from it, the tone sounding on each beat, and the kotekan,
  //     jegogan and reyong are built from the pokok, so no part can clash with another.
  //  3. A phrase is a gong cycle of two bars: the gong ageng marks the arrival on the first beat of the even bar, where the melody
  //     holds a pokok tone; the odd bar moves toward it. Every section ends on ding.
  //  4. The melody moves by step; a leap is answered by a step back.
  //  5. Kotekan: polos on the beat, sangsih between, never together, short notes; the beat always gets the pokok tone.
  //  6. Ombak: each kettle's partner beats against it at five a second across the whole set, not faster in the high register.
  //  7. Levels of scale (jegogan in halves, ugal in beats, kotekan in sixteenths), alternating repetition (question, answer),
  //     a breath (the angsel) before the close. All synthesized; no traditional piece is quoted.
  var LM = (function () {
    var SEL = [0, 1, 3, 7, 8], OMBAK_HZ = 5; // pelog selisir in semitones from ding; the paired instrument's beat rate
    function pf(p) { var o = Math.floor(p / 5), d = ((p % 5) + 5) % 5; return 329.63 * Math.pow(2, (SEL[d] + o * 12) / 12); } // p: 0..4 ding..dang, 5..9 the octave above
    // melodies as bars of [beat, pelog index, beats]; even bars begin with the arrival, odd bars move toward the next one
    var THEME = [[[0, 5, 2], [2, 6, .5], [2.5, 7, .5], [3, 8, 1]], [[0, 8, 1], [1, 7, 1], [2, 6, .5], [2.5, 7, .5], [3, 8, 1]], [[0, 8, 2], [2, 7, 1], [3, 6, 1]], [[0, 5, 1], [1, 6, 1], [2, 7, .5], [2.5, 8, .5], [3, 9, 1]],
      [[0, 7, 2], [2, 8, .5], [2.5, 9, .5], [3, 8, 1]], [[0, 7, 1], [1, 6, 1], [2, 5, 1], [3, 4, 1]], [[0, 5, 2], [2, 4, 1], [3, 3, 1]], [[0, 4, 1], [1, 3, 1], [2, 4, 1], [3, 5, .5], [3.5, 6, .5]]];
    var GARDEN = [[[0, 7, 2], [2, 8, 1], [3, 9, 1]], [[0, 9, 1], [1, 8, 1], [2, 9, .5], [2.5, 10, .5], [3, 9, 1]], [[0, 9, 2], [2, 8, 1], [3, 7, 1]], [[0, 8, 1], [1, 7, 1], [2, 6, 1], [3, 7, 1]],
      [[0, 8, 2], [2, 9, .5], [2.5, 8, .5], [3, 7, 1]], [[0, 6, 1], [1, 7, 1], [2, 8, 1], [3, 7, 1]], [[0, 5, 2], [2, 6, 1], [3, 7, 1]], [[0, 6, 1], [1, 5, 1], [2, 4, 1], [3, 5, 1]]];
    var BIRDS = [[[0, 7, 2], [2, 8, 1], [3, 9, 1]], [[0, 9, 1], [1, 8, .5], [1.5, 7, .5], [2, 8, 2]], [[0, 7, 2], [2, 6, 1], [3, 5, 1]], [[0, 6, 1], [1, 7, 1], [2, 6, 1], [3, 5, 1]]];
    var CLOSE = [[[0, 5, 4]]];
    var POKOK_SEA = [[0, 0, 0, 1], [2, 2, 1, 1], [0, 0, 3, 3], [2, 2, 1, 1], [0, 0, 1, 1], [3, 3, 2, 2], [0, 0, 0, 0], [1, 1, 0, 0]];
    // the pokok of a melody: the tone sounding on each beat
    function pokokOf(bars_) { var last = 5; return bars_.map(function (bar) { return [0, 1, 2, 3].map(function (bt) { bar.forEach(function (nt) { if (nt[0] <= bt + 1e-6) last = nt[1]; }); return last; }); }); }
    function compose(opt) {
      opt = opt || {}; var lilt = opt.feel === 'lilt' ? 1 / 6 : 0, E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR_M + beat * BEAT_M; }
      function K(time, p, v, beats, o) { o = o || {}; E.push({ t: time, k: 'kettle', n: ((p % 7) + 7) % 7, f: pf(p), v: v, soft: !!o.soft, damp: !!o.damp, pairHz: o.pair === false ? 0 : OMBAK_HZ, d: o.damp ? .14 : o.short ? .2 : clamp(beats * BEAT_M * (o.soft ? 2.4 : 1.8), .25, 2.2), s: o.stem || 'kakula' }); }
      // the ugal: the lead; a long note is approached from the scale tone below, lightly
      function ugal(bars_, at, v) { bars_.forEach(function (bar, i) { bar.forEach(function (nt) { var t0 = T(at + i, nt[0]); if (nt[2] >= 2 && nt[0] > 0) K(t0 - BEAT_M * .25, nt[1] - 1, v * .25, .25, { short: true }); K(t0, nt[1], v, nt[2]); }); }); }
      // kotekan on the pokok: polos plays the tone and its upper neighbour on the even sixteenths, sangsih the next two tones on the odd ones
      function kotekan(at, pokok, v, stem, up) {
        pokok.forEach(function (bar, i) { for (var s = 0; s < 16; s++) {
          var pk = bar[Math.floor(s / 4)] + (up || 0), polos = s % 2 === 0, off = polos ? [0, 1][(s / 2) % 2] : [2, 1][((s - 1) / 2) % 2];
          K(T(at + i, s / 4), pk + off, v * (s % 4 === 0 ? 1.15 : .8), .25, { short: true, stem: stem || (polos ? 'polos' : 'sangsih') });
        } });
      }
      // norot: the gentle figuration for the sea, the pokok tone and its upper neighbour trading in eighths
      function norot(at, pokok, v) { pokok.forEach(function (bar, i) { for (var e8 = 0; e8 < 8; e8++) { var pk = bar[Math.floor(e8 / 2)]; K(T(at + i, e8 / 2), pk + (e8 % 2), v * (e8 % 2 ? .75 : 1), .5, { short: true, stem: e8 % 2 ? 'sangsih' : 'polos' }); } }); }
      // jegogan hold the pokok two octaves down in half-bars; calung double it an octave down, lightly
      function jegogan(at, pokok, level) { pokok.forEach(function (bar, i) { [0, 2].forEach(function (bt) { var pk = bar[bt]; E.push({ t: T(at + i, bt), k: 'bassgong', f: pf(pk - 10), v: .4 * level, s: 'jegogan' }); E.push({ t: T(at + i, bt), k: 'kolintang', n: ((pk % 7) + 7) % 7, f: pf(pk - 5), v: .13 * level, s: 'jegogan' }); }); }); }
      function kempli(at, n, level) { for (var b = 0; b < n; b++) for (var bt = 0; bt < 4; bt++) K(T(at + b, bt), 8, .12 * level, .25, { damp: true, stem: 'kempli', pair: false }); }
      // the gong cycle, two bars: gong ageng (ding, two octaves down) on the even bar, kempur (dung below) on the odd, klentong (ding above) on the half
      function gongs(at, n, level) { for (var b = 0; b < n; b++) { E.push(b % 2 === 0 ? { t: T(at + b, 0), k: 'gong', n: 0, f: pf(-10), v: .42 * level, s: 'gongs' } : { t: T(at + b, 0), k: 'gong', n: 1, f: pf(-7), v: .24 * level, s: 'gongs' }); E.push({ t: T(at + b, 2), k: 'gong', n: 1, f: pf(5), v: .07 * level, s: 'gongs' }); } }
      function kendang(at, n, level, mode) {
        var pat = mode === 'light' ? [[0, 'dum', .4], [2, 'dum', .3], [3, 'tak', .3]] : [[0, 'dum', .44], [.75, 'tak', .3], [1.5, 'tak', .34], [2, 'dum', .36], [2.5, 'tak', .22], [3.25, 'tak', .34], [3.5, 'dum', .26]];
        for (var b = 0; b < n; b++) pat.forEach(function (h) { E.push({ t: T(at + b, h[0]), k: 'drum', n: h[1], v: h[2] * level * (b % 2 ? .9 : 1), s: 'kendang' }); });
      }
      function cengceng(at, n, level) { for (var b = 0; b < n; b++) { for (var e8 = 1; e8 < 8; e8 += 2) E.push({ t: T(at + b, e8 / 2), k: 'clap', v: .11 * level, s: 'cengceng' }); if (b % 2 === 0) E.push({ t: T(at + b, 0), k: 'clap', v: .2 * level, s: 'cengceng' }); } }
      function suling(bars_, at, v) { bars_.forEach(function (bar, i) { bar.forEach(function (nt) { E.push({ t: T(at + i, nt[0]), k: 'tatali', f: pf(nt[1]), v: v, d: nt[2] * BEAT_M * .92, s: 'suling' }); }); }); }
      function waves(at, n, level) { for (var b = 0; b < n; b++) for (var e8 = 0; e8 < 8; e8++) { var sw = .5 + .5 * Math.sin((e8 / 8) * Math.PI); E.push({ t: T(at + b, e8 / 2), k: 'shaker', v: (e8 % 2 ? .1 : .18) * sw * level, s: 'waves' }); } }
      // kebyar: the set strikes together on ding and dung through three octaves (a fifth, the scale's own consonance), with the gong and the cymbals
      function kebyar(bar, beat, v) { [0, 3, 5, 8, 10].forEach(function (p, i) { K(T(bar, beat) + i * .005, p, v * (i < 2 ? 1 : .7), 1.5); }); E.push({ t: T(bar, beat), k: 'gong', n: 0, f: pf(-10), v: .5, s: 'gongs' }); E.push({ t: T(bar, beat), k: 'clap', v: .28, s: 'cengceng' }); E.push({ t: T(bar, beat), k: 'drum', n: 'dum', v: .5, s: 'kendang' }); }
      var PK_THEME = pokokOf(THEME), PK_GARDEN = pokokOf(GARDEN), PK_BIRDS = pokokOf(BIRDS), PK_MARK = pokokOf(THEME.slice(0, 7).concat(CLOSE));

      // Title 0-3: two kebyar strikes out of silence, then the suling alone over the kempli and the sea
      kebyar(0, 0, .4); kebyar(0, 2.5, .32); kempli(2, 2, .8); waves(1, 3, .5);
      suling([[], [], [[0, 7, 2], [2, 6, 1], [3, 5, 1]], [[0, 5, 4]]], 0, .3);
      // The sea 4-11: the pokok on the jegogan, norot rocking above it, the gong cycle, the kendang softly; the gong ageng lifts the mountains
      jegogan(4, POKOK_SEA, .9); norot(4, POKOK_SEA, .24); kempli(4, 8, .8); gongs(4, 8, .9); kendang(4, 8, .55, 'light'); waves(4, 8, .8);
      suling([[], [], [[0, 7, 2], [2, 6, 2]], [[0, 5, 4]]], 8, .26);
      // The pavilion 12-19: the theme on the ugal over full kotekan; the kempur parts the gates
      ugal(THEME, 12, .5); kotekan(12, PK_THEME, .18); jegogan(12, PK_THEME, 1); kempli(12, 8, .9); gongs(12, 8, 1); kendang(12, 8, .8); waves(12, 8, .3);
      // The garden 20-27: the garden theme, higher; the reyong doubles the kotekan an octave up; ceng-ceng lightly; the suling closes the phrase
      ugal(GARDEN, 20, .5); kotekan(20, PK_GARDEN, .16); kotekan(20, PK_GARDEN, .08, 'reyong', 5); jegogan(20, PK_GARDEN, 1); kempli(20, 8, .9); gongs(20, 8, 1); kendang(20, 8, .85); cengceng(20, 8, .5); waves(20, 8, .3);
      suling([[], [], [], [], [], [], [[2, 6, 2]], [[0, 5, 4]]], 20, .24);
      // The birds 28-31: the suling sings over jegogan and kempli; dung and dang flutter above on the reyong
      suling(BIRDS, 28, .34); jegogan(28, PK_BIRDS, .8); kempli(28, 4, .7); gongs(28, 4, .8); waves(28, 4, .3);
      for (var b = 28; b < 32; b++) for (var e8 = 1; e8 < 8; e8 += 2) K(T(b, e8 / 2), e8 % 4 === 1 ? 8 : 9, .14, .25, { short: true, stem: 'reyong' });
      // The mark 32-39: everyone; an angsel on bar 37 (the set stops for a breath, the kendang calls), the arrival on 38, the close on 39
      ugal(THEME.slice(0, 7).concat(CLOSE), 32, .55); kotekan(32, PK_MARK, .2); kotekan(32, PK_MARK, .09, 'reyong', 5); jegogan(32, PK_MARK, 1.05); kempli(32, 8, 1); gongs(32, 8, 1.05); kendang(32, 8, 1); cengceng(32, 8, .8); waves(32, 8, .45);
      suling([[], [], [], [], [[0, 7, 2], [2, 6, 2]], [[0, 5, 4]], [], []], 32, .24);
      E = E.filter(function (e) { return !(e.t >= T(37, 1.5) - 1e-6 && e.t < T(38, 0) - 1e-6) || e.s === 'waves'; });
      [[37, 2, 'tak'], [37, 2.5, 'tak'], [37, 3, 'dum'], [37, 3.5, 'tak']].forEach(function (c) { E.push({ t: T(c[0], c[1]), k: 'drum', n: c[2], v: .4, s: 'kendang' }); });
      kebyar(38, 0, .34); kebyar(39, 0, .42); E.push({ t: T(39, 0), k: 'tatali', f: pf(5), v: .3, d: BAR_M * .9, s: 'suling' });
      return E;
    }
    // a strike from the welcome film or a touch, moved into this song's own scale so nothing clashes with it: the seven kakula
    // kettles become ding dong deng dung dang ding' deng' (an octave up when asked), a given pitch goes to the nearest pelog tone, the gongs to gong ageng and kempur
    function tune(e) {
      if (e.k === 'kettle') { var p; if (e.f) { var best = 1e9; for (var q = -5; q <= 14; q++) { var dlt = Math.abs(Math.log(e.f / pf(q))); if (dlt < best) { best = dlt; p = q; } } } else p = [0, 1, 2, 3, 4, 5, 7][((e.n || 0) % 7 + 7) % 7] + (e.oct ? 5 : 0);
        return Object.assign({}, e, { f: pf(p), oct: false, pairHz: OMBAK_HZ, n: ((p % 7) + 7) % 7 }); }
      if (e.k === 'gong') return Object.assign({}, e, { f: e.n ? pf(-7) : pf(-10) });
      return e;
    }
    return { compose: compose, tune: tune, BAR: BAR_M, BPM: BPM_M };
  })();

  var SCENES = SCENES_NTINA, starts = [], TOTAL = 0;
  function layoutScenes() { starts = []; TOTAL = 0; SCENES.forEach(function (s) { starts.push(TOTAL); TOTAL += s.dur; }); }
  layoutScenes();
  function sceneAt(t) { for (var i = SCENES.length - 1; i >= 0; i--) if (t >= starts[i]) return i; return 0; }

  function frame(t) {
    g.setTransform(K, 0, 0, K, 0, 0); g.fillStyle = C.ink; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    cecekGround(t);
    var i = sceneAt(t), sc = SCENES[i], lt = t - starts[i];
    sc.draw(lt, sc.dur);
    // structural footer: where we are in the sequence
    if (sc.step) {
      var n = SCENES.filter(function (s) { return s.step; }).indexOf(sc) + 1, total = SCENES.filter(function (s) { return s.step; }).length;
      text(CUR.name.toUpperCase() + ' · STEP ' + String(n).padStart(2, '0') + ' / ' + total + ' · ' + sc.phase.toUpperCase(), 72, H - 34, '500 12px ' + F.mono, C.muted, 1);
    }
    text('BATIK MEDIA LAB', W - 72, H - 34, '500 12px ' + F.mono, C.muted, 1, 'right');
    drawEnsemble(t);
    g.fillStyle = C.line; g.fillRect(0, H - 4, W, 4); g.fillStyle = C.gold2; g.fillRect(0, H - 4, W * t / TOTAL, 4);
  }

  // ---------- score: an original, synthesized ensemble ----------
  // kakula: seven small kettle gongs (Kaili), melody · gong: hanging gongs (tawa-tawa / nggongi), phrase marks
  // drum: double-headed drum (gimba / ganda), the dero sway. No samples, no quoted pieces, no lalove (ritual flute).
  var ROOT = 293.66, CENTS = [0, 300, 500, 700, 1000, 1200, 1400], DRIFT = [8, -12, 5, -6, 14, -4, 10]; // kettles drift; our tuning is our own
  function gseq(i) { var a = (i * GA) % (Math.PI * 2); return Math.floor(a / (Math.PI * 2) * 7) % 7; }
  var SCORES_NTINA = [['off', 'Sound off'], ['folk', 'Lingkar Ntina · folk ensemble'], ['ntina', 'Lingkar Ntina · acoustic (v2)'], ['lingkar', 'Sketch: Circle'], ['panen', 'Sketch: Harvest'], ['gema', 'Sketch: Resonance']];
  // =================== Reel 04 · Rebung border, the bamboo shoot ===================
  // Score: Pucuk Rebung (bamboo shoot), an original for the same Kaili kakula ensemble as Bunga Kaili. 100 bpm, 52 bars, one
  // section per scene. The rules it keeps so that music and drawing arrive together:
  //  1. The shoot is a rising run of five kettle notes inside one bar; it grows one note per bar in the drawing scene.
  //  2. Two rows, half a step apart: a second kakula plays the same run two beats later, a third above.
  //  3. The spine is a zigzag: the low gongs alternate two pitches on beats 1 and 3; the cecek dots are the loom's off-beat ticks.
  //  4. The gong cycle is two bars, as in the other reels; the border bends by moving the run up a step and back.
  var BPM_R = 100, BEAT_R = 60 / BPM_R, BAR_R = BEAT_R * 4; function barsR(n) { return n * BAR_R; }
  var LR = (function () {
    var PITCH = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25, 587.33, 659.26, 783.99, 880.00, 987.77];
    var CHP = { Am: [9, 0, 4], F: [5, 9, 0], G: [7, 11, 2], Em: [4, 7, 11], Dm: [2, 5, 9] };
    function pcF(pc, oct) { return 261.63 * Math.pow(2, pc / 12) * Math.pow(2, oct - 4); }
    var RUN = [0, 1, 2, 4, 5]; // la do re mi sol: the shoot's five sheaths, rising
    function compose(opt) {
      var lilt = opt && opt.feel === 'lilt' ? BEAT_R * .08 : 0, E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR_R + beat * BEAT_R; }
      function F(p) { return PITCH[Math.max(0, Math.min(PITCH.length - 1, p))]; }
      function K(time, p, v, beats, soft, stem) { E.push({ t: time, k: 'kettle', n: ((p % 7) + 7) % 7, f: F(p), v: v, soft: !!soft, d: clamp(beats * BEAT_R * (soft ? 2.6 : 2), .3, 2.2), s: stem || 'kakula' }); }
      // one shoot: n notes of the run from base pitch b, starting at beat bt; the last note holds
      function shoot(bar, bt, b, n, v, soft, stem) { for (var i = 0; i < n; i++) K(T(bar, bt + i * .5), b + RUN[i], v * (i === n - 1 ? 1.1 : .85), i === n - 1 ? 1.5 : .5, soft, stem); }
      function rows(at, n, b, v, both, soft) { for (var i = 0; i < n; i++) { shoot(at + i, 0, b, 5, v, soft, 'kakula'); if (both) shoot(at + i, 2, b + 2, 5, v * .8, true, 'kakula2'); } }
      var ROOT = { Am: [110, 82.41], F: [87.31, 130.81], G: [98, 73.42], Em: [82.41, 123.47], Dm: [73.42, 110] }; // root, fifth
      function spine(at, n, level, chords) { for (var i = 0; i < n; i++) { var rf = ROOT[chords ? chords[i % chords.length] : 'Am']; E.push({ t: T(at + i, 0), k: 'bassgong', f: rf[0], v: .42 * level, s: 'bass' }); E.push({ t: T(at + i, 2), k: 'bassgong', f: rf[1], v: .34 * level, s: 'bass' }); } }
      function gongs(at, n, level) { for (var i = 0; i < n; i++) { if (i % 2 === 0) E.push({ t: T(at + i, 0), k: 'gong', n: 0, f: 110, v: .3 * level, s: 'gongs' }); else E.push({ t: T(at + i, 2), k: 'gong', n: 1, f: 164.81, v: .18 * level, s: 'gongs' }); } }
      function dots(at, n, level) { for (var i = 0; i < n; i++) [.5, 1.5, 2.5, 3.5].forEach(function (bt) { E.push({ t: T(at + i, bt), k: 'shuttle', v: .14 * level, s: 'loom' }); }); }
      function beaters(at, n, level) { for (var i = 0; i < n; i++) { E.push({ t: T(at + i, 1), k: 'beater', v: .32 * level, s: 'loom' }); E.push({ t: T(at + i, 3), k: 'beater', v: .26 * level, s: 'loom' }); } }
      function chords(at, names, level) { names.forEach(function (c, i) { CHP[c].forEach(function (pc, k) { var f = pcF(pc, 4); if (f > 400) f /= 2; E.push({ t: T(at + i, k === 0 ? 0 : 2), k: 'kolintang', n: pc % 7, f: f, v: .16 * level, s: 'gamba' }); }); }); }
      function drums(at, n, level, full) { for (var i = 0; i < n; i++) { E.push({ t: T(at + i, 0), k: 'drum', n: 'dum', v: .42 * level, s: 'drums' }); E.push({ t: T(at + i, 2), k: 'drum', n: 'dum', v: .3 * level, s: 'drums' }); E.push({ t: T(at + i, 1), k: 'drum', n: 'tak', v: .3 * level, s: 'drums' }); E.push({ t: T(at + i, 3), k: 'drum', n: 'tak', v: .3 * level, s: 'drums' }); if (full) E.push({ t: T(at + i, 3.5), k: 'drum', n: 'tak', v: .18 * level, s: 'drums' }); } }
      // Title 0-3: one soft shoot every other bar, the first gong
      E.push({ t: T(0, 0), k: 'gong', n: 0, f: 110, v: .34, s: 'gongs' }); shoot(0, 0, 0, 5, .36, true); shoot(2, 0, 0, 5, .36, true);
      // Listen 4-11: the cloth: loom ticks, a soft shoot on the even bars, low gong on the cycle
      dots(4, 8, .7); for (var b = 4; b < 12; b += 2) shoot(b, 0, 0, 5, .34, true); gongs(4, 8, .7);
      // Brief 12-15: chords under a soft shoot per bar
      rows(12, 4, 0, .36, false, true); chords(12, ['Am', 'F', 'G', 'Am'], .9); gongs(12, 4, .8);
      // Draw one shoot 16-23: the run grows one note per bar, then plays whole for the last three
      [1, 2, 3, 4, 5, 5, 5, 5].forEach(function (n, i) { shoot(16 + i, 0, 0, n, .5, false); }); dots(16, 8, .5); gongs(16, 8, .8);
      // Rows 24-31: the second row joins two beats later, a third below; drums and spine arrive
      rows(24, 8, 0, .52, true, false); spine(24, 8, .8); drums(24, 8, .8, false); gongs(24, 8, 1); dots(24, 8, .6);
      // Bend 32-39: the run moves up a step and back as the band bends; full ensemble, chords walk
      [0, 1, 2, 3, 3, 2, 1, 0].forEach(function (up, i) { shoot(32 + i, 0, up, 5, .56); shoot(32 + i, 2, up + 2, 5, .44, true, 'kakula2'); });
      chords(32, ['Am', 'F', 'G', 'Em', 'Em', 'G', 'F', 'Am'], 1); spine(32, 8, 1, ['Am', 'F', 'G', 'Em', 'Em', 'G', 'F', 'Am']); drums(32, 8, 1, true); gongs(32, 8, 1); beaters(32, 8, .8); dots(32, 8, .6);
      // Misread 40-43: the test, soft and sparse
      for (var m = 40; m < 44; m++) shoot(m, 0, 0, m % 2 ? 3 : 5, .34, true); dots(40, 4, .4); gongs(40, 4, .6);
      // System 44-47: the border in place: everything back, bright
      rows(44, 4, 0, .52, true, false); chords(44, ['Am', 'F', 'G', 'Am'], 1); spine(44, 4, 1, ['Am', 'F', 'G', 'Am']); drums(44, 4, .9, true); gongs(44, 4, 1); dots(44, 4, .6);
      // Keep 48-51: a last shoot that keeps rising to the top, and the gong
      shoot(48, 0, 0, 5, .5); shoot(49, 0, 2, 5, .5); shoot(50, 0, 3, 5, .52); K(T(51, 0), 11, .6, 3, false); K(T(51, 0), 7, .3, 3, true, 'kakula2');
      [9, 0, 4].forEach(function (pc) { E.push({ t: T(51, 0), k: 'kolintang', n: pc % 7, f: pcF(pc, 4), v: .22, s: 'gamba' }); });
      E.push({ t: T(51, 0), k: 'gong', n: 0, f: 110, v: .55, s: 'gongs' }); E.push({ t: T(51, 0), k: 'drum', n: 'dum', v: .45, s: 'drums' }); spine(48, 3, .8); dots(48, 3, .5);
      return E;
    }
    return { compose: compose, BAR: BAR_R, BPM: BPM_R };
  })();

  // ---------- drawing the border ----------
  var REBUNG_SHAPE = [[-0.5, 0], [-0.43, 0.2], [-0.36, 0.4], [-0.24, 0.62], [-0.12, 0.82], [0, 1], [0.12, 0.82], [0.24, 0.62], [0.36, 0.4], [0.43, 0.2], [0.5, 0]];
  function linePts(x0, y0, x1, y1) { var pts = []; for (var i = 0; i <= 60; i++) pts.push([x0 + (x1 - x0) * i / 60, y0 + (y1 - y0) * i / 60]); return pts; }
  function wavePts(x0, x1, y, amp, waves) { var pts = []; for (var i = 0; i <= 160; i++) { var u = i / 160; pts.push([x0 + (x1 - x0) * u, y + Math.sin(u * Math.PI * 2 * waves) * amp]); } return pts; }
  function arcPts(cx, cy, r, a0, a1) { var pts = []; for (var i = 0; i <= 120; i++) { var a = a0 + (a1 - a0) * i / 120; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
  function spiralPts(cx, cy, r0, r1, turns) { var pts = []; for (var i = 0; i <= 240; i++) { var u = i / 240, a = u * Math.PI * 2 * turns, r = r0 + (r1 - r0) * u; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
  // the band drawn with the studio's own engine (rebungRibbon), revealed from the left to prog (0..1) of its bounding width
  // how much the ensemble is sounding right now (0 with sound off): the border breathes with it
  function liveLevel() { if (SND.kind === 'off') return 0; var k = 0; for (var i = 0; i < 7; i++) k = Math.max(k, lvK(i, t)); return clamp(k * .5 + lvD(t) * .3 + lvG(0, t) * .4, 0, 1); }
  // o.flow: px/s the shoots travel along the path · o.breathe: 0..1 slow swell · o.edge: a gold glow at the reveal edge
  function band(pts, h, ink, phase, prog, alpha, o) {
    if (alpha <= 0 || prog <= 0) return; o = o || {};
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - h * 2, x1 = Math.max.apply(null, xs) + h * 2, y0 = Math.min.apply(null, ys) - h * 2, y1 = Math.max.apply(null, ys) + h * 2;
    var lv = liveLevel(), br = (o.breathe || 0) * (.5 + .5 * Math.sin(t * 1.9)) * .022 + lv * .035, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    g.save(); g.globalAlpha *= alpha;
    if (!reduce) { g.translate(cx, cy); g.scale(1 + br, 1 + br); g.translate(-cx, -cy); }
    g.beginPath(); g.rect(x0, y0, (x1 - x0) * clamp(prog, 0, 1), y1 - y0); g.clip();
    var shapes = rebungRibbon(pts, h, ink, (phase || 0) + (reduce ? 0 : (o.flow || 0) * t));
    if (lv > .02) shapes.forEach(function (sh) { if (sh.dot) sh.r *= 1 + lv * .9; });
    rebungToCanvas(g, shapes);
    if (o.edge && prog > 0 && prog < 1) { var ex = x0 + (x1 - x0) * prog, grd = g.createLinearGradient(ex - 48, 0, ex, 0); grd.addColorStop(0, 'rgba(224,194,126,0)'); grd.addColorStop(1, 'rgba(224,194,126,.55)'); g.fillStyle = grd; g.fillRect(ex - 48, y0, 48, y1 - y0); }
    if (lv > .05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha *= lv * .22; g.fillStyle = C.gold; g.fillRect(x0, y0, (x1 - x0) * clamp(prog, 0, 1), y1 - y0); }
    g.restore();
  }
  // a reveal that pops one shoot at a time: n steps, each eased, so the border arrives on the beat rather than sliding
  function popped(p, n) { if (p <= 0) return 0; if (p >= 1) return 1; var q = p * n; return (Math.floor(q) + eo(q % 1)) / n; }
  // one shoot drawn large, stroke by stroke: outline, sheath, three chevrons, the dot
  function bigShoot(cx, cy, w, L, prog, alpha, ink) {
    var C2 = REBUNG_INKS[ink || 'buya-bomba']; g.save(); g.globalAlpha *= alpha; g.lineJoin = 'round'; g.lineCap = 'round';
    var lv = liveLevel(), sw = prog >= 1 && !reduce ? 1 + Math.sin(t * 2.4) * .012 + lv * .05 : 1; g.translate(cx, cy); g.scale(sw, sw); g.translate(-cx, -cy);
    if (lv > .05 && prog >= .9) { var gl = g.createRadialGradient(cx, cy - L, 0, cx, cy - L, w * .35); gl.addColorStop(0, 'rgba(224,194,126,' + (lv * .5).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(224,194,126,0)'); g.fillStyle = gl; g.fillRect(cx - w, cy - L - w, w * 2, w * 2); }
    var n = REBUNG_SHAPE.length, k = Math.floor(clamp(prog, 0, 1) * 1.0 * (n - 1) / .45);
    g.strokeStyle = C.gold2; g.lineWidth = 3; g.beginPath();
    for (var i = 0; i <= Math.min(n - 1, k); i++) { var q = REBUNG_SHAPE[i], x = cx + q[0] * w, y = cy - q[1] * L; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    if (prog >= .45) { g.closePath(); g.fillStyle = C2.shoot; g.fill(); } g.stroke();
    if (prog >= .55) { var hp = eo(ramp(prog, .55, .68)); g.globalAlpha *= 1; g.fillStyle = C2.shootLight; g.beginPath(); [[-0.22, 0.18], [0, 0.66], [0.22, 0.18]].forEach(function (q, i) { var x = cx + q[0] * w, y = cy - q[1] * L * hp; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fill(); }
    [0.28, 0.5, 0.72].forEach(function (fv, i) { var p = ramp(prog, .7 + i * .07, .76 + i * .07); if (p <= 0) return; var ww = 0.5 * (1 - fv) * 0.92 * w * p; g.strokeStyle = C2.chevron; g.lineWidth = 3.2; g.beginPath(); g.moveTo(cx - ww, cy - (fv * L - 0.06 * L)); g.lineTo(cx, cy - (fv * L + 0.06 * L)); g.lineTo(cx + ww, cy - (fv * L - 0.06 * L)); g.stroke(); });
    if (prog >= .93) { g.fillStyle = C2.dot; g.beginPath(); g.arc(cx, cy - L * .12, Math.max(2, w * .05) * eo(ramp(prog, .93, 1)), 0, 7); g.fill(); }
    g.restore();
  }
  // a sketched cloth: two rows of dashed triangles facing a zigzag, the way the border sits on a buya bomba
  function clothSketch(x, y, w, h, alpha) {
    g.save(); g.globalAlpha *= alpha; g.strokeStyle = C.gold; g.lineWidth = 1.6; g.setLineDash([6, 6]);
    var n = 7, tw = w / n;
    for (var i = 0; i < n; i++) { var cx = x + tw * (i + .5); g.beginPath(); g.moveTo(cx - tw * .42, y); g.lineTo(cx, y + h * .42); g.lineTo(cx + tw * .42, y); g.stroke(); var cx2 = cx + tw / 2; if (i < n - 1) { g.beginPath(); g.moveTo(cx2 - tw * .42, y + h); g.lineTo(cx2, y + h * .58); g.lineTo(cx2 + tw * .42, y + h); g.stroke(); } }
    g.setLineDash([]); g.strokeStyle = C.gold2; g.beginPath(); for (var k = 0; k <= n * 2; k++) { var zx = x + (w / (n * 2)) * k, zy = y + h / 2 + (k % 2 ? -5 : 5); if (k) g.lineTo(zx, zy); else g.moveTo(zx, zy); } g.stroke();
    g.restore();
  }
  var SCENES_REBUNG = [
    { id: 'r-title', dur: barsR(4), step: null,
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .5, d), p = eo(ramp(lt, .2, 3.6));
        band(linePts(200, 262, 1080, 262), 38, 'buya-bomba', 0, popped(p, 24), out, { flow: 14, breathe: 1, edge: true });
        var a = eo(ramp(lt, 1.6, 2.6)) * out;
        text('BATIK MEDIA LAB · REEL 04', W / 2, 400, '500 13px ' + F.mono, C.gold2, a, 'center');
        text('Rebung border', W / 2, 480, '600 84px ' + F.display, C.paper, a, 'center');
        text('Two rows of bamboo shoots, meeting at the spine', W / 2, 526, 'italic 500 24px ' + F.display, C.mist, eo(ramp(lt, 2.2, 3.4)) * out, 'center');
      } },
    { id: 'r-listen', dur: barsR(8), step: 'Listen to the cloth', phase: 'Thinking',
      eyebrow: 'Step 1 · Listen to the cloth', head: 'A border that points inward.',
      body: 'On the buya bomba of Donggala, rows of rebung, the bamboo shoot, frame the field, each shoot pointing in toward the centre of the cloth, with zigzag and dotted bands beside them. In the cloth’s own iconography the inward-facing rebung stand for power, greatness and triumph.',
      teach: 'Read the border as grammar before you draw: the direction (inward), the pairing (two rows facing), the framing (zigzag, dots), and what it means to the people who weave it.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, 1, 2.4)) * out, b = eo(ramp(lt, 5, 6.2)) * out, c = eo(ramp(lt, 9.5, 10.7)) * out;
        ikatField(660, 110, 540, 150, lt, a); text('ikat · gold on black (an abstract weave, not a copy)', 660, 282, '500 12px ' + F.mono, C.mist, a);
        clothSketch(660, 330, 540, 120, b); text('two rows · facing in · zigzag between · dots beside', 930, 480, '500 12px ' + F.mono, C.mist, b, 'center');
        g.save(); g.globalAlpha = c; g.strokeStyle = C.gold2; g.lineWidth = 1.5; rr(900, 520, 300, 110, 6); g.stroke(); g.restore();
        text('RULE', 920, 550, '500 12px ' + F.mono, C.gold2, c); para('Learn the grammar. Redraw everything else.', 920, 582, 270, 'italic 500 22px ' + F.display, 26, C.paper, c);
      } },
    { id: 'r-brief', dur: barsR(4), step: 'Set the brief', phase: 'Thinking',
      eyebrow: 'Step 2 · Set the brief', head: 'A border that can travel.',
      body: 'The rebung border belongs to the Dua Pulau signature. It must frame a sarong, run along a hem, and bend along a wave or a spiral without losing its grammar.',
      teach: 'The brief: our own drawing, credited origins, seamless along the cloth, two rows facing inward, and a ribbon that follows any path.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        ['Our own drawing, never a copy of the cloth', 'Two rows face inward to a zigzag spine', 'Seamless along the cloth, and bends along any path', 'Credit the weavers of Donggala'].forEach(function (r, i) {
          var a = eo(ramp(lt, .6 + i * 1.1, 1.4 + i * 1.1)) * out; g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(680, 190 + i * 84, 5, 0, 7); g.fill(); g.restore();
          text(r, 704, 196 + i * 84, '500 24px ' + F.display, C.paper, a);
        });
        band(linePts(680, 560, 1200, 560), 26, 'buya-bomba', 0, popped(ramp(lt, 4.5, 7.5), 16), out, { flow: 10, breathe: 1, edge: true });
      } },
    { id: 'r-shoot', dur: barsR(8), step: 'Draw one shoot', phase: 'Ideation',
      eyebrow: 'Step 3 · Draw one shoot', head: 'Eleven points, one sheath, three chevrons, a dot.',
      body: 'The shoot is a flat mark: an eleven-point outline that tapers to its tip, a lighter sheath inside, three nested chevrons for the leaf scales, and one pearl dot at the base. Every curve of the source becomes a straight segment, so it cuts, stamps and prints the same.',
      teach: 'Reduce to flat marks that survive at 16 px. A polygon with eleven points keeps the taper of a real shoot; chevrons stand in for the sheath lines without drawing them.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), p = ramp(lt, .4, d - 3), a = eo(ramp(lt, .3, 1)) * out;
        g.save(); g.globalAlpha = a * .5; g.strokeStyle = C.line2; g.lineWidth = 1; for (var gx = 700; gx <= 1180; gx += 40) { g.beginPath(); g.moveTo(gx, 120); g.lineTo(gx, 600); g.stroke(); } for (var gy = 120; gy <= 600; gy += 40) { g.beginPath(); g.moveTo(700, gy); g.lineTo(1180, gy); g.stroke(); } g.restore();
        bigShoot(940, 580, 360, 400, p, out);
        var labels = [[.45, 'outline · 11 points'], [.68, 'sheath · lighter'], [.9, 'three chevrons'], [1, 'one pearl dot']];
        labels.forEach(function (L, i) { var la = eo(ramp(p, L[0] - .05, L[0] + .02)) * out; text(L[1], 1200, 180 + i * 34, '500 12px ' + F.mono, C.gold2, la, 'right'); });
      } },
    { id: 'r-rows', dur: barsR(8), step: 'Grow the rows', phase: 'Synthesis', explore: 'rows',
      eyebrow: 'Step 4 · Grow the rows', head: 'Two rows, half a step apart, meeting at the spine.',
      body: 'The top row sits on the beat; the bottom row starts half a step later, so the shoots interlock instead of standing in pairs. Between them runs the zigzag spine with cecek dots alternating either side, and an edge band closes the border top and bottom.',
      teach: 'Offset the second row by half a spacing: the eye reads one woven band, not two rows of teeth. The spine is what makes it a border rather than a frieze.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), ex = EX && EX.scene === 'r-rows';
        var h = ex ? EX.h : 34, ink = ex ? EX.ink : 'buya-bomba', path = ex ? EX.path : 'straight';
        var pts = path === 'wave' ? wavePts(680, 1200, 400, 46, 1.5) : path === 'arc' ? arcPts(940, 640, 300, Math.PI * 1.15, Math.PI * 1.85) : linePts(680, 400, 1200, 400);
        var p = ex ? 1 : ramp(lt, .5, d - 2.5);
        band(pts, h, ink, 0, ex ? 1 : popped(p, 26), out, { flow: ex ? 12 : 0, breathe: 1, edge: !ex });
        if (!ex) { var k = p < .34 ? 'top row, on the beat' : p < .67 ? 'bottom row, half a step later' : 'spine and dots between'; text(k, 940, 520, '500 12px ' + F.mono, C.gold2, out * .9, 'center'); }
      } },
    { id: 'r-bend', dur: barsR(8), step: 'Bend it along a path', phase: 'Synthesis',
      eyebrow: 'Step 5 · Bend it along a path', head: 'Every shoot leans with the curve.',
      body: 'The same band is drawn live along any path: a wave, an arc, a golden spiral. Each shoot takes the local tangent, the rows keep their half-step, and where a curve is too tight for the band the engine leaves a gap rather than crumpling the shoots.',
      teach: 'A border that bends is a system, not a picture. Decide what happens at the limit (skip, never crumple) and the ribbon can go anywhere the pattern goes.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        var wv = []; for (var i = 0; i <= 160; i++) { var u = i / 160; wv.push([680 + 520 * u, 230 + Math.sin(u * Math.PI * 3 + (reduce ? 0 : lt * 1.1)) * (40 + Math.sin(lt * .7) * 6)]); }
        band(wv, 26, 'buya-bomba', 0, popped(ramp(lt, .3, 4.5), 20), out, { flow: 22, breathe: 1, edge: true });
        var rot = reduce ? 0 : lt * .12, sp = []; for (var j = 0; j <= 240; j++) { var v = j / 240, a = v * Math.PI * 2 * 2.2 + rot, r = 36 + 114 * v; sp.push([940 + Math.cos(a) * r, 480 + Math.sin(a) * r]); }
        band(sp, 20, 'buya-bomba', 0, eo(ramp(lt, 5, 11)), out, { flow: 8, breathe: 1 });
        text('tight turns at the centre: skipped, not crumpled', 940, 664, '500 12px ' + F.mono, C.mist, eo(ramp(lt, 9, 10)) * out, 'center');
      } },
    { id: 'r-misread', dur: barsR(4), step: 'Check misreadings', phase: 'Test',
      eyebrow: 'Step 6 · Check misreadings', head: 'Teeth, arrows, or shoots?',
      body: 'At twelve pixels the chevrons vanish and the border reads as a sawtooth or a row of arrowheads. At twenty the sheath returns and it reads as plant. The dots are the last thing to survive, so they carry the rhythm when nothing else can.',
      teach: 'Test the border at the smallest size it will be printed or shown. Decide what it may lose (chevrons) and what it must keep (direction, the spine).',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        [[12, 150, 'sawtooth · arrowheads'], [20, 300, 'reads as plant'], [40, 500, 'the full grammar']].forEach(function (R, i) {
          var a = eo(ramp(lt, .4 + i * 1.6, 1.2 + i * 1.6)) * out; band(linePts(700, R[1], 1200, R[1]), R[0], 'buya-bomba', 0, 1, a, { flow: 6 + i * 6, breathe: .6 });
          text(R[0] + ' px · ' + R[2], 700, R[1] + R[0] + 34, '500 12px ' + F.mono, C.gold2, a);
        });
      } },
    { id: 'r-system', dur: barsR(4), step: 'Where the border lives', phase: 'System',
      eyebrow: 'Step 7 · Where the border lives', head: 'Hems, heads, edges and ribbons.',
      body: 'The border frames the Dua Pulau sarong at head and hem, edges a scarf, and runs as the rebung ribbon through the Ntina garden, tracing its spirals. One drawing, four jobs.',
      teach: 'A signature motif earns its place by working at several scales and roles. Keep the master drawing in one place and let every use read from it.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .4, 1.4)) * out, b = eo(ramp(lt, 2.4, 3.6)) * out;
        g.save(); g.globalAlpha = a; g.fillStyle = '#FAF7F2'; rr(700, 130, 220, 470, 4); g.fill(); g.restore();
        band(linePts(716, 170, 904, 170), 14, 'dua-pulau', 0, 1, a, { flow: 5 }); band(linePts(716, 560, 904, 560), 14, 'dua-pulau', 0, 1, a, { flow: -5 });
        text('sarong · head and hem', 810, 630, '500 12px ' + F.mono, C.mist, a, 'center');
        band(spiralPts(1060, 360, 26, 128, 2), 16, 'buya-bomba', 0, 1, b, { flow: 7, breathe: 1 }); text('Ntina garden · rebung ribbon', 1070, 630, '500 12px ' + F.mono, C.mist, b, 'center');
      } },
    { id: 'r-keep', dur: barsR(4), step: 'Credit and keep', phase: 'Archive',
      eyebrow: 'Step 8 · Credit and keep', head: 'Credit the cloth. Keep the drawing.',
      body: 'Rebung border: our own drawing, inspired by the inward-facing bamboo-shoot borders of the buya bomba of Donggala, Central Sulawesi, with gratitude to the women who weave it. The master lives in the engine as a ribbon; every sarong, hem and ribbon reads from it.',
      teach: 'Credit is part of the design. Keep the source, the rule, the drawing and the credit line together, so the next person can continue rather than restart.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        band(linePts(680, 300, 1200, 300), 34, 'buya-bomba', 0, 1, eo(ramp(lt, .3, 1.5)) * out, { flow: 16, breathe: 1 });
        text('REEL 04 · SAVED TO THE LAB', 940, 420, '500 13px ' + F.mono, C.gold2, eo(ramp(lt, 2, 3)) * out, 'center');
        text('Next: Ketupat lattice', 940, 456, 'italic 500 22px ' + F.display, C.mist, eo(ramp(lt, 3.2, 4.2)) * out, 'center');
      } }
  ];
  var SCORES_REBUNG = [['off', 'Sound off'], ['rebung', 'Pucuk Rebung · 100 bpm']];
  var STEMS_REBUNG = [['kakula', 'Kakula, top row'], ['kakula2', 'Second kakula, bottom row'], ['gamba', 'Gamba-gamba'], ['gongs', 'Tawa-tawa'], ['drums', 'Gimba'], ['bass', 'Low gongs, the spine'], ['loom', 'Loom, the dots']];

  // =================== Reel 05 · Ketupat lattice, the woven diamond ===================
  // Score: Anyam Ketupat (weaving the ketupat), an original for the same Kaili kakula ensemble. 96 bpm, 52 bars, one section
  // per scene. The rules it keeps so that music and drawing arrive together:
  //  1. One diamond is one bar: two kakula start on the same kettle and open apart in contrary motion, one rising and one
  //     falling, to the widest point on beat 3, then close back together. Drawn as pitch against time, the bar is a diamond.
  //  2. The rings nest: the gamba-gamba plays a narrower diamond inside it (root, then third and fifth together, then root),
  //     and the low gong is the dark heart on beat 3.
  //  3. The lattice is a centred grid, so the next diamond starts half a tile on: a canon half a bar later, two kettles away.
  //  4. A cecek cross sits where four diamonds meet, so the loom ticks just before and after each bar line, round a beater on 1.
  //  5. It ends where it started: every voice on A.
  var BPM_K = 96, BEAT_K = 60 / BPM_K, BAR_K = BEAT_K * 4; function barsK(n) { return n * BAR_K; }
  var LK = (function () {
    var PITCH = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25, 587.33, 659.26, 783.99, 880.00, 987.77];
    var CHP = { Am: [9, 0, 4], C: [0, 4, 7], G: [7, 11, 2] };
    var ROOT = { Am: 110, C: 130.81, G: 98 };
    var CENTRE = { Am: 5, C: 7, G: 6 }; // the kettle each diamond opens from, chosen so its widest point sits in the chord
    function pcF(pc, oct) { return 261.63 * Math.pow(2, pc / 12) * Math.pow(2, oct - 4); }
    function compose(opt) {
      var lilt = opt && opt.feel === 'lilt' ? BEAT_K * .08 : 0, E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR_K + beat * BEAT_K; }
      function F(p) { return PITCH[Math.max(0, Math.min(PITCH.length - 1, p))]; }
      function K(time, p, v, beats, soft, stem) { E.push({ t: time, k: 'kettle', n: ((p % 7) + 7) % 7, f: F(p), v: v, soft: !!soft, d: clamp(beats * BEAT_K * (soft ? 2.6 : 2), .3, 2.2), s: stem || 'kakula' }); }
      // one diamond from kettle c, eighth notes from beat bt: the top line climbs `span` kettles and comes back, the bottom line mirrors it.
      // o.len cuts it short (the drawing grows it), o.bot false plays only the top line, o.swap trades the two players (over and under)
      function diamond(bar, bt, c, v, soft, o) {
        o = o || {}; var span = o.span || 4, len = o.len || span * 2, up = o.swap ? 'kakula2' : 'kakula', dn = o.swap ? 'kakula' : 'kakula2';
        for (var i = 0; i < len; i++) {
          var k = i <= span ? i : 2 * span - i, tm = T(bar, bt + i * (2 / span)), vv = v * (i === 0 ? 1.1 : i === span ? 1.05 : .85), hold = 2 / span;
          K(tm, c + k, vv, hold, soft, up); if (o.bot !== false && k > 0) K(tm, c - k, vv * .85, hold, soft, dn);
        }
      }
      function ring(bar, ch, v) { var p = CHP[ch]; function kol(bt, pc) { var f = pcF(pc, 4); if (f > 400) f /= 2; E.push({ t: T(bar, bt), k: 'kolintang', n: pc % 7, f: f, v: v, s: 'gamba' }); } kol(1, p[0]); kol(2, p[1]); kol(2, p[2]); kol(3, p[0]); }
      function heart(bar, ch, v) { E.push({ t: T(bar, 0), k: 'bassgong', f: ROOT[ch], v: .3 * v, s: 'bass' }); E.push({ t: T(bar, 2), k: 'bassgong', f: ROOT[ch], v: .42 * v, s: 'bass' }); }
      function cross(at, n, v) { for (var i = 0; i < n; i++) { [.25, .5, 3.5, 3.75].forEach(function (bt) { E.push({ t: T(at + i, bt), k: 'shuttle', v: .13 * v, s: 'loom' }); }); E.push({ t: T(at + i, 0), k: 'beater', v: .3 * v, s: 'loom' }); } }
      function gongs(at, n, level) { for (var i = 0; i < n; i++) { if (i % 2 === 0) E.push({ t: T(at + i, 0), k: 'gong', n: 0, f: 110, v: .3 * level, s: 'gongs' }); else E.push({ t: T(at + i, 2), k: 'gong', n: 1, f: 164.81, v: .18 * level, s: 'gongs' }); } }
      function drums(at, n, level, full) { for (var i = 0; i < n; i++) { E.push({ t: T(at + i, 0), k: 'drum', n: 'dum', v: .42 * level, s: 'drums' }); E.push({ t: T(at + i, 2), k: 'drum', n: 'dum', v: .3 * level, s: 'drums' }); E.push({ t: T(at + i, 1), k: 'drum', n: 'tak', v: .28 * level, s: 'drums' }); E.push({ t: T(at + i, 3), k: 'drum', n: 'tak', v: .28 * level, s: 'drums' }); if (full) E.push({ t: T(at + i, 1.5), k: 'drum', n: 'tak', v: .16 * level, s: 'drums' }); } }
      // the canon voice: half a bar on, two kettles up (or down, near the top of the set)
      function canon(bar, ch, v) { var c = CENTRE[ch] + 2 <= 8 ? CENTRE[ch] + 2 : CENTRE[ch] - 2; diamond(bar, 2, c, v, true); }
      // the fuller ensemble. Angklung: a tremolo bed of the chord, the ground the lattice sits on
      function bed(at, prog, level) { prog.forEach(function (ch, i) { CHP[ch].forEach(function (pc, j) { var f = pcF(pc, 4); if (f > 400) f /= 2; E.push({ t: T(at + i, 0) + j * .012, k: 'angklung', f: f * 2, v: .2 * level, d: BEAT_K * 3.2, s: 'angklung' }); }); }); }
      // dio, the plucked bass: root, fifth off the beat, the octave, the fifth again
      function dio(at, prog, level, sparse) { prog.forEach(function (ch, i) { var r = ROOT[ch] / 2 < 60 ? ROOT[ch] : ROOT[ch] / 2, b = at + i;
        E.push({ t: T(b, 0), k: 'dio', f: r, v: .5 * level, s: 'dio' }); if (sparse) return;
        E.push({ t: T(b, 1.5), k: 'dio', f: r * 1.5, v: .34 * level, s: 'dio' }); E.push({ t: T(b, 2.5), k: 'dio', f: r * 2, v: .3 * level, s: 'dio' }); E.push({ t: T(b, 3), k: 'dio', f: r * 1.5, v: .3 * level, s: 'dio' }); }); }
      // the tatali flute draws one big diamond across four bars: up to A5 and back down (phrase A), then an answer (phrase B).
      // Each note is [bar, beat, kettle index, beats]; written over Am C Am G so every long note sits in its chord
      var FL = { A: [[0, 0, 5, 2], [0, 2, 7, 1], [0, 3, 8, 1], [1, 0, 9, 3], [1, 3, 10, 1], [2, 0, 11, 2], [2, 2, 10, 1], [2, 3, 9, 1], [3, 0, 8, 3], [3, 3, 6, 1]],
                 B: [[0, 0, 9, 2], [0, 2, 8, 1], [0, 3, 7, 1], [1, 0, 4, 2], [1, 2, 7, 2], [2, 0, 9, 3], [2, 3, 8, 1], [3, 0, 6, 2], [3, 2, 4, 1], [3, 3, 6, 1]] };
      function flute(at, ph, v) { FL[ph].forEach(function (n) { E.push({ t: T(at + n[0], n[1]), k: 'tatali', f: F(n[2]), v: v, d: n[3] * BEAT_K * .94, s: 'tatali' }); }); }
      // the gamba-gamba fills the off-beats with the chord, so the middle ring is never silent
      function imbal(at, prog, level) { prog.forEach(function (ch, i) { var p = CHP[ch]; [.5, 1.5, 2.5, 3.5].forEach(function (bt, k) { var f = pcF(p[(k + 1) % 3], 4); if (f > 400) f /= 2; E.push({ t: T(at + i, bt), k: 'kolintang', n: p[(k + 1) % 3] % 7, f: f * 2, v: .1 * level, s: 'gamba' }); }); }); }
      function shaker(at, n, level) { for (var b = 0; b < n * 8; b++) E.push({ t: T(at + Math.floor(b / 8), (b % 8) / 2), k: 'shaker', v: (b % 2 ? .05 : .08) * level, s: 'shaker' }); }
      function full(at, prog, o) {
        prog.forEach(function (ch, i) { var b = at + i; diamond(b, 0, CENTRE[ch], o.v || .52, false, { swap: o.swap && i % 2 === 1 }); ring(b, ch, .16 * (o.lv || 1)); heart(b, ch, o.lv || 1); if (o.canon && b + 1 < o.canonEnd) canon(b, ch, .32); });
        drums(at, prog.length, .85 * (o.lv || 1), o.fullDrums); gongs(at, prog.length, 1); cross(at, prog.length, .6);
      }
      // G only ever lands on odd bars: the tawa-tawa sounds A2 on even bars, which would grind against a G2 root
      var P4 = ['Am', 'C', 'Am', 'G'], P8 = ['Am', 'C', 'Am', 'G', 'Am', 'C', 'Am', 'G'];
      // Title 0-3: one soft diamond every other bar, the first gong
      E.push({ t: T(0, 0), k: 'gong', n: 0, f: 110, v: .34, s: 'gongs' }); diamond(0, 0, 5, .36, true); diamond(2, 0, 5, .36, true);
      // Listen 4-11: the cloth: the loom's crosses round every bar line, a soft diamond on the even bars
      cross(4, 8, .7); for (var b = 4; b < 12; b += 2) diamond(b, 0, 5, .34, true); gongs(4, 8, .7);
      // Brief 12-15: a soft diamond each bar, the middle ring arrives
      P4.forEach(function (ch, i) { diamond(12 + i, 0, CENTRE[ch], .36, true); ring(12 + i, ch, .13); }); gongs(12, 4, .8);
      // Draw one diamond 16-23: the top line climbs, then the whole top, the bottom line joins, the rings, the heart, the crosses
      diamond(16, 0, 5, .5, false, { bot: false, len: 5 }); diamond(17, 0, 5, .5, false, { bot: false });
      for (var d = 18; d < 24; d++) { diamond(d, 0, 5, .5, false); if (d >= 19) ring(d, 'Am', .15); if (d >= 21) heart(d, 'Am', .8); }
      cross(22, 2, .6); gongs(16, 8, .8);
      // Lattice 24-31: the full diamond each bar; the canon joins half a bar on from 26, the drums from 26
      P8.forEach(function (ch, i) { var b2 = 24 + i; diamond(b2, 0, CENTRE[ch], .52, false); ring(b2, ch, .16); heart(b2, ch, 1); if (i >= 2) canon(b2, ch, .3); });
      drums(26, 6, .8, false); gongs(24, 8, 1); cross(24, 8, .6);
      // Weave 32-39: over and under: the two kakula trade lines each bar; full ensemble
      full(32, P8, { swap: true, canon: true, canonEnd: 40, fullDrums: true });
      // Misread 40-43: the diamond at three sizes, soft and sparse
      [1, 2, 4, 4].forEach(function (sp, i) { diamond(40 + i, 0, 5, .34, true, { span: sp }); }); cross(40, 4, .4); gongs(40, 4, .6);
      // System 44-47: the lattice in use: everything back, bright
      full(44, P4, { canon: true, canonEnd: 48, fullDrums: true });
      // Keep 48-51: three last diamonds, then every voice on A with the gong
      ['C', 'G', 'Am'].forEach(function (ch, i) { diamond(48 + i, 0, CENTRE[ch], .5, false); ring(48 + i, ch, .15); heart(48 + i, ch, .8); }); cross(48, 3, .5); gongs(48, 3, .9);
      K(T(51, 0), 5, .6, 3, false); K(T(51, 0), 11, .34, 3, true, 'kakula2'); K(T(51, 0), 0, .3, 3, true, 'kakula2');
      [9, 0, 4].forEach(function (pc) { E.push({ t: T(51, 0), k: 'kolintang', n: pc % 7, f: pcF(pc, 4), v: .22, s: 'gamba' }); });
      E.push({ t: T(51, 0), k: 'gong', n: 0, f: 110, v: .55, s: 'gongs' }); E.push({ t: T(51, 0), k: 'bassgong', f: 110, v: .45, s: 'bass' }); E.push({ t: T(51, 0), k: 'drum', n: 'dum', v: .45, s: 'drums' });
      // the fuller ensemble, section by section: the bed from the first bar, the flute from the cloth, the bass and fills as the lattice spreads
      var AM4 = ['Am', 'Am', 'Am', 'Am'];
      bed(0, AM4, .55); E.push({ t: T(2, 0), k: 'tatali', f: F(9), v: .22, d: BAR_K * 1.9, s: 'tatali' });            // title
      bed(4, P8, .55); dio(8, P4, .6, true); flute(8, 'A', .2);                                                            // listen
      bed(12, P4, .65); dio(12, P4, .7); flute(12, 'B', .22);                                                              // brief
      bed(16, AM4.concat(AM4), .55); dio(19, ['Am', 'Am', 'Am', 'Am', 'Am'], .7, true); shaker(21, 3, .6);                 // draw one diamond (all A minor, as it grows)
      bed(24, P8, .7); dio(24, P8, .8); shaker(24, 8, .8); flute(24, 'A', .24); flute(28, 'B', .24); imbal(28, P4, .9);    // lattice
      bed(32, P8, .75); dio(32, P8, .9); shaker(32, 8, 1); flute(32, 'A', .26); flute(36, 'B', .26); imbal(32, P8, 1);      // weave
      bed(40, AM4, .5); E.push({ t: T(40, 0), k: 'tatali', f: F(9), v: .18, d: BAR_K * 1.9, s: 'tatali' }); E.push({ t: T(42, 0), k: 'tatali', f: F(7), v: .18, d: BAR_K * 1.9, s: 'tatali' }); // misread
      bed(44, P4, .75); dio(44, P4, .9); shaker(44, 4, 1); flute(44, 'A', .26); imbal(44, P4, 1);                          // system
      bed(48, ['C', 'G', 'Am'], .65); dio(48, ['C', 'G', 'Am'], .8); shaker(48, 3, .7);                                     // keep
      [[48, 0, 7, 3], [48, 3, 9, 1], [49, 0, 8, 2], [49, 2, 6, 2], [50, 0, 9, 2], [50, 2, 7, 1], [50, 3, 6, 1]].forEach(function (n) { E.push({ t: T(n[0], n[1]), k: 'tatali', f: F(n[2]), v: .24, d: n[3] * BEAT_K * .94, s: 'tatali' }); });
      E.push({ t: T(51, 0), k: 'tatali', f: F(11), v: .26, d: BAR_K * 1.2, s: 'tatali' }); E.push({ t: T(51, 0), k: 'dio', f: 110, v: .5, s: 'dio' });
      [9, 0, 4].forEach(function (pc, j) { E.push({ t: T(51, 0) + j * .012, k: 'angklung', f: pcF(pc, 4) * (pc === 9 ? 1 : 2), v: .16, d: BAR_K * .9, s: 'angklung' }); });
      return E;
    }
    return { compose: compose, BAR: BAR_K, BPM: BPM_K };
  })();

  // ---------- drawing the lattice (the studio's own ketupat engine) ----------
  // per-diamond swell [outer, middle, inner]: a slow ripple out from (o.x, o.y), lifted by the score (the ensemble on the
  // outer ring, the drums on the middle, the gong on the heart)
  function kBreath(x, y, o) {
    if (reduce) return [0, 0, 0]; var w = Math.sin(t * 2.2 - Math.hypot(x - o.x, y - o.y) / 70) * (o.amp == null ? .03 : o.amp), lv = liveLevel();
    return [w + lv * .05, w * .6 + lvD(t) * .05, w * .3 + lvG(0, t) * .1];
  }
  // offsets that put a diamond exactly on (cx, cy) for a field drawn from (x0, y0) with tile P
  function kAlign(x0, y0, cx, cy, P) { return { ox: ((cx - x0) % P + P) % P, oy: ((cy - y0) % P + P) % P }; }
  // the sarong's head panel, sketched: a dashed cloth with a panel of dashed diamonds between two lines
  function headSketch(x, y, w, h, alpha) {
    g.save(); g.globalAlpha *= alpha; g.strokeStyle = C.gold; g.lineWidth = 1.4; g.setLineDash([6, 6]); g.strokeRect(x, y, w, h);
    var px = x + w * .4, pw = w * .2, q = pw / 4; g.setLineDash([]); g.strokeStyle = C.gold2; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(px, y); g.lineTo(px, y + h); g.moveTo(px + pw, y); g.lineTo(px + pw, y + h); g.stroke();
    g.beginPath(); g.rect(px, y, pw, h); g.clip(); g.setLineDash([4, 4]); g.strokeStyle = C.gold; g.lineWidth = 1.4;
    for (var r = 0; r * q < h + q; r++) (r % 2 ? [2] : [0, 4]).forEach(function (c) { var cx = px + c * q, cy = y + r * q, s = q * .86; g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s, cy); g.closePath(); g.stroke(); });
    g.restore();
  }
  // a plain weave turned 45°: rows slide in, then columns, over and under; every crossing shows as a diamond
  function weave(x0, y0, w, h, lt, alpha) {
    var sw = 40, N = 10, L = N * sw, A = '#C9A35A', B = '#8F6E38';
    g.save(); g.globalAlpha *= alpha; g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.translate(x0 + w / 2, y0 + h / 2); g.rotate(Math.PI / 4);
    g.lineWidth = 2; g.strokeStyle = C.ink;
    for (var j = -N; j < N; j++) for (var i = -N; i < N; i++) {
      var x = i * sw, y = j * sw;
      var ra = eo(ramp(lt, .3 + (j + N) * .12, 1.6 + (j + N) * .12)), rb = eo(ramp(lt, 2.2 + (i + N) * .12, 3.5 + (i + N) * .12));
      var hasA = -L + 2 * L * ra >= x + sw, hasB = -L + 2 * L * rb >= y + sw; if (!hasA && !hasB) continue;
      var aTop = hasA && (!hasB || ((i + j) % 2 + 2) % 2 === 0);
      g.fillStyle = aTop ? A : B; g.fillRect(x, y, sw, sw); g.beginPath();
      if (aTop) { g.moveTo(x, y); g.lineTo(x + sw, y); g.moveTo(x, y + sw); g.lineTo(x + sw, y + sw); } else { g.moveTo(x, y); g.lineTo(x, y + sw); g.moveTo(x + sw, y); g.lineTo(x + sw, y + sw); }
      g.stroke();
    }
    g.restore();
  }
  var SCENES_KETUPAT = [
    { id: 'k-title', dur: barsK(4), step: null,
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .5, d), cx = W / 2, cy = 210, P = 200, al = kAlign(0, 50, cx, cy, P), dr = reduce ? 0 : lt * 6;
        ketupatField(g, 0, 50, W, 320, P, 'buya-bomba', { ox: al.ox + dr, oy: al.oy,
          each: function (i, j, x, y) { var dd = Math.hypot(x - cx, y - cy), ap = eo(ramp(lt, .2 + dd / 700 * 2.2, .9 + dd / 700 * 2.2)); return ap > 0 ? { rings: 3 * ap, heart: ramp(ap, .8, 1), alpha: out * clamp(1.3 - dd / 560, 0, 1), swell: kBreath(x, y, { x: cx, y: cy, amp: .025 }) } : null; },
          cross: function (i, j, x, y) { var dd = Math.hypot(x - cx, y - cy); return { alpha: eo(ramp(lt, 1 + dd / 700 * 2.2, 1.6 + dd / 700 * 2.2)) * out * clamp(1.3 - dd / 560, 0, 1) }; } });
        var a = eo(ramp(lt, 1.6, 2.6)) * out;
        text('BATIK MEDIA LAB · REEL 05', W / 2, 410, '500 13px ' + F.mono, C.gold2, a, 'center');
        text('Ketupat lattice', W / 2, 490, '600 84px ' + F.display, C.paper, a, 'center');
        text('Three tones and one heart, woven on the diagonal', W / 2, 536, 'italic 500 24px ' + F.display, C.mist, eo(ramp(lt, 2.2, 3.4)) * out, 'center');
      } },
    { id: 'k-listen', dur: barsK(8), step: 'Listen to the cloth', phase: 'Thinking',
      eyebrow: 'Step 1 · Listen to the cloth', head: 'Diamonds in the head panel.',
      body: 'On the buya bomba of Donggala the head panel of the sarong carries belah ketupat, the split diamond, named after the woven palm-leaf case that rice is cooked in. The Bugis call the motif cobo’. In the cloth’s own iconography it speaks of courage in proposing marriage and the wisdom of elders.',
      teach: 'Read the motif as grammar before you draw: where it sits (the head panel), how it repeats (diamond on diamond, corner to corner), what fills it (nested tones, a dot), and what it means to the people who weave it.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, 1, 2.4)) * out, b = eo(ramp(lt, 5, 6.2)) * out, c = eo(ramp(lt, 9.5, 10.7)) * out;
        ikatField(660, 110, 540, 150, lt, a); text('ikat · gold on black (an abstract weave, not a copy)', 660, 282, '500 12px ' + F.mono, C.mist, a);
        headSketch(660, 330, 540, 120, b); text('the head panel · diamond on diamond, corner to corner', 930, 480, '500 12px ' + F.mono, C.mist, b, 'center');
        g.save(); g.globalAlpha = c; g.strokeStyle = C.gold2; g.lineWidth = 1.5; rr(900, 520, 300, 110, 6); g.stroke(); g.restore();
        text('RULE', 920, 550, '500 12px ' + F.mono, C.gold2, c); para('Learn the grammar. Redraw everything else.', 920, 582, 270, 'italic 500 22px ' + F.display, 26, C.paper, c);
      } },
    { id: 'k-brief', dur: barsK(4), step: 'Set the brief', phase: 'Thinking',
      eyebrow: 'Step 2 · Set the brief', head: 'A ground that never shows its seam.',
      body: 'The ketupat lattice belongs to the Dua Pulau signature. It must work as a quiet all-over ground for shirts, cushions and linings, carry Bomba rosettes on every other diamond, and print in one gold-on-black ink.',
      teach: 'The brief: our own drawing, credited origins, seamless both ways, three tones and a heart, and room for a rosette to bloom inside it.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        ['Our own drawing, never a copy of the cloth', 'Three nested tones and one dark heart', 'Seamless both ways, crosses where four meet', 'Credit the weavers of Donggala'].forEach(function (r, i) {
          var a = eo(ramp(lt, .6 + i * 1.1, 1.4 + i * 1.1)) * out; g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(680, 170 + i * 80, 5, 0, 7); g.fill(); g.restore();
          text(r, 704, 176 + i * 80, '500 24px ' + F.display, C.paper, a);
        });
        var p = ramp(lt, 4.5, 7.5), P = 120, al = kAlign(680, 520, 940, 580, P);
        ketupatField(g, 680, 520, 520, 120, P, 'buya-bomba', { ox: al.ox, oy: al.oy,
          each: function (i, j, x, y) { if (Math.abs(y - 580) > 1) return null; var ap = eo(clamp((p * 1.25 - (x - 680) / 520) * 4, 0, 1)); return ap > 0 ? { rings: 3 * ap, alpha: out, swell: kBreath(x, y, { x: 940, y: 580, amp: .03 }) } : null; },
          cross: function (i, j, x, y) { if (Math.abs(y - 580) > 1) return null; return { alpha: out * clamp((p * 1.25 - (x - 680) / 520) * 4 - 1, 0, 1) }; } });
      } },
    { id: 'k-diamond', dur: barsK(8), step: 'Draw one diamond', phase: 'Ideation',
      eyebrow: 'Step 3 · Draw one diamond', head: 'Four sides, three tones, one heart.',
      body: 'The diamond is four nearly straight sides that pinch in a little at the corners, so it looks cut by hand rather than ruled. Inside it nest three tones, gold, dark and light gold, at full, two-thirds and one-third size, around one dark heart. Every edge is a flat shape, so it stamps, prints and embroiders the same.',
      teach: 'Reduce to flat shapes that survive small. Three rings at fixed ratios (1, 0.65, 0.33) keep the depth of the woven original without a single gradient.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), p = ramp(lt, .4, d - 3), a = eo(ramp(lt, .3, 1)) * out, cx = 940, cy = 370, r = 200, P = r / KETUPAT_R;
        g.save(); g.globalAlpha = a * .5; g.strokeStyle = C.line2; g.lineWidth = 1; for (var gx = 700; gx <= 1180; gx += 40) { g.beginPath(); g.moveTo(gx, 130); g.lineTo(gx, 610); g.stroke(); } for (var gy = 130; gy <= 610; gy += 40) { g.beginPath(); g.moveTo(700, gy); g.lineTo(1180, gy); g.stroke(); } g.restore();
        var shown = 3 * ramp(p, .4, .79);
        if (shown > 0) ketupatDiamond(g, cx, cy, r, 'buya-bomba', { rings: shown, heart: eo(ramp(p, .8, .88)), alpha: out, swell: p >= 1 ? kBreath(cx, cy, { x: cx, y: cy + 60, amp: .015 }) : null });
        var tp = ramp(p, 0, .4), ta = out * (1 - ramp(p, .45, .6));
        if (tp > 0 && ta > 0) { var pts = ketupatPts(cx, cy, r, 40), k = Math.floor(tp * pts.length); g.save(); g.globalAlpha = ta; g.strokeStyle = C.gold2; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); for (var i = 0; i <= Math.min(k, pts.length - 1); i++) { if (i) g.lineTo(pts[i][0], pts[i][1]); else g.moveTo(pts[i][0], pts[i][1]); } if (tp >= 1) g.closePath(); g.stroke();
          if (tp < 1) { var q = pts[Math.min(k, pts.length - 1)]; g.fillStyle = C.gold; g.beginPath(); g.arc(q[0], q[1], 5, 0, 7); g.fill(); } g.restore(); }
        var ca = eo(ramp(p, .9, 1)) * out; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (v) { ketupatCross(g, cx + v[0] * P / 2, cy + v[1] * P / 2, P, 'buya-bomba', { alpha: ca, swell: liveLevel() * .6 }); });
        var lab = p < .4 ? 'outline · four sides, pinched at the corners' : p < .53 ? 'outer ring · gold' : p < .66 ? 'middle ring · dark, two-thirds' : p < .8 ? 'inner ring · light gold, one-third' : p < .9 ? 'the heart' : 'cecek crosses, where four diamonds meet';
        text(lab, cx, 690, '500 12px ' + F.mono, C.gold2, out * .9, 'center');
      } },
    { id: 'k-lattice', dur: barsK(8), step: 'Tile the lattice', phase: 'Synthesis', explore: 'lattice',
      eyebrow: 'Step 4 · Tile the lattice', head: 'A diamond in the middle, quarters at the corners.',
      body: 'One square tile holds a whole diamond at its centre and a quarter of one at each corner, with a cecek cross halfway along each side. Lay the tiles edge to edge and the quarters close into whole diamonds, so the lattice runs on the diagonal with no seam either way.',
      teach: 'Design the tile, not the cloth. When everything that crosses an edge is cut in matching halves or quarters, the repeat is seamless by construction.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), ex = EX && EX.scene === 'k-lattice';
        var P = ex ? EX.P : 200, ink = ex ? EX.ink : 'buya-bomba', fill = ex ? EX.fill : 'plain', ground = ex ? EX.ground : '#0E0C09';
        var x0 = 680, y0 = 110, w = 520, h = 480, cx = 940, cy = 350, p = ex ? 1 : ramp(lt, .5, d - 2.5), half = P / 2, maxd = Math.hypot(w, h) / 2;
        // while only the one tile shows, the field is cut to it, so its corners are quarters; then the cut opens and they close into diamonds
        var one = !ex && p < .3; if (one) { x0 = cx - half; y0 = cy - half; w = h = P; } var al = kAlign(x0, y0, cx, cy, P);
        if (ground !== '#0E0C09') { g.save(); g.globalAlpha = out; g.fillStyle = ground; g.fillRect(680, 110, 520, 480); g.restore(); }
        function inTile(x, y) { return Math.abs(x - cx) <= half + 1 && Math.abs(y - cy) <= half + 1; }
        function appear(x, y) { if (ex) return 1; var dd = Math.hypot(x - cx, y - cy); return dd < 1 ? eo(ramp(p, .02, .1)) : inTile(x, y) ? eo(ramp(p, .1, .2)) : eo(ramp(p, .3 + dd / maxd * .55, .36 + dd / maxd * .55)); }
        ketupatField(g, x0, y0, w, h, P, ink, { ox: al.ox, oy: al.oy,
          each: function (i, j, x, y) { var ap = appear(x, y); return ap > 0 ? { rings: 3 * ap, heart: ramp(ap, .7, 1), alpha: out, swell: kBreath(x, y, { x: cx, y: cy, amp: .03 }) } : null; },
          after: function (i, j, x, y) { if (fill === 'rosette' && i % 2 === 0 && j % 2 === 0) putImg('motifs/bomba-rosette--buya.png', x, y, P * .4, out * appear(x, y), reduce ? 0 : t * .15); },
          cross: function (i, j, x, y) { if (one) return null; var dd = Math.hypot(x - cx, y - cy); return { alpha: out * (ex ? 1 : inTile(x, y) ? 1 : eo(ramp(p, .36 + dd / maxd * .55, .42 + dd / maxd * .55))), swell: liveLevel() * .6 }; } });
        // the tile's own four crosses sit on its edges, so they are drawn outside the cut
        if (one) [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (v) { ketupatCross(g, cx + v[0] * half, cy + v[1] * half, P, ink, { alpha: out * eo(ramp(p, .2, .28)) }); });
        var fa = out * (ex ? 0 : ramp(p, .02, .08) * (1 - ramp(p, .5, .62)));
        if (fa > 0) { g.save(); g.globalAlpha = fa; g.strokeStyle = C.paper; g.lineWidth = 1.5; g.setLineDash([7, 6]); g.strokeRect(cx - half, cy - half, P, P); g.restore(); }
        if (!ex) { var k = p < .2 ? 'one tile: a diamond in the middle, quarters at the corners' : p < .3 ? 'a cecek cross halfway along each side' : 'tile edge to edge: the quarters close into diamonds'; text(k, 940, 630, '500 12px ' + F.mono, C.gold2, out * .9, 'center'); }
      } },
    { id: 'k-weave', dur: barsK(8), step: 'Weave it, then let it breathe', phase: 'Synthesis',
      eyebrow: 'Step 5 · Weave it, then let it breathe', head: 'Every crossing is a diamond.',
      body: 'A ketupat case is woven from two strips of young coconut leaf, over and under. Turn any plain weave forty-five degrees and every crossing shows as a diamond, so the lattice is the shape of weaving itself. Then the lattice comes alive: a slow ripple runs out from the centre, and the rings swell with the score.',
      teach: 'Find the making behind the motif. The lattice is not an ornament laid on the cloth; it is the weave turned on its corner, which is why it tiles without a seam.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), x0 = 680, y0 = 110, w = 520, h = 480, cx = 940, cy = 350, split = d * .55;
        var wa = (1 - ramp(lt, split, split + 1.4)) * out, la = eo(ramp(lt, split, split + 1.4)) * out;
        if (wa > 0) weave(x0, y0, w, h, lt, wa);
        if (la > 0) { var P = 150, al = kAlign(x0, y0, cx, cy, P), dr = reduce ? 0 : (lt - split) * 6;
          ketupatField(g, x0, y0, w, h, P, 'buya-bomba', { ox: al.ox + dr, oy: al.oy + dr,
            each: function (i, j, x, y) { return { alpha: la, swell: kBreath(x, y, { x: cx, y: cy, amp: .07 }) }; },
            cross: function (i, j, x, y) { return { alpha: la, swell: reduce ? 0 : liveLevel() * .8 + .4 * Math.max(0, Math.sin(t * 2.2 - Math.hypot(x - cx, y - cy) / 70)) }; } }); }
        text(lt < split ? 'two strips · over and under · turned 45°' : 'a ripple from the centre · the rings swell with the score', 940, 630, '500 12px ' + F.mono, C.gold2, out * .9, 'center');
      } },
    { id: 'k-misread', dur: barsK(4), step: 'Check misreadings', phase: 'Test',
      eyebrow: 'Step 6 · Check misreadings', head: 'Argyle, eyes, or ketupat?',
      body: 'At an eighteen-pixel tile the rings merge and the lattice reads as argyle or a checkerboard. Around sixty, each light ring with its dark heart can read as a row of eyes staring back. From about a hundred and twenty the tones, the heart and the crosses read as the cloth. So the small master drops the heart and the crosses and keeps the three tones.',
      teach: 'Test at the smallest size it will print. Decide what it may lose (the heart, the crosses) and what it must keep (the three tones, the diagonal).',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), dr = reduce ? 0 : lt * 4;
        [[18, 700, 'argyle · checkerboard'], [60, 885, 'rows of eyes'], [140, 1070, 'the full grammar']].forEach(function (R, i) {
          var a = eo(ramp(lt, .4 + i * 1.2, 1.2 + i * 1.2)) * out, al = kAlign(R[1], 150, R[1] + 75, 225, R[0]);
          ketupatField(g, R[1], 150, 150, 150, R[0], 'buya-bomba', { ox: al.ox + dr, oy: al.oy, each: function () { return { alpha: a }; }, cross: function () { return { alpha: a }; } });
          g.save(); g.globalAlpha = a; g.strokeStyle = C.line2; g.lineWidth = 1; g.strokeRect(R[1], 150, 150, 150); g.restore();
          text(R[0] + ' px tile', R[1], 330, '500 12px ' + F.mono, C.gold2, a); text(R[2], R[1], 350, '500 12px ' + F.mono, C.mist, a);
        });
        var b = eo(ramp(lt, 5.2, 6.2)) * out, al2 = kAlign(700, 420, 700, 470, 60);
        ketupatField(g, 700, 420, 520, 100, 60, 'buya-bomba', { ox: al2.ox + dr, oy: al2.oy, each: function () { return { alpha: b, heart: 0 }; }, cross: function () { return null; } });
        text('small master · no heart, no crosses, the three tones kept', 700, 552, '500 12px ' + F.mono, C.gold2, b);
      } },
    { id: 'k-system', dur: barsK(4), step: 'Where the lattice lives', phase: 'System',
      eyebrow: 'Step 7 · Where the lattice lives', head: 'Grounds, panels and hems.',
      body: 'The lattice is the ground of Ketupat Night, with a Bomba rosette blooming on every other diamond. It fills the head panel of the Dua Pulau sarong and runs small along a hem. One drawing, three jobs.',
      teach: 'A ground motif earns its place by staying quiet: it holds a hero, fills a panel and edges a hem without competing. Keep the master in one place and let every use read from it.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .4, 1.4)) * out, b = eo(ramp(lt, 2, 3)) * out, dr = reduce ? 0 : lt * 5;
        var al = kAlign(700, 140, 810, 250, 110);
        ketupatField(g, 700, 140, 220, 220, 110, 'buya-bomba', { ox: al.ox, oy: al.oy, each: function (i, j, x, y) { return { alpha: a, swell: kBreath(x, y, { x: 810, y: 250, amp: .03 }) }; }, cross: function () { return { alpha: a }; },
          after: function (i, j, x, y) { if (i % 2 === 0 && j % 2 === 0) putImg('motifs/bomba-rosette--buya.png', x, y, 44, a, reduce ? 0 : t * .15); } });
        g.save(); g.globalAlpha = a; g.strokeStyle = C.gold2; g.lineWidth = 1.5; g.strokeRect(700, 140, 220, 220); g.restore();
        text('cushion · Ketupat Night', 810, 390, '500 12px ' + F.mono, C.mist, a, 'center');
        var al3 = kAlign(700, 450, 700, 485, 70);
        ketupatField(g, 700, 450, 220, 70, 70, 'buya-bomba', { ox: al3.ox + dr, oy: al3.oy, each: function (i, j, x, y) { return Math.abs(y - 485) < 1 ? { alpha: a } : null; }, cross: function (i, j, x, y) { return Math.abs(y - 485) < 1 ? { alpha: a } : null; } });
        text('hem band', 810, 556, '500 12px ' + F.mono, C.mist, a, 'center');
        g.save(); g.globalAlpha = b; g.fillStyle = C.ink2; g.fillRect(980, 120, 200, 470); g.strokeStyle = C.gold2; g.lineWidth = 1.5; g.strokeRect(980, 120, 200, 470); g.restore();
        var al4 = kAlign(1050, 120, 1080, 120, 60);
        ketupatField(g, 1050, 120, 60, 470, 60, 'buya-bomba', { ox: al4.ox, oy: al4.oy - dr, each: function (i, j, x, y) { return { alpha: b }; }, cross: function () { return { alpha: b }; } });
        g.save(); g.globalAlpha = b; g.strokeStyle = C.gold2; g.beginPath(); g.moveTo(1050, 120); g.lineTo(1050, 590); g.moveTo(1110, 120); g.lineTo(1110, 590); g.stroke(); g.restore();
        text('sarong · head panel', 1080, 620, '500 12px ' + F.mono, C.mist, b, 'center');
      } },
    { id: 'k-keep', dur: barsK(4), step: 'Credit and keep', phase: 'Archive',
      eyebrow: 'Step 8 · Credit and keep', head: 'Credit the cloth. Keep the drawing.',
      body: 'Ketupat lattice: our own drawing, inspired by the belah ketupat diamonds of the buya bomba head panel of Donggala, Central Sulawesi, with gratitude to the women who weave it. The master lives in the engine; every ground, panel and hem reads from it.',
      teach: 'Credit is part of the design. Keep the source, the rule, the drawing and the credit line together, so the next person can continue rather than restart.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .3, 1.5)) * out, r = 120, P = r / KETUPAT_R;
        ketupatDiamond(g, 940, 250, r, 'buya-bomba', { alpha: a, swell: kBreath(940, 250, { x: 940, y: 310, amp: .03 }) });
        [-1, 1].forEach(function (s) { ketupatCross(g, 940 + s * P / 2, 250, P, 'buya-bomba', { alpha: a, swell: liveLevel() * .6 }); });
        text('REEL 05 · SAVED TO THE LAB', 940, 450, '500 13px ' + F.mono, C.gold2, eo(ramp(lt, 2, 3)) * out, 'center');
        text('Next: Cengkeh sprig', 940, 486, 'italic 500 22px ' + F.display, C.mist, eo(ramp(lt, 3.2, 4.2)) * out, 'center');
      } }
  ];
  var SCORES_KETUPAT = [['off', 'Sound off'], ['ketupat', 'Anyam Ketupat · 96 bpm']];
  var STEMS_KETUPAT = [['kakula', 'Kakula, the rising side'], ['kakula2', 'Second kakula, the falling side'], ['gamba', 'Gamba-gamba, the middle ring'], ['tatali', 'Tatali, the big diamond'], ['angklung', 'Angklung, the ground'], ['dio', 'Dio, plucked bass'], ['gongs', 'Tawa-tawa'], ['drums', 'Gimba'], ['shaker', 'Shaker'], ['bass', 'Low gong, the heart'], ['loom', 'Loom, the cecek crosses']];

  // =================== Reel 06 · Cengkeh sprig, the clove ===================
  // Score: Lima Kuntum (five buds), an original for the same Kaili ensemble, and the lab's first piece in 3/4: a harvest dance.
  // 138 bpm, 80 bars of three beats, one section per scene, in C major. The rules it keeps so that music and drawing arrive together:
  //  1. Five buds are a fan of five kettles: the centre on beat 1, the inner pair together on beat 2, the outer pair on beat 3,
  //     the way the drawing grows its buds from the middle out (and the way the buds light up on screen).
  //  2. A bud is four sepals round a ball: the second kakula plays a turn, four quick notes round one held note.
  //  3. Many hands: in the harvest sections the two kakula interlock in running eighths, one on the beat, one off it.
  //  4. The dance: dio bass on 1, the gamba-gamba chord on 2 and 3, claps on 2 and 3, the drums and the dried-clove shaker throughout.
  //  5. The chords run C G F C from every section's first bar, so the C3 gong (even bars) meets C or F and the G3 gong (odd bars)
  //     meets G or C. It ends with every voice on C.
  var BPM_C = 138, BEAT_C = 60 / BPM_C, BAR_C = BEAT_C * 3; function barsC(n) { return n * BAR_C; }
  var LC = (function () {
    var PITCH = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25, 587.33, 659.26, 783.99, 880.00, 987.77];
    var CHP = { C: [0, 4, 7], G: [7, 11, 2], F: [5, 9, 0] }, ROOT = { C: 65.41, G: 98, F: 87.31 };
    var FAN = { C: [9, 7, 10, 3, 11], G: [8, 6, 10, 4, 12], F: [7, 5, 11, 2, 8] }; // centre, inner pair, outer pair (kettle indices)
    var TONES = { C: [1, 3, 4, 7, 9, 10], G: [2, 4, 6, 8, 10, 12], F: [1, 2, 5, 7, 8, 11] }; // kettles that sit in each chord (F: no F kettle, so D adds a sixth)
    var PROG = ['C', 'G', 'F', 'C'], SECT = [0, 6, 18, 24, 36, 48, 62, 68, 74, 80];
    function chordAt(bar) { var s0 = 0; SECT.forEach(function (s) { if (s <= bar) s0 = s; }); return PROG[(bar - s0) % 4]; }
    function pcF(pc, oct) { return 261.63 * Math.pow(2, pc / 12) * Math.pow(2, oct - 4); }
    function compose(opt) {
      var lilt = opt && opt.feel === 'lilt' ? BEAT_C * .08 : 0, E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR_C + beat * BEAT_C; }
      function F(p) { return PITCH[Math.max(0, Math.min(PITCH.length - 1, p))]; }
      function K(time, p, v, beats, soft, stem) { E.push({ t: time, k: 'kettle', n: ((p % 7) + 7) % 7, f: F(p), v: v, soft: !!soft, d: clamp(beats * BEAT_C * (soft ? 2.6 : 2), .3, 2.2), s: stem || 'kakula' }); }
      function range(a, b, fn) { for (var x = a; x < b; x++) fn(x, chordAt(x)); }
      // the fan: ranks 1..3 (centre only, + inner pair, + outer pair)
      function fan(a, b, v, soft, ranks) { range(a, b, function (x, ch) { var f = FAN[ch], rk = typeof ranks === 'function' ? ranks(x) : ranks || 3; K(T(x, 0), f[0], v * 1.1, 1, soft); if (rk > 1) { K(T(x, 1), f[1], v * .9, 1, soft); K(T(x, 1), f[2], v * .8, 1, soft, 'kakula2'); } if (rk > 2) { K(T(x, 2), f[3], v * .85, 1, soft); K(T(x, 2), f[4], v * .75, 1, soft, 'kakula2'); } }); }
      // a bud: four quick notes round the centre kettle (above, on, below, on), then it holds. Over F the step below C is B,
      // a tritone, so it steps down to A instead
      function turns(a, b, v) { range(a, b, function (x, ch) { var c = FAN[ch][0], lo = ch === 'F' ? c - 2 : c - 1; [[c + 1, 0], [c, .25], [lo, .5], [c, .75]].forEach(function (q, i) { K(T(x, 1.5 + q[1]), q[0], v * (i === 3 ? 1 : .7), i === 3 ? 1 : .25, true, 'kakula2'); }); }); }
      // many hands: running eighths shared between the two kakula, chord tones climbing and falling
      function kotekan(a, b, v) { range(a, b, function (x, ch) { var tn = TONES[ch], up = x % 2 === 0; for (var e = 0; e < 6; e++) { var k = up ? e : 5 - e; K(T(x, e / 2), tn[k], v * (e % 2 ? .75 : 1), .5, true, e % 2 ? 'kakula2' : 'kakula'); } }); }
      function waltz(a, b, v) { range(a, b, function (x, ch) { [1, 2].forEach(function (bt) { CHP[ch].forEach(function (pc, j) { var f = pcF(pc, 4); if (f > 400) f /= 2; E.push({ t: T(x, bt) + j * .006, k: 'kolintang', n: pc % 7, f: f, v: v * (bt === 1 ? 1 : .8), s: 'gamba' }); }); }); }); }
      function dio(a, b, v, sparse) { range(a, b, function (x, ch) { var r = ROOT[ch]; E.push({ t: T(x, 0), k: 'dio', f: r, v: .52 * v, s: 'dio' }); if (sparse) return; E.push({ t: T(x, 2), k: 'dio', f: r * 1.5, v: .32 * v, s: 'dio' }); if (x % 2) E.push({ t: T(x, 2.5), k: 'dio', f: r * 2, v: .26 * v, s: 'dio' }); }); }
      function heart(a, b, v) { range(a, b, function (x, ch) { E.push({ t: T(x, 0), k: 'bassgong', f: ROOT[ch] * 2, v: .34 * v, s: 'bass' }); }); }
      function bed(a, b, v) { range(a, b, function (x, ch) { CHP[ch].forEach(function (pc, j) { var f = pcF(pc, 4); if (f > 400) f /= 2; E.push({ t: T(x, 0) + j * .012, k: 'angklung', f: f * 2, v: .2 * v, d: BAR_C * .95, s: 'angklung' }); }); }); }
      function gongs(a, b, v) { range(a, b, function (x) { if (x % 2 === 0) E.push({ t: T(x, 0), k: 'gong', n: 0, f: 130.81, v: .3 * v, s: 'gongs' }); else E.push({ t: T(x, 0), k: 'gong', n: 1, f: 196, v: .16 * v, s: 'gongs' }); }); }
      function drums(a, b, v, full) { range(a, b, function (x) { E.push({ t: T(x, 0), k: 'drum', n: 'dum', v: .44 * v, s: 'drums' }); E.push({ t: T(x, 1), k: 'drum', n: 'tak', v: .28 * v, s: 'drums' }); E.push({ t: T(x, 2), k: 'drum', n: 'tak', v: .28 * v, s: 'drums' }); if (full) { E.push({ t: T(x, 1.5), k: 'drum', n: 'tak', v: .14 * v, s: 'drums' }); E.push({ t: T(x, 2.5), k: 'drum', n: x % 2 ? 'dum' : 'tak', v: .2 * v, s: 'drums' }); } }); }
      function claps(a, b, v) { range(a, b, function (x) { E.push({ t: T(x, 1), k: 'clap', v: .22 * v, s: 'claps' }); E.push({ t: T(x, 2), k: 'clap', v: .2 * v, s: 'claps' }); }); }
      function cloves(a, b, v) { range(a, b, function (x) { for (var e = 0; e < 6; e++) E.push({ t: T(x, e / 2), k: 'shaker', v: (e % 2 ? .05 : .08) * v, s: 'shaker' }); }); }
      // the tatali sings over C G F C: phrase A, then the answer B. [bar, beat, kettle, beats]
      var FL = { A: [[0, 0, 9, 2], [0, 2, 10, 1], [1, 0, 8, 1], [1, 1, 6, 1], [1, 2, 8, 1], [2, 0, 7, 2], [2, 2, 5, 1], [3, 0, 9, 1.5], [3, 1.5, 7, 1.5]],
                 B: [[0, 0, 10, 1], [0, 1, 11, 1], [0, 2, 10, 1], [1, 0, 8, 3], [2, 0, 11, 1], [2, 1, 10, 1], [2, 2, 7, 1], [3, 0, 9, 3]] };
      function flute(at, ph, v) { FL[ph].forEach(function (n) { E.push({ t: T(at + n[0], n[1]), k: 'tatali', f: F(n[2]), v: v, d: n[3] * BEAT_C * .94, s: 'tatali' }); }); }
      // Title 0-5: the fan opens rank by rank, the shaker and drums already dancing
      bed(0, 6, .55); fan(0, 6, .4, false, function (x) { return Math.min(3, x + 1); }); cloves(0, 6, .6); drums(2, 6, .6); dio(2, 6, .6, true); gongs(0, 6, .9);
      // Listen 6-17: the fans and the waltz, the flute from bar 10
      bed(6, 18, .55); fan(6, 18, .36); waltz(6, 18, .11); gongs(6, 18, .8); dio(6, 18, .7); drums(6, 18, .6); cloves(6, 18, .55); flute(10, 'A', .22); flute(14, 'B', .22);
      // Brief 18-23: claps join
      bed(18, 24, .6); fan(18, 24, .42); waltz(18, 24, .12); dio(18, 24, .8); gongs(18, 24, .9); drums(18, 24, .7); claps(18, 24, .7); cloves(18, 24, .6); flute(18, 'A', .24);
      // Draw one bud 24-35: the centre kettle alone (the tube), then the turns join (the sepals), then the whole fan
      bed(24, 36, .6); fan(24, 32, .48, false, 1); turns(28, 36, .36); fan(32, 36, .44); waltz(24, 36, .12); dio(24, 36, .8); gongs(24, 36, .9); drums(24, 36, .6); cloves(24, 36, .5);
      // Fan the five 36-47: centre, then the inner pair, then the outer, as the branches grow; the dance fills in
      bed(36, 48, .65); fan(36, 48, .5, false, function (x) { return x < 38 ? 1 : x < 40 ? 2 : 3; }); waltz(36, 48, .14); dio(36, 48, .9); heart(40, 48, .9); drums(36, 48, .85, true); claps(40, 48, .8); gongs(36, 48, 1); cloves(36, 48, .7); kotekan(44, 48, .22); flute(40, 'A', .25); flute(44, 'B', .25);
      // Ripen, pick and dry 48-61: the harvest: everything, many hands
      bed(48, 62, .75); fan(48, 62, .5); kotekan(48, 62, .24); turns(52, 62, .26); waltz(48, 62, .15); dio(48, 62, 1); heart(48, 62, 1); drums(48, 62, 1, true); claps(48, 62, 1); gongs(48, 62, 1); cloves(48, 62, 1); flute(48, 'A', .27); flute(52, 'B', .27); flute(56, 'A', .27);
      // Misread 62-67: a breath: one bud, three, five, over the shaker
      bed(62, 68, .5); fan(62, 68, .34, true, function (x) { return x < 64 ? 1 : x < 66 ? 2 : 3; }); gongs(62, 68, .6); cloves(62, 68, .5); dio(62, 68, .5, true);
      // System 68-73: the dance again
      bed(68, 74, .75); fan(68, 74, .5); kotekan(68, 74, .24); waltz(68, 74, .15); dio(68, 74, 1); heart(68, 74, 1); drums(68, 74, 1, true); claps(68, 74, 1); gongs(68, 74, 1); cloves(68, 74, .8); flute(68, 'A', .27);
      // Keep 74-79: a last round and a cadence, then every voice on C
      bed(74, 79, .65); fan(74, 79, .46); waltz(74, 79, .13); dio(74, 79, .8); heart(74, 79, .8); gongs(74, 79, .9); drums(74, 79, .7); claps(74, 78, .7); cloves(74, 79, .6);
      [[74, 0, 9, 2], [74, 2, 10, 1], [75, 0, 8, 3], [76, 0, 11, 2], [76, 2, 7, 1], [77, 0, 9, 3], [78, 0, 10, 3]].forEach(function (n) { E.push({ t: T(n[0], n[1]), k: 'tatali', f: F(n[2]), v: .25, d: n[3] * BEAT_C * .94, s: 'tatali' }); });
      K(T(79, 0), 7, .6, 3, false); K(T(79, 0), 9, .34, 3, true, 'kakula2'); K(T(79, 0), 1, .3, 3, true, 'kakula2');
      [0, 4, 7].forEach(function (pc, j) { E.push({ t: T(79, 0), k: 'kolintang', n: pc % 7, f: pcF(pc, 4), v: .2, s: 'gamba' }); E.push({ t: T(79, 0) + j * .012, k: 'angklung', f: pcF(pc, 5), v: .15, d: BAR_C * 1.4, s: 'angklung' }); });
      E.push({ t: T(79, 0), k: 'tatali', f: F(7), v: .27, d: BAR_C * 1.6, s: 'tatali' }); E.push({ t: T(79, 0), k: 'dio', f: 65.41, v: .52, s: 'dio' });
      E.push({ t: T(79, 0), k: 'gong', n: 0, f: 130.81, v: .55, s: 'gongs' }); E.push({ t: T(79, 0), k: 'bassgong', f: 130.81, v: .45, s: 'bass' }); E.push({ t: T(79, 0), k: 'drum', n: 'dum', v: .5, s: 'drums' }); E.push({ t: T(79, 0), k: 'clap', v: .3, s: 'claps' });
      return E;
    }
    return { compose: compose, BAR: BAR_C, BPM: BPM_C, chordAt: chordAt };
  })();

  // ---------- drawing the sprig (the studio's own cengkeh engine) ----------
  // a sway for sprig k: a slow lean, lifted by the score, and each branch a little behind the last
  // the sway is the waltz: one lean and back per bar, lifted by the score; each branch a little behind the last
  function cSway(k, amp) { if (reduce) return { sway: 0, swayEach: null }; var lv = liveLevel(), a = amp == null ? 1 : amp, ph = t / BAR_C * Math.PI * 2 + k * .9; return { sway: (Math.sin(ph) * .06 + lv * .03 * Math.sin(ph * 3)) * a, swayEach: function (i) { return Math.sin(ph - i * .5) * .035 * a; } }; }
  // the buds light as the kettles fan out: the centre on beat 1, the inner pair on beat 2, the outer pair on beat 3
  function budLight(rank) { if (reduce) return 0; var bt = (t % BAR_C) / BEAT_C, bi = Math.floor(bt); return bi === rank ? Math.exp(-(bt - bi) * 3) * (SND.kind === 'off' ? .55 : 1) : 0; }
  function budRank(i, n) { var mid = (n - 1) / 2; return mid ? Math.min(2, Math.round(Math.abs(i - mid) * 2 / mid)) : 0; }
  function sprigGlow(x, y, H, o, alpha) {
    var n = o.n || 5; g.save(); g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) { var I = budLight(budRank(i, n)) * alpha; if (I < .02) continue; var bp = cengkehBudPos(x, y, H, i, o), r = H * .1 * (1 + I * .6);
      var gr = g.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, r); gr.addColorStop(0, 'rgba(255,226,160,' + (I * .55).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,226,160,0)'); g.fillStyle = gr; g.fillRect(bp.x - r, bp.y - r, r * 2, r * 2); }
    g.restore();
  }
  // harvest light: a warm sun that swells with the gong, and gold motes drifting up through it
  function sunGlow(cx, cy, r, alpha) { var I = (.16 + lvG(0, t) * .12) * alpha; if (I <= 0) return; var gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(240,190,110,' + I.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(240,190,110,0)'); g.save(); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.restore(); }
  function motes(x0, y0, w, h, alpha, n) {
    if (alpha <= 0 || reduce) return; g.save(); g.fillStyle = '#F3E3B5';
    for (var j = 0; j < n; j++) { var sp = 12 + (j * 7) % 18, px = x0 + (j * 962.5) % w + Math.sin(t * 1.3 + j) * 6, py = y0 + h - ((t * sp + j * 53) % h), f = Math.sin(t * 2 + j); g.globalAlpha = alpha * (.25 + .45 * f * f); g.beginPath(); g.arc(px, py, 1.2 + (j % 3) * .6, 0, 7); g.fill(); }
    g.restore();
  }
  // a sprig whose buds light on the beat
  function liveSprig(x, y, H, ink, o) { var n = o.n || 5; cengkehSprig(g, x, y, H, ink, Object.assign({ budStyle: function (i) { var I = budLight(budRank(i, n)); return I > .02 ? { ball: mixHex('#E0C27E', '#FFF4D0', I * .8) } : {}; } }, o)); if ((o.buds == null ? 1 : o.buds) >= 1) sprigGlow(x, y, H, o, o.alpha == null ? 1 : o.alpha); }
  function mixHex(a, b, u) { var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), c = [16, 8, 0].map(function (sh) { var x = (A >> sh) & 255, y = (B >> sh) & 255; return Math.round(x + (y - x) * u); }); return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  // clove colours on the tree and on the mat: green, pink when ready to pick, crimson, then dried brown
  var RIPE = ['#8FA05A', '#D9978A', '#B5473A'], DRY = '#5A3A24';
  function ripeHex(u) { return u < .5 ? mixHex(RIPE[0], RIPE[1], u * 2) : mixHex(RIPE[1], RIPE[2], (u - .5) * 2); }
  function sprigGrow(p) { return { stem: ramp(p, 0, .2), leaves: ramp(p, .15, .4), branches: ramp(p, .35, .75), buds: ramp(p, .55, .9), open: ramp(p, .85, 1) }; }
  // a woven drying mat (tikar): small checks in two browns
  function tikar(x0, y0, w, h, alpha) { g.save(); g.globalAlpha *= alpha; var s = 12; for (var y = 0; y < h; y += s) for (var x = 0; x < w; x += s) { g.fillStyle = ((x / s + y / s) % 2) ? '#5E4A2E' : '#4A3A24'; g.fillRect(x0 + x, y0 + y, s, s); } g.strokeStyle = C.gold2; g.lineWidth = 1.2; g.strokeRect(x0, y0, w, h); g.restore(); }
  var SCENES_CENGKEH = [
    { id: 'c-title', dur: barsC(6), step: null,
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .5, d);
        sunGlow(640, 170, 420, out); motes(160, 40, 960, 340, out * .8, 40);
        [[400, .6], [640, 0], [880, 1.2]].forEach(function (S, k) { var gr = sprigGrow(ramp(lt, .2 + S[1], 4.6 + S[1])), sw = cSway(k); liveSprig(S[0], 370, 320, 'malam', Object.assign(gr, sw, { alpha: out })); });
        var a = eo(ramp(lt, 2.4, 3.4)) * out;
        text('BATIK MEDIA LAB · REEL 06', W / 2, 420, '500 13px ' + F.mono, C.gold2, a, 'center');
        text('Cengkeh sprig', W / 2, 500, '600 84px ' + F.display, C.paper, a, 'center');
        text('Five buds, two leaves, one harvest', W / 2, 546, 'italic 500 24px ' + F.display, C.mist, eo(ramp(lt, 3, 4.2)) * out, 'center');
      } },
    { id: 'c-listen', dur: barsC(12), step: 'Listen to the cloth', phase: 'Thinking',
      eyebrow: 'Step 1 · Listen to the cloth', head: 'A clove for the harvest.',
      body: 'Palu batik carries the clove, cengkeh, in honour of the harvest of Tolitoli, the clove country of Central Sulawesi. On the cloth it is read as a wish for health and healing for whoever wears it.',
      teach: 'Read the motif as grammar before you draw: what it is (a flower bud, picked before it opens), where it comes from (Tolitoli’s harvest), how it sits on the cloth (scattered sprigs), and what it wishes the wearer.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, 1, 2.4)) * out, b = eo(ramp(lt, 6, 7.2)) * out, c = eo(ramp(lt, 11, 12.2)) * out;
        g.save(); g.globalAlpha = a; g.strokeStyle = C.gold; g.lineWidth = 1.4; g.setLineDash([6, 6]); g.strokeRect(660, 110, 540, 200); g.setLineDash([]); g.beginPath(); g.rect(660, 110, 540, 200); g.clip();
        for (var r = 0; r < 3; r++) for (var q = 0; q < 6; q++) { var x = 690 + q * 96 + (r % 2) * 48, y = 190 + r * 66, sw = cSway(q + r * 6, .6); g.save(); g.translate(x, y); g.rotate((q + r) % 2 ? .25 : -.25); cengkehSprig(g, 0, 0, 78, 'malam', Object.assign({ alpha: .7 }, sw)); g.restore(); }
        g.restore(); text('batik Palu · clove sprigs scattered on the cloth (a sketch, not a copy)', 660, 330, '500 12px ' + F.mono, C.mist, a);
        text('TOLITOLI', 660, 390, '500 13px ' + F.mono, C.gold2, b); para('Clove country of Central Sulawesi. The buds are picked by hand, then dried in the sun along the road.', 660, 420, 420, 'italic 500 22px ' + F.display, 26, C.paper, b);
        g.save(); g.globalAlpha = c; g.strokeStyle = C.gold2; g.lineWidth = 1.5; rr(900, 520, 300, 110, 6); g.stroke(); g.restore();
        text('RULE', 920, 550, '500 12px ' + F.mono, C.gold2, c); para('Learn the grammar. Redraw everything else.', 920, 582, 270, 'italic 500 22px ' + F.display, 26, C.paper, c);
      } },
    { id: 'c-brief', dur: barsC(6), step: 'Set the brief', phase: 'Thinking',
      eyebrow: 'Step 2 · Set the brief', head: 'A sprig that can be scattered.',
      body: 'The clove sprig belongs to the Dua Pulau signature. It must read alone, scatter as a ground, grow in the Bomba Garden beside the rosettes, and stay legible on pearl and on black.',
      teach: 'The brief: our own drawing, credited origins, five buds, one dark leaf and one teal leaf, and an ink for every ground it will meet.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        ['Our own drawing, never a copy of the cloth', 'Five buds: a Fibonacci number', 'One dark leaf, one teal: never symmetric', 'Credit Palu’s batik makers and Tolitoli'].forEach(function (r, i) {
          var a = eo(ramp(lt, .5 + i * .9, 1.2 + i * .9)) * out; g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(680, 160 + i * 74, 5, 0, 7); g.fill(); g.restore();
          text(r, 704, 166 + i * 74, '500 24px ' + F.display, C.paper, a);
        });
        [760, 940, 1120].forEach(function (x, k) { liveSprig(x, 640, 150, 'malam', Object.assign(sprigGrow(ramp(lt, 3.8 + k * .5, 7.6 + k * .5)), cSway(k), { alpha: out })); });
      } },
    { id: 'c-bud', dur: barsC(12), step: 'Draw one bud', phase: 'Ideation',
      eyebrow: 'Step 3 · Draw one bud', head: 'A tube, four sepals, a round flower.',
      body: 'A clove is a flower bud picked before it opens. The tube is the calyx, narrow at the stem and widening to the head; four sepals sit round it like a crown; inside them the petals are still a closed ball. We draw it as flat shapes: a tapered tube with one line, four lobes, a ball and a pearl dot.',
      teach: 'Draw the thing itself before the ornament. Knowing that the ball is unopened petals and the crown is four sepals keeps every bud the same and every count right.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), p = ramp(lt, .4, d - 3), a = eo(ramp(lt, .3, 1)) * out, foot = 630, size = 460;
        g.save(); g.globalAlpha = a * .5; g.strokeStyle = C.line2; g.lineWidth = 1; for (var gx = 700; gx <= 1180; gx += 40) { g.beginPath(); g.moveTo(gx, 110); g.lineTo(gx, 630); g.stroke(); } for (var gy = 110; gy <= 630; gy += 40) { g.beginPath(); g.moveTo(700, gy); g.lineTo(1180, gy); g.stroke(); } g.restore();
        var rv = ramp(p, 0, .55), lv = liveLevel(), sw = reduce ? 0 : Math.sin(t * 2.1) * .03;
        g.save(); g.beginPath(); g.rect(640, foot - (size + 40) * rv, 600, (size + 40) * rv + 10); g.clip();
        cengkehBud(g, 940, foot, size * (1 + (p >= 1 ? lv * .025 + budLight(0) * .025 : 0)), sw, 'malam', { open: eo(ramp(p, .55, .78)), lw: 1.6 });
        g.restore();
        var lab = p < .3 ? 'the tube · the calyx, narrow at the stem' : p < .55 ? 'it widens to the head' : p < .78 ? 'four sepals open into a crown' : 'the closed petals, a ball, and its pearl dot';
        text(lab, 940, 662, '500 12px ' + F.mono, C.gold2, out * .9, 'center');
      } },
    { id: 'c-fan', dur: barsC(12), step: 'Fan the five', phase: 'Synthesis', explore: 'fan',
      eyebrow: 'Step 4 · Fan the five', head: 'From the middle out: one, then two, then two.',
      body: 'The stem rises and opens its two leaves; then five branches fan from one joint, the centre bud first, then the inner pair, then the outer pair, each branch elbowing once so the fan reads as grown rather than ruled. Five is a Fibonacci number; the two leaves, one dark and one teal, keep it from becoming a mirror.',
      teach: 'Grow a motif in the order a plant would, and the count will look natural. Break the symmetry on purpose, low down, so the eye reads a living sprig and not an emblem.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), ex = EX && EX.scene === 'c-fan';
        var n = ex ? EX.n : 5, spread = ex ? EX.spread : 56, ink = ex ? EX.ink : 'malam', ground = ex ? EX.ground : '#0E0C09', p = ex ? 1 : ramp(lt, .4, d - 2.5);
        if (ground !== '#0E0C09') { g.save(); g.globalAlpha = out; g.fillStyle = ground; g.fillRect(680, 100, 520, 545); g.restore(); }
        if (ground === '#0E0C09') { sunGlow(1080, 180, 320, out); motes(690, 110, 500, 520, out * .7, 26); }
        liveSprig(940, 636, 520, ink, Object.assign({ stem: ramp(p, 0, .12), leaves: ramp(p, .1, .25), branches: ramp(p, .25, .72), buds: ramp(p, .4, .85), open: ramp(p, .85, .95), n: n, spread: spread, alpha: out }, cSway(0, ex ? .6 : 1)));
        if (!ex) { var k = p < .25 ? 'the stem, and two leaves of two colours' : p < .45 ? 'the centre bud first' : p < .6 ? 'then the inner pair' : 'then the outer pair: five, a Fibonacci number'; text(k, 940, 662, '500 12px ' + F.mono, C.gold2, out * .9, 'center'); }
      } },
    { id: 'c-ripen', dur: barsC(14), step: 'Ripen, pick and dry', phase: 'Synthesis',
      eyebrow: 'Step 5 · Ripen, pick and dry', head: 'Green, then pink, then picked.',
      body: 'On the tree the buds turn from green to pink, and they are picked by hand before the flowers open. Laid out on mats in the sun they dry to the dark brown clove everyone knows. The sprigs dance to the waltz, ripen bud by bud, drop their cloves to the mat and grow new ones, the way a harvest goes on.',
      teach: 'Let the motif carry its story in time. The same drawing, recoloured and released, shows the whole harvest without a single new shape.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), base = 540, H = 270, CY = 6.2, PICK = 3.6, GONE = 1;
        sunGlow(1100, 150, 340, out); motes(690, 100, 500, 470, out * .8, 30);
        tikar(690, 580, 500, 52, eo(ramp(lt, 2.5, 4)) * out);
        [760, 940, 1120].forEach(function (x, k) {
          var sw = cSway(k); function local(i) { return lt - .6 - k * .7 - Math.abs(i - 2) * .45; }
          cengkehSprig(g, x, base, H, 'malam', Object.assign({ alpha: out, budStyle: function (i) {
            var L = local(i), I = budLight(budRank(i, 5)); if (L < 0) return { tube: RIPE[0], ball: mixHex('#C8D49A', '#FFF4D0', I * .6) };
            var ph = L % CY; if (ph >= PICK && ph < PICK + GONE) return { hidden: true };
            var rp = ph < PICK ? ph / PICK : 0; return { tube: ripeHex(rp), ball: mixHex(mixHex('#C8D49A', '#F0B9A8', rp), '#FFF4D0', I * .6) };
          } }, sw));
          sprigGlow(x, base, H, sw, out * .8);
          for (var i = 0; i < 5; i++) {
            var L = local(i); if (L < PICK) continue;
            for (var c = 0; c <= Math.floor((L - PICK) / CY); c++) {
              var ft = L - PICK - c * CY; if (ft < 0) continue;
              var bp = cengkehBudPos(x, base, H, i, sw), id = c * 15 + k * 5 + i, gx = (id * .618034) % 1, gy = (id * .754878) % 1, lx = 702 + gx * 436, ly = 594 + gy * 26, u = clamp(ft / .9, 0, 1);
              var fx = bp.x + (lx - bp.x) * u, fy = bp.y + (ly - bp.y) * u * u, ang = bp.a + ((((id * 53) % 7) - 3) * .22 + Math.PI / 2 - bp.a) * u, dry = ramp(ft, 1, 3.5);
              cengkehBud(g, fx, fy, 46, ang, 'malam', { open: .2, tube: mixHex(RIPE[2], DRY, dry), ball: mixHex('#F0B9A8', '#3E2818', dry), sepal: mixHex('#2A241B', '#24170E', dry), lw: 1 });
            }
          }
        });
        text(lt < 6 ? 'green, then pink: picked before the flower opens' : 'and again: the mat fills, the cloves dry brown', 940, 662, '500 12px ' + F.mono, C.gold2, out * .9, 'center');
      } },
    { id: 'c-misread', dur: barsC(6), step: 'Check misreadings', phase: 'Test',
      eyebrow: 'Step 6 · Check misreadings', head: 'A hand, a candlestick, or a clove?',
      body: 'At sixteen pixels the fan of five reads as a hand or a fork. At forty, with the leaves too small to see, it can read as a candlestick. From about a hundred and twenty the buds, the sepals and the two leaf colours read as a clove sprig. So the small master drops the leaf dots and closes the sepals, but keeps both leaves big and in two colours.',
      teach: 'Test at the smallest size it will print, and name what it turns into. The cure here is the one asymmetry the drawing already has: the two leaves.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        [[16, 700, 'a hand · a fork'], [40, 885, 'a candlestick'], [140, 1070, 'a clove sprig']].forEach(function (R, i) {
          var a = eo(ramp(lt, .4 + i * 1.2, 1.2 + i * 1.2)) * out;
          g.save(); g.globalAlpha = a; g.strokeStyle = C.line2; g.lineWidth = 1; g.strokeRect(R[1], 150, 150, 150); g.restore();
          cengkehSprig(g, R[1] + 75, 225 + R[0] / 2, R[0], 'malam', Object.assign({ alpha: a }, cSway(i, .5)));
          text(R[0] + ' px tall', R[1], 330, '500 12px ' + F.mono, C.gold2, a); text(R[2], R[1], 350, '500 12px ' + F.mono, C.mist, a);
        });
        var b = eo(ramp(lt, 4.2, 5.2)) * out;
        for (var k = 0; k < 8; k++) cengkehSprig(g, 730 + k * 64, 530, 64, 'malam', Object.assign({ alpha: b, dots: false, open: 0 }, cSway(k, .5)));
        text('small master · no leaf dots, sepals closed, both leaves kept', 700, 572, '500 12px ' + F.mono, C.gold2, b);
      } },
    { id: 'c-system', dur: barsC(6), step: 'Where the sprig lives', phase: 'System',
      eyebrow: 'Step 7 · Where the sprig lives', head: 'Scattered, in the garden, along a hem.',
      body: 'Tilted left and right on a half-drop it scatters into a quiet ground. In the Bomba Garden it grows round the rosettes, buds pointing outward. Small and upright, it walks along a hem. One drawing, three jobs.',
      teach: 'A sprig is the most movable of motifs: it takes a tilt, a ring or a row. Keep the master in one place and let every use read from it.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .3, 1.3)) * out, b = eo(ramp(lt, 1.6, 2.6)) * out, c = eo(ramp(lt, 2.8, 3.8)) * out;
        sunGlow(1080, 250, 200, b); motes(690, 110, 520, 480, out * .6, 24);
        g.save(); g.globalAlpha = a; g.beginPath(); g.rect(700, 140, 220, 220); g.clip();
        for (var r = 0; r < 4; r++) for (var q = 0; q < 4; q++) { g.save(); g.translate(715 + q * 62 + (r % 2) * 31, 200 + r * 58); g.rotate((q + r) % 2 ? .3 : -.3); cengkehSprig(g, 0, 0, 58, 'malam', cSway(q + r * 4, .6)); g.restore(); }
        g.restore(); g.save(); g.globalAlpha = a; g.strokeStyle = C.gold2; g.lineWidth = 1.5; g.strokeRect(700, 140, 220, 220); g.restore();
        text('scattered ground · half-drop, tilted', 810, 390, '500 12px ' + F.mono, C.mist, a, 'center');
        var rot = reduce ? 0 : lt * .12;
        for (var k = 0; k < 5; k++) { var an = rot + k * Math.PI * 2 / 5; g.save(); g.translate(1080 + Math.sin(an) * 46, 250 - Math.cos(an) * 46); g.rotate(an); cengkehSprig(g, 0, 0, 100, 'malam', Object.assign({ alpha: b }, cSway(k, .5))); g.restore(); }
        putImg('motifs/bomba-rosette--buya.png', 1080, 250, 84, b, rot * .5); text('Bomba Garden · round the rosette', 1080, 390, '500 12px ' + F.mono, C.mist, b, 'center');
        g.save(); g.globalAlpha = c; g.strokeStyle = C.gold2; g.lineWidth = 1.5; g.beginPath(); g.moveTo(700, 470); g.lineTo(1200, 470); g.moveTo(700, 560); g.lineTo(1200, 560); g.stroke(); g.restore();
        for (var h = 0; h < 8; h++) cengkehSprig(g, 730 + h * 63, 550, 72, 'malam', Object.assign({ alpha: c }, cSway(h, .7)));
        text('hem · small and upright', 950, 592, '500 12px ' + F.mono, C.mist, c, 'center');
      } },
    { id: 'c-keep', dur: barsC(6), step: 'Credit and keep', phase: 'Archive',
      eyebrow: 'Step 8 · Credit and keep', head: 'Credit the cloth. Keep the drawing.',
      body: 'Cengkeh sprig: our own drawing, inspired by the clove motif of Palu batik, which honours the clove harvest of Tolitoli, Central Sulawesi, with gratitude to the batik makers of Palu and the clove growers of Tolitoli. The master lives in the engine; every ground, garden and hem reads from it.',
      teach: 'Credit is part of the design. Keep the source, the rule, the drawing and the credit line together, so the next person can continue rather than restart.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .3, 1.5)) * out;
        sunGlow(940, 230, 260, a); motes(740, 80, 400, 340, a * .7, 20);
        liveSprig(940, 400, 300, 'malam', Object.assign({ alpha: a }, cSway(0)));
        text('REEL 06 · SAVED TO THE LAB', 940, 450, '500 13px ' + F.mono, C.gold2, eo(ramp(lt, 2, 3)) * out, 'center');
        text('Next: Dua Pulau medallion', 940, 486, 'italic 500 22px ' + F.display, C.mist, eo(ramp(lt, 3.2, 4.2)) * out, 'center');
      } }
  ];
  var SCORES_CENGKEH = [['off', 'Sound off'], ['cengkeh', 'Lima Kuntum · 138 bpm in 3']];
  var STEMS_CENGKEH = [['kakula', 'Kakula, the fan'], ['kakula2', 'Second kakula, the buds'], ['gamba', 'Gamba-gamba, the waltz'], ['tatali', 'Tatali'], ['angklung', 'Angklung, the ground'], ['dio', 'Dio, plucked bass'], ['gongs', 'Tawa-tawa'], ['drums', 'Gimba'], ['shaker', 'Dried cloves'], ['claps', 'Claps'], ['bass', 'Low gong']];

  // =================== Reel 07 · Dua Pulau medallion, the emblem ===================
  // Score: Dua Pulau (two islands), our own song for the emblem, made the way Bunga Kaili is made and kept simple so it can be
  // felt: one tune, sung by the kakula on the Kaili kettles, answered from Bali by the flute. The call, a verse in A minor, the
  // answer, the verse again, the rose singing itself at the heart, a chorus that lifts into C major, the flute remembering the
  // verse alone, the chorus once more, and the call coming home to a bright A major. 110 bpm, 52 bars, a section per scene.
  // The rings' own loops (13 rays, 21 leaves, 55 dots) sound only softly under the chorus; the drawing still keeps their time.
  var BPM_D = 110, BEAT_D = 60 / BPM_D, BAR_D = BEAT_D * 4; function barsD(n) { return n * BAR_D; }
  var LD = (function () {
    var CHP = { Am: [9, 0, 4], C: [0, 4, 7], G: [7, 11, 2], F: [5, 9, 0], Em: [4, 7, 11], A: [9, 1, 4] }, ROOT = { Am: 110.00, C: 130.81, G: 98.00, F: 87.31, Em: 82.41, A: 110.00 };
    var HARM = [
      'Am', 'F', 'C', 'G',                                  // 0-3 the call
      'Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'Am',            // 4-11 verse
      'Am', 'F', 'C', 'G',                                  // 12-15 Bali answers
      'Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'Am',            // 16-23 verse again, the flute beside it
      'Am', 'F', 'C', 'G', 'Am', 'G',                       // 24-29 the rose sings itself, then a breath
      'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C', 'Am', 'G',  // 30-39 chorus, and down again
      'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C',             // 40-47 the last chorus, everyone, the flute above
      'Am', 'F', 'G', 'A'];                                 // 48-51 home
    var NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function N(s) { var m = /^([A-G])(b|#)?(\d)$/.exec(s); return 261.63 * Math.pow(2, (NN[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0)) / 12 + (+m[3] - 4)); }
    var MEL = {
      verse: ['A4:.5 C5:.5 E5:2 D5:.5 C5:.5', 'C5:3 R:1', 'G4:.5 A4:.5 C5:2 D5:.5 E5:.5', 'D5:3 R:1',
              'A4:.5 C5:.5 E5:2 E5:.5 G5:.5', 'A5:2 G5:.5 E5:.5 C5:1', 'D5:1.5 E5:.5 D5:1 B4:1', 'A4:3 R:1'],
      answer: ['E5:1.5 G5:.5 A5:2', 'R:1 C6:1 A5:1 F5:1', 'G5:2 E5:1 C5:1', 'D5:3 R:1'],
      beside: ['C6:4', 'A5:4', 'G5:4', 'B5:4', 'C6:4', 'C6:4', 'B5:2 D6:2', 'C6:3 R:1'],
      chorus: ['C6:2 B5:1 A5:1', 'B5:2 G5:1 D5:1', 'E5:1 G5:1 B5:2', 'A5:3 R:1', 'A5:1 C6:1 A5:1.5 G5:.5', 'G5:2 D5:1 B4:1', 'C5:1 E5:1 G5:1.5 E5:.5', 'C5:3 R:1'],
      down: ['E5:1.5 D5:.5 C5:1 A4:1', 'B4:2 D5:2'],
      home: ['A4:.5 C5:.5 E5:2 D5:.5 C5:.5', 'C5:3 R:1', 'D5:1 E5:1 D5:1 B4:1', 'A4:4']
    };
    var EUC = []; for (var q = 0; q < 21; q++) EUC.push(Math.floor((q + 1) * 8 / 21) - Math.floor(q * 8 / 21)); // 8 strokes spread evenly over 21
    var RAYH = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 1, 0], TIP = 4, GA = 137.50776;
    // the same Kaili kettles as Bunga Kaili: la do re mi sol la si from A3, each a few cents off true, which is their colour
    var KAILI = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25, 587.33, 659.26, 783.99, 880.00, 987.77, 1046.50], KDR = [2, -3, 4, -2, 3, 2, -3, 3, -2, 4, -3, 2, -2, 3];
    function pcOf(f) { return ((Math.round(12 * Math.log2(f / 261.63)) % 12) + 12) % 12; }
    function kaili(f) { for (var i = 0; i < KAILI.length; i++) if (Math.abs(1200 * Math.log2(f / KAILI[i])) < 20) return i; return -1; }
    function ktones(ch, lo, n) { return KAILI.filter(function (f) { return f >= lo * .99 && CHP[ch].indexOf(pcOf(f)) >= 0; }).slice(0, n); }
    function chordAt(bar) { return HARM[Math.max(0, Math.min(HARM.length - 1, bar))]; }
    function compose(opt) {
      var lilt = opt && opt.feel === 'lilt' ? BEAT_D * .08 : 0, E = [], prevK = null;
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR_D + beat * BEAT_D; }
      function kn(f) { return ((Math.round(12 * Math.log2(f / 220)) % 7) + 7) % 7; }
      // a kakula can only strike a Kaili kettle, tuned as in Bunga Kaili
      function KF(time, f, v, beats, soft, stem, detune) { var isK = (stem || 'kakula').indexOf('kakula') === 0, ki = isK ? kaili(f) : -1; if (isK && ki < 0) return null; if (ki >= 0) f = KAILI[ki] * Math.pow(2, KDR[ki] / 1200); var e = { t: time, k: 'kettle', n: kn(f), f: f * (detune || 1), v: v, soft: !!soft, d: clamp(beats * BEAT_D * (soft ? 2.6 : 2), .3, 2.4), s: stem || 'kakula' }; E.push(e); return e; }
      function bars(a, b, fn) { for (var x = a; x < b; x++) fn(x, chordAt(x)); }
      // the kakula sings, as in Bunga Kaili: a grace note from the kettle above on a new long note, a soft roll to keep a long
      // note sounding, a second kakula a chord tone below; fl doubles it quietly on the flute
      function kline(bar, str, v, soft, fl) { var beat = 0; str.split(' ').forEach(function (tok) { var p = tok.split(':'), d = +(p[1] || .5); if (p[0] === 'R') { beat += d; prevK = null; return; }
          var f = N(p[0]), t0 = T(bar, beat), ki = kaili(f);
          if (d >= 1 && !soft && prevK !== null && Math.abs(prevK - f) > 1 && beat % 2 === 0 && ki >= 0 && ki < KAILI.length - 1) KF(t0 - .07, KAILI[ki + 1], v * .22, .25, false);
          var e = KF(t0, f, v, d, soft); if (e) { e.lead = 1; e.d = Math.max(e.d, d * BEAT_D); }
          if (d >= 1.5) for (var q = .75; q < d - .4; q += 1 / 3) KF(t0 + q * BEAT_D, f, v * (soft ? .1 : .13), .3, soft);
          if (d >= 1) { var ch = chordAt(bar), lo = KAILI.filter(function (k) { var st = 12 * Math.log2(f / k); return st >= 2.5 && st <= 9.5 && CHP[ch].indexOf(pcOf(k)) >= 0; }); if (lo.length) KF(t0, lo[lo.length - 1], v * .4, d, true, 'kakula2'); }
          if (fl) E.push({ t: t0, k: 'tatali', f: f, v: fl, d: d * BEAT_D * .92, s: 'tatali' });
          prevK = f; beat += d; }); }
      function ksing(at, list, v, soft, fl) { list.forEach(function (s, i) { kline(at + i, s, v, soft, fl); }); }
      // the flute sings alone (lead) or holds long notes beside the kakula
      function flute(at, list, v, lead) { list.forEach(function (s, i) { var beat = 0; s.split(' ').forEach(function (tok) { var p = tok.split(':'), d = +p[1]; if (p[0] !== 'R') E.push({ t: T(at + i, beat), k: 'tatali', f: N(p[0]), v: v, d: d * BEAT_D * .94, s: 'tatali', lead: lead ? 1 : 0 }); beat += d; }); }); }
      // the gamba-gamba: soft chords on 1 and 3, or Bunga Kaili's eighth figure when the song opens up
      function gamba(a, b, v, full) { bars(a, b, function (x, ch) { var pcs = CHP[ch], seq = full ? [[0, 0], [.5, 2], [1, 1], [1.5, 2], [2, 0], [2.5, 2], [3, 1], [3.5, 2]] : [[0, 0], [2, 1]];
          seq.forEach(function (sq) { var pc = pcs[sq[1]], f = 261.63 * Math.pow(2, pc / 12); if (f > 400) f /= 2; E.push({ t: T(x, sq[0]), k: 'kolintang', n: pc % 7, f: f, v: (sq[0] % 1 ? .15 : .21) * v, s: 'gamba' }); if (!full) CHP[ch].forEach(function (pc2, j) { if (j === sq[1]) return; var f2 = 261.63 * Math.pow(2, pc2 / 12); if (f2 > 400) f2 /= 2; E.push({ t: T(x, sq[0]) + .01 * (j + 1), k: 'kolintang', n: pc2 % 7, f: f2, v: .12 * v, s: 'gamba' }); }); }); }); }
      function bed(a, b, v) { bars(a, b, function (x, ch) { CHP[ch].forEach(function (pc, j) { var f = 261.63 * Math.pow(2, pc / 12); E.push({ t: T(x, 0) + j * .015, k: 'angklung', f: f, v: .2 * v, d: BAR_D * .95, s: 'angklung' }); }); }); }
      function low(a, b, v, walk) { bars(a, b, function (x, ch) { E.push({ t: T(x, 0), k: 'bassgong', f: ROOT[ch], v: .42 * v, s: 'bass' }); if (walk) E.push({ t: T(x, 2), k: 'bassgong', f: ROOT[ch] * 1.5, v: .28 * v, s: 'bass' }); }); }
      function dio(a, b, v) { bars(a, b, function (x, ch) { var r = ROOT[ch] < 100 ? ROOT[ch] * 2 : ROOT[ch]; E.push({ t: T(x, 0), k: 'dio', f: r, v: .45 * v, s: 'dio' }); E.push({ t: T(x, 2), k: 'dio', f: r * 1.5, v: .3 * v, s: 'dio' }); E.push({ t: T(x, 3.5), k: 'dio', f: r, v: .22 * v, s: 'dio' }); }); }
      // the tawa-tawa sounds a note of the chord: C3 or G3 if the chord holds one, otherwise A2
      function gongs(a, b, v) { bars(a, b, function (x, ch) { var f = [130.81, 196.00, 110.00, 164.81].filter(function (g0) { return CHP[ch].indexOf(pcOf(g0)) >= 0; })[0]; E.push({ t: T(x, x % 2 ? 2 : 0), k: 'gong', n: x % 2, f: f, v: (x % 2 ? .17 : .3) * v, s: 'gongs' }); }); }
      function gimba(a, b, v, half) { bars(a, b, function (x) { (half ? [[0, 'dum', .4], [3, 'tak', .3]] : [[0, 'dum', .42], [1, 'tak', .4], [2, 'dum', .3], [3, 'tak', .42], [3.5, 'tak', .14]]).forEach(function (h) { E.push({ t: T(x, h[0]), k: 'drum', n: h[1], v: h[2] * v, s: 'drums' }); }); }); }
      function loom(a, b, v) { v *= 1.8; bars(a, b, function (x) { E.push({ t: T(x, 0), k: 'beater', v: .4 * v, s: 'loom' }); E.push({ t: T(x, 2), k: 'beater', v: .3 * v, s: 'loom' }); E.push({ t: T(x, 1), k: 'shuttle', v: .16 * v, s: 'loom' }); E.push({ t: T(x, 3), k: 'shuttle', v: .16 * v, s: 'loom' }); }); }
      // the rings' loops, soft: rays a kakula broken chord on eighths (13 steps), leaves 8 reyong strokes in 21 sixteenths, dots the shaker
      function rays(a, b, v) { bars(a, b, function (x, ch) { var tn = ktones(ch, 261.63, 5); for (var e = 0; e < 8; e++) { var gi = (x * 8 + e) % 13; KF(T(x, e / 2), tn[RAYH[gi]], v * (gi === TIP ? 1.2 : .8), .5, true, 'kakula'); } }); }
      function leaves(a, b, v) { bars(a, b, function (x, ch) { var tn = ktones(ch, 783.99, 4); for (var s = 0; s < 16; s++) { var gs = x * 16 + s; if (!EUC[gs % 21]) continue; var f = tn[Math.floor(((gs * GA) % 360) / 90) % tn.length]; KF(T(x, s / 4), f, v, .25, true, 'reyong'); KF(T(x, s / 4) + .004, f, v * .6, .25, true, 'reyong', 1.006); } }); }
      function dots(a, b, v) { bars(a, b, function (x) { for (var s = 0; s < 16; s++) E.push({ t: T(x, s / 4), k: 'shaker', v: (s % 4 === 2 ? .08 : .035) * v, s: 'shaker' }); }); }
      // the rose sings itself, Bunga Kaili's ring song from the heart out: 3 notes in a bar, then 5, 8 and 13, each a Kaili
      // kettle on the chord, chosen by the golden angle, moving by small steps
      function roseSong(at, counts, v) { var prev = 8, idx = 0; counts.forEach(function (n, k) { var x = at + k, ch = chordAt(x), ct = [];
          KAILI.forEach(function (f, i) { if (i >= 4 && i <= 12 && CHP[ch].indexOf(pcOf(f)) >= 0) ct.push(i); });
          for (var j = 0; j < n; j++) { var s16 = Math.floor(j * 16 / n), gi = 4 + Math.floor(((idx++ * GA) % 360) / 360 * 9), best = ct[0], sc = 1e9;
            ct.forEach(function (i) { var q = Math.abs(i - gi) + .8 * Math.abs(i - prev); if (q < sc) { sc = q; best = i; } });
            var e = KF(T(x, s16 / 4), KAILI[best], v * (n >= 8 ? .8 : 1), 16 / n / 4, n >= 8, 'kakula'); if (e) e.lead = 1; prev = best; } }); }

      // Progressive: the song grows the way the medallion is drawn, from the heart out. Each section adds a layer and nothing
      // leaves once it has come in: the heart (the kakula alone), the disc (gongs, low gong, gamba-gamba), Bali (the flute),
      // the rays (their 13-step loop, the loom, the gimba), the dots (the shaker, the held chords), the leaves (the reyong
      // shimmer, the dio), and then everyone in the last chorus with the flute above. A slow swell runs under the whole piece.
      // The heart 0-3: the call, the kakula alone, softly; one gong
      ksing(0, MEL.verse.slice(0, 4), .4, true); E.push({ t: T(0, 0), k: 'gong', n: 0, f: 110, v: .3, s: 'gongs' });
      // + the disc 4-11: the verse; the gongs, the low gong and the gamba-gamba come in
      ksing(4, MEL.verse, .48); gongs(4, 52, .9); low(4, 30, .85); gamba(4, 30, .8);
      // + Bali 12-15: the flute answers, and stays
      flute(12, MEL.answer, .3, true); KF(T(12, 0), 440, .16, 4, true, 'kakula'); KF(T(14, 0), 523.25, .16, 4, true, 'kakula');
      // + the rays 16-23: the verse again, the flute beside it; the 13-step rays loop, the loom and the gimba on the half bar
      ksing(16, MEL.verse, .5); flute(16, MEL.beside, .16, false); rays(16, 24, .1); loom(16, 48, .35); gimba(16, 24, .7, true);
      // + the dots 24-29: the rose sings itself; the shaker and the held chords come in, the gimba fills out
      roseSong(24, [3, 5, 8, 13, 13], .46); flute(24, ['A5:4', 'A5:4', 'G5:4', 'B5:4', 'C6:4'], .12, false); rays(24, 30, .12); dots(24, 52, .55); bed(24, 52, .42); gimba(24, 52, .9);
      [4, 5, 7, 8, 9, 10, 11].forEach(function (i, j) { KF(T(29, 2 + j * 2 / 7), KAILI[i], .3 + j * .03, .3, false); });
      for (var r = 0; r < 8; r++) E.push({ t: T(29, 2 + r / 4), k: 'drum', n: r % 4 === 0 ? 'dum' : 'tak', v: .1 + r * .035, s: 'drums' });
      // + the leaves 30-39: the chorus in C major; the reyong shimmer and the dio come in, the gamba-gamba opens into eighths
      ksing(30, MEL.chorus, .55, false, .2); gamba(30, 52, 1, true); low(30, 52, 1, true); dio(30, 52, .85); rays(30, 52, .15); leaves(30, 52, .12);
      ksing(38, MEL.down, .52, false, .2);
      [8, 10, 12, 13, 14, 15].forEach(function (s16, i) { E.push({ t: T(39, s16 / 4), k: 'drum', n: i % 2 ? 'tak' : 'dum', v: .2 + i * .045, s: 'drums' }); });
      // Everyone 40-47: the last chorus, the kakula with the flute, and the flute's descant above
      ksing(40, MEL.chorus, .58, false, .22); flute(40, ['C6:4', 'D6:4', 'B5:4', 'C6:4', 'C6:4', 'D6:4', 'E6:2 D6:2', 'C6:4'], .14, false);
      // Home 48-51: the call once more over everything, settling; the last chord turns to A major
      ksing(48, MEL.home, .48, false, .16);
      [9, 1, 4].forEach(function (pc, j) { var f = 220 * Math.pow(2, ((pc - 9 + 12) % 12) / 12); E.push({ t: T(51, 0) + j * .012, k: 'kolintang', n: pc % 7, f: f, v: .24, s: 'gamba' }); E.push({ t: T(51, 0) + j * .015, k: 'angklung', f: f * 2, v: .16, d: BAR_D * 1.2, s: 'angklung' }); });
      E.push({ t: T(51, 0), k: 'tatali', f: N('E5'), v: .2, d: BAR_D * 1.1, s: 'tatali' }); E.push({ t: T(51, 0), k: 'gong', n: 0, f: 110, v: .55, s: 'gongs' }); E.push({ t: T(51, 0), k: 'bassgong', f: 110, v: .48, s: 'bass' });
      // the swell: everything grows from soft to full by the last chorus, and eases a little into the final bar
      E = E.filter(function (e) { var bar = Math.floor(e.t / BAR_D + 1e-6); return !(bar === 51 && e.t > T(51, 0) + .05 && e.k !== 'kettle' && e.k !== 'tatali'); });
      E.forEach(function (e) { var x = e.t / BAR_D, u = clamp(x / 44, 0, 1); e.v *= (.62 + .38 * u * u * (3 - 2 * u)) * (x > 48 ? 1 - .12 * clamp(x - 48, 0, 3) / 3 : 1); });
      return E;
    }
    return { compose: compose, BAR: BAR_D, BPM: BPM_D, chordAt: chordAt, EUC: EUC, HARM: HARM };
  })();

  // ---------- drawing the medallion (the studio's own medallion engine, the Bomba rose as its heart) ----------
  // a light chasing round a ring of n: the element on the current step glows, the ones just behind it fade
  function chase(cur, i, n) { var d = ((cur - i) % n + n) % n; return d < 4 ? Math.exp(-d * .9) : 0; }
  // the loops' own steps from the clock: rays on eighths (13), leaves and dots on sixteenths (21 and 55)
  function mLights(on) {
    if (reduce || !on) return {}; var e8 = Math.floor(t / (BEAT_D / 2)), e16 = Math.floor(t / (BEAT_D / 4)), k = SND.kind === 'off' ? .6 : 1;
    return { rays: function (i) { return chase(e8 % 13, i, 13) * k; }, leaves: function (i) { return chase(e16 % 21, i, 21) * k * (LD.EUC[e16 % 21] ? 1 : .5); }, dots: function (i) { return chase(e16 % 55, i, 55) * k; } };
  }
  // the heart is the Bomba rose itself, its rings growing with the heart's progress
  // the heart is cut from the master drawing itself (the one on the front panel), so the two can never drift apart; heart
  // radius 200 in the master's 1024-px units. It opens from the centre out: reveal 0..1 is the radius of the cut.
  function masterHeart(c, cx, cy, r, reveal, ink) {
    var im = img(ink === 'dua' ? 'motifs/dua-pulau-medallion.png' : 'motifs/dua-pulau-medallion--buya.png'), k = r / 200, rv = clamp(reveal, 0, 1);
    if (rv <= 0) return; c.save(); c.beginPath(); c.arc(cx, cy, r * rv, 0, Math.PI * 2); c.clip();
    if (im.complete && im.naturalWidth) c.drawImage(im, cx - 512 * k, cy - 512 * k, 1024 * k, 1024 * k); else { c.fillStyle = ink === 'dua' ? '#C39B65' : '#C9A35A'; c.fill(); }
    c.restore();
  }
  function mHeart(ink) { return function (c, cx, cy, r, sh) { masterHeart(c, cx, cy, r, eo(clamp(sh, 0, 1)), ink); }; }
  // the score, once, so the drawing can read the tune and the gongs from the clock
  var MD_EV = null;
  function mdEv() { if (!MD_EV) { var E = LD.compose({}); MD_EV = { mel: E.filter(function (e) { return e.lead; }).sort(function (a, b) { return a.t - b.t; }), gong: E.filter(function (e) { return e.k === 'gong'; }) }; } return MD_EV; }
  // the tune draws its own star: seven points round the mark, one per step of the scale, further out the higher the octave
  function degPos(f, cx, cy, R) { var st = Math.round(12 * Math.log2(f / 261.63)), pc = ((st % 12) + 12) % 12, oct = Math.floor(st / 12), deg = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc], a = -Math.PI / 2 + deg * Math.PI * 2 / 7, r = R * clamp(.36 + .17 * (oct + 1), .22, .97); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
  function tuneStar(cx, cy, R, alpha) {
    if (reduce || !(alpha > .01)) return; var M = mdEv().mel, i = -1, LIFE = 6;
    for (var k = 0; k < M.length && M[k].t <= t; k++) i = k; var pts = [];
    for (k = i; k >= 0 && pts.length < 20; k--) { var age = t - M[k].t; if (age > LIFE) break; pts.push({ p: degPos(M[k].f, cx, cy, R), age: age, e: M[k] }); }
    if (!pts.length) return; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (k = 0; k < 7; k++) { var a7 = -Math.PI / 2 + k * Math.PI * 2 / 7; g.fillStyle = 'rgba(224,194,126,' + (.25 * alpha).toFixed(3) + ')'; g.beginPath(); g.arc(cx + Math.cos(a7) * R * 1.02, cy + Math.sin(a7) * R * 1.02, 1.8, 0, 7); g.fill(); }
    for (k = 0; k < pts.length - 1; k++) { var la = (1 - pts[k].age / LIFE) * alpha; g.strokeStyle = 'rgba(244,220,160,' + (la * .6).toFixed(3) + ')'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(pts[k].p[0], pts[k].p[1]); g.lineTo(pts[k + 1].p[0], pts[k + 1].p[1]); g.stroke(); }
    pts.forEach(function (q) { var on = q.age < q.e.d, na = (1 - q.age / LIFE) * alpha; g.fillStyle = 'rgba(255,238,196,' + (na * (on ? .95 : .45)).toFixed(3) + ')'; g.beginPath(); g.arc(q.p[0], q.p[1], on ? 4 + 4 * Math.exp(-q.age * 6) : 2.4, 0, 7); g.fill(); });
    g.restore();
  }
  // each gong stroke sends a ring out through the rings
  function gongRipple(cx, cy, R, alpha) {
    if (reduce) return; var G = mdEv().gong, L = 1.8; g.save(); g.globalCompositeOperation = 'lighter';
    G.forEach(function (e) { var age = t - e.t; if (age < 0 || age > L) return; var u = age / L; g.strokeStyle = 'rgba(224,194,126,' + ((1 - u) * clamp(e.v * 2.2, .3, 1) * .55 * alpha).toFixed(3) + ')'; g.lineWidth = .6 + 2.4 * (1 - u); g.beginPath(); g.arc(cx, cy, R * (.46 + .74 * eo(u)), 0, 7); g.stroke(); });
    g.restore();
  }
  function minorNow() { var bar = Math.floor(t / BAR_D), ch = LD.chordAt(bar); return ch === 'Am' || ch === 'Em'; }
  // on every beat the mark breathes out a little and a warm halo flashes behind it
  function beatPulse() { return reduce || SND.kind === 'off' ? 0 : Math.exp(-((t / BEAT_D) % 1) * 5) * (Math.floor(t / BEAT_D) % 4 === 0 ? 1 : .6); }
  function med(cx, cy, R, ink, o) {
    var pz = beatPulse(), a = o && o.alpha != null ? o.alpha : 1;
    if (R > 60) gongRipple(cx, cy, R, a);
    if (R > 60 && !reduce && minorNow()) { g.save(); g.globalCompositeOperation = 'lighter'; var mw = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2); mw.addColorStop(0, 'rgba(96,160,184,' + (.1 * a).toFixed(3) + ')'); mw.addColorStop(1, 'rgba(96,160,184,0)'); g.fillStyle = mw; g.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4); g.restore(); }
    if (pz > .02 && R > 60) { g.save(); g.globalCompositeOperation = 'lighter'; var hl = g.createRadialGradient(cx, cy, R * .3, cx, cy, R * 1.15); hl.addColorStop(0, 'rgba(224,194,126,' + (pz * .1 * a).toFixed(3) + ')'); hl.addColorStop(1, 'rgba(224,194,126,0)'); g.fillStyle = hl; g.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4); g.restore(); }
    medallion(g, cx, cy, R * (1 + pz * .02), ink, Object.assign({ heart: mHeart(ink === 'dua-pulau' ? 'dua' : 'buya') }, o));
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  var FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  var SCENES_MEDALLION = [
    { id: 'm-title', dur: barsD(4), step: null,
      draw: function (lt, d) {
        var out = 1 - ramp(lt, d - .5, d), bar = lt / BAR_D, sw = reduce ? 0 : lt * .04;
        med(W / 2, 210, 180, 'malam', { alpha: out, show: { heart: ramp(bar, 0, 1), disc: ramp(bar, .3, 1), rays: ramp(bar, 1, 2), dots: ramp(bar, 2, 3), leaves: ramp(bar, 3, 3.8) }, rot: { rays: sw, dots: -sw * .6, leaves: -sw * .38 }, light: mLights(true) }); tuneStar(W / 2, 210, 180, out);
        var a = eo(ramp(lt, 1.6, 2.6)) * out;
        text('BATIK MEDIA LAB · REEL 07', W / 2, 440, '500 13px ' + F.mono, C.gold2, a, 'center');
        text('Dua Pulau medallion', W / 2, 520, '600 84px ' + F.display, C.paper, a, 'center');
        text('Two islands in one mark, every count a Fibonacci number', W / 2, 566, 'italic 500 24px ' + F.display, C.mist, eo(ramp(lt, 2.2, 3.4)) * out, 'center');
      } },
    { id: 'm-listen', dur: barsD(8), step: 'Listen to both islands', phase: 'Thinking',
      eyebrow: 'Step 1 · Listen to both islands', head: 'Sulawesi at the heart, Bali round the edge.',
      body: 'The medallion is our emblem, and it is made of what came before it: the Bomba rose and the rebung of the buya bomba of Central Sulawesi at the centre, and the ring of leaves and the keyline of Balinese ornament around them. It recognises both origins in one mark.',
      teach: 'An emblem is a promise about where you come from. List the sources first, name each one, and let every ring of the mark answer to one of them.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .8, 2)) * out, b = eo(ramp(lt, 7.5, 8.7)) * out, c = eo(ramp(lt, 12, 13.5)) * out;
        text('SULAWESI · BUYA BOMBA', 690, 130, '500 12px ' + F.mono, C.gold2, a); putImg('motifs/bomba-rose--buya.png', 735, 205, 90, a); putImg('motifs/rebung-border--buya.png', 865, 205, 120, a);
        text('the rose · the rebung', 690, 312, '500 12px ' + F.mono, C.mist, a);
        text('BALI · ORNAMENT', 1200, 130, '500 12px ' + F.mono, C.gold2, b, 'right'); putImg('motifs/lotus-flower.png', 1155, 205, 90, b); putImg('motifs/wave-cloud-ornament.png', 1040, 205, 100, b);
        text('the leaf ring · the keyline', 1200, 312, '500 12px ' + F.mono, C.mist, b, 'right');
        var sw = reduce ? 0 : lt * .04; med(945, 500, 110, 'malam', { alpha: c, rot: { rays: sw, dots: -sw * .6, leaves: -sw * .38 }, light: mLights(c > .5) }); tuneStar(945, 500, 110, c);
        g.save(); g.globalAlpha = c * .7; g.strokeStyle = C.gold2; g.lineWidth = 1.2; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(800, 320); g.lineTo(880, 410); g.moveTo(1090, 320); g.lineTo(1010, 410); g.stroke(); g.restore();
      } },
    { id: 'm-brief', dur: barsD(4), step: 'Set the brief', phase: 'Thinking',
      eyebrow: 'Step 2 · Set the brief', head: 'One mark, read at every size.',
      body: 'The medallion must work as a seal on a card, a placement on a scarf and a tiny mark on a screen. Every count in it is a Fibonacci number, so the rings never line up into spokes, and it reads in navy and gold, in buya gold on black, and in one colour.',
      teach: 'The brief: our own drawing, both origins named, Fibonacci counts only, and a small master for stamp sizes.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        ['Our own drawing, built from both islands', 'Fibonacci counts: 13 rays, 21 leaves, 55 dots', 'A seal, a placement, a mark on a screen', 'Credit Donggala, Palu and Bali'].forEach(function (r, i) {
          var a = eo(ramp(lt, .5 + i * 1, 1.2 + i * 1)) * out; g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(680, 160 + i * 76, 5, 0, 7); g.fill(); g.restore();
          text(r, 704, 166 + i * 76, '500 24px ' + F.display, C.paper, a);
        });
        [[760, 26], [880, 44], [1060, 80]].forEach(function (m, k) { med(m[0], 560, m[1], 'malam', { alpha: eo(ramp(lt, 4.5 + k * .6, 5.5 + k * .6)) * out, light: mLights(true) }); });
      } },
    { id: 'm-counts', dur: barsD(8), step: 'Count the rings', phase: 'Ideation', explore: 'counts',
      eyebrow: 'Step 3 · Count the rings', head: 'Thirteen, fifty-five, twenty-one.',
      body: 'Ring by ring from the heart: the Bomba rose, three blades and two rings of petals turning round a dark heart; a dark disc; 13 rebung rays, each with two chevrons pointing out; 55 cecek dots; 21 leaves, dark and teal in turn. Because neighbouring Fibonacci numbers share no factor, no ray ever lines up with a leaf except at the top, and the eye never finds a spoke to rest on.',
      teach: 'Choose counts that do not divide each other and the rings stay independent. Try 12 rays against 24 leaves on the bench: the spokes appear at once.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), ex = EX && EX.scene === 'm-counts', bar = lt / BAR_D;
        var counts = ex ? { rays: EX.rays, dots: EX.dots, leaves: EX.leaves } : null, cx = 940, cy = 385, R = 245;
        var show = ex ? null : { heart: ramp(bar, 0, 2), disc: ramp(bar, 1.5, 2), rays: ramp(bar, 2, 3.6), dots: ramp(bar, 4, 5.6), leaves: ramp(bar, 6, 7.4) };
        if (ex) { // the spokes: wherever two rings put an element at the same angle
          var pairs = [[EX.rays, EX.leaves], [EX.rays, EX.dots], [EX.leaves, EX.dots]]; g.save(); g.globalAlpha = out * .55; g.strokeStyle = C.flag; g.lineWidth = 1.4; g.setLineDash([5, 5]);
          pairs.forEach(function (pq) { var k = gcd(pq[0], pq[1]); if (k < 2) return; for (var j = 0; j < k; j++) { var a = j * Math.PI * 2 / k; g.beginPath(); g.moveTo(cx + Math.sin(a) * 120, cy - Math.cos(a) * 120); g.lineTo(cx + Math.sin(a) * 300, cy - Math.cos(a) * 300); g.stroke(); } }); g.restore(); }
        med(cx, cy, R, 'malam', { alpha: out, show: show, counts: counts, light: mLights(ex || bar > 7.4) }); if (!ex) tuneStar(cx, cy, R, out * ramp(bar, 6, 7));
        if (!ex) { var lab = bar < 2 ? 'the heart: the Bomba rose' : bar < 4 ? '13 rebung rays' : bar < 6 ? '55 cecek dots' : '21 leaves, dark and teal in turn';
          text(lab, cx, 662, '500 12px ' + F.mono, C.gold2, out * .9, 'center');
          FIB.forEach(function (f, i) { var used = [3, 13, 21, 55].indexOf(f) >= 0 && (f !== 13 || bar > 0) ; text(String(f), 706 + i * 52, 104, '500 15px ' + F.mono, used ? C.gold : C.line2, out * eo(ramp(lt, .5 + i * .15, 1 + i * .15)), 'center'); }); }
      } },
    { id: 'm-heart', dur: barsD(6), step: 'Set the rose at the heart', phase: 'Synthesis',
      eyebrow: 'Step 4 · Set the rose at the heart', head: 'The Bomba rose, turning round its heart.',
      body: 'The heart is the Bomba rose as the medallion draws it: a dark three-pointed heart with a golden spiral, three blades turning round it, a ring of broad petals, and an outer ring of scalloped two-tone petals, each with a cecek dot. In the music the rose sings itself, as in Bunga Kaili: from the heart out the kakula plays 3 notes in a bar, then 5, 8 and 13, each a Kaili kettle on the chord chosen by the golden angle, while the loom weaves underneath.',
      teach: 'Reuse the master, never a copy: the heart on screen is cut from the master itself, so the reel and the front panel can never drift apart.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), cx = 940, cy = 350, p = ramp(lt, .3, d - 2.5), r = 230 * (1 + liveLevel() * .02);
        // open the master's heart ring by ring, from the centre out (edges measured on the master: 62, 122, 163, 200 of 200)
        var stops = [0, .31, .61, .815, 1], seg = Math.min(3, Math.floor(p * 4)), rv = stops[seg] + (stops[seg + 1] - stops[seg]) * eo(clamp(p * 4 - seg, 0, 1) * 1.25);
        g.save(); g.globalAlpha = out; g.fillStyle = '#1B1712'; g.beginPath(); g.arc(cx, cy, r * 1.125, 0, 7); g.fill(); g.strokeStyle = C.gold; g.lineWidth = 1.5; g.stroke(); masterHeart(g, cx, cy, r, rv, 'buya'); g.restore();
        if (p < 1) { g.save(); g.globalAlpha = out * .7; g.strokeStyle = C.paper; g.lineWidth = 1.2; g.setLineDash([4, 5]); g.beginPath(); g.arc(cx, cy, r * rv + 6, 0, 7); g.stroke(); g.restore(); }
        var lab = p < .25 ? 'the dark heart and its golden spiral' : p < .5 ? 'three blades turning round it' : p < .75 ? 'a ring of broad petals' : 'the outer ring: scalloped petals, two-tone, each with a cecek dot';
        text(lab, cx, 662, '500 12px ' + F.mono, C.gold2, out * .9, 'center');
      } },
    { id: 'm-time', dur: barsD(10), step: 'Let it keep time', phase: 'Synthesis',
      eyebrow: 'Step 5 · Let it keep time', head: 'Three rings, three clocks.',
      body: 'Each ring has its own loop in the score: the rays a kakula line of 13 eighth notes, the leaves a shimmering Balinese line of 21 sixteenths, the dots the shaker running round all 55. A light follows each loop round its ring. Because the counts share no factor, the lights never meet in the same place twice. And the gold thread is the tune: each note lands on one of seven points, one per step of the scale, so the melody draws its own star.',
      teach: 'When the music and the motif share one rule, the motif can perform it. Fibonacci counts make polyrhythms that never settle, and the eye feels the same thing the ear does.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), sw = reduce ? 0 : lt * .05, cx = 940, cy = 360, R = 270;
        g.save(); g.globalCompositeOperation = 'lighter'; var gl = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25); gl.addColorStop(0, 'rgba(224,194,126,' + (.08 + lvG(0, t) * .12).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(224,194,126,0)'); g.fillStyle = gl; g.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6); g.restore();
        med(cx, cy, R * (1 + liveLevel() * .015), 'malam', { alpha: out, rot: { rays: sw, dots: -sw * .618, leaves: -sw * .382 }, light: mLights(true) }); tuneStar(cx, cy, R, out);
        var e8 = Math.floor(t / (BEAT_D / 2)), e16 = Math.floor(t / (BEAT_D / 4));
        [['rays', e8 % 13, 13, 'eighths'], ['leaves', e16 % 21, 21, 'sixteenths'], ['dots', e16 % 55, 55, 'sixteenths']].forEach(function (L, i) { text(L[0] + ' ' + String(L[1] + 1).padStart(2, '0') + ' / ' + L[2], 760 + i * 180, 662, '500 12px ' + F.mono, C.gold2, out * eo(ramp(lt, 1 + i * .8, 1.8 + i * .8))); });
      } },
    { id: 'm-misread', dur: barsD(4), step: 'Check misreadings', phase: 'Test',
      eyebrow: 'Step 6 · Check misreadings', head: 'A sun, an eye, or our mark?',
      body: 'At sixteen pixels the rays win and it reads as a sun or a gear. At forty-eight the dark heart in its gold petals reads as an eye. From about a hundred and sixty every ring reads. So the small master keeps the rays, the disc and the leaves, drops the dots, and gives the heart a gold centre instead of a dark one.',
      teach: 'An emblem will be printed smaller than anything else you make. Draw its small master on purpose rather than letting the printer decide what disappears.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d);
        [[16, 700, 'a sun · a gear'], [48, 885, 'an eye at the heart'], [160, 1070, 'the medallion']].forEach(function (R, i) {
          var a = eo(ramp(lt, .4 + i * 1.2, 1.2 + i * 1.2)) * out;
          g.save(); g.globalAlpha = a; g.strokeStyle = C.line2; g.lineWidth = 1; g.strokeRect(R[1], 140, 170, 170); g.restore();
          med(R[1] + 85, 225, R[0] / 2, 'malam', { alpha: a, lw: Math.max(3.5, 500 / R[0] * .6) });
          text(R[0] + ' px across', R[1], 330, '500 12px ' + F.mono, C.gold2, a); text(R[2], R[1], 350, '500 12px ' + F.mono, C.mist, a);
        });
        var b = eo(ramp(lt, 4.4, 5.4)) * out;
        [[760, 16], [830, 24], [920, 32], [1040, 48]].forEach(function (m) { medallion(g, m[0], 470, m[1], 'malam', { alpha: b, show: { dots: 0 }, lw: Math.max(3.5, 500 / m[1] * .5), heart: function (c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#C9A35A'; c.fill(); c.beginPath(); c.arc(x, y, r * .35, 0, 7); c.fillStyle = '#E0C27E'; c.fill(); } }); });
        text('small master · rays, disc and leaves, no dots, a gold heart', 700, 552, '500 12px ' + F.mono, C.gold2, b);
      } },
    { id: 'm-system', dur: barsD(4), step: 'Where the mark lives', phase: 'System',
      eyebrow: 'Step 7 · Where the mark lives', head: 'A seal, a scarf, a screen.',
      body: 'In navy and gold on pearl card it is the seal of the studio. At the centre of a scarf it holds the placement, framed by the rebung border. On a screen it shrinks to its small master. One drawing, three jobs.',
      teach: 'An emblem earns its place by staying the same everywhere. Keep the master in one place and let every use read from it, down to the favicon.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .3, 1.3)) * out, b = eo(ramp(lt, 1.6, 2.6)) * out, c = eo(ramp(lt, 2.8, 3.8)) * out, sw = reduce ? 0 : lt * .04;
        g.save(); g.globalAlpha = a; g.fillStyle = '#FAF7F2'; g.beginPath(); g.arc(810, 250, 112, 0, 7); g.fill(); g.restore();
        medallion(g, 810, 250, 100, 'dua-pulau', { alpha: a, heart: mHeart('dua'), rot: { rays: sw } }); text('seal · navy and gold on pearl', 810, 392, '500 12px ' + F.mono, C.mist, a, 'center');
        g.save(); g.globalAlpha = b; g.fillStyle = C.ink2; g.fillRect(960, 130, 240, 240); g.restore();
        band(linePts(972, 142, 1188, 142), 9, 'buya-bomba', 0, 1, b); band(linePts(972, 358, 1188, 358), 9, 'buya-bomba', 0, 1, b);
        med(1080, 250, 82, 'malam', { alpha: b, rot: { rays: sw, dots: -sw * .618, leaves: -sw * .382 }, light: mLights(true) }); text('scarf · the placement', 1080, 392, '500 12px ' + F.mono, C.mist, b, 'center');
        [[760, 16], [810, 32], [880, 64]].forEach(function (m) { g.save(); g.globalAlpha = c; g.fillStyle = '#17140F'; rr(m[0] - m[1] * .6, 520 - m[1] * .6, m[1] * 1.2, m[1] * 1.2, m[1] * .22); g.fill(); g.strokeStyle = C.line2; g.lineWidth = 1; g.stroke(); g.restore();
          medallion(g, m[0], 520, m[1] / 2, 'malam', { alpha: c, show: { dots: 0 }, lw: Math.max(3.5, 500 / m[1] * .5), heart: function (cc, x, y, r) { cc.beginPath(); cc.arc(x, y, r, 0, 7); cc.fillStyle = '#C9A35A'; cc.fill(); } }); });
        text('screen · 16, 32 and 64 px', 700, 600, '500 12px ' + F.mono, C.mist, c);
      } },
    { id: 'm-keep', dur: barsD(4), step: 'Credit and keep', phase: 'Archive',
      eyebrow: 'Step 8 · Credit and keep', head: 'Credit both islands. Keep the mark.',
      body: 'Dua Pulau medallion: our own emblem, built from the Bomba rose and the rebung of the buya bomba of Donggala and the batik of Palu, Central Sulawesi, inside a ring of leaves from Balinese ornament, with gratitude to the weavers, batik makers and carvers of both islands. The master lives in the engine.',
      teach: 'Credit is part of the design. Keep the source, the rule, the drawing and the credit line together, so the next person can continue rather than restart.',
      draw: function (lt, d) {
        caption(this, lt, d); var out = 1 - ramp(lt, d - .45, d), a = eo(ramp(lt, .3, 1.5)) * out, sw = reduce ? 0 : lt * .05;
        med(940, 250, 160, 'malam', { alpha: a, rot: { rays: sw, dots: -sw * .618, leaves: -sw * .382 }, light: mLights(true) }); tuneStar(940, 250, 160, a);
        text('REEL 07 · SAVED TO THE LAB', 940, 470, '500 13px ' + F.mono, C.gold2, eo(ramp(lt, 2, 3)) * out, 'center');
        text('Six motifs, six reels: the signature is complete', 940, 506, 'italic 500 22px ' + F.display, C.mist, eo(ramp(lt, 3.2, 4.2)) * out, 'center');
      } }
  ];
  // the form of the score, under the words: where we are in the piece and what the music is doing
  var FORM_D = [[0, 4, 'heart'], [4, 12, 'disc'], [12, 16, 'Bali'], [16, 24, 'rays'], [24, 30, 'dots'], [30, 40, 'leaves'], [40, 48, 'everyone'], [48, 52, 'home']];
  function formSay(bar) { return bar < 4 ? 'the heart: the kakula alone, calling' : bar < 12 ? '+ the disc: gongs and gamba-gamba, the verse' : bar < 16 ? '+ Bali: the flute answers, and stays' : bar < 24 ? '+ the rays: their loop, the loom, the gimba' : bar < 29 ? '+ the dots: the shaker; the rose sings itself' : bar < 30 ? 'a breath, and up' : bar < 40 ? '+ the leaves: the reyong shimmer, the chorus' : bar < 48 ? 'everyone: the last chorus, the flute above' : bar < 51 ? 'home: the call again' : 'and it ends in A major'; }
  function formMap(lt, d) {
    if (stageDraw) return; var out = eo(ramp(lt, .8, 1.6)) * (1 - ramp(lt, d - .45, d)), x0 = 72, w = 470, y = 604, pb = w / 52, bar = clamp(t / BAR_D, 0, 51.999), cur = Math.floor(bar);
    g.save(); g.globalAlpha *= out;
    FORM_D.forEach(function (f) { var on = cur >= f[0] && cur < f[1], x = x0 + f[0] * pb + 1, ww = (f[1] - f[0]) * pb - 2; g.fillStyle = on ? C.gold : C.line2; g.fillRect(x, y, ww, on ? 4 : 2); if (f[2]) text(f[2], x, y - 8, '500 10px ' + F.mono, on ? C.gold2 : C.mist, on ? 1 : .55); });
    g.fillStyle = C.paper; g.fillRect(x0 + bar * pb - 1, y - 4, 2, 12);
    text('BAR ' + String(cur + 1).padStart(2, '0') + ' · ' + LD.chordAt(cur) + ' · ' + formSay(cur), x0, y + 28, '500 11px ' + F.mono, C.gold2, .9);
    g.restore();
  }
  SCENES_MEDALLION.forEach(function (sc) { if (sc.id === 'm-title') return; var dr = sc.draw; sc.draw = function (lt, d) { dr.call(this, lt, d); formMap(lt, d); }; });
  var SCORES_MEDALLION = [['off', 'Sound off'], ['medallion', 'Dua Pulau · 110 bpm']];
  var STEMS_MEDALLION = [['kakula', 'Kakula, the song and the rose'], ['kakula2', 'Second kakula, below the song'], ['tatali', 'Flute, Bali'], ['gamba', 'Gamba-gamba'], ['angklung', 'Angklung, held chords'], ['dio', 'Dio'], ['gongs', 'Tawa-tawa'], ['drums', 'Gimba'], ['loom', 'Loom, the cloth being woven'], ['reyong', 'Reyong, the 21 leaves'], ['shaker', 'Shaker, the 55 dots'], ['bass', 'Low gong']];

  var SCORES = SCORES_NTINA, SCORES_BOMBA = [['off', 'Sound off'], ['bomba', 'Bunga Kaili · 138 bpm']];
  var SCORES_LOGO = [['off', 'Sound off'], ['marea', 'Marea · gong kebyar for the mark · 112 bpm']], SCORES_IMAGE = [['off', 'Sound off'], ['image', 'Your picture · kakula ensemble']];
  var SCORE_NOTE = {
    medallion: 'Dua Pulau (two islands), our own song for the emblem, made the way Bunga Kaili is made and built the way the medallion is drawn: from the heart out, a layer at a time, nothing leaving once it has come in. The heart: the kakula calls alone. The disc: the gongs and the gamba-gamba come in under the verse in A minor, sung on the Kaili kettles with Bunga Kaili’s grace notes and rolls and a second kakula below. Bali: the flute answers, and stays. The rays: their 13-step loop, the loom and the gimba. The dots: the shaker and the held chords, while the rose sings itself, 3, 5, 8 and 13 notes a bar by the golden angle. The leaves: the reyong shimmer and the dio, as the chorus lifts into C major. Then everyone, the flute above, and home to a bright A major. A slow swell runs under the whole piece. 110 bpm, 52 bars. No traditional piece is quoted.',
    cengkeh: 'Lima Kuntum (five buds), our own harvest dance for the clove sprig, on the same Kaili ensemble and the lab’s first in 3/4, because a sprig sways: every bar the kakula fan out like the buds, the centre kettle on beat 1, the inner pair together on beat 2, the outer pair on beat 3, and the buds light up in the same order; the second kakula plays a turn, four quick notes round one, for a bud’s four sepals; at the harvest the two kakula interlock in running eighths, many hands at once; the dio and the gamba-gamba make the waltz, claps land on 2 and 3, a tatali flute sings over it, and a shaker rattles like dried cloves. C major, C G F C, 138 bpm, 80 bars, one section per scene, ending with every voice on C. No traditional piece is quoted.',
    ketupat: 'Anyam Ketupat (weaving the ketupat), our own piece for the lattice, on the same Kaili kakula ensemble: each bar is one diamond, two kakula starting on one kettle and opening apart in contrary motion, one rising and one falling, to the widest point on beat 3, then closing back together; the gamba-gamba plays a narrower diamond inside it and the low gong is the dark heart; because the lattice is a centred grid, a canon enters half a bar later; the loom ticks either side of every bar line, a cecek cross where four diamonds meet. Around them the tatali flute draws one big diamond across every four bars, up to A5 and back, an angklung tremolo lays the ground, the dio plucks the bass and a shaker fills the weave. A minor, 96 bpm, 52 bars, one section per scene, ending with every voice on A. No traditional piece is quoted.',
    rebung: 'Pucuk Rebung, our own piece for the border, on the same Kaili kakula ensemble as Bunga Kaili: the shoot is a rising run of five kettle notes inside one bar, and it grows one note per bar while the shoot is drawn; a second kakula plays the same run two beats later a third above, the way the second row sits half a step on; the low gongs alternate each chord’s root and fifth on beats 1 and 3 for the zigzag spine; the loom’s off-beat ticks are the cecek dots. 100 bpm, 52 bars, one section per scene. No traditional piece is quoted.',
    marea: 'Marea, our own piece for the mark in the manner of Balinese gong kebyar: pelog selisir over two octaves with the paired ombak tuning that shimmers; kotekan, two interlocking kettle parts making one fast line, doubled by the reyong; jegogan holding the core melody on long low tones; kempli on the beat; the gong cycle of gong ageng, kempur and klentong; kendang; ceng-ceng; a suling flute; the sea’s wash. Forty bars at 112 bpm, one section per layer: it opens with a kebyar burst, breaks on an angsel before the close. All synthesized; no traditional piece is quoted.',
    image: 'Composed from your picture: 128 columns over 16 bars at 106.7 bpm. The brightest row of each column picks one of the seven kettles (high in the picture, high in pitch), dark columns ring the low gong on the bar, edges drive the drum, a change of colour scrapes. Nothing leaves this browser.',
    off: 'Choose a score to hear it. Sound starts only when you pick one.',
    bomba: 'Bunga Kaili, our own flower song for a Kaili kakula ensemble: the kakula leads (softly when we are thinking), a second kakula harmonises, gamba-gamba plays the chords, tawa-tawa gongs and gimba drums keep the phrases, and the loom weaves underneath. In the ring section the rose plays itself: 13, 8, 5 and 3 notes by the golden angle, now locked to the beat. A minor on the Kaili seven-tone set, at 138 bpm in 4/4. Every rhythm sits on one sixteenth grid, Fibonacci numbers become Euclidean rhythms (the rings play 13, 8, 5 and 3 onsets in 16), two kakula interlock, and in the bridge a 13-step loop phases against a 16-step one. Ends on a bright A major.',
    folk: 'Our own song for a Central Sulawesi folk ensemble in a dero groove: the kakula carries the melody, softly when we are thinking (intro, bridge, outro) and fully in the verses; kolintang answers and joins the circle’s refrain with angklung, di’o and re-re carry the bass, ganda drives the dero beat with padengko keeping time, nggongi gongs mark the phrases, a distant tatali echoes in the bridge. All synthesized; no ritual instruments.',
    ntina: 'Our own song in the spirit of the Dero circle, in an acoustic modern feel: the gamelan sings the melody, a guitar strums, the drum sways. A classical progression (descending canon bass, IV-V-iii-vi-ii-V-I chorus, a B7 secondary dominant, a deceptive cadence). Tap tempo to match a cover you love; the film follows the music.',
    lingkar: 'Dero-led and joyful: a steady two-beat sway on the drum, a low gong every four beats, kettles calling and the ensemble answering.',
    panen: 'Starts with the seed song alone; a gong, then the drum, then the answering phrase join round by round, like people joining the circle.',
    gema: 'Minimal and cinematic: long gong drones and single kettle strikes, damped for what failed, ringing for what was kept.'
  };
  var LN = (function () {
    // Lingkar Ntina, version 2: the gamelan sings. An acoustic, modern dero feel with a classical progression:
    // a descending "canon" bass in the verse, a IV-V-iii-vi-ii-V-I chorus, a secondary dominant (B7) in the bridge,
    // a deceptive cadence before the outro. Our own melody throughout. 4/4; 106.7 bpm keeps 60 bars = the reel.
    var BEAT = 60 / (6400 / 60), BAR = BEAT * 4;
    // two kettle rows tuned to this piece (G major hexatonic, no C): low G3-F#4, high G4-G5
    var PITCH = [196.00, 220.00, 246.94, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 587.33, 659.26, 739.99, 783.99];
    var DR = [2, -4, 3, -2, 5, -3, 2, -4, 3, -2, 5, -3, 2];
    var CH = { // bass (root or inversion), three-voice pad, six-string strum voicing, chord tones for generated lines (pitch indexes)
      'G':    { b: 98.00,  pad: [246.94, 293.66, 392.00], gt: [98.00, 123.47, 146.83, 196.00, 246.94, 392.00], ct: [6, 8, 9, 12] },
      'G/B':  { b: 123.47, pad: [246.94, 293.66, 392.00], gt: [123.47, 146.83, 196.00, 246.94, 392.00], ct: [6, 8, 9, 12] },
      'D/F#': { b: 92.50,  pad: [220.00, 293.66, 369.99], gt: [92.50, 110.00, 146.83, 220.00, 293.66, 369.99], ct: [7, 9, 11] },
      'D':    { b: 146.83, pad: [220.00, 293.66, 369.99], gt: [146.83, 220.00, 293.66, 369.99], ct: [7, 9, 11] },
      'D7':   { b: 146.83, pad: [220.00, 261.63, 369.99], gt: [146.83, 220.00, 261.63, 369.99], ct: [7, 9, 11] },
      'Em':   { b: 164.81, pad: [196.00, 246.94, 329.63], gt: [82.41, 123.47, 164.81, 196.00, 246.94, 329.63], ct: [6, 8, 10, 12] },
      'Bm':   { b: 123.47, pad: [246.94, 293.66, 369.99], gt: [123.47, 185.00, 246.94, 293.66, 369.99], ct: [8, 9, 11] },
      'Bm/D': { b: 146.83, pad: [246.94, 293.66, 369.99], gt: [146.83, 185.00, 246.94, 293.66, 369.99], ct: [8, 9, 11] },
      'C':    { b: 130.81, pad: [196.00, 261.63, 329.63], gt: [130.81, 164.81, 196.00, 261.63, 329.63], ct: [6, 10, 12] },
      'Am':   { b: 110.00, pad: [220.00, 261.63, 329.63], gt: [110.00, 164.81, 220.00, 261.63, 329.63], ct: [7, 10] },
      'Am7':  { b: 110.00, pad: [196.00, 261.63, 329.63], gt: [110.00, 164.81, 196.00, 261.63, 329.63], ct: [6, 7, 10] },
      'B7':   { b: 123.47, pad: [246.94, 311.13, 369.99], gt: [123.47, 155.56, 220.00, 246.94, 369.99], ct: [7, 8, 11] }
    };
    // melody bars: [beat, pitch index, beats]
    var VERSE = [
      [[.5, 3, .5], [1, 6, 1], [2, 8, .5], [2.5, 9, 1.5]],
      [[0, 7, 1], [1, 5, .5], [1.5, 7, .5], [2, 3, 2]],
      [[.5, 4, .5], [1, 6, 1], [2, 8, .5], [2.5, 10, 1.5]],
      [[0, 9, 1], [1, 8, .5], [1.5, 7, .5], [2, 5, 2]],
      [[.5, 4, .5], [1, 6, 1], [2, 10, 1.5], [3.5, 9, .5]],
      [[0, 8, 2], [2, 6, .5], [2.5, 7, .5], [3, 8, 1]],
      [[0, 7, 1], [1, 4, 1], [2, 6, .5], [2.5, 7, 1.5]],
      [[0, 5, 1], [1, 7, 1], [2, 7, 2]]
    ];
    var VERSE_CH = ['G', 'D/F#', 'Em', 'Bm/D', 'C', 'G/B', 'Am7', 'D7'];
    var LIFT = [
      [[0, 8, .5], [.5, 8, .5], [1, 10, 1], [2, 10, .5], [2.5, 8, 1.5]],
      [[0, 10, .5], [.5, 10, .5], [1, 12, 1], [2, 10, .5], [2.5, 9, 1.5]],
      [[0, 7, .5], [.5, 10, .5], [1, 10, 1], [2, 7, .5], [2.5, 10, 1.5]],
      [[0, 11, 1], [1, 10, .5], [1.5, 9, .5], [2, 7, 1]]
    ];
    var LIFT_CH = ['Em', 'C', 'Am', 'D7'];
    var CHORUS = [
      [[0, 12, 1.5], [1.5, 10, .5], [2, 10, 1], [3, 9, .5], [3.5, 10, .5]],
      [[0, 11, 1.5], [1.5, 9, .5], [2, 7, 2]],
      [[0, 11, 1], [1, 9, .5], [1.5, 8, .5], [2, 9, 1], [3, 11, 1]],
      [[0, 10, 2.5], [2.5, 9, .5], [3, 8, 1]],
      [[0, 7, .5], [.5, 8, .5], [1, 10, 1], [2, 10, .5], [2.5, 12, 1.5]],
      [[0, 11, 1], [1, 10, .5], [1.5, 9, .5], [2, 7, 1], [3, 9, 1]],
      [[0, 9, 1], [1, 8, 1], [2, 6, 2]],
      []
    ];
    var CHORUS_CH = ['C', 'D', 'Bm', 'Em', 'Am', 'D', 'G', 'G'];
    var FINAL_MEL = CHORUS.slice(0, 6).concat([[[0, 10, 1], [1, 8, 1], [2, 6, 2]], []]); // the deceptive bar sings E minor's own tones
    var FINAL_CH = ['C', 'D', 'Bm', 'Em', 'Am', 'D', 'Em', 'D7']; // deceptive: V goes to vi, then the outro brings it home
    var BRIDGE = [
      [[0, 4, 1], [1, 7, 1], [2, 10, .5], [2.5, 7, 1.5]],
      [[0, 5, 1], [1, 7, 1], [2, 9, 2]],
      [[0, 9, 1], [1, 8, 1], [2, 6, 2]],
      [[0, 4, 1], [1, 6, .5], [1.5, 8, .5], [2, 10, 2]],
      [[0, 10, 1], [1, 9, .5], [1.5, 8, .5], [2, 7, 2]],
      [[0, 8, 1], [1, 5, 1], [2, 7, 1], [3, 8, 1]],
      [[0, 6, 1], [1, 4, 1], [2, 8, 2]],
      [[0, 7, .5], [.5, 9, .5], [1, 11, .5], [1.5, 9, .5], [2, 7, .5], [2.5, 9, .5], [3, 11, .5], [3.5, 12, .5]]
    ];
    var BRIDGE_CH = ['Am', 'D', 'G', 'Em', 'Am', 'B7', 'Em', 'D7'];
    var BREAK_CH = ['Em', 'C', 'G', 'D'];
    var INTRO_CH = ['G', 'Em', 'C', 'D'];
    var OUTRO = [[[0, 4, 1], [1, 6, 1], [2, 7, 2]], [[0, 5, 1], [1, 7, 1], [2, 9, 2]], [[0, 6, 4]], []];
    var OUTRO_CH = ['Am7', 'D7', 'G', 'G'];

    function compose(opt) {
      opt = opt || {}; var lilt = opt.feel === 'lilt' ? 1 / 6 : 0; // lilt: offbeat eighths fall late, a swaying triplet feel
      var E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR + beat * BEAT; }
      function K(time, p, v, beats, stem) { E.push({ t: time, k: 'kettle', n: p % 7, f: PITCH[p] * Math.pow(2, DR[p] / 1200), v: v, d: clamp(beats * BEAT * 2.2, .3, 1.8), s: stem || 'melody' }); }
      // the singing line: a grace note from above into long notes, and a soft tremolo roll to sustain them like a held voice
      function sing(bars, at, v) {
        var prev = null;
        bars.forEach(function (bar, i) { bar.forEach(function (nt) {
          var x = at + i, t0 = T(x, nt[0]), beats = nt[2];
          if (beats >= 1 && prev !== null && prev !== nt[1] && nt[1] < 12 && (nt[0] % 2 === 0)) K(t0 - .07, nt[1] + 1, v * .28, .25);
          K(t0, nt[1], v * (nt[0] % 1 === 0 ? 1 : .9), beats);
          if (beats >= 1.5) { for (var r = BEAT * .75; r < beats * BEAT - BEAT * .4; r += BEAT / 3) K(t0 + r, nt[1], v * .16 * (1 - r / (beats * BEAT)), .3, 'melody'); }
          prev = nt[1];
        }); });
      }
      function gongs(at, chords, dense) { chords.forEach(function (c, i) { if (i % 2 === 0) E.push({ t: T(at + i, 0), k: 'gong', n: 0, f: 98, v: .38, s: 'gongs' }); if (dense || i % 2 === 1) E.push({ t: T(at + i, 2), k: 'gong', n: 1, f: 146.83, v: .22, s: 'gongs' }); }); }
      function drums(at, n, level, mode) {
        level *= 1.3;
        for (var b = 0; b < n; b++) {
          var x = at + b;
          if (mode === 'half') { E.push({ t: T(x, 0), k: 'drum', n: 'dum', v: .38 * level, s: 'drums' }); E.push({ t: T(x, 2), k: 'drum', n: 'tak', v: .26 * level, s: 'drums' }); continue; }
          E.push({ t: T(x, 0), k: 'drum', n: 'dum', v: .42 * level, s: 'drums' }); E.push({ t: T(x, 1), k: 'drum', n: 'tak', v: .28 * level, s: 'drums' });
          E.push({ t: T(x, 2.5), k: 'drum', n: 'dum', v: .3 * level, s: 'drums' }); E.push({ t: T(x, 3), k: 'drum', n: 'tak', v: .3 * level, s: 'drums' });
          if (mode === 'full') { E.push({ t: T(x, 1.5), k: 'drum', n: 'tak', v: .1 * level, s: 'drums' }); E.push({ t: T(x, 3.5), k: 'drum', n: 'tak', v: .12 * level, s: 'drums' }); }
        }
      }
      function bass(at, chords, style, level) {
        level *= .62;
        chords.forEach(function (c, i) {
          var r = CH[c].b, x = at + i, fifth = r * 1.5 > 200 ? r * .75 : r * 1.5;
          if (style === 'whole') { E.push({ t: T(x, 0), k: 'bass', f: r, v: .42 * level, d: BAR * .95, s: 'bass' }); return; }
          E.push({ t: T(x, 0), k: 'bass', f: r, v: .46 * level, d: BEAT * 1.4, s: 'bass' });
          E.push({ t: T(x, 2), k: 'bass', f: fifth, v: .34 * level, d: BEAT * .9, s: 'bass' });
          var nx = chords[i + 1] ? CH[chords[i + 1]].b : r; if (Math.abs(nx - r) > 1) E.push({ t: T(x, 3.5), k: 'bass', f: nx * (nx > r ? Math.pow(2, -1 / 12) : Math.pow(2, 1 / 12)), v: .22 * level, d: BEAT * .45, s: 'bass' });
        });
      }
      // acoustic guitar: the modern-cover colour. Strum pattern down, down-up, up, down-up (the common acoustic pop strum)
      function guitar(at, chords, level, pattern) {
        var P = pattern === 'soft' ? [[0, 'd', .8], [2, 'd', .6]] : [[0, 'd', 1], [1, 'd', .7], [1.5, 'u', .45], [2.5, 'u', .5], [3, 'd', .7], [3.5, 'u', .45]];
        chords.forEach(function (c, i) { P.forEach(function (st) { E.push({ t: T(at + i, st[0]), k: 'strum', notes: CH[c].gt, dir: st[1], v: .2 * st[2] * level, s: 'guitar' }); }); });
      }
      function pad(at, chords, level) { chords.forEach(function (c, i) { CH[c].pad.forEach(function (f) { E.push({ t: T(at + i, 0), k: 'organ', f: f, v: .085 * level, d: BAR * .98, s: 'organ' }); }); }); }
      function answers(at, chords, level) { // the circle answers the singer: a short kettle figure from the chord tones, low row
        chords.forEach(function (c, i) { if (i % 2 === 1) { var ct = CH[c].ct; [ct[0], ct[Math.min(1, ct.length - 1)], ct[0]].forEach(function (p, j) { K(T(at + i, 2.5 + j * .5), Math.max(0, p - 6), .24 * level, .5, 'counter'); }); } });
      }
      function harmony(bars, at, level, chords) { // a second kettle voice two kettles below the melody (a third or a fourth), final chorus only
        bars.forEach(function (bar, i) { var ct = CH[chords[i]].ct.concat(CH[chords[i]].ct.map(function (p) { return p - 6; })).filter(function (p) { return p >= 0; });
          bar.forEach(function (nt) { if (nt[2] < 1) return; var best = -1; ct.forEach(function (p) { if (p <= nt[1] - 2 && p >= nt[1] - 4 && p > best) best = p; }); if (best >= 0) K(T(at + i, nt[0]), best, .2 * level, nt[2], 'counter'); }); });
      }
      function claps(at, n, level, extra) { for (var b = 0; b < n; b++) { [1, 3].forEach(function (bt) { E.push({ t: T(at + b, bt), k: 'clap', v: .26 * level, s: 'claps' }); }); if (extra && b % 2 === 1) E.push({ t: T(at + b, 3.5), k: 'clap', v: .18 * level, s: 'claps' }); } }
      function shaker(at, n, level) { for (var b = 0; b < n * 8; b++) E.push({ t: T(at + Math.floor(b / 8), (b % 8) / 2), k: 'shaker', v: (b % 2 ? .06 : .04) * level, s: 'claps' }); }
      function choir(at, chords, level) { chords.forEach(function (c, i) { CH[c].pad.forEach(function (f) { E.push({ t: T(at + i, 0), k: 'choir', f: f, v: .06 * level, d: BAR, s: 'voices' }); }); }); }

      // Intro 0-7: the kettles sing the theme alone; the guitar and a gong come in at bar 4
      sing(VERSE.slice(0, 4), 0, .5);
      sing(VERSE.slice(4, 8), 4, .5); guitar(4, VERSE_CH.slice(4), .7, 'soft'); E.push({ t: T(4, 0), k: 'gong', n: 0, f: 98, v: .36, s: 'gongs' });
      // Verse 8-15: the canon bass walks down under the theme; the sway begins
      sing(VERSE, 8, .5); guitar(8, VERSE_CH, .85); bass(8, VERSE_CH, 'walk', .9); drums(8, 8, .7, 'light'); gongs(8, VERSE_CH);
      // Verse 16-23 with the circle's answers and the shaker; lift 24-27 climbs to the dominant
      sing(VERSE, 16, .5); guitar(16, VERSE_CH, .95); bass(16, VERSE_CH, 'walk', 1); drums(16, 8, .85, 'light'); gongs(16, VERSE_CH); answers(16, VERSE_CH, 1); shaker(16, 8, .8);
      sing(LIFT, 24, .54); guitar(24, LIFT_CH, 1); bass(24, LIFT_CH, 'walk', 1); drums(24, 4, 1, 'full'); gongs(24, LIFT_CH, true); claps(26, 2, .6); pad(24, LIFT_CH, .7);
      // Breakdown 28-31: the drums stop; Ntina's 21 seeds play themselves over a soft pad, each mapped to the chord's tones
      pad(28, BREAK_CH, .9); guitar(28, BREAK_CH, .55, 'soft'); bass(28, BREAK_CH, 'whole', .8); E.push({ t: T(28, 0), k: 'gong', n: 0, f: 98, v: .32, s: 'gongs' });
      for (var sd = 0; sd < 21; sd++) {
        var br = 28 + Math.floor(sd / 6), bt = (sd % 6) * .5 + (sd % 6 >= 3 ? .5 : 0), ct = CH[BREAK_CH[Math.min(3, br - 28)]].ct, gi = 6 + gseq(sd), best = ct[0];
        ct.forEach(function (p) { if (Math.abs(p - gi) < Math.abs(best - gi)) best = p; });
        K(T(br, bt), best, .28 + .14 * sd / 21, .5, 'melody');
      }
      // Chorus 32-39: the full circle, IV-V-iii-vi-ii-V-I, claps on two and four
      sing(CHORUS, 32, .56); guitar(32, CHORUS_CH, 1.05); bass(32, CHORUS_CH, 'walk', 1); drums(32, 8, 1, 'full'); gongs(32, CHORUS_CH, true); answers(32, CHORUS_CH, 1.1); claps(32, 8, 1); shaker(32, 8, 1);
      // Bridge 40-47: ii-V-I, then B7 tonicises E minor; the sway halves and a roll builds on D7
      sing(BRIDGE, 40, .48); guitar(40, BRIDGE_CH, .8, 'soft'); bass(40, BRIDGE_CH, 'whole', .9); pad(40, BRIDGE_CH, 1); drums(40, 6, .75, 'half'); gongs(40, BRIDGE_CH);
      for (var rl = 0; rl < 16; rl++) E.push({ t: T(46 + Math.floor(rl / 8), (rl % 8) / 2), k: 'drum', n: rl % 4 === 0 ? 'dum' : 'tak', v: .1 + rl * .02, s: 'drums' });
      // Final chorus 48-55: everyone, a harmony voice, the circle's voices, and a deceptive cadence (V to vi)
      sing(FINAL_MEL, 48, .58); harmony(FINAL_MEL, 48, 1, FINAL_CH); guitar(48, FINAL_CH, 1.1); bass(48, FINAL_CH, 'walk', 1.05); drums(48, 8, 1.05, 'full'); gongs(48, FINAL_CH, true); answers(48, FINAL_CH, 1.15); claps(48, 8, 1.1, true); shaker(48, 8, 1.1);
      // Outro 56-59: ii7-V7-I, the theme alone again, the great gong
      sing(OUTRO, 56, .46); guitar(56, OUTRO_CH.slice(0, 3), .7, 'soft'); pad(56, OUTRO_CH, .8); bass(56, OUTRO_CH, 'whole', .8);
      E.push({ t: T(58, 0), k: 'gong', n: 0, f: 98, v: .55, s: 'gongs' }); E.push({ t: T(58, 0), k: 'drum', n: 'dum', v: .45, s: 'drums' });
      K(T(58, 0), 12, .26, 4, 'counter');
      return E;
    }
    // ---------- version 3: Lingkar Ntina, folk ensemble ----------
    // Same song (our melody, same form and progression), re-orchestrated for traditional instruments in a dero groove:
    // geso-geso (one-string bowed fiddle) leads like the kayori singer; the circle's refrain is kakula + kolintang in unison,
    // with angklung shimmer; di'o (struck rattan strings) and re-re (split bamboo)
    // carry the bass; ganda drives the dero beat with padengko (slit bamboo) keeping time and padengko ndare'a (three tuned tubes)
    // ringing an ostinato; nggongi gongs mark the phrases; tatali (three-hole bamboo flute) opens and closes.
    function composeFolk(opt) {
      opt = opt || {}; var lilt = opt.feel === 'lilt' ? 1 / 6 : 0, E = [];
      function T(bar, beat) { var f = beat % 1; if (Math.abs(f - .5) < 1e-6) beat += lilt; return bar * BAR + beat * BEAT; }
      function F(p) { return PITCH[p] * Math.pow(2, DR[p] / 1200); }
      function lead(bars, at, v, voice, octave) { // voice: geso | tatali | kakula | kolintang
        var prevF = null;
        bars.forEach(function (bar, i) { bar.forEach(function (nt, j) {
          var t0 = T(at + i, nt[0]), beats = nt[2], f = F(nt[1]) * (octave || 1), d = beats * BEAT;
          if (voice === 'geso' || voice === 'tatali') { E.push({ t: t0, k: voice, f: f, from: prevF, v: v, d: Math.max(.18, d * .96), s: voice === 'geso' ? 'fiddle' : 'flute' }); prevF = f; return; }
          if (voice === 'kolintang') { E.push({ t: t0, k: 'kolintang', n: nt[1] % 7, f: f, v: v, s: 'kolintang' }); if (beats >= 1.5) for (var r = BEAT / 2; r < d - BEAT / 3; r += BEAT / 4) E.push({ t: t0 + r, k: 'kolintang', n: nt[1] % 7, f: f, v: v * .32, s: 'kolintang' }); return; }
          var soft = voice === 'kakula-soft';
          E.push({ t: t0, k: 'kettle', n: nt[1] % 7, f: f, v: v, soft: soft, d: clamp(beats * BEAT * (soft ? 2.8 : 2.2), .35, 2.2), s: 'kakula' });
          if (beats >= 1.5) for (var q = BEAT * .75; q < d - BEAT * .4; q += BEAT / 3) E.push({ t: t0 + q, k: 'kettle', n: nt[1] % 7, f: f, v: v * (soft ? .11 : .15), soft: soft, d: .35, s: 'kakula' });
        }); });
      }
      function nggongi(at, chords, dense) { chords.forEach(function (c, i) { if (i % 2 === 0) E.push({ t: T(at + i, 0), k: 'gong', n: 0, f: 98, v: .28, s: 'gongs' }); if (dense || i % 2 === 1) E.push({ t: T(at + i, 2), k: 'gong', n: 1, f: 146.83, v: .16, s: 'gongs' }); }); }
      // ganda: the dero beat, accents following the step "left, right-right" then the sway
      function ganda(at, n, level, mode) {
        for (var b = 0; b < n; b++) {
          var x = at + b;
          if (mode === 'half') { E.push({ t: T(x, 0), k: 'ganda', n: 'dum', v: .5 * level, s: 'ganda' }); E.push({ t: T(x, 2), k: 'ganda', n: 'tak', v: .34 * level, s: 'ganda' }); continue; }
          [[0, 'dum', .55], [1, 'tak', .42], [1.5, 'tak', .36], [2, 'dum', .4], [2.5, 'dum', .18], [3, 'tak', .4], [3.5, 'tak', .16]].forEach(function (h) {
            if (mode === 'light' && h[2] < .2) return; E.push({ t: T(x, h[0]), k: 'ganda', n: h[1], v: h[2] * level, s: 'ganda' }); });
        }
      }
      function padengko(at, n, level) { for (var b = 0; b < n * 8; b++) { var bt = (b % 8) / 2; E.push({ t: T(at + Math.floor(b / 8), bt), k: 'padengko', v: (bt % 2 === 0 ? .32 : bt % 1 === 0 ? .2 : .12) * level, s: 'bamboo' }); } }
      function ndarea(at, chords, level) { // three tuned bamboo tubes: G4, D5, E5
        var tubes = [392.00, 587.33, 659.26], pat = [[0, 0], [.5, 1], [1, 2], [1.5, 1], [2, 0], [2.5, 2], [3, 1], [3.5, 2]];
        chords.forEach(function (c, i) { if (c === 'B7') return; if (c === 'D7' || c === 'D/F#' || c === 'D' || c === 'Bm' || c === 'Bm/D') { pat.forEach(function (p) { if (p[1] !== 2) E.push({ t: T(at + i, p[0]), k: 'ndarea', f: p[1] === 0 ? (c.charAt(0) === 'B' ? 493.88 : 440) : tubes[1], v: .16 * level, s: 'bamboo' }); }); return; }
          var low = c === 'Am' ? 440 : tubes[0]; pat.forEach(function (p) { E.push({ t: T(at + i, p[0]), k: 'ndarea', f: p[1] === 0 ? low : tubes[p[1]], v: .16 * level, s: 'bamboo' }); }); });
      }
      function rere(at, chords, level) { chords.forEach(function (c, i) { [1.5, 3.5].forEach(function (bt) { E.push({ t: T(at + i, bt), k: 'rere', f: CH[c].b, v: .12 * level, s: 'bass' }); }); }); }
      function dio(at, chords, style, level) { // struck rattan strings, the bass
        level *= .6;
        chords.forEach(function (c, i) {
          var r = CH[c].b, x = at + i, fifth = r * 1.5 > 200 ? r * .75 : r * 1.5;
          if (style === 'whole') { E.push({ t: T(x, 0), k: 'dio', f: r, v: .5 * level, s: 'bass' }); return; }
          E.push({ t: T(x, 0), k: 'dio', f: r, v: .52 * level, s: 'bass' }); E.push({ t: T(x, 2), k: 'dio', f: fifth, v: .4 * level, s: 'bass' });
          var nx = chords[i + 1] ? CH[chords[i + 1]].b : r; if (Math.abs(nx - r) > 1) E.push({ t: T(x, 3.5), k: 'dio', f: nx * (nx > r ? Math.pow(2, -1 / 12) : Math.pow(2, 1 / 12)), v: .26 * level, s: 'bass' });
        });
      }
      function santu(at, chords, level, soft) { // plucked bamboo zither: a rolling folk arpeggio of the chord
        chords.forEach(function (c, i) { var g = CH[c].gt, notes = g.slice(-4), seq = soft ? [[0, 0], [2, 2]] : [[0, 0], [.5, 2], [1, 1], [1.5, 3], [2, 0], [2.5, 2], [3, 1], [3.5, 3]];
          seq.forEach(function (sq) { E.push({ t: T(at + i, sq[0]), k: 'santu', f: notes[Math.min(sq[1], notes.length - 1)] * 2, v: (sq[0] % 1 ? .18 : .25) * level, s: 'santu' }); }); });
      }
      function angklung(at, chords, level, beats) { chords.forEach(function (c, i) { CH[c].pad.forEach(function (f, j) { E.push({ t: T(at + i, 0) + j * .012, k: 'angklung', f: f * 2, v: .25 * level, d: (beats || 1) * BEAT, s: 'angklung' }); }); }); }
      function answers(at, chords, level) { chords.forEach(function (c, i) { if (i % 2 === 1) { var ct = CH[c].ct; [ct[0], ct[Math.min(1, ct.length - 1)], ct[0]].forEach(function (p, j) { E.push({ t: T(at + i, 2.5 + j * .5), k: 'kolintang', n: p % 7, f: F(p) / 2, v: .34 * level, s: 'kolintang' }); }); } }); }
      function claps(at, n, level, extra) { for (var b = 0; b < n; b++) { [1, 3].forEach(function (bt) { E.push({ t: T(at + b, bt), k: 'clap', v: .55 * level, s: 'claps' }); }); if (extra && b % 2 === 1) E.push({ t: T(at + b, 3.5), k: 'clap', v: .38 * level, s: 'claps' }); } }
      function harmonyBelow(bars, chords, at, v) { // a second fiddle on the closest chord tone at least a minor third below the melody
        bars.forEach(function (bar, i) { var tones = []; CH[chords[i]].gt.concat(CH[chords[i]].pad).forEach(function (f) { [.5, 1, 2, 4].forEach(function (o) { tones.push(f * o); }); });
          bar.forEach(function (nt) { if (nt[2] < 1) return; var m = F(nt[1]), best = null; tones.forEach(function (f) { if (f < m / 1.18 && f > m / 1.7 && (!best || f > best)) best = f; });
            if (best) E.push({ t: T(at + i, nt[0]), k: 'kettle', n: 0, f: best, v: v, soft: true, d: clamp(nt[2] * BEAT * 2.4, .4, 2), s: 'kakula' }); }); });
      }
      function voices(at, chords, level) { chords.forEach(function (c, i) { CH[c].pad.forEach(function (f) { E.push({ t: T(at + i, 0), k: 'choir', f: f, v: .055 * level, d: BAR, s: 'voices' }); }); }); }

      // Intro 0-7: the kakula alone, softly, like a first thought; padengko joins at bar 4
      lead(VERSE.slice(0, 4), 0, .42, 'kakula-soft');
      lead(VERSE.slice(4, 8), 4, .44, 'kakula-soft'); padengko(4, 4, .7); E.push({ t: T(4, 0), k: 'gong', n: 0, f: 98, v: .36, s: 'gongs' });
      // Verse 8-15: the kakula leads like the kayori singer; ganda starts the dero beat; di'o walks the canon bass down
      lead(VERSE, 8, .46, 'kakula'); dio(8, VERSE_CH, 'walk', .9); ganda(8, 8, .75, 'light'); padengko(8, 8, .8); nggongi(8, VERSE_CH);
      // Verse 16-23: the circle answers on kolintang; re-re buzzes the offbeats
      lead(VERSE, 16, .46, 'kakula'); dio(16, VERSE_CH, 'walk', 1); ganda(16, 8, .85, 'light'); padengko(16, 8, .85); nggongi(16, VERSE_CH); answers(16, VERSE_CH, 1); rere(16, VERSE_CH, .9);
      // Lift 24-27: padengko ndare'a starts its ring, the first claps
      lead(LIFT, 24, .5, 'kakula'); dio(24, LIFT_CH, 'walk', 1); ganda(24, 4, 1, 'full'); padengko(24, 4, 1); nggongi(24, LIFT_CH, true); ndarea(24, LIFT_CH, .9); claps(26, 2, .6); angklung(24, LIFT_CH, .7, 2);
      // Breakdown 28-31: the drums rest; Ntina's 21 seeds play on kakula over the bamboo tubes
      dio(28, BREAK_CH, 'whole', .7); ndarea(28, BREAK_CH, .6); angklung(28, BREAK_CH, .6, 3); E.push({ t: T(28, 0), k: 'gong', n: 0, f: 98, v: .32, s: 'gongs' });
      for (var sd = 0; sd < 21; sd++) {
        var br = 28 + Math.floor(sd / 6), bt = (sd % 6) * .5 + (sd % 6 >= 3 ? .5 : 0), ct = CH[BREAK_CH[Math.min(3, br - 28)]].ct, gi = 6 + gseq(sd), best = ct[0];
        ct.forEach(function (p) { if (Math.abs(p - gi) < Math.abs(best - gi)) best = p; });
        E.push({ t: T(br, bt), k: 'kettle', n: best % 7, f: F(best), v: .3 + .14 * sd / 21, d: .9, s: 'kakula' });
      }
      // Chorus 32-39: the refrain belongs to the whole circle, kakula and kolintang in unison, angklung on every chord
      lead(CHORUS, 32, .5, 'kakula'); lead(CHORUS, 32, .42, 'kolintang'); 
      dio(32, CHORUS_CH, 'walk', 1); rere(32, CHORUS_CH, 1); ganda(32, 8, 1, 'full'); padengko(32, 8, 1); nggongi(32, CHORUS_CH, true); ndarea(32, CHORUS_CH, .9); angklung(32, CHORUS_CH, 1); claps(32, 8, 1);
      // Bridge 40-47: thinking again: the soft kakula over the gongs, a distant tatali echo; the ganda roll builds on D7
      lead(BRIDGE, 40, .42, 'kakula-soft'); dio(40, BRIDGE_CH, 'whole', .9); ganda(40, 6, .75, 'half'); nggongi(40, BRIDGE_CH); angklung(40, BRIDGE_CH, .55, 2);
      [[41, 2, 9], [43, 2, 10], [45, 2, 8]].forEach(function (e) { E.push({ t: T(e[0], e[1]), k: 'tatali', f: F(e[2]), v: .16, d: BEAT * 1.6, s: 'flute' }); });
      for (var rl = 0; rl < 16; rl++) E.push({ t: T(46 + Math.floor(rl / 8), (rl % 8) / 2), k: 'ganda', n: rl % 4 === 0 ? 'dum' : 'tak', v: .14 + rl * .025, s: 'ganda' });
      // Final chorus 48-55: everyone, a soft kakula voice a third below, the circle's voices, and the deceptive turn to E minor
      lead(FINAL_MEL, 48, .52, 'kakula'); lead(FINAL_MEL, 48, .44, 'kolintang'); harmonyBelow(FINAL_MEL, FINAL_CH, 48, .24);
      dio(48, FINAL_CH, 'walk', 1.05); rere(48, FINAL_CH, 1.05); ganda(48, 8, 1.05, 'full'); padengko(48, 8, 1.05); nggongi(48, FINAL_CH, true); ndarea(48, FINAL_CH, 1); angklung(48, FINAL_CH, 1.1); claps(48, 8, 1.1, true); answers(48, FINAL_CH, 1.1);
      // Outro 56-59: the soft kakula returns to the first thought, ii7-V7-I, the great gong
      lead(OUTRO.slice(0, 2), 56, .4, 'kakula-soft'); lead(OUTRO.slice(2), 58, .4, 'kakula-soft'); dio(56, OUTRO_CH, 'whole', .8); angklung(56, OUTRO_CH.slice(0, 3), .6, 2);
      E.push({ t: T(58, 0), k: 'gong', n: 0, f: 98, v: .55, s: 'gongs' }); E.push({ t: T(58, 0), k: 'ganda', n: 'dum', v: .5, s: 'ganda' });
      E.push({ t: T(58, 0), k: 'kettle', n: 5, f: F(12), v: .26, d: 2.4, s: 'kakula' });
      return E;
    }
    var TIMELINE = [].concat(VERSE_CH.slice(0, 4), VERSE_CH.slice(4), VERSE_CH, VERSE_CH, LIFT_CH, BREAK_CH, CHORUS_CH, BRIDGE_CH, FINAL_CH, OUTRO_CH);
    function chordTones(bar) { var c = CH[TIMELINE[bar]]; return c ? c.gt.concat(c.pad) : []; }
    return { compose: compose, composeFolk: composeFolk, TIMELINE: TIMELINE, chordTones: chordTones, BAR: BAR, BPM: 6400 / 60 };
  })();

  function sceneStart(id) { for (var i = 0; i < SCENES.length; i++) if (SCENES[i].id === id) return starts[i]; return 0; }
  function buildScore(kind) {
    if (kind === 'marea') return LM.compose({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    if (kind === 'medallion') return LD.compose({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    if (kind === 'cengkeh') return LC.compose({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    if (kind === 'ketupat') return LK.compose({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    if (kind === 'rebung') return LR.compose({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    if (kind === 'image') return IMG && IMG.score ? IMG.score.slice() : [];
    if (kind === 'bomba') return LB.compose({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    if (kind === 'folk') return LN.composeFolk({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    if (kind === 'ntina') return LN.compose({ feel: SND.feel }).sort(function (a, b) { return a.t - b.t; });
    var E = [];
    function at(id, lt) { return sceneStart(id) + lt; }
    function K(time, n, v, o) { o = o || {}; E.push({ t: time, k: 'kettle', n: ((n % 7) + 7) % 7, v: v, oct: !!o.oct, damp: !!o.damp, long: kind === 'gema' || !!o.long }); }
    function G(time, n, v) { E.push({ t: time, k: 'gong', n: n, v: v }); }
    function D(time, n, v) { E.push({ t: time, k: 'drum', n: n, v: v }); }
    function X(time, v, d) { E.push({ t: time, k: 'scrape', v: v, d: d }); }
    // story cues shared by every score
    K(at('title', .3), 0, .45); G(at('title', 3.0), 0, .55); K(at('title', 5.0), 4, .25);
    K(at('listen', 1.3), 2, .4);
    for (var i = 0; i < 21; i++) K(at('listen', 2.6 + i * .08), gseq(i), .1, { oct: true });
    G(at('listen', 5.6), 1, .45);
    [0, 2, 3, 5].forEach(function (n, i) { K(at('brief', 1.45 + i * .8), n, .42); });
    [1, 3, 5].forEach(function (n, i) { K(at('round1', .9 + i * .4), n, .28); });
    K(at('round1', 3.6), 0, .45, { damp: true }); D(at('round1', 3.6), 'mute', .4);
    K(at('round1', 5.2), 5, .3); K(at('round1', 5.2), 6, .3);
    K(at('round1', 6.0), 1, .45, { damp: true }); D(at('round1', 6.0), 'mute', .4);
    [0, 4, 6].forEach(function (n) { K(at('round1', 8.6), n, .4); }); G(at('round1', 8.6), 0, .4);
    for (var r = .8; r < 6.5; r += .09) { var fr = 1 - ease(ramp(r, 3.5, 6.5)); if (fr > .05) K(at('round2', r), Math.round(r / .09) % 2 ? 3 : 4, .2 * fr, { damp: true }); }
    K(at('round2', 7.0), 5, .55); G(at('round2', 7.0), 1, .3);
    for (var m = 0; m < 5; m++) { K(at('round3', 1 + m * 1.9), gseq(m + 3), .42); if (m >= 1 && m <= 3) { var c = gseq(m + 7); K(at('round3', 1.3 + m * 1.9), c, .26); K(at('round3', 1.3 + m * 1.9), c + 1, .26); } }
    for (var j = 0; j < 7; j++) K(at('round3', 11.2 + j * .12), j, .35); G(at('round3', 12.6), 0, .5);
    var prev = 0; for (var s = 0; s <= 8; s += .01) { var nn = Math.round(lerp(1, 21, ease(ramp(s, .8, 7.5)))); while (prev < nn) { K(at('seeds', s), gseq(prev), .4); prev++; } }
    for (var h = 0; h < 7; h++) K(at('horns', 2 + h * .22), 6 - h, .28);
    for (var dr = 0; dr < 16; dr++) D(at('horns', 5 + dr * .1), 'tak', .08 + dr * .025);
    K(at('horns', 6.6), 0, .55); G(at('horns', 6.6), 0, .45);
    [[2.2, 1], [3.6, 4], [5.0, 5]].forEach(function (p) { K(at('misread', p[0]), p[1], .32); K(at('misread', p[0]), p[1] + 1, .32); });
    [0, 2, 4].forEach(function (n) { K(at('misread', 8.6), n, .42); }); G(at('misread', 8.6), 1, .38);
    for (var q = 0; q <= 12; q++) K(at('tanaka', .4 + q * .05), 6, .07, { damp: true, oct: true });
    K(at('tanaka', 2.4), 0, .45); K(at('tanaka', 3.8), 2, .45); K(at('tanaka', 5.2), 4, .45); [0, 2, 4].forEach(function (n) { K(at('tanaka', 6.4), n, .25); });
    X(at('katagami', .6), .14, 1.2);
    for (var z = 0; z < 6; z++) K(at('katagami', 2.6 + z * .45), z, .32);
    K(at('katagami', 5.1), 0, .4); K(at('katagami', 5.1), 4, .4); G(at('katagami', 5.1), 0, .4);
    for (var f = 0; f < 10; f++) K(at('katagami', 7.4 + f * .06), f % 2 ? 6 : 5, .12, { oct: true, damp: true });
    K(at('katagami', 8.1), 0, .4, { damp: true }); D(at('katagami', 8.1), 'mute', .35);
    for (var it = 0; it < 4; it++) K(at('system', 1 + it * .7), gseq(it), .38);
    G(at('system', 6), 0, .55); D(at('system', 6), 'dum', .5);
    for (var tr = 0; tr < 8; tr++) K(at('keep', .6 + tr * .18), 6 - (tr % 7), .18);
    [0, 2, 4].forEach(function (n) { K(at('keep', 2.0), n, .42); }); G(at('keep', 2.0), 0, .6); G(at('keep', 6.4), 1, .4);

    // beds
    var ci = 0;
    function seedSong(t0, t1, every, v) { for (var x = t0; x < t1; x += every) K(x, gseq(ci++), v); }
    function sway(t0, t1, bpm, lv, parts) { // the dero circle: sway on two, gong every four, call and answer over eight
      var beat = 60 / bpm, b = 0;
      for (var x = t0; x < t1 - .05; x += beat, b++) {
        if (parts.drum) { D(x, b % 2 ? 'tak' : 'dum', (b % 2 ? .34 : .46) * lv); if (b % 4 === 3) D(x + beat / 2, 'tak', .13 * lv); }
        if (parts.gong) { if (b % 4 === 0) G(x, 0, .3 * lv); if (b % 8 === 6) G(x, 1, .2 * lv); }
        if (parts.melody) {
          var p = b % 8;
          if (p < 3) K(x, gseq(ci + p), (p === 1 ? .36 : .3) * lv);
          else if (p >= 4 && p < 7) { var n = 6 - gseq(ci + p - 4); K(x, n, .26 * lv); K(x, n - 2, .18 * lv); }
          if (p === 7) ci += 3;
        }
      }
    }
    var fullS = { drum: 1, gong: 1, melody: 1 };
    if (kind === 'lingkar') {
      ['listen', 'brief', 'round1', 'round2'].forEach(function (id) { G(at(id, .05), 1, .3); });
      sway(at('round3', .5), at('round3', 13.6), 88, .6, fullS);
      sway(at('seeds', .3), at('seeds', 10.6), 88, .5, { gong: 1 });
      sway(at('horns', .3), at('horns', 8.6), 88, .5, { drum: 1, gong: 1 });
      sway(at('misread', .3), at('misread', 11.6), 92, .32, { drum: 1 });
      sway(at('katagami', .3), at('katagami', 11.6), 96, .38, { drum: 1, gong: 1 });
      sway(at('system', .4), at('system', 11.7), 100, 1, fullS);
      sway(at('keep', .2), at('keep', 3.2), 84, .6, { drum: 1, gong: 1 });
    } else if (kind === 'panen') {
      seedSong(at('listen', 7), at('listen', 10.6), 1.2, .18);
      seedSong(at('round1', 1.8), at('round1', 11.5), 1.6, .14);
      sway(at('round2', .2), at('round2', 9.6), 72, .45, { gong: 1 });
      sway(at('round3', .4), at('round3', 13.6), 80, .5, { gong: 1, drum: 1 });
      sway(at('horns', .3), at('horns', 8.6), 84, .5, fullS);
      sway(at('misread', .3), at('misread', 11.6), 88, .36, { gong: 1, drum: 1 });
      sway(at('tanaka', 6.8), at('tanaka', 9.6), 88, .3, { gong: 1 });
      sway(at('katagami', .3), at('katagami', 11.6), 92, .45, { gong: 1, drum: 1 });
      sway(at('system', .4), at('system', 11.7), 100, 1, fullS);
      seedSong(at('keep', 3), at('keep', 6.2), 1.0, .16);
    } else if (kind === 'gema') {
      SCENES.forEach(function (sc, i) { if (i) G(starts[i] + .05, i % 2, .42); });
      var pace = { listen: 3.2, brief: 3, round1: 3, round2: 2.8, round3: 2.4, horns: 2.1, misread: 1.9, tanaka: 1.7, katagami: 1.5, system: .75, keep: 3 };
      Object.keys(pace).forEach(function (id) { var d = SCENES.filter(function (s) { return s.id === id; })[0].dur; seedSong(at(id, 1.1), at(id, d - .6), pace[id], id === 'system' ? .22 : .16); });
      for (var y = 1; y < 11.5; y += 1.5) D(at('system', y), 'dum', .3);
      for (var w = 0; w < 11; w += 3) G(at('system', w + .1), 0, .3);
    }
    E.sort(function (a, b) { return a.t - b.t; });
    E.forEach(function (e) { e.t = clamp(e.t, 0, TOTAL - .05); });
    return E;
  }

  var SND = { feel: 'straight', rate: 1, ks: null, muted: {}, stemGain: null, kind: 'off', ev: [], byK: {}, ctx: null, master: null, wet: null, bus: null, rec: null, anchor: 0, from: 0, noise: null };
  function indexScore() {
    SND.ev = SND.kind === 'off' ? [] : buildScore(SND.kind); SND.byK = { kettle: [[], [], [], [], [], [], []], gong: [[], []], drum: [] };
    SND.ev.forEach(function (e) { if (e.k === 'kettle' || e.k === 'kolintang') SND.byK.kettle[e.n].push(e); else if (e.k === 'gong') SND.byK.gong[e.n].push(e); else if (e.k === 'drum' || e.k === 'ganda') SND.byK.drum.push(e); });
  }
  function ensureCtx() {
    if (SND.ctx) { if (SND.ctx.state === 'suspended') SND.ctx.resume(); return SND.ctx; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    var c = new AC(); SND.ctx = c;
    var comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 2.5; comp.attack.value = .008; comp.release.value = .3;
    var makeup = c.createGain(); makeup.gain.value = 1.6; // phone speakers need level
    var lim = c.createDynamicsCompressor(); lim.threshold.value = -2.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .1;
    SND.master = c.createGain(); SND.master.gain.value = 1; SND.master.connect(comp); comp.connect(makeup); makeup.connect(lim); lim.connect(c.destination); SND.out = lim;
    var conv = c.createConvolver(), len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate); // a small open pavilion
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    conv.buffer = ir; SND.wet = c.createGain(); SND.wet.connect(conv); conv.connect(SND.master);
    var nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1; SND.noise = nb;
    return c;
  }
  // Phones: resume inside the tap, prime the output with a silent buffer, and ask iOS to treat this as playback
  // so the ring/silent switch does not mute it (Safari 17+); older iOS needs a playing media element as well.
  var unlockEl = null;
  function unlockAudio() {
    var c = ensureCtx(); if (!c) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { var p = c.resume(); if (p && p.then) p.then(audioStatus, audioStatus); } catch (e) {}
    try { var b = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch (e) {}
    try {
      if (!unlockEl) { unlockEl = document.createElement('audio'); unlockEl.setAttribute('playsinline', ''); unlockEl.loop = true; unlockEl.src = silentWav(); }
      var pp = unlockEl.play(); if (pp && pp.catch) pp.catch(function () {});
    } catch (e) {}
    audioStatus(); return c;
  }
  function silentWav() { // 0.5 s of silence as a data URI
    var n = 4000, buf = new ArrayBuffer(44 + n), v = new DataView(buf), w = function (o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
    for (var i = 0; i < n; i++) v.setUint8(44 + i, 128);
    var bin = '', u = new Uint8Array(buf); for (var j = 0; j < u.length; j++) bin += String.fromCharCode(u[j]); return 'data:audio/wav;base64,' + btoa(bin);
  }
  function audioStatus() {
    var el = $('audioState'); if (!el) return;
    if (!SND.ctx) { el.textContent = ''; return; }
    var st = SND.ctx.state;
    el.textContent = st === 'running' ? 'Audio on. If you still hear nothing, check the volume and, on iPhone, the silent switch.' : 'Audio is ' + st + '. Tap Test sound to start it.';
  }
  function testSound() {
    var c = unlockAudio(); if (!c) { $('audioState').textContent = 'This browser has no Web Audio.'; return; }
    var bus = c.createGain(); bus.connect(SND.master); var now = c.currentTime + .08;
    play({ k: 'gong', n: 0, v: .6 }, now, bus); [0, 2, 4].forEach(function (n, i) { play({ k: 'kettle', n: n, v: .55 }, now + .25 + i * .22, bus); });
    setTimeout(audioStatus, 400);
  }
  function newBus() {
    var c = SND.ctx; if (!c) return;
    if (SND.bus) { var old = SND.bus; old.gain.cancelScheduledValues(c.currentTime); old.gain.setTargetAtTime(0, c.currentTime, .08); setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 900); }
    SND.bus = c.createGain(); SND.bus.gain.value = ['ntina', 'folk', 'bomba', 'marea', 'rebung', 'ketupat', 'cengkeh', 'medallion', 'image'].indexOf(SND.kind) >= 0 ? .55 : 1; SND.bus.connect(SND.master);
    SND.stemGain = {}; STEMS.concat(STEMS_FOLK, STEMS_BOMBA, STEMS_MAREA, STEMS_REBUNG, STEMS_KETUPAT, STEMS_CENGKEH, STEMS_MEDALLION).forEach(function (st) { if (SND.stemGain[st[0]]) return; var sg = c.createGain(); sg.gain.value = SND.muted[st[0]] ? 0 : 1; sg.connect(SND.bus); SND.stemGain[st[0]] = sg; });
    var send = c.createGain(); send.gain.value = SND.kind === 'gema' ? .5 : .24; SND.bus.connect(send); send.connect(SND.wet);
    SND.anchor = c.currentTime + .06 - t / SND.rate; SND.from = t;
  }
  function env(gn, when, peak, atk, dec) { gn.gain.setValueAtTime(0, when); gn.gain.linearRampToValueAtTime(peak, when + atk); gn.gain.exponentialRampToValueAtTime(.0001, when + atk + dec); }
  function tone(bus, when, f, peak, atk, dec, type, f0) {
    var c = SND.ctx, o = c.createOscillator(), gn = c.createGain(); o.type = type || 'sine';
    if (f0) { o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(f, when + Math.min(.3, dec * .3)); } else o.frequency.setValueAtTime(f, when);
    env(gn, when, peak, atk, dec); o.connect(gn); gn.connect(bus); o.start(when); o.stop(when + atk + dec + .05);
  }
  function noiseHit(bus, when, peak, dec, ftype, freq, q, sweepTo) {
    var c = SND.ctx, s = c.createBufferSource(), bf = c.createBiquadFilter(), gn = c.createGain(); s.buffer = SND.noise; s.loop = true;
    bf.type = ftype; bf.frequency.setValueAtTime(freq, when); if (sweepTo) bf.frequency.exponentialRampToValueAtTime(sweepTo, when + dec); bf.Q.value = q || 1;
    env(gn, when, peak, .003, dec); s.connect(bf); bf.connect(gn); gn.connect(bus); s.start(when, Math.random() * .5); s.stop(when + dec + .05);
  }
  var STEMS_BOMBA = [['kakula', 'Kakula'], ['kakula2', 'Second kakula'], ['gamba', 'Gamba-gamba'], ['gongs', 'Tawa-tawa'], ['drums', 'Gimba'], ['bass', 'Low gongs'], ['loom', 'Loom']];
  var STEMS_FOLK = [['kakula', 'Kakula'], ['flute', 'Tatali'], ['kolintang', 'Kolintang'], ['angklung', 'Angklung'], ['bamboo', 'Padengko'], ['ganda', 'Ganda'], ['gongs', 'Nggongi'], ['bass', 'Di’o & re-re'], ['claps', 'Claps']];
  var STEMS_MAREA = [['kakula', 'Ugal (lead)'], ['polos', 'Kotekan polos'], ['sangsih', 'Kotekan sangsih'], ['reyong', 'Reyong'], ['jegogan', 'Jegogan & calung'], ['kempli', 'Kempli'], ['gongs', 'Gong, kempur, klentong'], ['kendang', 'Kendang'], ['cengceng', 'Ceng-ceng'], ['suling', 'Suling'], ['waves', 'Waves']];
  var STEMS = [['melody', 'Gamelan voice'], ['counter', 'Answers & harmony'], ['gongs', 'Gongs'], ['guitar', 'Acoustic guitar'], ['drums', 'Drum sway'], ['bass', 'Bass'], ['organ', 'Pad'], ['claps', 'Claps & shaker']];
  function organVoice(bus, when, f, v, dur) {
    var c = SND.ctx, gn = c.createGain(); gn.gain.setValueAtTime(0, when); gn.gain.linearRampToValueAtTime(v, when + .03); gn.gain.setValueAtTime(v, when + Math.max(.04, dur - .08)); gn.gain.linearRampToValueAtTime(0, when + dur + .06); gn.connect(bus);
    [[1, 1], [2, .45], [3, .22], [4, .1]].forEach(function (h) { var o = c.createOscillator(); o.frequency.setValueAtTime(f * h[0], when); var hg = c.createGain(); hg.gain.value = h[1]; o.connect(hg); hg.connect(gn); o.start(when); o.stop(when + dur + .1); });
  }
  function ksBuffer(f) { // plucked string (Karplus-Strong), computed once per pitch
    var c = SND.ctx; SND.ks = SND.ks && SND.ks.ctx === c ? SND.ks : { ctx: c, map: {} }; var key = f.toFixed(2); if (SND.ks.map[key]) return SND.ks.map[key];
    var sr = c.sampleRate, len = Math.floor(sr * 2.2), N = Math.max(2, Math.round(sr / f)), b = c.createBuffer(1, len, sr), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < N; i++) { var r = Math.random() * 2 - 1; last = last * .5 + r * .5; d[i] = last; }
    var damp = .996 - Math.min(.006, f / 120000);
    for (var j = N; j < len; j++) d[j] = (d[j - N] + d[j - N + 1 < j ? j - N + 1 : j - N]) * .5 * damp;
    SND.ks.map[key] = b; return b;
  }
  function play(e, when, bus) {
    if (!bus && SND.stemGain && e.s && SND.stemGain[e.s]) bus = SND.stemGain[e.s];
    bus = bus || SND.bus; if (!bus) return; var v = e.v;
    if (e.k === 'bass') { var c = SND.ctx, o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), gn = c.createGain(); o1.type = 'triangle'; o2.type = 'sawtooth'; o1.frequency.value = e.f; o2.frequency.value = e.f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400, when); lp.frequency.exponentialRampToValueAtTime(420, when + .25);
      var g2 = c.createGain(); g2.gain.value = .35; o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(gn); gn.connect(bus);
      gn.gain.setValueAtTime(0, when); gn.gain.linearRampToValueAtTime(v, when + .006); gn.gain.exponentialRampToValueAtTime(v * .45, when + .2); gn.gain.setValueAtTime(v * .45, when + Math.max(.21, e.d - .05)); gn.gain.linearRampToValueAtTime(0, when + e.d + .04);
      o1.start(when); o2.start(when); o1.stop(when + e.d + .1); o2.stop(when + e.d + .1); return; }
    if (e.k === 'organ') { organVoice(bus, when, e.f, v, e.d); return; }
    if (e.k === 'bassgong') { tone(bus, when, e.f, v * .7, .006, 1.4, 'sine', e.f * 1.01); tone(bus, when, e.f * 2, v * .3, .004, .8); tone(bus, when, e.f * 3.01, v * .12, .003, .4); return; }
    if (e.k === 'beater') { tone(bus, when, 92, v * .6, .002, .12, 'sine', 150); noiseHit(bus, when, v * .35, .05, 'bandpass', 520, 2.5); return; }
    if (e.k === 'shuttle') { noiseHit(bus, when, v * .6, .32, 'bandpass', 1300, 2.2, 3400); return; }
    if (e.k === 'geso' || e.k === 'tatali') { // bowed one-string fiddle (nasal, bow noise, slides) or bamboo flute (breathy)
      var cg = SND.ctx, out = cg.createGain(), dur = e.d, fiddle = e.k === 'geso';
      out.gain.setValueAtTime(0, when); out.gain.linearRampToValueAtTime(v * (fiddle ? .5 : .55), when + (fiddle ? .07 : .05)); out.gain.setValueAtTime(v * (fiddle ? .45 : .5), when + Math.max(.08, dur - .08)); out.gain.linearRampToValueAtTime(0, when + dur + (fiddle ? .1 : .06)); out.connect(bus);
      var vib = cg.createOscillator(), vg = cg.createGain(); vib.frequency.value = fiddle ? 5.6 : 4.8; vg.gain.setValueAtTime(0, when); vg.gain.linearRampToValueAtTime(e.f * (fiddle ? .009 : .005), when + Math.min(.45, dur * .6)); vib.connect(vg);
      var src = fiddle ? [['sawtooth', 1, .5], ['sawtooth', 1.002, .35]] : [['sine', 1, .8], ['sine', 2, .1], ['triangle', 1, .12]];
      var lpf = cg.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = fiddle ? 3000 : 2400; lpf.connect(out);
      if (fiddle) { var nas = cg.createBiquadFilter(); nas.type = 'peaking'; nas.frequency.value = 1050; nas.Q.value = 2; nas.gain.value = 7; var nas2 = cg.createBiquadFilter(); nas2.type = 'peaking'; nas2.frequency.value = 2500; nas2.Q.value = 3; nas2.gain.value = 4; nas.connect(nas2); nas2.connect(lpf); var into = nas; } else var into = lpf;
      src.forEach(function (sv) { var o = cg.createOscillator(); o.type = sv[0]; var f0 = e.f * sv[1];
        if (e.from && Math.abs(e.from - e.f) > 1 && fiddle) { o.frequency.setValueAtTime(e.from * sv[1], when); o.frequency.exponentialRampToValueAtTime(f0, when + .07); } else o.frequency.setValueAtTime(f0, when);
        vg.connect(o.frequency); var og = cg.createGain(); og.gain.value = sv[2]; o.connect(og); og.connect(into); o.start(when); o.stop(when + dur + .15); });
      vib.start(when); vib.stop(when + dur + .15);
      noiseHit(bus, when, v * (fiddle ? .05 : .12), dur * .9, 'bandpass', fiddle ? 2200 : e.f * 2, fiddle ? 1.5 : 6);
      return; }
    if (e.k === 'kolintang') { tone(bus, when, e.f, v * .5, .002, .55); tone(bus, when, e.f * 3.92, v * .16, .001, .12); tone(bus, when, e.f * 9.2, v * .05, .001, .04); noiseHit(bus, when, v * .1, .018, 'bandpass', 1800, 1); return; }
    if (e.k === 'angklung') { for (var ar = 0; ar < e.d; ar += .072) { var w = when + ar + (Math.random() - .5) * .008, lv = v * (ar === 0 ? 1 : .7) * (1 - .4 * ar / e.d); tone(bus, w, e.f, lv * .5, .002, .11); tone(bus, w, e.f * 2.01, lv * .25, .002, .07); } return; }
    if (e.k === 'santu') { var cs = SND.ctx, s1 = cs.createBufferSource(), sg = cs.createGain(), bf = cs.createBiquadFilter(); s1.buffer = ksBuffer(e.f); bf.type = 'peaking'; bf.frequency.value = 650; bf.Q.value = 2.5; bf.gain.value = 6; sg.gain.setValueAtTime(v, when); sg.gain.exponentialRampToValueAtTime(.0001, when + .9); s1.connect(bf); bf.connect(sg); sg.connect(bus); s1.start(when); s1.stop(when + .95); return; }
    if (e.k === 'dio') { var cd = SND.ctx, s2 = cd.createBufferSource(), dg = cd.createGain(), lp2 = cd.createBiquadFilter(); s2.buffer = ksBuffer(e.f); lp2.type = 'lowpass'; lp2.frequency.value = 900; dg.gain.setValueAtTime(v * 1.3, when); dg.gain.exponentialRampToValueAtTime(.0001, when + 1.1); s2.connect(lp2); lp2.connect(dg); dg.connect(bus); s2.start(when); s2.stop(when + 1.15); tone(bus, when, e.f, v * .4, .004, .5, 'sine', e.f * 1.3); return; }
    if (e.k === 'rere') { var cr = SND.ctx, ob = cr.createOscillator(), am = cr.createOscillator(), amg = cr.createGain(), rg = cr.createGain(), bp3 = cr.createBiquadFilter(); ob.type = 'square'; ob.frequency.value = e.f * 2; am.type = 'square'; am.frequency.value = 38; amg.gain.value = .5; var amNode = cr.createGain(); amNode.gain.value = .5; am.connect(amg); amg.connect(amNode.gain); bp3.type = 'bandpass'; bp3.frequency.value = 420; bp3.Q.value = 1.2;
      rg.gain.setValueAtTime(v * .5, when); rg.gain.exponentialRampToValueAtTime(.0001, when + .16); ob.connect(bp3); bp3.connect(amNode); amNode.connect(rg); rg.connect(bus); ob.start(when); am.start(when); ob.stop(when + .18); am.stop(when + .18); return; }
    if (e.k === 'padengko') { tone(bus, when, 760, v * .45, .001, .05); noiseHit(bus, when, v * .5, .03, 'bandpass', 900, 9); return; }
    if (e.k === 'ndarea') { tone(bus, when, e.f, v * .55, .002, .45); tone(bus, when, e.f * 2.7, v * .14, .001, .08); noiseHit(bus, when, v * .12, .02, 'bandpass', 1400, 4); return; }
    if (e.k === 'ganda') { if (e.n === 'dum') { tone(bus, when, 96, v * .8, .002, .28, 'sine', 170); noiseHit(bus, when, v * .2, .04, 'lowpass', 1100, .7); } else { tone(bus, when, 330, v * .45, .001, .09, 'sine', 470); noiseHit(bus, when, v * .38, .05, 'bandpass', 2600, 1.6); } return; }
    if (e.k === 'strum') { var cx = SND.ctx, ns = e.dir === 'u' ? e.notes.slice(-4).reverse() : e.notes, bodyF = cx.createBiquadFilter(); bodyF.type = 'peaking'; bodyF.frequency.value = 220; bodyF.gain.value = 4; bodyF.Q.value = 1; var hp = cx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70; bodyF.connect(hp); hp.connect(bus);
      ns.forEach(function (f, i) { var src = cx.createBufferSource(), gn = cx.createGain(); src.buffer = ksBuffer(f); gn.gain.value = v * (e.dir === 'u' ? .8 : 1) * (1 - i * .04); src.connect(gn); gn.connect(bodyF); var w = when + i * (e.dir === 'u' ? .009 : .013); src.start(w); src.stop(w + 2.1); }); return; }
    if (e.k === 'choir') { var cc = SND.ctx, gn2 = cc.createGain(); gn2.gain.setValueAtTime(0, when); gn2.gain.linearRampToValueAtTime(v, when + .35); gn2.gain.setValueAtTime(v, when + e.d - .3); gn2.gain.linearRampToValueAtTime(0, when + e.d + .3); gn2.connect(bus);
      [[450, 6, 1], [820, 7, .6], [2600, 8, .15]].forEach(function (fm) { var bp = cc.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm[0]; bp.Q.value = fm[1]; var fg = cc.createGain(); fg.gain.value = fm[2] * 3; bp.connect(fg); fg.connect(gn2);
        [-6, 6].forEach(function (dt) { var o = cc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = e.f; o.detune.value = dt; o.connect(bp); o.start(when); o.stop(when + e.d + .4); }); }); return; }
    if (e.k === 'clap') { [0, .009, .019].forEach(function (dt, i) { noiseHit(bus, when + dt, v * (i === 2 ? 1 : .7), i === 2 ? .13 : .012, 'bandpass', 1150, .9); }); return; }
    if (e.k === 'shaker') { noiseHit(bus, when, v, .045, 'highpass', 6500, .7); return; }
    if (e.k === 'kettle') { // bossed kettle gong: strong fundamental, a near-unison beat and two inharmonic partials
      var f = e.f || ROOT * Math.pow(2, (CENTS[e.n] + DRIFT[e.n]) / 1200) * (e.oct ? 2 : 1), d = e.d || (e.damp ? .16 : (e.long ? 2.8 : 1.5));
      var sa = e.soft ? .012 : .004; tone(bus, when, f, v * .5, sa, d, 'sine', f * 1.004);
      if (e.pairHz) tone(bus, when, f + e.pairHz, v * .4, sa, d * .95, 'sine', (f + e.pairHz) * 1.004); // ombak: the paired instrument a few hertz above, beating at that rate
      else tone(bus, when, f * 1.0035, v * .22, sa, d * .9);
      tone(bus, when, f * 2.76, v * (e.soft ? .06 : .14), .002, d * .35); if (!e.soft) tone(bus, when, f * 5.4, v * .05, .002, d * .15);
      noiseHit(bus, when, v * (e.soft ? .035 : .12), .025, 'bandpass', e.soft ? 1800 : 2600, 1.2);
    } else if (e.k === 'gong') { // hanging gong: low, slow bloom, beating pair
      var gf = e.f || (e.n ? 110 : 98); tone(bus, when, gf, v * .55, .02, 5.5, 'sine', gf * 1.015); tone(bus, when, gf * 1.006, v * .4, .02, 5);
      tone(bus, when, gf * 2.01, v * .3, .015, 3.4); tone(bus, when, gf * 2.98, v * .18, .01, 2.2); tone(bus, when, gf * 4.1, v * .09, .01, 1.4); tone(bus, when, gf * 5.03, v * .05, .01, .9);
    } else if (e.k === 'drum') {
      if (e.n === 'dum' || e.n === 'mute') { var dd = e.n === 'mute' ? .12 : .36; tone(bus, when, 72, v * .9, .003, dd, 'sine', 150); tone(bus, when, 180, v * .3, .003, dd * .5, 'triangle', 260); noiseHit(bus, when, v * .22, .05, 'lowpass', 900, .7); }
      else { tone(bus, when, 210, v * .5, .002, .12, 'sine', 330); noiseHit(bus, when, v * .3, .06, 'bandpass', 1800, 1.4); }
    } else if (e.k === 'scrape') { noiseHit(bus, when, v, e.d, 'bandpass', 800, 3, 4200); }
  }
  function lowerBound(arr, x) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m].t < x) lo = m + 1; else hi = m; } return lo; }
  function schedule() {
    if (!SND.ctx || !SND.bus || SND.kind === 'off') return;
    var horizon = t + .3 * SND.rate; if (horizon <= SND.from) return;
    for (var i = lowerBound(SND.ev, SND.from); i < SND.ev.length && SND.ev[i].t < horizon; i++) play(SND.ev[i], Math.max(SND.ctx.currentTime, SND.anchor + SND.ev[i].t / SND.rate));
    SND.from = horizon;
  }
  function audioLive() { return SND.kind !== 'off' && SND.ctx && SND.ctx.state === 'running' && SND.bus; }
  function stopSound() { if (SND.ctx && SND.bus) { var c = SND.ctx, old = SND.bus; old.gain.setTargetAtTime(0, c.currentTime, .1); setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 900); SND.bus = null; } }
  function startSound() { if (SND.kind === 'off') return; if (!unlockAudio()) return; newBus(); }
  // the kakula row on screen: seven kettles light as they are struck, two gongs bloom, the drum pulses
  function glow(list, now, decay) {
    var i = lowerBound(list, now + .001) - 1, best = 0;
    for (; i >= 0 && now - list[i].t < decay * 4; i--) { var e = list[i], dk = e.damp ? decay * .3 : decay; best = Math.max(best, e.v * 2.4 * Math.exp(-(now - e.t) / dk)); }
    return Math.min(1, best);
  }
  function drawEnsemble(now) {
    if (SND.kind === 'off') return;
    var cx = W / 2, y = H - 38;
    text('KAKULA', cx - 96, y + 4, '500 10px ' + F.mono, C.muted, 1, 'right');
    for (var k = 0; k < 7; k++) {
      var gl = glow(SND.byK.kettle[k], now, .35), x = cx - 78 + k * 22;
      g.save(); g.fillStyle = C.line2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
      if (gl > .01) { g.globalAlpha = gl; g.fillStyle = C.gold; g.beginPath(); g.arc(x, y, 6 + gl * 2, 0, 7); g.fill(); }
      g.restore();
    }
    for (var n = 0; n < 2; n++) { var gg = glow(SND.byK.gong[n], now, 1.4), gx = cx + 96 + n * 26; g.save(); g.strokeStyle = C.line2; g.lineWidth = 2; g.beginPath(); g.arc(gx, y, 9, 0, 7); g.stroke(); if (gg > .01) { g.globalAlpha = gg; g.strokeStyle = C.gold; g.beginPath(); g.arc(gx, y, 9 + gg * 4, 0, 7); g.stroke(); } g.restore(); }
    var dg = glow(SND.byK.drum, now, .12); g.save(); g.fillStyle = C.line2; rr(cx + 150, y - 6, 12, 12, 2); g.fill(); if (dg > .01) { g.globalAlpha = dg; g.fillStyle = C.gold2; rr(cx + 150 - dg * 2, y - 6 - dg * 2, 12 + dg * 4, 12 + dg * 4, 2); g.fill(); } g.restore();
  }
  function setScore(kind) {
    SND.kind = kind; if (['ntina', 'folk', 'bomba', 'marea', 'rebung', 'ketupat', 'cengkeh', 'medallion'].indexOf(kind) < 0) { SND.rate = 1; } indexScore(); renderScores();
    $('scoreNote').textContent = SCORE_NOTE[kind];
    if (kind === 'off') { stopSound(); return; }
    if (!unlockAudio()) { $('scoreNote').textContent = 'This browser has no Web Audio, so the score can’t play here.'; return; }
    if (playing) newBus();
  }
  function renderScores() {
    var row = $('scores'); row.innerHTML = '';
    SCORES.forEach(function (s) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = s[1]; b.setAttribute('aria-pressed', String(SND.kind === s[0])); b.addEventListener('click', function () { setScore(s[0]); }); row.appendChild(b); });
    var mx = $('mixer'); mx.hidden = ['ntina', 'folk', 'bomba', 'marea', 'rebung', 'ketupat', 'cengkeh', 'medallion'].indexOf(SND.kind) < 0; var ml = $('stems'); ml.innerHTML = '';
    (SND.kind === 'folk' ? STEMS_FOLK : SND.kind === 'bomba' ? STEMS_BOMBA : SND.kind === 'marea' ? STEMS_MAREA : SND.kind === 'rebung' ? STEMS_REBUNG : SND.kind === 'ketupat' ? STEMS_KETUPAT : SND.kind === 'cengkeh' ? STEMS_CENGKEH : SND.kind === 'medallion' ? STEMS_MEDALLION : STEMS).forEach(function (st) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = st[1]; b.setAttribute('aria-pressed', String(!SND.muted[st[0]]));
      b.addEventListener('click', function () { SND.muted[st[0]] = !SND.muted[st[0]]; if (SND.stemGain && SND.stemGain[st[0]] && SND.ctx) SND.stemGain[st[0]].gain.setTargetAtTime(SND.muted[st[0]] ? 0 : 1, SND.ctx.currentTime, .03); renderScores(); });
      ml.appendChild(b); });
  }
  function hearRings(rings, spin) { // each ring plays its petals as notes, outer to inner, on the Kaili set
    if (!ensureCtx()) return; var c = SND.ctx, bus = c.createGain(); bus.connect(SND.master); var send = c.createGain(); send.gain.value = .25; bus.connect(send); send.connect(SND.wet);
    var set = [440, 523.25, 587.33, 659.26, 783.99, 880, 987.77], when = c.currentTime + .05, idx = 0;
    rings.forEach(function (n, k) { for (var j = 0; j < n; j++) { var a = (k * GA * spin + j * Math.PI * 2 / n) % (Math.PI * 2); play({ k: 'kettle', n: 0, f: set[Math.floor((a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2) * 7) % 7], v: .38 - k * .04, soft: k >= 2 }, when, bus); when += .9 / Math.max(3, n) + .04; } when += .25; });
  }
  function hearSeeds(angleDeg, n) { // explore bench: the seed head played at any angle
    if (!ensureCtx()) return; var c = SND.ctx, bus = c.createGain(); bus.connect(SND.master);
    var send = c.createGain(); send.gain.value = .25; bus.connect(send); send.connect(SND.wet);
    for (var i = 0; i < n; i++) { var a = (i * angleDeg) % 360; play({ k: 'kettle', n: Math.floor(a / 360 * 7) % 7, v: .4 }, c.currentTime + .05 + i * .17, bus); }
  }

  // ---------- player ----------
  var t = 0, playing = false, last = 0, recording = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ICON = { play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>', pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>', again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>' };
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function setPlaying(on) {
    playing = on; if (on && t >= TOTAL - .01) t = 0;
    $('play').innerHTML = on ? ICON.pause : (t >= TOTAL - .01 ? ICON.again : ICON.play);
    $('play').setAttribute('aria-label', on ? 'Pause' : 'Play');
    if (on && EX) closeBench();
    if (on) startSound(); else stopSound();
  }
  function seek(nt) { t = clamp(nt, 0, TOTAL); if (EX && SCENES[sceneAt(t)].id !== EX.scene) closeBench(); if (playing && SND.kind !== 'off') newBus(); ui(); }
  var lastScene = -1, seen = {};
  function ui() {
    $('scrub').value = Math.round(t / TOTAL * 1000);
    $('time').textContent = fmt(t) + ' / ' + fmt(TOTAL);
    var i = sceneAt(t);
    for (var k = 0; k <= i; k++) seen[k] = 1;
    if (i !== lastScene) {
      lastScene = i; renderSteps();
      var sc = SCENES[i];
      $('explore').disabled = !sc.explore; $('explore').textContent = sc.explore ? 'Explore this step' : 'Nothing to explore here';
      cv.setAttribute('aria-label', CUR.name + ' reel, ' + (sc.step ? 'step: ' + sc.step + '. ' + sc.head + ' ' + (sc.body || '') : 'title'));
    }
  }
  function renderSteps() {
    var ol = $('steps'); ol.innerHTML = ''; var cur = sceneAt(t);
    SCENES.forEach(function (sc, i) {
      if (!sc.step) return;
      var li = document.createElement('li'); if (i === cur) li.className = 'now'; else if (seen[i] && i < cur) li.className = 'done';
      var b = document.createElement('button'); b.type = 'button';
      var n = document.createElement('span'); n.className = 'n'; n.textContent = String(SCENES.filter(function (s) { return s.step; }).indexOf(sc) + 1).padStart(2, '0');
      var mk = document.createElement('span'); mk.className = 'mk';
      var tx = document.createElement('span'); var ph = document.createElement('span'); ph.className = 'ph'; ph.textContent = sc.phase + (sc.explore ? ' · explorable' : '');
      tx.appendChild(ph); tx.appendChild(document.createTextNode(sc.step));
      b.appendChild(mk); b.appendChild(n); b.appendChild(tx);
      b.addEventListener('click', function () { seek(starts[i] + .01); setPlaying(true); });
      if (i === cur) b.setAttribute('aria-current', 'step');
      li.appendChild(b); ol.appendChild(li);
    });
  }
  function tick(now) {
    var dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
    if (playing) {
      if (audioLive()) { // the score's clock is the reel's clock, so picture and sound cannot drift apart
        if (holdT) { newBus(); resyncs++; holdT = 0; } // the audio is back: re-anchor the score at the picture's time
        else t = (SND.ctx.currentTime - SND.anchor) * SND.rate;
      } else if (SND.kind !== 'off' && SND.bus && SND.ctx && SND.ctx.state !== 'running') { // the score is on but the output has gone quiet (background, interruption): hold the picture and ask for it back
        if (!holdT) { holdT = now; try { var pr = SND.ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* fine */ } }
        if (now - holdT >= 1500) t += dt * SND.rate; // not coming back: carry on silently rather than freeze
      } else t += dt * SND.rate;
      if (t >= TOTAL) { t = TOTAL; if (!recording) setPlaying(false); } ui(); schedule();
    }
    if (clip && t >= clip.end) endClip(true);
    if ((isActive() && (!stageOpen || stageMirror)) || recording || (clip && !clip.noDraw)) frame(Math.min(t, TOTAL - .001)); // nothing to draw while the Pattern Studio is showing
    requestAnimationFrame(tick);
  }

  // ---------- explore bench ----------
  function closeBench() { EX = null; $('bench').hidden = true; }
  function openBench() {
    var i = sceneAt(t), sc = SCENES[i]; if (!sc.explore) return;
    setPlaying(false); seek(starts[i] + sc.dur * .7);
    $('bench').hidden = false; $('bench-h').textContent = sc.step; $('benchTeach').textContent = sc.teach;
    var box = $('benchCtl'); box.innerHTML = '';
    function chips(label, list, key, after) {
      var lab = document.createElement('div'); lab.className = 'label'; lab.textContent = label; box.appendChild(lab);
      var row = document.createElement('div'); row.className = 'reels'; box.appendChild(row);
      function draw() { row.innerHTML = ''; list.forEach(function (o) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = o[1]; b.setAttribute('aria-pressed', String(JSON.stringify(EX[key]) === JSON.stringify(o[0]))); b.addEventListener('click', function () { EX[key] = o[0]; draw(); (after || out)(); }); row.appendChild(b); }); }
      draw();
    }
    function out() {
      if (sc.explore === 'angle') { var spokes = Math.abs(EX.angle - 137.5) < .6 ? 'no spokes: seeds pack evenly' : (EX.angle % 30 === 0 || EX.angle % 45 === 0 || Math.abs(EX.angle - 120) < 1 || Math.abs(EX.angle - 90) < 1 ? 'clear spokes: seeds line up in rows' : 'spirals and gaps appear'); $('benchOut').textContent = EX.angle.toFixed(1) + '° · ' + EX.n + ' seeds · ' + spokes; }
      if (sc.explore === 'size') { var r = []; if (!EX.stem) r.push('Taurus and Venus sign readings return'); if (EX.seeds && EX.size <= 24) r.push('seeds blur into a face or noise'); $('benchOut').textContent = EX.size + ' px · ' + (r.length ? r.join('; ') : 'reads as Ntina: pure silhouette'); }
      if (sc.explore === 'rings') $('benchOut').textContent = EX.rings.join(' · ') + (EX.spin ? ' · golden turn: every petal shows between the petals outside it' : ' · no turn: petals stack behind each other in spokes');
      if (sc.explore === 'inks') $('benchOut').textContent = (EX.ink === 'buya' ? 'Buya Bomba ink' : 'Dua Pulau ink') + ' on ' + EX.gname + (EX.ink === 'dua' && EX.ground === '#0E0C09' ? ': navy outlines vanish on black, use Buya Bomba ink here' : EX.ink === 'buya' && EX.ground === '#FAF7F2' ? ': black lines read, but the cloth’s gold-on-black mood is lost' : ': reads well');
      if (sc.explore === 'roseSize') { var rs = []; if (!EX.gold && EX.px <= 24) rs.push('the dark heart reads as an eye'); if (!EX.curve) rs.push('round head on a straight stem nears a lollipop'); $('benchOut').textContent = EX.px + ' px head · ' + (rs.length ? rs.join('; ') : 'reads as a flower'); }
      if (sc.explore === 'rows') $('benchOut').textContent = EX.h + ' px band · ' + (EX.ink === 'buya-bomba' ? 'gold on black' : 'gold with navy lines') + ' · ' + (EX.path === 'straight' ? 'rows stay parallel, spacing 1.25 × the half-height' : EX.path === 'wave' ? 'shoots lean with the curve; the half-step offset holds' : 'on the inside of the arc the shoots close up; too tight and the band skips');
      if (sc.explore === 'lattice') $('benchOut').textContent = EX.P + ' px tile · ' + (EX.fill === 'rosette' ? 'Ketupat Field: a Bomba rosette blooms on every other diamond' : 'plain lattice: diamonds on a centred grid, crosses where four meet') + (EX.ink === 'dua-pulau' && EX.ground === '#0E0C09' ? ' · navy lines and the dark heart sink into black: use Buya Bomba ink here' : EX.ground === '#FAF7F2' ? ' · the pearl cecek go quiet on a pearl ground' + (EX.ink === 'buya-bomba' ? ', and the gold-on-black mood is lost' : '') : ' · reads well');
      if (sc.explore === 'fan') $('benchOut').textContent = EX.n + ' buds · ' + (EX.n === 3 ? 'sparse: a trident' : EX.n === 8 ? 'crowded: the heads touch and the fan reads as a ball' : 'five, a Fibonacci number: reads as a hand of buds') + (EX.spread < 50 ? ', narrow: a broom' : EX.spread > 60 ? ', wide: the outer buds droop' : '') + (EX.ground === '#0E0C09' ? (EX.ink === 'buya-bomba' ? ' · the black stem and dark leaf vanish on black: use the night ink' : EX.ink === 'dua-pulau' ? ' · the navy stem and leaf sink into black: use the night ink' : ' · the night ink reads on black') : (EX.ink === 'malam' ? ' · gold outlines go faint on pearl: use Dua Pulau or Buya Bomba ink' : ' · reads well on pearl'));
      if (sc.explore === 'counts') { var sp = []; [[EX.rays, EX.leaves, 'rays and leaves'], [EX.rays, EX.dots, 'rays and dots'], [EX.leaves, EX.dots, 'leaves and dots']].forEach(function (q) { var k = gcd(q[0], q[1]); if (k > 1) sp.push(q[2] + ' meet ' + k + ' times'); }); $('benchOut').textContent = EX.rays + ' rays · ' + EX.dots + ' dots · ' + EX.leaves + ' leaves · ' + (sp.length ? 'spokes: ' + sp.join(', ') : 'no spokes: only the top lines up, every count shares no factor with the others'); }
      if (sc.explore === 'cut') $('benchOut').textContent = EX.cm === 3 ? '3 cm: seeds narrower than 0.6 mm close up when cut. Use the dot-free small mark.' : '8 cm: one stencil. The seed head stays joined to the sheet through the open stem.';
    }
    if (sc.explore === 'angle') {
      EX = { scene: 'seeds', angle: 137.5, n: 21 };
      var lab = document.createElement('label'); lab.className = 'label'; lab.htmlFor = 'angIn'; lab.textContent = 'Turn between seeds'; box.appendChild(lab);
      var inp = document.createElement('input'); inp.type = 'range'; inp.id = 'angIn'; inp.min = 90; inp.max = 180; inp.step = .5; inp.value = 137.5; box.appendChild(inp);
      inp.addEventListener('input', function () { EX.angle = Number(inp.value); out(); });
      chips('Seeds', [[8, '8'], [13, '13'], [21, '21'], [34, '34'], [55, '55']], 'n');
      chips('Jump to', [[137.5, 'Golden 137.5°'], [120, '120°'], [90, '90°']], 'angle', function () { inp.value = EX.angle; out(); });
      var hb = document.createElement('button'); hb.type = 'button'; hb.className = 'btn'; hb.textContent = 'Hear the seed head'; hb.addEventListener('click', function () { unlockAudio(); hearSeeds(EX.angle, EX.n); }); box.appendChild(hb);
      var hn = document.createElement('p'); hn.className = 'note'; hn.textContent = 'Each seed’s angle picks one of the seven kettles. At 137.5° the melody never settles into a loop; at 90° you hear only a few notes repeating.'; box.appendChild(hn);
    } else if (sc.explore === 'size') {
      EX = { scene: 'misread', size: 16, seeds: true, stem: true };
      chips('Size', [[16, '16 px'], [24, '24 px'], [48, '48 px']], 'size');
      chips('Seeds', [[true, 'Seeds on'], [false, 'Empty opening']], 'seeds');
      chips('Stem', [[true, 'Open stem'], [false, 'Closed']], 'stem');
    } else if (sc.explore === 'cut') {
      EX = { scene: 'katagami', cm: 8 };
      chips('Motif width', [[8, '8 cm print'], [3, '3 cm stamp']], 'cm');
    } else if (sc.explore === 'rings') {
      EX = { scene: 'b-rings', rings: [13, 8, 5, 3], spin: 1 };
      chips('Petal counts', [[[13, 8, 5, 3], 'Fibonacci 13·8·5·3'], [[8, 8, 8, 8], 'Equal 8·8·8·8'], [[12, 9, 6, 3], 'Steps 12·9·6·3'], [[21, 13, 8, 5], 'Fuller 21·13·8·5']], 'rings');
      chips('Turn between rings', [[1, 'Golden angle'], [0, 'No turn']], 'spin');
      var hb2 = document.createElement('button'); hb2.type = 'button'; hb2.className = 'btn'; hb2.textContent = 'Hear the rings'; hb2.addEventListener('click', function () { unlockAudio(); hearRings(EX.rings, EX.spin); }); box.appendChild(hb2);
    } else if (sc.explore === 'inks') {
      EX = { scene: 'b-inks', ink: 'dua', ground: '#FAF7F2', gname: 'pearl' };
      chips('Ink', [['dua', 'Dua Pulau'], ['buya', 'Buya Bomba']], 'ink');
      chips('Ground', [['#FAF7F2', 'Pearl'], ['#2A6F74', 'Lagoon teal'], ['#0E0C09', 'Bomba black']], 'ground', function () { EX.gname = { '#FAF7F2': 'pearl', '#2A6F74': 'lagoon teal', '#0E0C09': 'Bomba black' }[EX.ground]; out(); });
    } else if (sc.explore === 'roseSize') {
      EX = { scene: 'b-misread', px: 18, gold: false, curve: false };
      chips('Head size', [[12, '12 px'], [18, '18 px'], [24, '24 px'], [40, '40 px']], 'px');
      chips('Heart', [[false, 'Dark spiral'], [true, 'Gold heart']], 'gold');
      chips('Stem', [[false, 'Straight'], [true, 'Curved']], 'curve');
    } else if (sc.explore === 'rows') {
      EX = { scene: 'r-rows', h: 34, ink: 'buya-bomba', path: 'straight' };
      chips('Band height', [[24, '24 px'], [34, '34 px'], [48, '48 px']], 'h');
      chips('Ink', [['buya-bomba', 'Buya Bomba'], ['dua-pulau', 'Dua Pulau']], 'ink');
      chips('Path', [['straight', 'Straight hem'], ['wave', 'Wave'], ['arc', 'Arc']], 'path');
    } else if (sc.explore === 'lattice') {
      EX = { scene: 'k-lattice', P: 200, ink: 'buya-bomba', fill: 'plain', ground: '#0E0C09' };
      chips('Tile size', [[120, '120 px'], [200, '200 px'], [300, '300 px']], 'P');
      chips('Ink', [['buya-bomba', 'Buya Bomba'], ['dua-pulau', 'Dua Pulau']], 'ink');
      chips('Ground', [['#0E0C09', 'Bomba black'], ['#FAF7F2', 'Pearl']], 'ground');
      chips('Fill', [['plain', 'Plain lattice'], ['rosette', 'Ketupat Field']], 'fill');
    } else if (sc.explore === 'fan') {
      EX = { scene: 'c-fan', n: 5, spread: 56, ink: 'malam', ground: '#0E0C09' };
      chips('Buds', [[3, '3'], [5, '5'], [8, '8']], 'n');
      chips('Spread', [[40, 'Narrow'], [56, 'As drawn'], [72, 'Wide']], 'spread');
      chips('Ink', [['malam', 'Night'], ['buya-bomba', 'Buya Bomba'], ['dua-pulau', 'Dua Pulau']], 'ink');
      chips('Ground', [['#0E0C09', 'Bomba black'], ['#FAF7F2', 'Pearl']], 'ground');
    } else if (sc.explore === 'counts') {
      EX = { scene: 'm-counts', rays: 13, dots: 55, leaves: 21 };
      chips('Rays', [[12, '12'], [13, '13'], [16, '16']], 'rays');
      chips('Dots', [[48, '48'], [55, '55'], [60, '60']], 'dots');
      chips('Leaves', [[20, '20'], [21, '21'], [24, '24']], 'leaves');
    }
    out();
    if (window.innerWidth <= 1020) $('bench').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }

  // ---------- recording ----------
  var downloads = null, recorder = null;
  function recType() { var ts = SND.kind !== 'off' ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'] : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']; for (var i = 0; i < ts.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(ts[i])) return ts[i]; return null; }
  $('record').addEventListener('click', function () {
    if (recording) { if (recorder && recorder.state !== 'inactive') { recording = false; recorder.stop(); } return; }
    var type = recType(); if (!type || !cv.captureStream) { $('status').textContent = 'This browser can’t record the canvas.'; return; }
    closeBench(); var chunks = [], stream = cv.captureStream(30);
    if (SND.kind !== 'off' && ensureCtx()) { if (!SND.rec) { SND.rec = SND.ctx.createMediaStreamDestination(); SND.out.connect(SND.rec); } SND.rec.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); }); }
    recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6000000 });
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = async function () {
      recording = false; $('recDot').hidden = true; $('record').textContent = 'Record video (WebM)'; setPlaying(false);
      stream.getVideoTracks().forEach(function (tr) { tr.stop(); });
      var blob = new Blob(chunks, { type: 'video/webm' });
      if (!blob.size) { $('status').textContent = 'Nothing was recorded. Try again.'; return; }
      $('status').textContent = 'Video ready (' + (blob.size / 1048576).toFixed(1) + ' MB). Confirm the save.';
      if (downloads) {
        try { var r = await downloads.save({ filename: CUR.file, data: blob }); $('status').textContent = r && r.status === 'saved' ? 'Video saved.' : 'Video handed off.'; }
        catch (e) { $('status').textContent = e && e.code === 'declined' ? 'Save cancelled.' : 'The video wasn’t saved.'; }
        return;
      }
      try {
        var file = window.File ? new File([blob], CUR.file, { type: 'video/webm' }) : null;
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(hover: none)').matches) { await navigator.share({ files: [file], title: CUR.name + ' reel' }); $('status').textContent = 'Video shared.'; return; }
      } catch (e) { if (e && e.name === 'AbortError') { $('status').textContent = 'Share cancelled.'; return; } }
      var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = CUR.file; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000); $('status').textContent = 'Video saved as ' + CUR.file + '.';
    };
    t = 0; recording = true; recorder.start(1000); setPlaying(true); if (SND.kind !== 'off') newBus();
    $('recDot').hidden = false; $('record').textContent = 'Stop recording'; $('status').textContent = 'Recording the full reel in real time (' + fmt(TOTAL) + ').';
    var stopper = setInterval(function () { if (!recording) { clearInterval(stopper); return; } if (t >= TOTAL) { clearInterval(stopper); setTimeout(function () { if (recorder.state !== 'inactive') recorder.stop(); }, 400); } }, 200);
  });

  // ---------- reels ----------
  var NTINA_NOTES = $('reelNotes').innerHTML, NTINA_CREDIT = $('reelCredit').textContent;
  var REEL_DEFS = {
    ntina: { name: 'Ntina', scenes: SCENES_NTINA, scores: SCORES_NTINA, bpm: function () { return LN.BPM; }, file: 'ntina-reel.webm', credit: NTINA_CREDIT, notes: NTINA_NOTES },
    bomba: { name: 'Bomba Rose', scenes: SCENES_BOMBA, scores: SCORES_BOMBA, bpm: function () { return LB.BPM; }, file: 'bomba-rose-reel.webm',
      credit: 'Bomba Rose: our own drawing, inspired by the mawar (rose) of the buya bomba ikat of Donggala, Central Sulawesi, with gratitude to the women of Donggala who weave it. Bomba means flower in Kaili.',
      notes: '<p class="note">Score: Bunga Kaili, an original song for a synthesized Kaili kakula ensemble (kakula, gamba-gamba, tawa-tawa gongs and gimba drums as in the kakula ensemble), with the sound of a loom. No traditional piece is quoted; lalove is left out because of its role in balia healing rituals. The ring section is generated from the rose’s own petal rings.</p><p class="note">The source’s rules (seen from above, one stem, three leaves; gold on black; love for family, kingdom and God) are from published studies; the misreading check and the bridged stencil are new proposals. Read more: <a href="https://ojs.unm.ac.id/societies/article/view/73950" target="_blank" rel="noopener">Inayah &amp; Fatimah 2025, buya bomba iconography</a> · <a href="https://www.detik.com/sulsel/budaya/d-6405331/mengenal-batik-bomba-dari-sulawesi-tengah-yang-dipakai-elon-musk-di-ktt-b20" target="_blank" rel="noopener">Batik Bomba (detik)</a> · <a href="https://lobo.apps01.yorku.ca/wp-content/uploads/2020/06/735-Document-with-author-details-1208-1-10-20190226.pdf" target="_blank" rel="noopener">Santaella on kakula</a></p>' }
  };
  REEL_DEFS.marea = { name: 'Marea Dvīpa', scenes: SCENES_LOGO, scores: SCORES_LOGO, bpm: function () { return LM.BPM; }, file: 'marea-dvipa-reel.webm',
    credit: 'Marea Dvīpa: our own mark, a bandstand pavilion between candi bentar gates, with palms, frangipani, the pier, the sea and the mountains, with gratitude to Bali and Central Sulawesi, whose forms it draws on.',
    notes: '<p class="note">Marea is the mark’s own piece, written for it in the manner of Balinese gong kebyar (pelog selisir, kotekan, ombak, the gong cycle): 40 bars at 112 bpm, one section per layer, so the music and the drawing arrive together. The mark is drawn by its music: the waves ride the kendang, the mountains lift with the gong ageng and the gates part on the kempur, the pavilion breathes with the ugal and the kotekan, the palms sway and the flowers pulse with the reyong, the birds bob on the highest kettles. The layers live in <code>public/logo</code>; <code>layout.json</code> places them.</p>' };
  REEL_DEFS.rebung = { name: 'Rebung border', scenes: SCENES_REBUNG, scores: SCORES_REBUNG, bpm: function () { return LR.BPM; }, file: 'rebung-border-reel.webm',
    credit: 'Rebung border: our own drawing, inspired by the inward-facing bamboo-shoot borders of the buya bomba of Donggala, Central Sulawesi, with gratitude to the women who weave it. In the cloth’s iconography the rebung stand for power, greatness and triumph.',
    notes: '<p class="note">Score: Pucuk Rebung, an original for the same synthesized Kaili kakula ensemble as Bunga Kaili. The shoot is a rising five-note run that grows a note per bar while it is drawn; the second row is a second kakula two beats on and a third above; the zigzag spine is the low gongs alternating root and fifth; the dots are the loom. 100 bpm, 52 bars, a section per scene. The drawing uses the studio’s own rebung ribbon engine, so the reel and the Pattern Studio draw from one master.</p>' };
  REEL_DEFS.ketupat = { name: 'Ketupat lattice', scenes: SCENES_KETUPAT, scores: SCORES_KETUPAT, bpm: function () { return LK.BPM; }, file: 'ketupat-lattice-reel.webm',
    credit: 'Ketupat lattice: our own drawing, inspired by the belah ketupat diamonds (the Bugis cobo’) of the buya bomba head panel of Donggala, Central Sulawesi, with gratitude to the women who weave it. In the cloth’s iconography the motif speaks of courage in proposing marriage and the wisdom of elders.',
    notes: '<p class="note">Score: Anyam Ketupat, an original for the same synthesized Kaili kakula ensemble as Bunga Kaili. Each bar is one diamond: two kakula open apart from one kettle in contrary motion and close again; the gamba-gamba plays the middle ring, the low gong the heart, a canon half a bar on is the centred grid, and the loom ticks round each bar line are the cecek crosses; the tatali flute draws one big diamond every four bars over an angklung ground, a plucked dio bass and a shaker. 96 bpm, 52 bars, a section per scene, ending on A. The drawing uses the studio’s own ketupat engine (<code>src/engine/ketupat.js</code>), proportioned from the master tile. Read more: <a href="https://ojs.unm.ac.id/societies/article/view/73950" target="_blank" rel="noopener">Inayah &amp; Fatimah 2025, buya bomba iconography</a></p>' };
  REEL_DEFS.cengkeh = { name: 'Cengkeh sprig', scenes: SCENES_CENGKEH, scores: SCORES_CENGKEH, bpm: function () { return LC.BPM; }, file: 'cengkeh-sprig-reel.webm',
    credit: 'Cengkeh sprig: our own drawing, inspired by the clove motif of Palu batik, which honours the clove harvest of Tolitoli, Central Sulawesi, with gratitude to the batik makers of Palu and the clove growers of Tolitoli. On the cloth the clove is read as a wish for the wearer’s health.',
    notes: '<p class="note">Score: Lima Kuntum, an original harvest dance in 3/4 for the same synthesized Kaili ensemble. Each bar the kakula fan out like the buds (centre, inner pair, outer pair) and the buds light up in that order; the second kakula turns four notes round one for the sepals; at the harvest the two kakula interlock in running eighths; dio and gamba-gamba make the waltz, with claps on 2 and 3, a tatali flute and a shaker like dried cloves. C major, 138 bpm, 80 bars, a section per scene, ending on C. The drawing uses the studio’s own cengkeh engine (<code>src/engine/cengkeh.js</code>), measured from the master drawing; the night ink is our proposal for black grounds, where the buya ink’s black stem and leaf vanish. Read more: <a href="https://www.detik.com/sulsel/budaya/d-6405331/mengenal-batik-bomba-dari-sulawesi-tengah-yang-dipakai-elon-musk-di-ktt-b20" target="_blank" rel="noopener">Batik Bomba (detik)</a> · <a href="https://www.antaranews.com/berita/277926/batik-bomba-tandamata-dari-palu" target="_blank" rel="noopener">Batik Bomba, a keepsake from Palu (ANTARA)</a></p>' };
  REEL_DEFS.medallion = { name: 'Dua Pulau medallion', scenes: SCENES_MEDALLION, scores: SCORES_MEDALLION, bpm: function () { return LD.BPM; }, file: 'dua-pulau-medallion-reel.webm',
    credit: 'Dua Pulau medallion: our own emblem, built from the Bomba rose and the rebung of the buya bomba of Donggala and the batik of Palu, Central Sulawesi, inside a ring of leaves from Balinese ornament, with gratitude to the weavers, batik makers and carvers of both islands.',
    notes: '<p class="note">Score: Dua Pulau, a song made the way Bunga Kaili is made and built progressively, the way the medallion is drawn: the kakula alone (the heart), then the gongs and gamba-gamba (the disc), the flute (Bali), the rays’ loop with the loom and gimba, the shaker and held chords (the dots) under the rose song, the reyong shimmer and dio (the leaves) under a C-major chorus, everyone in the last chorus, and home to A major. Nothing leaves once it has come in, and a slow swell runs under the whole piece. 110 bpm, 52 bars, a section per scene. On screen the tune draws a gold star across the mark, gongs ripple through the rings, and the light cools in the minor verses. The drawing uses the studio’s own medallion engine (<code>src/engine/medallion.js</code>) with its heart cut from the master drawing, so it matches the front panel exactly.</p>' };
  var CUR = REEL_DEFS.ntina;
  var REELS = [['ntina', 'Ntina', true], ['bomba', 'Bomba Rose', true], ['marea', 'Marea Dvīpa', true], ['rebung', 'Rebung border', true], ['ketupat', 'Ketupat lattice', true], ['cengkeh', 'Cengkeh sprig', true], ['medallion', 'Dua Pulau medallion', true]];
  function renderReels() {
    $('reels').innerHTML = '';
    REELS.forEach(function (r) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', String(REEL_DEFS[r[0]] === CUR));
      b.appendChild(document.createTextNode(r[1]));
      if (!r[2]) { b.disabled = true; var sm = document.createElement('small'); sm.textContent = 'next'; b.appendChild(sm); }
      else b.addEventListener('click', function () { switchReel(r[0]); });
      $('reels').appendChild(b);
    });
  }
  function renderTicks() { $('ticks').innerHTML = ''; starts.forEach(function (s0, i) { if (!i) return; var tk = document.createElement('i'); tk.style.left = (s0 / TOTAL * 100) + '%'; $('ticks').appendChild(tk); }); }
  function switchReel(id, quiet) { // quiet: the welcome film borrows a reel without moving your saved reel or the link
    if (REEL_DEFS[id] === CUR) return;
    if (recording) return;
    setPlaying(false); stopSound(); closeBench();
    CUR = REEL_DEFS[id]; SCENES = CUR.scenes; layoutScenes(); SCORES = CUR.scores;
    SND.kind = 'off'; SND.rate = 1; indexScore(); renderScores(); $('scoreNote').textContent = SCORE_NOTE.off; $('bpmOut').textContent = CUR.bpm().toFixed(1) + ' bpm · film ' + fmt(TOTAL);
    $('reelCredit').textContent = CUR.credit; $('reelNotes').innerHTML = CUR.notes;
    seen = {}; lastScene = -1; t = 0; renderReels(); renderTicks(); ui(); setPlaying(false);
    if (quiet) return;
    if (id === 'image') return; // your picture lives only in this session
    try { localStorage.setItem('media-lab-reel', id); } catch (e) {}
    try { if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id); } catch (e) {}
  }
  renderReels();

  // ---------- your picture: a PNG or JPG becomes a reel with its own score ----------
  function loadImageFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) { $('status').textContent = 'PNG or JPG only.'; return; }
    if (recording) { $('status').textContent = 'Finish the recording first.'; return; }
    var url = URL.createObjectURL(file), el = new Image();
    el.onload = function () {
      if (IMG && IMG.url) { try { URL.revokeObjectURL(IMG.url); } catch (e) { /* fine */ } }
      IMG = { el: el, name: file.name.replace(/\.(png|jpe?g)$/i, ''), url: url, score: composeImage(readImage(el)) };
      if (!REEL_DEFS.image) {
        REEL_DEFS.image = { name: 'Your picture', scenes: SCENES_IMAGE, scores: SCORES_IMAGE, bpm: function () { return IMG_BPM; }, file: 'your-picture.webm',
          credit: 'Your own picture, read by the lab’s synthesized ensemble. It stays in this browser; nothing is uploaded.',
          notes: '<p class="note">The lab scans the picture in 128 columns over 16 bars. In each column the brightest row picks one of the seven kettles (high in the picture, high in pitch) and its brightness sets the strike; dark columns ring the low gong on the bar line, the light ones the high gong; edges drive the gimba drum; a change of colour scrapes. Load another picture and the score is composed again. Record video keeps the picture and its score together.</p>' };
        REELS.splice(3, 0, ['image', 'Your picture', true]);
      }
      if (CUR === REEL_DEFS.image) { setPlaying(false); stopSound(); } else switchReel('image');
      renderReels(); setScore('image'); seek(0); setPlaying(true);
      $('status').textContent = 'Playing ' + file.name + ' as a score: ' + IMG.score.length + ' notes over 16 bars.';
      if (stage && stage.imageReady) stage.imageReady({ name: IMG.name, url: url });
      try { cv.parentNode.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { /* fine */ }
    };
    el.onerror = function () { $('status').textContent = 'That image could not be read.'; };
    el.src = url;
  }
  var fileIn = $('imgFile');
  if (fileIn) fileIn.addEventListener('change', function () { if (fileIn.files && fileIn.files[0]) loadImageFile(fileIn.files[0]); fileIn.value = ''; });
  (function () { // drop a picture on the screen
    var dropEl = cv.parentNode;
    ['dragenter', 'dragover'].forEach(function (ev) { dropEl.addEventListener(ev, function (e) { e.preventDefault(); dropEl.classList.add('drop'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dropEl.addEventListener(ev, function (e) { e.preventDefault(); dropEl.classList.remove('drop'); }); });
    dropEl.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadImageFile(f); });
  })();

  // ---------- wiring ----------
  $('play').addEventListener('click', function () { if (SND.kind !== 'off') unlockAudio(); setPlaying(!playing); });
  $('testSound').addEventListener('click', testSound);
  function setMutes(fn) { STEMS.concat(STEMS_FOLK, STEMS_BOMBA, STEMS_MAREA, STEMS_REBUNG, STEMS_KETUPAT, STEMS_CENGKEH, STEMS_MEDALLION).forEach(function (st) { SND.muted[st[0]] = fn(st[0]); if (SND.stemGain && SND.stemGain[st[0]] && SND.ctx) SND.stemGain[st[0]].gain.setTargetAtTime(SND.muted[st[0]] ? 0 : 1, SND.ctx.currentTime, .03); }); renderScores(); }
  var taps = [];
  function setRate(bpm) { bpm = clamp(bpm, 80, 132); var was = playing; SND.rate = bpm / CUR.bpm(); $('bpmOut').textContent = 'Tempo set to ' + bpm.toFixed(1) + ' bpm (the song’s own is ' + CUR.bpm().toFixed(0) + ') · film ' + fmt(TOTAL / SND.rate); if (was && SND.kind !== 'off') newBus(); }
  $('tapTempo').addEventListener('click', function () { var now = performance.now(); taps = taps.filter(function (x) { return now - x < 3000; }); taps.push(now); if (taps.length >= 4) { var iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); setRate(60000 / iv); } else $('bpmOut').textContent = 'Tap ' + (4 - taps.length) + ' more time' + (4 - taps.length > 1 ? 's' : '') + ' to set the tempo (' + taps.length + ' of 4 taps)'; });
  $('resetTempo').addEventListener('click', function () { taps = []; setRate(CUR.bpm()); });
  function renderFeels() { var row = $('feels'); row.innerHTML = ''; [['straight', 'Straight'], ['lilt', 'Lilt (swaying)']].forEach(function (f) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = f[1]; b.setAttribute('aria-pressed', String(SND.feel === f[0])); b.addEventListener('click', function () { SND.feel = f[0]; indexScore(); renderFeels(); if (playing && SND.kind !== 'off') newBus(); }); row.appendChild(b); }); }
  renderFeels();
  $('soloMelody').addEventListener('click', function () { setMutes(function (k) { return SND.kind === 'folk' || SND.kind === 'bomba' || SND.kind === 'marea' ? k !== 'kakula' : k !== 'melody'; }); });
  $('allLayers').addEventListener('click', function () { setMutes(function () { return false; }); });
  $('scrub').addEventListener('input', function (e) { seek(Number(e.target.value) / 1000 * TOTAL); });
  $('prev').addEventListener('click', function () { var i = sceneAt(t); seek(starts[Math.max(0, (t - starts[i] < 1 ? i - 1 : i))] + .01); });
  $('next').addEventListener('click', function () { var i = sceneAt(t); if (i < SCENES.length - 1) seek(starts[i + 1] + .01); });
  $('explore').addEventListener('click', openBench);
  $('benchClose').addEventListener('click', function () { closeBench(); setPlaying(true); });
  document.addEventListener('keydown', function (e) { if (!isActive() || stageOpen) return; if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; if (e.key === ' ' && e.target === document.body) { e.preventDefault(); setPlaying(!playing); } });
  renderTicks();

  indexScore(); renderScores(); $('scoreNote').textContent = SCORE_NOTE.off;
  (function () { var want = location.hash.slice(1), saved = null; try { saved = localStorage.getItem('media-lab-reel'); } catch (e) {} want = REEL_DEFS[want] ? want : saved; if (want && REEL_DEFS[want] && REEL_DEFS[want] !== CUR) switchReel(want); })();
  // first still frame: the title, fully drawn
  t = reduce ? 3.4 : 0; ui(); setPlaying(false); frame(3.4);
  var fontsLoaded = false, autoplayed = false;
  var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 44px "Cormorant Garamond"'), document.fonts.load('italic 500 24px "Cormorant Garamond"'), document.fonts.load('400 18px Karla'), document.fonts.load('500 13px "IBM Plex Mono"')]) : Promise.resolve();
  fontsReady.catch(function () {}).then(function () { cache = {}; requestAnimationFrame(tick); fontsLoaded = true; if (!reduce && isActive()) { autoplayed = true; setPlaying(true); } });
  $('record').hidden = !(recType() && cv.captureStream);
  (async function () {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    try { downloads = await window.claude.use('downloads'); } catch (e) { downloads = null; }
  })();

  // ---------- web app: full screen, keys, deep links, install, offline ----------
  var screenEl = cv.parentNode;
  function isFs() { return document.fullscreenElement === screenEl || document.webkitFullscreenElement === screenEl || screenEl.classList.contains('pseudo-fs'); }
  function toggleFs() {
    if (isFs()) {
      if (screenEl.classList.contains('pseudo-fs')) { screenEl.classList.remove('pseudo-fs'); return; }
      (document.exitFullscreen || document.webkitExitFullscreen).call(document); return;
    }
    var req = screenEl.requestFullscreen || screenEl.webkitRequestFullscreen;
    if (req) { var p = req.call(screenEl); if (p && p.catch) p.catch(function () { screenEl.classList.add('pseudo-fs'); }); try { screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} }
    else screenEl.classList.add('pseudo-fs'); // iPhone Safari: no element full screen
  }
  $('fullscreen').addEventListener('click', toggleFs);
  cv.addEventListener('dblclick', toggleFs);
  document.addEventListener('keydown', function (e) {
    if (!isActive() || stageOpen) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight') { e.preventDefault(); $('next').click(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); $('prev').click(); }
    else if (k === 'f' || k === 'F') toggleFs();
    else if ((k === 'e' || k === 'E') && !$('explore').disabled) openBench();
    else if (k === 'Escape' && screenEl.classList.contains('pseudo-fs')) screenEl.classList.remove('pseudo-fs');
  });
  // deep links: #ntina or #bomba opens that reel; the hash follows the reel you pick
  window.addEventListener('hashchange', function () { var h = location.hash.slice(1); if (REEL_DEFS[h]) switchReel(h); });
  // a home-screen app pauses when it goes to the background
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing && !recording) setPlaying(false); });

  // ---------- the welcome film: the lab's own instruments, and a clip of a reel with its score ----------
  var clip = null, wBus = null, stage = null, stageOpen = false, stageMirror = false, stageDraw = false, holdT = 0, resyncs = 0;
  function welcomeBus() {
    var c = SND.ctx; if (!c) return null;
    if (!wBus) { wBus = c.createGain(); wBus.gain.value = .62; wBus.connect(SND.master); var send = c.createGain(); send.gain.value = .3; wBus.connect(send); send.connect(SND.wet); }
    return wBus;
  }
  function reelId() { return CUR === REEL_DEFS.bomba ? 'bomba' : 'ntina'; }
  function endClip(finished) {
    if (!clip) return; var c = clip; clip = null;
    setPlaying(false);
    if (c.prevReel !== reelId()) switchReel(c.prevReel, true); else seek(c.prevT);
    setScore(c.prevKind);
    if (c.onEnd) c.onEnd(finished);
  }
  function startClip(o) {
    if (recording) return null;
    if (clip) endClip(false);
    var prev = { prevReel: reelId(), prevKind: SND.kind, prevT: t };
    setPlaying(false);
    if (REEL_DEFS[o.reel] !== CUR) switchReel(o.reel, true);
    var i = Math.max(0, SCENES.findIndex(function (s) { return s.id === o.scene; })), s0 = starts[i];
    var j = o.through ? SCENES.findIndex(function (s) { return s.id === o.through; }) : -1;
    var dur = o.dur || (j >= i ? starts[j] + SCENES[j].dur - s0 : SCENES[i].dur);
    setScore(o.sound ? o.score : 'off');
    clip = Object.assign(prev, { start: s0, end: s0 + dur, dur: dur, onEnd: o.onEnd, score: o.score, scene: SCENES[Math.max(0, i)], noDraw: !!o.noDraw });
    seek(s0 + .01 + (o.offset || 0)); setPlaying(true);
    return { dur: dur };
  }

  // ---------- the shell switches views: pause when you leave, play once on the first visit ----------
  var api = {
    canvas: cv,
    unlock: function () { return !!unlockAudio(); },
    audioRunning: function () { return !!(SND.ctx && SND.ctx.state === 'running'); },
    strike: function (evs) { // [{k, n, v, at, ...}] played now + at seconds, on the lab's kakula, gongs and drums
      var c = SND.ctx; if (!c || c.state !== 'running') return; var bus = welcomeBus(), now = c.currentTime + .03;
      evs.forEach(function (e) { play(SND.kind === 'marea' ? LM.tune(e) : e, now + (e.at || 0), bus); }); // while Marea plays, every strike is in its scale
    },
    startClip: startClip,
    stopClip: function () { endClip(false); },
    pauseClip: function () { if (clip && playing) setPlaying(false); },
    resumeClip: function () { if (clip && !playing) setPlaying(true); },
    clipSound: function (on) { if (clip) setScore(on ? clip.score : 'off'); },
    clipElapsed: function () { return clip ? t - clip.start : null; },
    // the motif being made in the clip, as the reel's own scene builds it (petal rings: ring by ring, then the heart)
    clipMotif: function () {
      if (!clip) return null; var lt = clamp(t - clip.start, 0, clip.dur), d = clip.dur, sc = SCENES[sceneAt(t)];
      if (clip.scene.id.indexOf('m-') === 0) { var lo = logoReveal(t); return { kind: 'logo', R: lo.R, ghost: lo.ghost, breath: lo.breath, scene: lo.scene, lt: lt, dur: d }; } // the mark's reel: what the welcome's living mark builds from
      if (clip.scene.id === 'seeds') { // the Ntina mark across the seeds and horns scenes, on the score's own grid: the body first, a seed on every eighth, the U over a bar, the stem over two beats
        var BT = 60 / CUR.bpm(), E8 = BT / 2, BR = BT * 4, s0 = clip.start;
        var grid = function (abs, unit) { return Math.ceil((abs - 1e-6) / unit) * unit - s0; }; // the first grid line at or after a reel time, in clip seconds
        var T0 = grid(s0 + .8, E8), TH = grid(s0 + 12.5, BR), TS = grid(s0 + 16, BR);
        var body = eo(ramp(lt, 0, Math.max(.5, T0 - .1))), seeds = clamp((lt - T0) / E8, 0, 21), horn = ease(ramp(lt, TH, TH + BR)), stem = ease(ramp(lt, TS, TS + BT * 2));
        var phase = lt < T0 + 21 * E8 ? 'seeds' : lt < TH ? 'hold' : lt < TH + BR ? 'horn' : lt < TS + BT * 2 ? 'stem' : 'done';
        return { kind: 'mark', body: body, seeds: seeds, horn: horn, stem: stem, phase: phase, lt: lt, dur: d, scene: sc.step || '' };
      }
      var prog = [0, 1, 2, 3].map(function (k) { return ramp(lt, k * bars(4) + .05, (k + 1) * bars(4) - .3); });
      return { kind: 'rose', rings: [13, 8, 5, 3], prog: prog, heart: ramp(lt, d - 2.5, d - 1), ring: Math.min(3, Math.floor(lt / bars(4))), lt: lt, dur: d, bar: lt / BAR_B };
    },
    clipScene: function () { if (!clip) return null; var sc = SCENES[sceneAt(t)]; return { id: sc.id, eyebrow: sc.eyebrow || '', head: sc.head || '', body: sc.body || '', step: sc.step || '', phase: sc.phase || '' }; },
    clipPlaying: function () { return !!(clip && playing); },
    drawMark: function (c, cx, cy, s, o) { drawMark(c, cx, cy, s, o); },
    // the stage: a pattern made in the centre of the screen (stage.js); it borrows the reel and its score
    openStage: function (id) { if (stage) stage.open(id); },
    setStageOpen: function (on, mirror) { stageOpen = !!on; stageMirror = !!(on && mirror); }, // mirror: the stage shows this canvas, so keep drawing it
    // the stage plays the whole reel with its score; the stage mirrors the lab's canvas, so picture, score and the lab's own player are one clock
    playReel: function (reel, score) {
      if (clip) endClip(false);
      if (REEL_DEFS[reel]) switchReel(reel);
      setScore(score && SCORES.some(function (s) { return s[0] === score; }) ? score : 'off');
      if (SND.kind !== 'off') unlockAudio();
      setPlaying(true);
    },
    reelState: function () { var i = sceneAt(t), sc = SCENES[i]; return { t: t, total: TOTAL, playing: playing, ended: t >= TOTAL - .01, id: sc.id, step: sc.step || '', phase: sc.phase || '', eyebrow: sc.eyebrow || '', head: sc.head || '', body: sc.body || '', number: sc.step ? SCENES.filter(function (s) { return s.step; }).indexOf(sc) + 1 : 0, steps: SCENES.filter(function (s) { return s.step; }).length }; },
    seekReel: function (nt) { seek(nt); },
    loadImage: loadImageFile,
    imageInfo: function () { return IMG ? { name: IMG.name, url: IMG.url, notes: IMG.score.length } : null; },
    // the current scene's picture drawn on the stage's canvas in a w × h box (the reel's 1280 × 720 stage, scaled), without the frame's
    // chrome or caption column: the lab's drawing helpers all draw into g, so g is pointed at the stage for the length of one scene draw
    drawReelScene: function (c, x, y, w, h) {
      var old = g, i = sceneAt(Math.min(t, TOTAL - .001)), sc = SCENES[i], s = w / W;
      g = c; stageDraw = true;
      try {
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.setTransform(s, 0, 0, s, x, y); c.globalAlpha = 1;
        sc.draw(Math.min(t, TOTAL - .001) - starts[i], sc.dur);
      } catch (e) { /* a scene that cannot draw here leaves the stage empty rather than breaking it */ }
      c.restore(); g = old; stageDraw = false;
    },
    stepReel: function (d) { $(d > 0 ? 'next' : 'prev').click(); },
    setReelPlaying: function (on) { if (on && SND.kind !== 'off') unlockAudio(); setPlaying(on); },
    setReelSound: function (on, score) { if (on) unlockAudio(); setScore(on && score && SCORES.some(function (s) { return s[0] === score; }) ? score : 'off'); },
    // are picture and sound on one clock right now? live: the score's clock drives the picture; held: waiting for the audio to come back
    sync: function () { var live = !!audioLive(); return { live: live, held: !!holdT, sound: SND.kind !== 'off', drift: live ? Math.abs(t - (SND.ctx.currentTime - SND.anchor) * SND.rate) : 0, fixes: resyncs }; },
    selectReel: function (id) { if (REEL_DEFS[id]) switchReel(id); },
    watchReel: function (reel, sceneId, score) { // leave the stage for the reel itself, from the scene that made the pattern
      if (clip) endClip(false);
      if (REEL_DEFS[reel]) switchReel(reel);
      if (score && SCORES.some(function (s) { return s[0] === score; })) setScore(score);
      seek(sceneStart(sceneId) + .01); setPlaying(true);
      try { screenEl.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) {}
    },
    drawRose: function (c, cx, cy, s, o) { drawRose(c, cx, cy, s, o); },
    // how brightly each instrument is sounding right now, for drawing the ensemble
    levels: function () {
      if (SND.kind === 'off' || !SND.byK.kettle) return null;
      var k = []; for (var i = 0; i < 7; i++) k.push(glow(SND.byK.kettle[i], t, .35));
      return { kettle: k, gong: [glow(SND.byK.gong[0], t, 1.4), glow(SND.byK.gong[1], t, 1.4)], drum: glow(SND.byK.drum, t, .12) };
    },
    activate: function () {
      frame(Math.min(t, TOTAL - .001));
      if (fontsLoaded && !autoplayed && !reduce) { autoplayed = true; setPlaying(true); }
    },
    deactivate: function () {
      if (stage) stage.close();
      if (isFs()) toggleFs();
      if (playing && !recording) setPlaying(false);
    },
    isRecording: function () { return recording; }
  };
  stage = createStage(api, cv.closest('.lab-view'));
  return api;
}
