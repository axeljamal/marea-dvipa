// Katagami bridge check: loose pieces, thin strands, fine cuts and suggested silk-thread ties.
import React, { useEffect, useRef, useState } from 'react';
import { KATA_MOTIFS, KATA_SIZES, KATA_VIEWS, KATA_LAYERS, KATA_LAND, KATA_CUT, KATA_COL, KATA_STORE } from '../data/catalog';
import { NTINA } from '../engine';
import { nameOf } from '../lib/color';
import { loadJSON, saveJSON } from '../lib/state';
import { kataAnalyse, kataPaint, kataImg } from '../lib/kata';
import { saveBlob } from '../lib/png';
import { Chips } from './ui';

function initial() {
  const k = { motif: 'ntina-mark', size: 8, view: 'stencil', layer: 'all' }, s = loadJSON(KATA_STORE);
  if (s && nameOf(KATA_MOTIFS, s.motif)) k.motif = s.motif;
  if (s && KATA_SIZES.some((x) => x[0] === s.size)) k.size = s.size;
  if (s && nameOf(KATA_VIEWS, s.view)) k.view = s.view;
  if (s && nameOf(KATA_LAYERS, s.layer)) k.layer = s.layer;
  return k;
}
const cache = {};

export function Kata({ downloads }) {
  const [kata, setKata] = useState(initial);
  const [R, setR] = useState(null);
  const [status, setStatus] = useState('');
  const cv = useRef(null);
  const oneInk = NTINA.indexOf(kata.motif) >= 0;
  const layer = oneInk ? 'all' : kata.layer;
  const key = kata.motif + '@' + kata.size + '@' + layer;
  const set = (p) => setKata((k) => ({ ...k, ...p }));
  useEffect(() => { saveJSON(KATA_STORE, kata); }, [kata]);

  useEffect(() => {
    let live = true;
    if (cache[key]) { setR(cache[key]); setStatus(''); return; }
    setStatus('Checking…');
    kataImg(kata.motif).then((img) => {
      cache[key] = kataAnalyse(img, kata.motif, kata.size, layer);
      if (live) { setR(cache[key]); setStatus(''); }   // a newer choice wins
    }, () => { if (live) setStatus('This motif could not be checked.'); });
    return () => { live = false; };
  }, [key]);

  // paint the canvas whenever the result, view or column width changes
  useEffect(() => {
    const c = cv.current; if (!c || !R) return;
    const draw = () => {
      const cssW = c.parentElement.clientWidth || 380, dpr = Math.min(2, window.devicePixelRatio || 1);
      kataPaint(c, R, kata.view, (cssW * dpr) / R.view.W);
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(c.parentElement);
    return () => ro.disconnect();
  }, [R, kata.view]);

  const nm = nameOf(KATA_MOTIFS, kata.motif) + (!oneInk && kata.layer !== 'all' ? ' (' + nameOf(KATA_LAYERS, kata.layer).toLowerCase() + ')' : '');
  const sz = kata.size + ' cm';
  let verdict = '', li = [];
  if (R) {
    const ok = !R.islands && !R.thin && !R.fine;
    verdict = ok ? `${nm} cuts as one stencil at ${sz}. No loose pieces, no strands under ${KATA_LAND} mm, no cuts under ${KATA_CUT} mm.` : `${nm} at ${sz} needs work before it can be cut as one stencil.`;
    if (R.islands) li.push(`${R.islands} loose piece${R.islands > 1 ? 's' : ''} of paper would fall out. ${R.ties.length} tie${R.ties.length > 1 ? 's' : ''} suggested, longest ${Math.max(...R.ties.map((t) => t.mm)).toFixed(1)} mm${R.capped ? ' (first 60 pieces only)' : ''}. Tie them with thread, as katagami were, or redraw so the paper joins the sheet.`);
    if (R.thinIslands) li.push(`${R.thinIslands} of those pieces ${R.thinIslands > 1 ? 'are themselves' : 'is itself'} thinner than ${KATA_LAND} mm and would tear even when tied.`);
    if (R.thin) li.push(`${R.thin} piece${R.thin > 1 ? 's hang' : ' hangs'} on a paper strand under ${KATA_LAND} mm. Widen the strand or add a tie.`);
    if (R.fine) li.push(`${R.fine} cut${R.fine > 1 ? 's are' : ' is'} narrower than ${KATA_CUT} mm and would close up. Enlarge them, merge them, or print this motif larger.`);
    if (R.wrap) li.push('Checked as a seamless repeat, so pieces that continue across the tile edge count as joined.');
    if (ok && !R.wrap) li.push('One stencil means it also works as a screen, a stamp, a laser cut or an embroidery outline at this size.');
  }
  const legend = kata.view === 'print'
    ? [[KATA_COL.ink, 'Ink'], [KATA_COL.sheet, 'Cloth, and gaps left by bridges'], ['#B9B2A6', 'Too fine, would fill in']]
    : [[KATA_COL.paper, 'Stencil paper'], [KATA_COL.cut, 'Cut (ink passes)'], [KATA_COL.island, 'Falls out'], [KATA_COL.thin, 'Hangs on a thin strand'], [KATA_COL.fine, 'Cut too fine'], [KATA_COL.thread, 'Suggested tie']];

  function save() {
    if (!R) return;
    const c = document.createElement('canvas'); kataPaint(c, R, kata.view, 4);
    c.toBlob(async (blob) => {
      try {
        setStatus(await saveBlob(blob, `katagami-${kata.motif}${!oneInk && kata.layer !== 'all' ? '-' + kata.layer : ''}-${kata.size}cm-${kata.view}.png`, downloads));
      } catch (e) { setStatus(e && e.code === 'cancelled' ? '' : 'The PNG wasn’t saved.'); }
    }, 'image/png');
  }

  return (
    <section className="kata" aria-labelledby="kata-h">
      <div>
        <div className="eyebrow">Stencil test · after Ise katagami</div>
        <h2 className="kata-h" id="kata-h">Katagami bridge check</h2>
        <p className="tip">Can this motif be cut as one stencil? Paper that ink surrounds falls out when cut. Ise stencil cutters held those pieces with fine silk threads. This check finds loose pieces, suggests where to tie them and flags strands and cuts too fine to survive. If a motif passes, it can also be screen printed, stamped, laser cut or embroidered.</p>
      </div>
      <div className="group"><div className="label">Motif</div><Chips list={KATA_MOTIFS} value={kata.motif} onPick={(v) => set({ motif: v })} label="Stencil motif" /></div>
      <div className="row2">
        <div className="group"><div className="label">Motif width</div><Chips list={KATA_SIZES} value={kata.size} onPick={(v) => set({ size: v })} label="Motif width" /></div>
        <div className="group"><div className="label">View</div><Chips list={KATA_VIEWS} value={kata.view} onPick={(v) => set({ view: v })} label="View" /></div>
      </div>
      {!oneInk && <div className="group"><div className="label">Ink layer</div><Chips list={KATA_LAYERS} value={kata.layer} onPick={(v) => set({ layer: v })} label="Ink layer" /></div>}
      <div><canvas ref={cv} role="img" aria-label={`${kata.view === 'print' ? 'Print preview' : 'Stencil preview'} of ${nm} at ${sz}. ${verdict}`} /></div>
      <div className="legend">{legend.map(([c, t]) => <span key={t}><i style={{ background: c }} />{t}</span>)}</div>
      <p className="summary" aria-live="polite">{verdict}</p>
      <ul className="kata-list">{li.map((t) => <li key={t}>{t}</li>)}</ul>
      <div className="actions"><button className="btn ghost" type="button" disabled={!R} onClick={save}>Save stencil PNG</button><span className="status">{status}</span></div>
      <p className="kata-note">The limits (paper strands at least 1 mm, cuts at least 0.6 mm) are rules of thumb for hand-cut paper or vinyl, so adjust them for your cutter. Katagami are hand-cut mulberry-paper stencils from Ise-Shima, Japan, treated with persimmon tannin and reinforced with silk thread (<a href="https://www.allentownartmuseum.org/exhibitions/on-view/katagami-the-japanese-stencil/" target="_blank" rel="noopener">Allentown Art Museum</a>). Silk-thread katagami led to silkscreen printing (<a href="https://risdmuseum.org/exhibitions-events/exhibitions/textile-printing-paper-stencils-japan" target="_blank" rel="noopener">RISD Museum</a>).</p>
    </section>
  );
}
