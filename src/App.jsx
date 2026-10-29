// Batik Pattern Studio: React edition of the published studio (repeats, Fibonacci flows, Dua Pulau and Ntina
// signatures, ink readouts, Albers colour test, katagami stencil check, origins and the Claude design partner).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GENERATORS, CREDIT_LINE, SIGNATURE } from './engine';
import {
  REPEAT_LIST, FLOW_LIST, LAYOUT_LIST, DIRECTIONS, ORIENTS, LINE_INKS, LINE_STYLES, COUNTS, GROUNDS, MOOD, HEROES, CROWNS,
  INKS, USE, FOLDER, PRESETS, DEFAULTS, STORE, USES, SIG_INKS, TEXTURES, BOATS,
} from './data/catalog';
import { ratio, validHex, nameOf, inkRead, inkVerdict } from './lib/color';
import { sanitize, describe, initialState, saveJSON, recipe } from './lib/state';
import { compute, srcOf, geometryKey } from './lib/compute';
import { renderPatternPng, saveBlob } from './lib/png';
import { connectPartner } from './lib/partner';
import { useElementSize } from './hooks/useElementSize';
import { Stage } from './components/Stage';
import { Chips, Group, Stepper, Card } from './components/ui';
import { Partner } from './components/Partner';
import { Albers } from './components/Albers';
import { Kata } from './components/Kata';
import { Origins } from './components/Origins';

const randSeed = () => Math.floor(Math.random() * 999983) + 1;

export default function App() {
  const [state, setState] = useState(initialState);
  const [feedback, setFeedback] = useState({ text: '', changed: false, flash: 0 });
  const [footStatus, setFootStatus] = useState('');
  const [caps, setCaps] = useState({ partner: null, downloads: null, reason: 'Connecting…' });
  const stageRef = useRef(null);
  const size = useElementSize(stageRef);
  const timer = useRef(null);

  useEffect(() => { saveJSON(STORE, state); }, [state]);
  useEffect(() => { connectPartner().then(setCaps); }, []);

  // Every control goes through here: sanitise, detect what changed, then confirm it on the stage.
  function update(patch, quiet) {
    const clean = sanitize(patch);
    const changed = Object.keys(clean).filter((k) => String(state[k]) !== String(clean[k]));
    const next = { ...state, ...clean };
    setState(next);
    if (quiet) return;
    const shown = changed.filter((k) => k !== 'origin');
    if (!changed.length) setFeedback((f) => ({ ...f, text: 'Already selected', changed: true }));
    else if (shown.length) setFeedback((f) => ({ text: 'Updated · ' + (shown.length > 2 ? shown.length + ' settings' : shown.map((k) => describe(k, next[k])).join(' · ')), changed: true, flash: f.flash + 1 }));
    else return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback((f) => ({ ...f, text: '', changed: false })), 1800);
  }
  // presets and Claude's directions apply from the defaults, so leftovers never leak in
  const applyLook = (p) => { update({ ...DEFAULTS, origin: state.origin, ...p }); setFootStatus('Applied “' + (p.name || 'direction') + '”'); };

  const gk = geometryKey(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const res = useMemo(() => (size.w && size.h ? compute(state, size.w, size.h) : null), [gk, size.w, size.h]);
  const gen = !!GENERATORS[state.layout];
  const isPanel = state.layout === 'reference-panel';
  const u = USES[state.layout] || {};
  const title = res ? res.title : 'Reference panel';
  const notUsed = 'not used in ' + title;
  const items = res ? res.items : [];
  const hasSig = items.some((it) => SIGNATURE.indexOf(it.m) >= 0) || (res && res.bands.length > 0) || state.texture !== 'none';
  const hasBoat = items.some((it) => it.m === 'traditional-boat' || it.m === 'wave-cloud-ornament');
  const groundLabel = (nameOf(GROUNDS, state.ground) || 'Custom') + ' ' + state.ground.toUpperCase();

  const rr = inkRead(state.ground), mood = MOOD[state.ground.toUpperCase()];
  let tip;
  if (Math.max(rr.gold, rr.navy) < 2) tip = 'Both inks sit close to this ground. Go lighter (towards pearl) or deeper (towards teal or navy) for definition.';
  else if (rr.gold < 1.6) tip = 'Gold nearly vanishes here. Fine for a tonal look; try Teal or Deep teal if you want the gold to sing.';
  else if (rr.navy < 1.6) tip = 'Navy melts into this ground. Lean into a gold-forward look, or switch to Teal to bring the navy back.';
  else if (res && res.s < 0.6) tip = 'At this scale the detail becomes texture, which suits linings and bedding. Raise the scale to show the barong’s face.';
  else if (gen && state.articulation >= 0.8) tip = 'Very expressive: the Fibonacci structure is loosening into gesture. Ease articulation back to 0.5 to keep the spiral legible.';
  else tip = 'Best use: ' + USE[state.layout] + '.';

  const presets = PRESETS.filter((p) => !(p.layout === state.layout && p.ground === state.ground.toUpperCase()))
    .map((p) => [p, (p.layout === state.layout ? 2 : 0) + (p.ground === state.ground.toUpperCase() ? 1 : 0) + (p.tag === 'Signature' ? 0.7 : p.tag === 'Teal' ? 0.5 : 0)])
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);

  const renderCard = (p, tag, i) => {
    const r = inkRead(p.ground);
    const meta = (nameOf(LAYOUT_LIST, p.layout) || p.layout) + ' · ' + (nameOf(GROUNDS, p.ground) || p.ground.toUpperCase()) + ' · gold ' + r.gold.toFixed(1) + ':1 · navy ' + r.navy.toFixed(1) + ':1' + (p.use ? ' · ' + p.use : '');
    return <Card key={(p.name || '') + i} p={p} tag={tag} meta={meta} src={srcOf(p.hero || 'barong-mask', { ...state, ...p })} onApply={() => applyLook(p)} />;
  };

  const groundList = nameOf(GROUNDS, state.ground) ? GROUNDS : GROUNDS.concat([[state.ground, 'Custom ' + state.ground.toUpperCase()]]);
  const [hexDraft, setHexDraft] = useState(null);

  async function savePng() {
    if (!res) return;
    try {
      const blob = await renderPatternPng(state, size.w, size.h);
      setFootStatus(await saveBlob(blob, 'batik-' + state.layout + '-' + state.ground.replace('#', '') + '.png', caps.downloads));
    } catch (e) { setFootStatus(e && e.code === 'cancelled' ? '' : 'The PNG wasn’t saved.'); }
  }
  function copyRecipe() {
    const txt = JSON.stringify(recipe(state, res && res.key), null, 2);
    navigator.clipboard.writeText(txt).then(() => setFootStatus('Recipe copied'), () => setFootStatus('Copy blocked here. Recipe: ' + JSON.stringify(recipe(state, res && res.key))));
  }

  const readout = !res ? '' : gen
    ? GENERATORS[res.key].title + ' · seed ' + state.seed + ' · count ' + state.count + ' · articulation ' + state.articulation.toFixed(1) + ' · ' + res.items.length + ' motifs · reproduce with Copy recipe'
    : (res.isPanel ? 'Panel · ' + state.rows + ' repeats' : 'Tile ' + Math.round(res.tw) + ' × ' + Math.round(res.th) + ' px · ' + nameOf(DIRECTIONS, state.direction)) + ' · ' + res.items.length + ' motifs · ' + (FOLDER[res.key] ? 'recipe: pattern-layouts/' + FOLDER[res.key] + '-' + res.key + '/recipe.json' : 'Dua Pulau studio layout · reproduce with Copy recipe');

  return (
    <div className="wrap">
      <Stage stageRef={stageRef} state={state} res={res} size={size} flashKey={feedback.flash}
        badge={feedback.text || groundLabel} badgeChanged={feedback.changed}
        label={title + ' on ' + (nameOf(GROUNDS, state.ground) || 'custom ' + state.ground) + ' ground'} />
      <main className="rail">
        <header>
          <div className="eyebrow">Bali Master v2.0.0 · Dua Pulau signature v1.1.0 · Ntina</div>
          <h1>{title}</h1>
          <p className="lede">{res ? res.note : ''}</p>
        </header>

        <Partner partner={caps.partner} offReason={caps.reason} state={state} renderCard={renderCard} />

        <Group label="Repeats"><Chips list={REPEAT_LIST} value={state.layout} onPick={(v) => update({ layout: v })} label="Repeats" /></Group>
        <Group label="Flows & Fibonacci abstracts"><Chips list={FLOW_LIST} value={state.layout} onPick={(v) => update({ layout: v })} label="Flows" /></Group>

        {!gen && !isPanel && (
          <Group label="Pattern direction" off={!u.direction} why={notUsed}>
            <Chips list={DIRECTIONS} value={state.direction} onPick={(v) => update({ direction: v })} label="Pattern direction" />
            {u.direction && state.direction === 'tossed' && (
              <div className="actions"><button className="btn ghost" type="button" onClick={() => update({ seed: randSeed() })}>Re-toss</button><span className="status">New random angles for every motif</span></div>
            )}
          </Group>
        )}

        {gen && (
          <section className="fib" aria-labelledby="fib-h">
            <div className="fib-head">
              <div><div className="label" id="fib-h">Fibonacci rule</div><p className="rule">{GENERATORS[state.layout].rule({ count: state.count })}</p></div>
              <svg className="phi" viewBox="0 0 89 55" aria-hidden="true"><path d="M0 0h89v55H0zM55 0v55M55 34h34M68 34v21M55 42h13" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".5" /><path d="M0 55A55 55 0 0 1 55 0A34 34 0 0 1 89 34A21 21 0 0 1 68 55A13 13 0 0 1 55 42" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
            </div>
            <Stepper label="Articulation" display={state.articulation.toFixed(1)} step={0.1} capLo="Strict" capHi="Expressive" lessLabel="More strict" moreLabel="More expressive" onStep={(d) => update({ articulation: state.articulation + d })} />
            <Group label="Fibonacci count"><Chips list={COUNTS} value={state.count} onPick={(v) => update({ count: v })} label="Fibonacci count" /></Group>
            <div className="row2">
              <Group label="Motif orientation"><Chips list={ORIENTS} value={state.orient} onPick={(v) => update({ orient: v })} label="Motif orientation" /></Group>
              <Group label="Linework" off={!res || res.lines.length === 0} why={state.lineStyle === 'rebung' ? 'all flow lines are rebung ribbons now' : 'no lines at this setting'}>
                <Chips list={LINE_INKS} value={state.lines} onPick={(v) => update({ lines: v })} label="Linework" />
              </Group>
              <Group label="Flow line style"><Chips list={LINE_STYLES} value={state.lineStyle} onPick={(v) => update({ lineStyle: v })} label="Flow line style" /></Group>
            </div>
            <div className="actions"><button className="btn" type="button" onClick={() => update({ seed: randSeed() })}>Regenerate</button><span className="status">Seed {state.seed} · same seed, same pattern</span></div>
          </section>
        )}

        <div className="row2">
          <Group label="Signature ink" off={!hasSig} why="shows when signature motifs, rebung or isen are in view"><Chips list={SIG_INKS} value={state.sigInk} onPick={(v) => update({ sigInk: v })} label="Signature ink" /></Group>
          <Group label="Isen-isen ground"><Chips list={TEXTURES} value={state.texture} onPick={(v) => update({ texture: v })} label="Isen-isen ground" /></Group>
        </div>

        <Group label="Ground">
          <Chips list={groundList} value={state.ground} dots onPick={(v) => update({ ground: v })} label="Ground" />
          <div className="custom">
            <label htmlFor="customColor" style={{ fontSize: 13, color: 'var(--mist)' }}>Custom colour</label>
            <input id="customColor" type="color" value={state.ground.toLowerCase()} onChange={(e) => update({ ground: e.target.value })} />
            <label className="sr" htmlFor="customHex">Custom ground hex code</label>
            <input id="customHex" type="text" maxLength={7} placeholder="#2A6F74" spellCheck={false} autoComplete="off"
              value={hexDraft ?? state.ground.toUpperCase()}
              onChange={(e) => { let v = e.target.value.trim(); setHexDraft(e.target.value); if (v && v[0] !== '#') v = '#' + v; if (validHex(v)) update({ ground: v }); }}
              onBlur={() => setHexDraft(null)} />
          </div>
        </Group>

        <div className="group">
          <div className="label">How the inks read on this ground</div>
          <div className="inks">
            {INKS.map(([n, hex]) => {
              const r = ratio(state.ground, hex), [v, col] = inkVerdict(r);
              return (
                <div className="ink" key={n}>
                  <div className="nm"><span className="dot" style={{ background: hex }} /><span>{n}</span></div>
                  <div className="ratio">{r.toFixed(1)}:1</div>
                  <div className="verdict" style={{ color: col }}>{v}</div>
                </div>
              );
            })}
          </div>
          <p className="read">{(mood ? nameOf(GROUNDS, state.ground) + ' is ' + mood + '. ' : 'Your custom ground. ') + rr.lead}</p>
        </div>

        <Albers ground={state.ground} onSwap={(g) => update({ ground: g })} />

        <div className="row2">
          <Group label="Hero motif" off={!u.hero} why={notUsed}><Chips list={HEROES} value={state.hero} onPick={(v) => update({ hero: v })} label="Hero motif" /></Group>
          <Group label="Crown motif" off={!u.crown} why={notUsed}><Chips list={CROWNS} value={state.crown} onPick={(v) => update({ crown: v })} label="Crown motif" /></Group>
        </div>

        <div className="steppers">
          <Stepper label="Scale" display={res ? res.s.toFixed(2) : state.scale.toFixed(2)} step={0.1} lessLabel="Smaller" moreLabel="Larger" onStep={(d) => update({ scale: state.scale + d })} />
          <Stepper label="Spacing" hidden={gen} off={!u.spacing} why={notUsed} display={state.spacing.toFixed(2)} step={0.05} lessLabel="Tighter" moreLabel="Looser" onStep={(d) => update({ spacing: state.spacing + d })} />
          <Stepper label="Repeats" hidden={!u.rows} display={state.rows} step={1} lessLabel="Fewer repeats" moreLabel="More repeats" onStep={(d) => update({ rows: state.rows + d })} />
          <Group off={!(u.boats && hasBoat)} className="boats">
            <Chips list={BOATS} value={state.boats} onPick={(v) => update({ boats: v })} label="Boats" />
          </Group>
        </div>

        <div className="group">
          <div className="label">Studio presets</div>
          <p className="tip">{tip}</p>
          <div className="cards">{presets.map((p, i) => renderCard(p, p.tag, i))}</div>
        </div>

        <Kata downloads={caps.downloads} />

        <Origins state={state} items={items} onPick={(v) => update({ origin: v }, true)} onStatus={setFootStatus} />

        <div className="foot-row">
          <button className="btn ghost" type="button" onClick={savePng} disabled={!res}>Save PNG</button>
          <button className="btn ghost" type="button" onClick={copyRecipe}>Copy recipe</button>
          <span className="status" aria-live="polite">{footStatus}</span>
        </div>
        <div className="readout">{readout}</div>
        <p className="kata-note">{CREDIT_LINE}</p>
      </main>
    </div>
  );
}
