// Ported to an ES module from the published Batik Pattern Studio (contract 0.2.91). Logic unchanged.

// Bali Batik Motifs — pattern layout recipes (shared by the exporter and the canvas builder).
// Units: layout units at scale 1. Each item: motif id, centre x/y, width, flip.
var AR = { // height / width of each master SVG
  'barong-mask': 1.272, 'traditional-boat': 1.102, 'split-gate-candi-bentar': 0.99,
  'large-floral-ornament': 1.069, 'wave-cloud-ornament': 0.835, 'lotus-floral-motif': 0.96,
  'scroll-ornament': 1.031, 'lotus-flower': 1.065, 'lotus-bud': 1.298, 'border-filler-ornament': 0.132
};
var LAYOUTS = {
  'temple-column': {
    title: 'Temple Column', note: 'The reference panel: floral crown over barong, flanked by temple gates sailing on waves.',
    tw: 450, th: 390,
    items: function (o) {
      var H = o.hero, S = 225, it = [];
      // centre column
      it.push(['wave-cloud-ornament', -112, 62, 96, true], ['wave-cloud-ornament', 112, 62, 96, false]);
      it.push([o.crown, 0, 72, 168, false]);
      it.push([H, 0, 268, 148, false]);
      it.push(['scroll-ornament', -92, 350, 58, true], ['scroll-ornament', 92, 350, 58, false]);
      // gate column
      it.push(['wave-cloud-ornament', S - 92, 182, 92, true], ['wave-cloud-ornament', S + 92, 182, 92, false]);
      it.push(['split-gate-candi-bentar', S, 128, 176, false]);
      it.push(['lotus-floral-motif', S, 70, 30, false]);
      it.push(['lotus-bud', S, 4, 34, false]);
      it.push(['traditional-boat', S, 292, 150, o.mirror]);
      return it;
    }
  },
  'royal-damask': {
    title: 'Royal Damask', note: 'Half-drop damask: barong and floral crown alternate, lotus fillers on the diagonals.',
    tw: 380, th: 460,
    items: function (o) {
      return [[o.hero, 0, 0, 150, false], [o.crown, 190, 230, 176, false],
        ['lotus-bud', 190, 10, 38, false], ['lotus-bud', 0, 240, 38, false],
        ['lotus-flower', 95, 118, 54, false], ['lotus-flower', 285, 348, 54, false],
        ['scroll-ornament', 285, 112, 56, false], ['scroll-ornament', 95, 342, 56, true]];
    }
  },
  'ocean-voyage': {
    title: 'Ocean Voyage', note: 'Directional rows of perahu and cloud-waves, lotus between the swells.',
    tw: 440, th: 380,
    items: function (o) {
      return [['traditional-boat', 0, 0, 170, false], ['wave-cloud-ornament', 220, 20, 130, o.mirror],
        ['lotus-floral-motif', 110, 190, 96, false], ['lotus-bud', 330, 190, 40, false],
        ['scroll-ornament', 330, 110, 46, false], ['lotus-flower', 0, 190, 40, false]];
    }
  },
  'lotus-garden': {
    title: 'Lotus Garden', note: 'Diamond all-over of lotus blooms, buds and gold scrolls; quiet ground pattern.',
    tw: 300, th: 300,
    items: function (o) {
      return [['lotus-floral-motif', 0, 0, 124, false], ['lotus-flower', 150, 150, 92, false],
        ['lotus-bud', 150, 0, 38, false], ['lotus-bud', 0, 150, 38, false],
        ['scroll-ornament', 75, 78, 52, false], ['scroll-ornament', 225, 78, 52, true],
        ['scroll-ornament', 75, 228, 52, true], ['scroll-ornament', 225, 228, 52, false]];
    }
  },
  'temple-frieze': {
    title: 'Temple Frieze', note: 'Border band over alternating barong and temple gates: a stripe for hems and edges.',
    tw: 900, th: 400,
    items: function (o) {
      return [['border-filler-ornament', 0, 0, 840, false], ['lotus-bud', 450, 0, 44, false],
        [o.hero, 0, 210, 130, false], ['split-gate-candi-bentar', 450, 210, 170, false],
        ['lotus-flower', 225, 220, 58, false], ['lotus-flower', 675, 220, 58, false]];
    }
  }
};

// Place a layout over a w x h viewport (px). opts: layout, scale, spacing, hero, crown, mirror, panel, rows
function placeLayout(opts, vw, vh) {
  var L = LAYOUTS[opts.layout] || LAYOUTS['temple-column'];
  var s = opts.scale, sp = opts.spacing, tw = L.tw * s * sp, th = L.th * s * sp;
  var base = L.items(opts), out = [];
  function put(m, x, y, w, flip) {
    var pw = w * s, ph = pw * AR[m];
    out.push({ m: m, x: x - pw / 2, y: y - ph / 2, w: pw, h: ph, flip: !!flip });
  }
  if (opts.panel && opts.layout === 'temple-column') {
    // the reference: three columns, N repeats, finials at the foot
    var rows = opts.rows, cx = vw / 2, top = (vh - rows * th) / 2 + 30 * s;
    for (var r = 0; r < rows; r++) {
      [-1, 0, 1].forEach(function (col) {
        base.forEach(function (b) {
          // gate-column items sit at S ± 92 (133..317); the centre column only reaches ±112
          var isGateCol = b[1] > 120;
          if (col === 0 && isGateCol) return;
          if (col !== 0 && !isGateCol) return;
          var dx = col === 0 ? b[1] : col * (b[1]);
          if (col === -1) dx = -b[1];
          var flip = col === -1 && b[0] === 'wave-cloud-ornament' ? !b[4] : b[4];
          put(b[0], cx + dx * s * sp, top + (r * L.th + b[2]) * s * sp, b[3], flip);
        });
      });
    }
    [-1, 1].forEach(function (col) { put('lotus-bud', cx + col * 225 * s * sp, top + (rows * L.th + 4) * s * sp, 34, false); });
    return { items: out, tw: tw, th: th };
  }
  var nx = Math.ceil(vw / tw) + 2, ny = Math.ceil(vh / th) + 2;
  var ox = (vw / 2) % tw, oy = (vh / 2) % th;
  for (var j = -1; j < ny; j++) for (var i = -1; i < nx; i++) {
    base.forEach(function (b) {
      var x = ox + i * tw + b[1] * s * sp, y = oy + j * th + b[2] * s * sp;
      var pw = b[3] * s, ph = pw * AR[b[0]];
      if (x + pw / 2 < 0 || x - pw / 2 > vw || y + ph / 2 < 0 || y - ph / 2 > vh) return;
      put(b[0], x, y, b[3], b[4]);
    });
  }
  return { items: out, tw: tw, th: th };
}


export { AR, LAYOUTS, placeLayout };
