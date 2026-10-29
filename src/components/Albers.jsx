// One colour, two grounds (after Josef Albers): the studio ground (A) against a second ground (B).
import React, { useEffect, useState } from 'react';
import { ALB_INKS, ALB_FORMS, ALB_BRIDGE, ALB_STORE, GROUNDS } from '../data/catalog';
import { cielab, albShift, albGrade, nameOf, validHex } from '../lib/color';
import { groundName, loadJSON, saveJSON } from '../lib/state';
import { Chips } from './ui';

function initial() {
  const a = { ink: '#C39B65', form: 'ntina-mark', b: '#02213D', bridge: 'off' }, s = loadJSON(ALB_STORE);
  if (s && nameOf(ALB_INKS, s.ink)) a.ink = s.ink.toUpperCase();
  if (s && nameOf(ALB_FORMS, s.form)) a.form = s.form;
  if (s && validHex(s.b)) a.b = s.b.toUpperCase();
  if (s && nameOf(ALB_BRIDGE, s.bridge)) a.bridge = s.bridge;
  return a;
}
const maskOK = typeof CSS !== 'undefined' && (CSS.supports('mask-image', 'url("x.png")') || CSS.supports('-webkit-mask-image', 'url("x.png")'));

export function Albers({ ground, onSwap }) {
  const [alb, setAlb] = useState(initial);
  const [status, setStatusRaw] = useState({ text: '', ground: '' });
  // a message belongs to the ground it was written for, so it disappears once the studio ground moves on
  const setStatus = (text, g = ground) => setStatusRaw({ text, ground: g.toUpperCase() });
  useEffect(() => { saveJSON(ALB_STORE, alb); }, [alb]);
  const set = (p) => { setAlb((a) => ({ ...a, ...p })); setStatus(''); };

  const A = ground.toUpperCase(), B = alb.b.toUpperCase(), ink = alb.ink, inkName = nameOf(ALB_INKS, ink);
  const sA = albShift(ink, A), sB = albShift(ink, B), Li = Math.round(cielab(ink)[0]);
  const useMask = maskOK && alb.form !== 'square';
  const url = useMask ? `url("motifs/${alb.form}--black.png")` : 'none';

  let msg;
  if (A === B) msg = 'Both sides show the same ground. Pick a second ground, or press Find the strongest split.';
  else if (Math.abs(sA.dL) > 3 && Math.abs(sB.dL) > 3 && (sA.dL > 0) !== (sB.dL > 0)) msg = `${inkName} splits in two: on ${groundName(A)} it ${sA.words}, on ${groundName(B)} it ${sB.words}. It is the same dye showing as two colours, which is the effect Albers set out to show.`;
  else msg = `Both grounds push ${inkName} the same way, so it reads much alike on each. To see it split, pair one ground lighter and one darker than the ink (its lightness is L* ${Li}).`;
  const muddy = [[A, sA], [B, sB]].filter((r) => Math.abs(r[1].dL) < 15).map((r) => groundName(r[0]));
  if (muddy.length && A !== B) msg += ` Watch: on ${muddy.join(' and ')} the ink sits within 15 L* of the ground, so its edges will blur once printed.`;

  function split() {
    const LiF = cielab(ink)[0], sideA = cielab(A)[0] > LiF;
    let best = null, bestS = -1e9;
    GROUNDS.forEach((g) => {
      const h = g[0].toUpperCase(); if (h === A) return;
      const Lg = cielab(h)[0], d = Math.abs(Lg - LiF);
      const s = ((Lg > LiF) !== sideA ? 100 : 0) + Math.min(d, 60) - (d < 15 ? 50 : 0);
      if (s > bestS) { bestS = s; best = h; }
    });
    if (!best) return;
    set({ b: best }); setStatus('Second ground: ' + groundName(best));
  }
  function swap() {
    setAlb((a) => ({ ...a, b: A }));
    onSwap(B);
    setStatus(`${groundName(B)} is now the studio ground; ${groundName(A)} moved to the second ground.`, B);
  }

  return (
    <section className="alb" aria-labelledby="alb-h">
      <div>
        <div className="eyebrow">Colour test · after Josef Albers</div>
        <h2 className="kata-h" id="alb-h">One colour, two grounds</h2>
        <p className="tip">The same ink can look like two different colours. The ground around it pushes it lighter or darker, warmer or cooler. Choose an ink and a second ground to compare it against your studio ground, then show the bridge to prove both sides are the same colour.</p>
      </div>
      <div className="group"><div className="label">Ink</div><Chips list={ALB_INKS} value={ink} dots onPick={(v) => set({ ink: v })} label="Ink" /></div>
      <div className="row2">
        <div className="group"><div className="label">Form</div><Chips list={ALB_FORMS} value={alb.form} onPick={(v) => set({ form: v })} label="Form" /></div>
        <div className="group"><div className="label">Bridge</div><Chips list={ALB_BRIDGE} value={alb.bridge} onPick={(v) => set({ bridge: v })} label="Bridge" /></div>
      </div>
      <div className="group"><div className="label">Second ground</div><Chips list={GROUNDS} value={B} dots onPick={(v) => set({ b: v.toUpperCase() })} label="Second ground" /></div>
      <div className="alb-pair" role="img"
        aria-label={`${inkName} ${alb.form === 'square' ? 'square' : nameOf(ALB_FORMS, alb.form)} on ${groundName(A)} and on ${groundName(B)}${alb.bridge === 'on' ? ', joined by a bridge of the same ink' : ''}`}>
        {[A, B].map((g, i) => (
          <div key={i} className="alb-sw" style={{ background: g }}>
            <div className={'alb-mark' + (useMask ? '' : ' square')} style={{ background: ink, WebkitMaskImage: url, maskImage: url }} />
          </div>
        ))}
        {alb.bridge === 'on' && <div className="alb-bridge" style={{ background: ink }} />}
      </div>
      <div className="alb-reads">
        {[[A, sA, 'Your ground'], [B, sB, 'Second ground']].map(([g, s, who]) => {
          const gr = albGrade(s.dL);
          return (
            <div className="ink" key={who}>
              <div className="nm"><span className="dot" style={{ background: g }} /><span>{who} · {groundName(g)}</span></div>
              <div className="ratio">ΔL* {Math.round(Math.abs(s.dL))}</div>
              <div className="verdict" style={{ color: gr[1] }}>{gr[0]}</div>
              <div className="shift">{inkName} {s.words}.</div>
            </div>
          );
        })}
      </div>
      <p className="summary" aria-live="polite">{msg}</p>
      <div className="actions">
        <button className="btn ghost" type="button" onClick={split}>Find the strongest split</button>
        <button className="btn ghost" type="button" disabled={A === B} onClick={swap}>Swap into the studio</button>
        <span className="status" aria-live="polite">{status.ground === A ? status.text : ''}</span>
      </div>
      <p className="kata-note">Lightness is CIELAB L*, from 0 (black) to 100 (white). Inks within 15 L* of their ground lose their edges once dye spreads into cloth, so make colours that must stay separate differ in lightness, not hue alone. After Josef Albers, <i>Interaction of Color</i> (Yale University Press, 1963), whose exercises showed that a colour is read through what surrounds it (<a href="https://www.yalealumnimagazine.com/articles/3731-the-portable-albers" target="_blank" rel="noopener">Yale Alumni Magazine</a>).</p>
    </section>
  );
}
