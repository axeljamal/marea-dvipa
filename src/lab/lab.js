// Batik Media Lab, carried over from the standalone web app. It now runs inside the combined Marea Dvīpa shell:
// startLab() is called once the lab markup is in the page; hooks.isActive() tells it whether the Media Lab view is showing,
// so its keys, drawing loop and autoplay stay quiet while you are in the Pattern Studio.
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
  var SCORES = SCORES_NTINA, SCORES_BOMBA = [['off', 'Sound off'], ['bomba', 'Bunga Kaili · 138 bpm']];
  var SCORE_NOTE = {
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
    SND.bus = c.createGain(); SND.bus.gain.value = ['ntina', 'folk', 'bomba'].indexOf(SND.kind) >= 0 ? .55 : 1; SND.bus.connect(SND.master);
    SND.stemGain = {}; STEMS.concat(STEMS_FOLK, STEMS_BOMBA).forEach(function (st) { if (SND.stemGain[st[0]]) return; var sg = c.createGain(); sg.gain.value = SND.muted[st[0]] ? 0 : 1; sg.connect(SND.bus); SND.stemGain[st[0]] = sg; });
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
      var sa = e.soft ? .012 : .004; tone(bus, when, f, v * .5, sa, d, 'sine', f * 1.004); tone(bus, when, f * 1.0035, v * .22, sa, d * .9);
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
    SND.kind = kind; if (['ntina', 'folk', 'bomba'].indexOf(kind) < 0) { SND.rate = 1; } indexScore(); renderScores();
    $('scoreNote').textContent = SCORE_NOTE[kind];
    if (kind === 'off') { stopSound(); return; }
    if (!unlockAudio()) { $('scoreNote').textContent = 'This browser has no Web Audio, so the score can’t play here.'; return; }
    if (playing) newBus();
  }
  function renderScores() {
    var row = $('scores'); row.innerHTML = '';
    SCORES.forEach(function (s) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = s[1]; b.setAttribute('aria-pressed', String(SND.kind === s[0])); b.addEventListener('click', function () { setScore(s[0]); }); row.appendChild(b); });
    var mx = $('mixer'); mx.hidden = ['ntina', 'folk', 'bomba'].indexOf(SND.kind) < 0; var ml = $('stems'); ml.innerHTML = '';
    (SND.kind === 'folk' ? STEMS_FOLK : SND.kind === 'bomba' ? STEMS_BOMBA : STEMS).forEach(function (st) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = st[1]; b.setAttribute('aria-pressed', String(!SND.muted[st[0]]));
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
    if (playing) { if (audioLive()) t = (SND.ctx.currentTime - SND.anchor) * SND.rate; else t += dt * SND.rate; if (t >= TOTAL) { t = TOTAL; if (!recording) setPlaying(false); } ui(); schedule(); }
    if (clip && t >= clip.end) endClip(true);
    if (isActive() || recording || (clip && !clip.noDraw)) frame(Math.min(t, TOTAL - .001)); // nothing to draw while the Pattern Studio is showing
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
  var CUR = REEL_DEFS.ntina;
  var REELS = [['ntina', 'Ntina', true], ['bomba', 'Bomba Rose', true], ['rebung', 'Rebung border', false], ['ketupat', 'Ketupat lattice', false]];
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
    try { localStorage.setItem('media-lab-reel', id); } catch (e) {}
    try { if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id); } catch (e) {}
  }
  renderReels();

  // ---------- wiring ----------
  $('play').addEventListener('click', function () { if (SND.kind !== 'off') unlockAudio(); setPlaying(!playing); });
  $('testSound').addEventListener('click', testSound);
  function setMutes(fn) { STEMS.concat(STEMS_FOLK, STEMS_BOMBA).forEach(function (st) { SND.muted[st[0]] = fn(st[0]); if (SND.stemGain && SND.stemGain[st[0]] && SND.ctx) SND.stemGain[st[0]].gain.setTargetAtTime(SND.muted[st[0]] ? 0 : 1, SND.ctx.currentTime, .03); }); renderScores(); }
  var taps = [];
  function setRate(bpm) { bpm = clamp(bpm, 80, 132); var was = playing; SND.rate = bpm / CUR.bpm(); $('bpmOut').textContent = 'Tempo set to ' + bpm.toFixed(1) + ' bpm (the song’s own is ' + CUR.bpm().toFixed(0) + ') · film ' + fmt(TOTAL / SND.rate); if (was && SND.kind !== 'off') newBus(); }
  $('tapTempo').addEventListener('click', function () { var now = performance.now(); taps = taps.filter(function (x) { return now - x < 3000; }); taps.push(now); if (taps.length >= 4) { var iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); setRate(60000 / iv); } else $('bpmOut').textContent = 'Tap ' + (4 - taps.length) + ' more time' + (4 - taps.length > 1 ? 's' : '') + ' to set the tempo (' + taps.length + ' of 4 taps)'; });
  $('resetTempo').addEventListener('click', function () { taps = []; setRate(CUR.bpm()); });
  function renderFeels() { var row = $('feels'); row.innerHTML = ''; [['straight', 'Straight'], ['lilt', 'Lilt (swaying)']].forEach(function (f) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = f[1]; b.setAttribute('aria-pressed', String(SND.feel === f[0])); b.addEventListener('click', function () { SND.feel = f[0]; indexScore(); renderFeels(); if (playing && SND.kind !== 'off') newBus(); }); row.appendChild(b); }); }
  renderFeels();
  $('soloMelody').addEventListener('click', function () { setMutes(function (k) { return SND.kind === 'folk' || SND.kind === 'bomba' ? k !== 'kakula' : k !== 'melody'; }); });
  $('allLayers').addEventListener('click', function () { setMutes(function () { return false; }); });
  $('scrub').addEventListener('input', function (e) { seek(Number(e.target.value) / 1000 * TOTAL); });
  $('prev').addEventListener('click', function () { var i = sceneAt(t); seek(starts[Math.max(0, (t - starts[i] < 1 ? i - 1 : i))] + .01); });
  $('next').addEventListener('click', function () { var i = sceneAt(t); if (i < SCENES.length - 1) seek(starts[i + 1] + .01); });
  $('explore').addEventListener('click', openBench);
  $('benchClose').addEventListener('click', function () { closeBench(); setPlaying(true); });
  document.addEventListener('keydown', function (e) { if (!isActive()) return; if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; if (e.key === ' ' && e.target === document.body) { e.preventDefault(); setPlaying(!playing); } });
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
    if (!isActive()) return;
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
  var clip = null, wBus = null;
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
    var i = SCENES.findIndex(function (s) { return s.id === o.scene; }), s0 = starts[Math.max(0, i)], dur = o.dur || SCENES[Math.max(0, i)].dur;
    setScore(o.sound ? o.score : 'off');
    clip = Object.assign(prev, { start: s0, end: s0 + dur, dur: dur, onEnd: o.onEnd, score: o.score, scene: SCENES[Math.max(0, i)], noDraw: !!o.noDraw });
    seek(s0 + .01 + (o.offset || 0)); setPlaying(true);
    return { dur: dur };
  }

  // ---------- the shell switches views: pause when you leave, play once on the first visit ----------
  return {
    canvas: cv,
    unlock: function () { return !!unlockAudio(); },
    audioRunning: function () { return !!(SND.ctx && SND.ctx.state === 'running'); },
    strike: function (evs) { // [{k, n, v, at, ...}] played now + at seconds, on the lab's kakula, gongs and drums
      var c = SND.ctx; if (!c || c.state !== 'running') return; var bus = welcomeBus(), now = c.currentTime + .03;
      evs.forEach(function (e) { play(e, now + (e.at || 0), bus); });
    },
    startClip: startClip,
    stopClip: function () { endClip(false); },
    pauseClip: function () { if (clip && playing) setPlaying(false); },
    resumeClip: function () { if (clip && !playing) setPlaying(true); },
    clipSound: function (on) { if (clip) setScore(on ? clip.score : 'off'); },
    clipElapsed: function () { return clip ? t - clip.start : null; },
    // the motif being made in the clip, as the reel's own scene builds it (petal rings: ring by ring, then the heart)
    clipMotif: function () {
      if (!clip) return null; var lt = clamp(t - clip.start, 0, clip.dur), d = clip.dur;
      var prog = [0, 1, 2, 3].map(function (k) { return ramp(lt, k * bars(4) + .05, (k + 1) * bars(4) - .3); });
      return { rings: [13, 8, 5, 3], prog: prog, heart: ramp(lt, d - 2.5, d - 1), ring: Math.min(3, Math.floor(lt / bars(4))), lt: lt, dur: d, bar: lt / BAR_B };
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
      if (isFs()) toggleFs();
      if (playing && !recording) setPlaying(false);
    },
    isRecording: function () { return recording; }
  };
}
