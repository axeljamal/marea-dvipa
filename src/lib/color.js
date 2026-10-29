// Colour maths: WCAG contrast for ink readouts, CIELAB for the Albers test.

export function lum(h) {
  h = h.replace('#', '');
  const c = [0, 2, 4].map((i) => {
    const x = parseInt(h.substr(i, 2), 16) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export function validHex(h) { return /^#[0-9a-fA-F]{6}$/.test(h || ''); }
export function nameOf(list, v) {
  for (let i = 0; i < list.length; i++) if (String(list[i][0]).toLowerCase() === String(v).toLowerCase()) return list[i][1];
  return null;
}
export function clamp(v, lo, hi, d) { v = Number(v); if (!isFinite(v)) return d; return Math.max(lo, Math.min(hi, Math.round(v * 100) / 100)); }

export function inkRead(ground) {
  const gold = ratio(ground, '#C39B65'), navy = ratio(ground, '#02213D');
  const lead = gold >= 2.2 && navy >= 2.2 ? 'Balanced: navy and gold both carry.'
    : gold >= navy ? 'Gold-forward: navy reads as shadow and texture.' : 'Navy-forward: gold becomes a quiet accent.';
  return { gold, navy, lead };
}
export function inkVerdict(r) {
  const v = r >= 4.5 ? 'Strong' : r >= 3 ? 'Clear' : r >= 2 ? 'Soft' : r >= 1.4 ? 'Faint' : 'Blends in';
  const col = r >= 3 ? 'var(--good)' : r >= 2 ? 'var(--warn)' : 'var(--bad)';
  return [v, col];
}

export function cielab(hex) {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => { const x = parseInt(h.substr(i, 2), 16) / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  const X = (0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.95047, Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], Z = (0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
// simultaneous contrast: the ink is pushed away from its ground in lightness and towards the ground's opposite hue
export function albShift(ink, ground) {
  const I = cielab(ink), G = cielab(ground), dL = G[0] - I[0], parts = [];
  if (Math.abs(dL) > 3) parts.push(dL > 0 ? 'looks darker' : 'looks lighter');
  if (Math.hypot(G[1], G[2]) > 8) {
    const hue = Math.abs(G[2]) >= Math.abs(G[1]) ? (G[2] > 0 ? 'a touch cooler' : 'a touch warmer') : (G[1] > 0 ? 'a touch greener' : 'a touch redder');
    parts.push(parts.length ? hue : 'looks ' + hue);
  }
  return { dL, words: parts.length ? parts.join(' and ') : 'holds steady' };
}
export function albGrade(dL) {
  const d = Math.abs(dL);
  return d >= 40 ? ['Strong', 'var(--good)'] : d >= 25 ? ['Clear', 'var(--good)'] : d >= 15 ? ['Soft', 'var(--warn)'] : ['Muddy in print', 'var(--bad)'];
}
