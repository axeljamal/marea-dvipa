// The welcome film, written as a score: acts on a 138 bpm grid (the Bunga Kaili tempo of the Bomba Rose reel),
// and beats that change the pattern, the ground or the caption, each with the sound it rings on the Media Lab's
// own kakula, gongs and drums. Every look is a real Pattern Studio state, drawn by the studio's engine.
import { DEFAULTS, GROUNDS } from '../data/catalog';
import { albShift, cielab, nameOf } from '../lib/color';

export const BEAT = 60 / 138, BAR = BEAT * 4, E8 = BEAT / 2;
const GA = Math.PI * (3 - Math.sqrt(5));
const gseq = (i) => Math.floor((((i * GA) % (Math.PI * 2)) / (Math.PI * 2)) * 7) % 7;
const KAILI = [440, 523.25, 587.33, 659.26, 783.99, 880, 987.77];
const GOLD = '#C39B65';
const look = (p) => ({ ...DEFAULTS, ...p });
const gname = (h) => nameOf(GROUNDS, h) || h;

export const CLIP = { reel: 'bomba', scene: 'b-rings', score: 'bomba', bars: 16 };

export function buildTimeline(motifCount = 34) {
  const acts = [
    { id: 'title', label: 'Welcome', bars: 3 },
    { id: 'motifs', label: 'Motif by motif', bars: 7 },
    { id: 'repeats', label: 'Repeats', bars: 8 },
    { id: 'albers', label: 'Albers grounds', bars: 10 },
    { id: 'signatures', label: 'Signatures', bars: 6 },
    { id: 'lab', label: 'Media Lab', bars: CLIP.bars },
    { id: 'end', label: 'Enter', bars: 4 },
  ];
  let at = 0;
  acts.forEach((a) => { a.start = at; a.dur = a.bars * BAR; at += a.dur; });
  const total = at, A = Object.fromEntries(acts.map((a) => [a.id, a])), beats = [];
  const add = (t, view, sound) => beats.push({ t, view, sound });

  // 1 · Title: the Ntina mark over a drifting Ntina stream on Bomba black
  add(A.title.start, {
    act: 'title', overlay: 'title', dim: true, reveal: null, alb: null,
    look: look({ layout: 'ntina-stream', ground: '#0E0C09', texture: 'cecek', sigInk: 'buya-bomba', scale: 0.8 }),
    caption: null,
  }, [{ k: 'gong', n: 0, v: 0.5, at: 0.05 }, ...[0, 2, 4, 5].map((n, i) => ({ k: 'kettle', n, v: 0.4, at: BAR + i * E8 }))]);
  add(A.title.start + 2 * BAR, {}, [{ k: 'gong', n: 1, v: 0.35 }]);

  // 2 · Motif by motif: Fibonacci Bloom, each motif lands on a kakula note
  const m0 = A.motifs.start;
  add(m0, {
    act: 'motifs', overlay: null, dim: false, reveal: 0, alb: null,
    look: look({ layout: 'fibonacci-bloom', ground: '#02213D', count: 34, lines: 'gold', articulation: 0.3, seed: 1618, orient: 'flow' }),
    caption: { eyebrow: 'Pattern Studio · Fibonacci flows', head: 'Motif by motif, at the golden angle', body: 'Fibonacci Bloom sets 34 motifs 137.5° apart around the barong. Each one rings a kakula kettle as it lands.' },
  }, [{ k: 'gong', n: 0, v: 0.45 }]);
  for (let i = 0; i < motifCount; i++) {
    add(m0 + BAR + i * E8, { reveal: i + 1 }, [{ k: 'kettle', n: gseq(i), v: 0.36 - i * 0.004, oct: i % 5 === 4, soft: i > 21 }]);
  }
  add(m0 + BAR + motifCount * E8 + E8, { reveal: null }, [{ k: 'gong', n: 1, v: 0.42 }, { k: 'kettle', n: 0, v: 0.3, at: BEAT }, { k: 'kettle', n: 4, v: 0.3, at: BEAT * 1.5 }]);

  // 3 · Repeats: the same motifs glide from layout to layout
  const reps = [
    [{ layout: 'royal-damask', ground: '#1F5C63', scale: 0.85, spacing: 1.1 }, 'Royal damask', 'Ten repeats, each rebuilt live from the master motifs. Watch every motif glide to its place in the next one.'],
    [{ layout: 'temple-column', ground: '#1F5C63', scale: 0.8, direction: 'diagonal', crown: 'lotus-floral-motif' }, 'Temple column · Diagonal 45°', 'Pattern direction turns the whole repeat: upright, diagonal, tossed or mirrored rows.'],
    [{ layout: 'ocean-voyage', ground: '#1F5C63', scale: 0.8, boats: 'mirrored', direction: 'tossed', seed: 610, crown: 'lotus-flower' }, 'Ocean voyage · Tossed', 'Scale, spacing, hero and crown motifs are one tap each, and every control says why when a layout does not use it.'],
    [{ layout: 'dua-pulau-sarong', ground: '#FAF7F2', scale: 0.8, crown: 'bomba-rose', texture: 'cecek', sigInk: 'dua-pulau' }, 'Dua Pulau sarong', 'Our signature: rebung bands, the Bomba rose and the barong taking turns on a cecek isen-isen ground.'],
  ];
  reps.forEach(([p, head, body], k) => {
    const t0 = A.repeats.start + k * 2 * BAR;
    add(t0, { act: 'repeats', reveal: null, look: look(p), caption: { eyebrow: 'Pattern Studio · Repeats', head, body } }, [
      { k: 'gong', n: k % 2, v: 0.4 }, { k: 'drum', n: 'dum', v: 0.5 },
      ...[0, 2, 4].map((d, i) => ({ k: 'kettle', n: (k + d) % 7, v: 0.34, at: E8 * (i + 1) })),
      { k: 'drum', n: 'tak', v: 0.35, at: BEAT * 2 }, { k: 'drum', n: 'dum', v: 0.4, at: BAR }, { k: 'kettle', n: (k + 5) % 7, v: 0.3, oct: true, at: BAR + BEAT },
    ]);
  });

  // 4 · Albers: one gold, many grounds, alternating lighter and darker than the ink so it visibly splits
  const grounds = ['#FAF7F2', '#02213D', '#D2C7B6', '#1F5C63', '#B9D4CF'];
  let prev = '#FAF7F2';
  const albLook = look({ layout: 'temple-column', scale: 0.75, spacing: 1.05, crown: 'large-floral-ornament' });
  grounds.forEach((gr, k) => {
    const t0 = A.albers.start + k * 2 * BAR, before = k === 0 ? '#0E0C09' : prev;
    const s = albShift(GOLD, gr), L = cielab(gr)[0], f = KAILI[Math.min(6, Math.round((L / 100) * 6))];
    add(t0, {
      act: 'albers', reveal: null, alb: { a: before, b: gr },
      look: { ...albLook, ground: gr },
      caption: { eyebrow: 'Pattern Studio · One colour, two grounds', head: `Temple gold ${s.words} on ${gname(gr)}`, body: `After Josef Albers: one dye, two colours. ${gname(gr)} sits ${Math.round(Math.abs(s.dL))} L* ${s.dL > 0 ? 'above' : 'below'} the gold, pushing it ${s.dL > 0 ? 'darker' : 'lighter'}. The bridge proves both sides are the same ink.` },
    }, [{ k: 'angklung', f, d: 0.7, v: 0.32 }, { k: 'kolintang', f: f / 2, v: 0.4, at: BEAT * 2 }, { k: 'kettle', n: gseq(k + 3), v: 0.26, soft: true, at: BAR + BEAT }]);
    prev = gr;
  });

  // 5 · Signatures: Dua Pulau and Ntina
  const sigs = [
    [{ layout: 'bomba-garden', ground: '#0E0C09', crown: 'bomba-rose', count: 34, lines: 'gold', seed: 2009, sigInk: 'buya-bomba' }, 'Two Islands · Bomba Garden', 'Bali at the heart, Sulawesi blooming around it: Bomba roses and cloves at the golden angle, in Buya Bomba ink.'],
    [{ layout: 'ntina-stream', ground: '#2A6F74', direction: 'upright' }, 'Ntina Stream', 'The Ntina mark as one flat ink, so it prints, stamps or embroiders the same. Always shown whole and upright.'],
    [{ layout: 'ketupat-field', ground: '#0E0C09', crown: 'bomba-rosette', scale: 0.7, sigInk: 'buya-bomba', texture: 'sero' }, 'Ketupat Night', 'The head-panel diamonds of buya bomba as an all-over ground, over a sero isen-isen fill.'],
  ];
  sigs.forEach(([p, head, body], k) => {
    const t0 = A.signatures.start + k * 2 * BAR;
    add(t0, { act: 'signatures', alb: null, reveal: null, look: look(p), caption: { eyebrow: 'Pattern Studio · Signatures', head, body } }, [
      ...(k === 0 ? [{ k: 'gong', n: 0, v: 0.42 }] : []),
      { k: 'drum', n: 'dum', v: 0.55 }, { k: 'drum', n: 'tak', v: 0.35, at: BEAT * 1.5 }, { k: 'drum', n: 'dum', v: 0.45, at: BEAT * 2 }, { k: 'drum', n: 'tak', v: 0.35, at: BEAT * 3 },
      ...[0, 1, 2, 3].map((i) => ({ k: 'kettle', n: gseq(k * 4 + i), v: 0.32, at: BAR + i * E8 })),
    ]);
  });

  // 6 · The Media Lab: the Bomba Rose grows its petal rings, with its own score
  add(A.lab.start, {
    act: 'lab', overlay: 'clip', alb: null, reveal: null, dim: true,
    caption: { eyebrow: 'Media Lab · Bomba Rose reel', head: 'Grow the petal rings', body: 'Rings of 13, 8, 5 and 3 petals, each turned by the golden angle, scored for Bunga Kaili, an original piece for a synthesized Kaili ensemble.', small: true },
  }, null);
  beats[beats.length - 1].clip = true;

  // 7 · End: the way in
  add(A.end.start, {
    act: 'end', overlay: 'end', dim: true, caption: null,
    look: look({ layout: 'bomba-garden', ground: '#0E0C09', crown: 'bomba-rose', count: 34, lines: 'gold', seed: 3355, sigInk: 'buya-bomba', hero: 'ntina-mark' }),
  }, [{ k: 'gong', n: 0, v: 0.5 }, ...[6, 4, 2, 0].map((n, i) => ({ k: 'kettle', n, v: 0.36, at: BEAT * (i + 1) })), { k: 'gong', n: 1, v: 0.3, at: BAR * 2 }]);

  beats.sort((a, b) => a.t - b.t);
  return { acts, beats, total, clipAct: A.lab };
}
