// Origins & recognition: where each signature motif comes from, what we made our own, and a credit line to copy.
import React from 'react';
import { SIGNATURE, ORIGINS, ORIGIN_SOURCES, CREDIT_LINE, NTINA_CREDIT } from '../engine';
import { srcOf, texSrc } from '../lib/compute';
import { Chips } from './ui';

export function Origins({ state, items, onPick, onStatus }) {
  const used = {}; (items || []).forEach((it) => { used[it.m] = 1; });
  const list = SIGNATURE.map((k) => [k, ORIGINS[k].title + (used[k] ? ' ·' : '')]);
  list.push(['isen', 'Isen-isen fills' + (state.texture !== 'none' ? ' ·' : '')]);
  list.push(['ntina', 'Ntina' + (used['ntina-mark'] || used['ntina-line'] || used['ntina-tile'] ? ' ·' : '')]);
  list.push(['bali', 'Bali master motifs']);
  const k = ORIGINS[state.origin] ? state.origin : 'bomba-rose', o = ORIGINS[k];
  const img = k === 'isen' ? (texSrc(state) || 'isen/isen-cecek.svg') : k === 'bali' ? srcOf('barong-mask', state) : k === 'ntina' ? srcOf('ntina-mark', state) : srcOf(k, state);
  const credit = k === 'ntina' ? NTINA_CREDIT : CREDIT_LINE;

  function copy() {
    navigator.clipboard.writeText(credit).then(() => onStatus('Credit line copied'), () => onStatus('Copy blocked here. Select the credit line and copy it with your keyboard.'));
  }
  return (
    <section className="origins" aria-labelledby="origins-h">
      <div className="label" id="origins-h">Origins &amp; recognition</div>
      <p className="tip">Every signature motif is our own drawing, inspired by a living tradition. Tap one to see where it comes from and what we made our own.</p>
      <Chips list={list} value={k} onPick={(v) => onPick(v)} label="Origins" />
      <article className="origin-card" aria-live="polite">
        <img src={img} alt="" />
        <div style={{ minWidth: 0 }}>
          <h3>{o.title}</h3>
          <div className="from">{o.from}</div>
          <dl>
            {[['Inspired by', o.inspired], ['What we made our own', o.own], ['Meaning we honour', o.meaning]].map(([t, d]) => (
              <React.Fragment key={t}><dt>{t}</dt><dd>{d}</dd></React.Fragment>
            ))}
            <dt>Read more</dt>
            <dd>{o.src.filter((s) => ORIGIN_SOURCES[s]).map((s, i) => (
              <React.Fragment key={s}>{i ? ' · ' : ''}<a href={ORIGIN_SOURCES[s][1]} target="_blank" rel="noopener">{ORIGIN_SOURCES[s][0]}</a></React.Fragment>
            ))}</dd>
          </dl>
        </div>
      </article>
      <blockquote className="credit">{credit}</blockquote>
      <div className="actions"><button className="btn ghost" type="button" onClick={copy}>Copy credit line</button></div>
    </section>
  );
}
