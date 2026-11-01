// Render the rebung ribbon along sample paths into standalone SVGs (no DOM needed: paths are given as point lists).
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const ctx = {}; new Function('ctx', src + '\nctx.rebungRibbon=rebungRibbon;ctx.REBUNG_INKS=REBUNG_INKS;')(ctx);
const PHI = (1 + Math.sqrt(5)) / 2;
const paths = {
  straight: { w: 1600, h: 300, runs: [[...Array(281)].map((_, i) => [-80 + i * 6.6, 150])], h0: 70 },
  wave: { w: 1600, h: 600, runs: [[...Array(400)].map((_, i) => { const x = -80 + i * 4.4; return [x, 300 + 110 * Math.sin(2 * Math.PI * x / (340 * PHI))]; })], h0: 28 },
  'golden-spiral': { w: 1200, h: 1200, runs: [(() => { const b = Math.log(PHI) / (Math.PI / 2), pts = []; for (let th = 0; th < 14; th += 0.01) { const r = 30 * Math.exp(b * th); if (r > 760) break; pts.push([600 + r * Math.cos(th), 600 + r * Math.sin(th)]); } return pts; })()], h0: 34 },
  'golden-arcs': { w: 1618, h: 1000, runs: [(() => { // quarter-circle golden spiral through squares 1000, 618, 382, 236, 146
      const pts = []; let x = 0, y = 0, w = 1618, h = 1000; const seq = ['L', 'T', 'R', 'B'];
      for (let d = 0; d < 6; d++) { const s = Math.min(w, h), dir = seq[d % 4]; let cx, cy, a0;
        if (dir === 'L') { cx = x + s; cy = y + s; a0 = Math.PI; x += s; w -= s; }
        else if (dir === 'T') { cx = x; cy = y + s; a0 = -Math.PI / 2; y += s; h -= s; }
        else if (dir === 'R') { cx = x + w - s; cy = y; a0 = 0; w -= s; }
        else { cx = x + s; cy = y + h - s; a0 = Math.PI / 2; h -= s; }
        for (let t = 0; t <= 1; t += 0.01) { const a = a0 + t * Math.PI / 2; pts.push([cx + s * Math.cos(a), cy + s * Math.sin(a)]); } }
      return pts; })()], h0: 30 }
};
const f1 = v => v.toFixed(1);
for (const cw of ['dua-pulau', 'buya-bomba']) for (const [name, P] of Object.entries(paths)) {
  let body = '';
  P.runs.forEach(pts => ctx.rebungRibbon(pts, P.h0, cw, 0).forEach(s => {
    if (s.dot) body += `<circle cx="${f1(s.dot[0])}" cy="${f1(s.dot[1])}" r="${f1(s.r)}" fill="${s.fill}"/>\n`;
    else body += `<path d="${s.d}" fill="${s.fill || 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${f1(s.sw)}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>\n`;
  }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${P.w} ${P.h}" width="${P.w}" height="${P.h}" role="img" aria-label="Rebung ribbon along a ${name} path">\n<title>Rebung Ribbon (${name})</title>\n<desc>Dua Pulau signature v1.1.0 · rebung ribbon drawn continuously along a ${name} path · ${cw} colourway · LOCKED</desc>\n${body}</svg>\n`;
  fs.writeFileSync(`rebung-ribbon-${name}--${cw}.svg`, svg);
}
console.log('samples ok');
