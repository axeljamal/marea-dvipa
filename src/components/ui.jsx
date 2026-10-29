// Shared controls: chip rows, gated groups, steppers and the proposal card.
import React from 'react';
import { MOTIF_FALLBACK } from '../data/assets';

export function Chips({ list, value, onPick, dots, disabled, label, id }) {
  return (
    <div className="chips" id={id} role="group" aria-label={label}>
      {list.map(([v, name]) => {
        const on = String(value).toLowerCase() === String(v).toLowerCase();
        return (
          <button key={String(v)} type="button" className="chip" aria-pressed={on} disabled={disabled} onClick={() => onPick(v)}>
            {dots && <span className="dot" style={{ background: v }} />}
            {name}
          </button>
        );
      })}
    </div>
  );
}

// A labelled control group. When `off` is set the group dims, its buttons disable and the reason shows by the label.
export function Group({ label, off, why, children, className = 'group', id, hidden }) {
  return (
    <div className={className + (off ? ' off' : '')} id={id} hidden={hidden}>
      {label && <div className="label">{label}{off && why ? <span className="why">{why}</span> : null}</div>}
      {off ? <fieldset disabled className="bare">{children}</fieldset> : children}
    </div>
  );
}

export function Stepper({ label, value, display, onStep, step, lessLabel, moreLabel, off, why, hidden, capLo, capHi }) {
  return (
    <div className={'stepper' + (off ? ' off' : '')} hidden={hidden}>
      <span className="label">{label}{off && why ? <span className="why">{why}</span> : null}</span>
      <span className="ctl">
        {capLo && <span className="scale-cap">{capLo}</span>}
        <button className="round" type="button" disabled={off} aria-label={lessLabel} onClick={() => onStep(-step)}>−</button>
        <span className="val">{display ?? value}</span>
        <button className="round" type="button" disabled={off} aria-label={moreLabel} onClick={() => onStep(step)}>+</button>
        {capHi && <span className="scale-cap">{capHi}</span>}
      </span>
    </div>
  );
}

export function Card({ p, tag, meta, src, onApply, applyLabel = 'Apply' }) {
  return (
    <article className="card">
      <div className="sw" style={{ background: p.ground }}><img src={src || MOTIF_FALLBACK} alt="" /></div>
      <div style={{ minWidth: 0 }}>
        <div className="top"><div className="nm">{p.name || 'Untitled direction'}</div><div className="tag">{tag}</div></div>
        <p>{p.why || p.rationale || ''}</p>
        {p.tip && <p>Tip: {p.tip}</p>}
        <div className="meta">{meta}</div>
        <div className="foot"><button type="button" className="btn" onClick={onApply}>{applyLabel}</button></div>
      </div>
    </article>
  );
}
