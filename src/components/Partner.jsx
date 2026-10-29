// Claude design partner: three directions from a brief, or a streamed critique of the current pattern.
import React, { useRef, useState } from 'react';
import { STARTERS } from '../data/catalog';
import { sanitize } from '../lib/state';
import { proposalPrompt, critiquePrompt, errorCopy } from '../lib/partner';

export function Partner({ partner, offReason, state, renderCard }) {
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState('');
  const [critique, setCritique] = useState(null);
  const [cards, setCards] = useState([]);
  const [off, setOff] = useState('');
  const ctl = useRef(null);
  const briefRef = useRef(null);
  const disabled = !partner || !!off;

  function fail(e) {
    const c = errorCopy(e);
    if (c.off) setOff(c.msg);
    setStatus(c.off ? '' : c.msg);
  }

  async function ask() {
    const b = brief.trim() || 'Surprise me with three strong, different directions that develop the original layout.';
    ctl.current = new AbortController();
    setBusy(true); setStatus('Thinking about your brief…'); setCritique(null); setSummary(''); setCards([]);
    try {
      const out = await partner.json(proposalPrompt(state, b), { signal: ctl.current.signal });
      const props = out && Array.isArray(out.proposals) ? out.proposals : [];
      if (out && out.summary) setSummary(String(out.summary));
      const usable = props.slice(0, 3).map((p) => {
        const clean = sanitize(p);
        if (!clean.layout || !clean.ground) return null;
        return {
          ...clean,
          hero: clean.hero || 'barong-mask', crown: clean.crown || 'large-floral-ornament',
          name: String(p.name || '').slice(0, 40), why: String(p.rationale || '').slice(0, 500),
          use: String(p.use || '').slice(0, 80), tip: String(p.tip || '').slice(0, 240),
        };
      }).filter(Boolean);
      setCards(usable);
      setStatus(usable.length ? 'Three directions from Claude. Apply one, then ask for a critique or refine the brief.' : 'Claude replied, but none of the directions were usable. Try again.');
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function critiqueNow() {
    ctl.current = new AbortController();
    setBusy(true); setStatus('Looking at your pattern…'); setSummary(''); setCards([]); setCritique('');
    try {
      await partner.text(critiquePrompt(state, brief.trim()), { signal: ctl.current.signal, onText: (u) => setCritique(u.text) });
      setStatus('Critique from Claude.');
    } catch (e) {
      setCritique(e && e.text ? e.text : null);
      fail(e);
    }
    setBusy(false);
  }

  return (
    <section className="partner" aria-labelledby="partner-h">
      <div>
        <div className="eyebrow">Design partner</div>
        <h2 id="partner-h">Ask Claude for a direction</h2>
      </div>
      <label className="sr" htmlFor="brief">Describe what the pattern is for</label>
      <textarea id="brief" ref={briefRef} value={brief} disabled={disabled} onChange={(e) => setBrief(e.target.value)}
        placeholder="e.g. Teal resort shirt, subtle, for men; or: make the current one calmer" />
      {!disabled && (
        <div className="chips" aria-label="Example briefs">
          {STARTERS.map((s) => <button key={s} type="button" className="chip" onClick={() => { setBrief(s); briefRef.current && briefRef.current.focus(); }}>{s}</button>)}
        </div>
      )}
      {!disabled && (
        <div className="actions">
          <button className="btn" type="button" disabled={busy} onClick={ask}>Suggest 3 directions</button>
          <button className="btn ghost" type="button" disabled={busy} onClick={critiqueNow}>Critique current pattern</button>
          {busy && <button className="btn ghost" type="button" onClick={() => ctl.current && ctl.current.abort()}>Stop</button>}
        </div>
      )}
      <div className="status" aria-live="polite">{disabled ? (off || offReason) : status}</div>
      {summary && <p className="summary">{summary}</p>}
      {critique !== null && <pre className="critique">{critique}</pre>}
      <div className="cards">{cards.map((p, i) => renderCard(p, 'Claude', i))}</div>
    </section>
  );
}
