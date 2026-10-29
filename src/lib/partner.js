// Design partner: the prompts, plus a provider that talks to Claude.
// Provider order: (1) window.claude 'sample' when the app runs as a Claude artifact; (2) an endpoint you host
// yourself, set as VITE_PARTNER_URL at build time (see server/partner-proxy.mjs); otherwise the partner is off.
// No API key ever lives in this browser code.
import { LAYOUTS, GENERATORS, SIGNATURE, ORIGINS } from '../engine';
import { REPEAT_LIST, FLOW_LIST, USE, GROUNDS } from '../data/catalog';
import { inkRead } from './color';
import { recipe } from './state';

function groundTable() {
  return GROUNDS.map((g) => { const r = inkRead(g[0]); return g[1] + ' ' + g[0] + ' (gold ' + r.gold.toFixed(1) + ':1, navy ' + r.navy.toFixed(1) + ':1)'; }).join('; ');
}

export function context(state) {
  const r = inkRead(state.ground);
  return [
    'You are a senior textile print designer helping develop a Balinese batik-inspired pattern collection.',
    'Motifs (fixed artwork, navy/teal-blue/gold with pearl keylines): barong-mask (guardian mask, the hero), large-floral-ornament (winged floral crown), lotus-floral-motif (navy-teal lotus), lotus-flower (gold lotus), lotus-bud, split-gate-candi-bentar (temple gates), traditional-boat, wave-cloud-ornament, scroll-ornament (gold), border-filler-ornament.',
    'Repeat layouts: ' + REPEAT_LIST.map((l) => l[0] + ' = ' + (l[0] === 'reference-panel' ? "the client's original 3-column temple panel, " : LAYOUTS[l[0]].note + ' ') + 'best for ' + USE[l[0]]).join(' | '),
    'Fibonacci flow / abstract generators: ' + FLOW_LIST.map((l) => l[0] + ' = ' + GENERATORS[l[0]].note + ' Rule: ' + GENERATORS[l[0]].rule({ count: 34 }) + ' Best for ' + USE[l[0]]).join(' | '),
    'Dua Pulau signature (our own original motifs, Bomba-inspired, from Central Sulawesi meeting Bali): ' + SIGNATURE.map((k) => { const o = ORIGINS[k]; return k + ' (' + o.inspired + ' Ours: ' + o.own + ')'; }).join(' | ') + '. Signature layouts: dua-pulau-sarong, ketupat-field; generator: bomba-garden. Signature ink dua-pulau (navy/teal/gold/pearl) or buya-bomba (gold on black, use with ground #0E0C09). Isen-isen ground texture: none|cecek|zigzag|sero.',
    'Ntina (our primary Central Sulawesi signature, inspired by taiganja of the Kaili and Kulawi peoples and the Bomba flower): ntina-mark (solid; selectable as hero), ntina-line (line version), ntina-tile (pattern unit). Layouts ntina-stream and ntina-cascade. Ntina marks are always whole and upright, never filler or cut by an edge; ink switches automatically between Bomba black (light grounds) and Bomba gold (dark grounds).',
    'Values: the project designs its own signature inspired by heritage and always credits the origins. When a direction uses signature motifs, end its rationale with a short credit to the Kaili/Donggala Bomba tradition. Leave ceremonial objects (taiganja, sambulugana) out.',
    'Controls for all: hero in [barong-mask, lotus-floral-motif, large-floral-ornament, dua-pulau-medallion, bomba-rosette, ntina-mark]; crown in [large-floral-ornament, lotus-floral-motif, lotus-flower, bomba-rose, bomba-rosette]; scale 0.4-1.6; ground = any hex colour; sigInk dua-pulau|buya-bomba; texture none|cecek|zigzag|sero.',
    'Repeat-only controls: spacing 0.8-1.5; rows 1-6 (reference-panel only); boats same|mirrored; direction upright|diagonal|tossed|alternate (pattern direction of the repeat).',
    'Generator-only controls: articulation 0-1 (0 = strict Fibonacci geometry with construction lines, 1 = expressive, loosened, artistic); count one of 13|21|34|55|89 (Fibonacci numbers: motif count, panel depth, rows or spiral arms); orient flow|upright (motifs turn along the flow or stay upright); lines gold|teal|pearl|navy|off (linework colour); lineStyle line|rebung (rebung draws the main flow lines, spirals and arcs as continuous Dua Pulau rebung ribbons that bend with the flow); seed any integer. In repeats, the rebung band of dua-pulau-sarong is drawn continuously and follows the pattern direction.',
    'Preset grounds with contrast of the two key inks: ' + groundTable() + '. Gold #C39B65 and navy #02213D each need about 2:1 against the ground to read; teal grounds balance both.',
    'Current setup: ' + JSON.stringify(recipe(state)) + ' (gold ' + r.gold.toFixed(1) + ':1, navy ' + r.navy.toFixed(1) + ':1 on this ground).',
  ].join('\n');
}

export function proposalPrompt(state, brief) {
  return context(state) + '\n\nBrief from the designer: "' + brief.slice(0, 1200) + '"\n\n' +
    'Propose three meaningfully different directions for this brief: vary layout, ground and scale; include at least one Fibonacci flow/abstract generator unless the brief clearly rules it out, and a teal ground if it suits. For generators, choose articulation deliberately (strict for architectural, expressive for artistic) and say why. ' +
    'Reply with only JSON of this shape: {"summary": "one or two sentences on how you read the brief", "proposals": [{"name": "2-3 word evocative name", "layout": "layout or generator id", "ground": "#RRGGBB", "hero": "motif id", "crown": "motif id", "scale": 0.8, "spacing": 1.0, "rows": 2, "boats": "same", "direction": "upright", "articulation": 0.4, "count": 34, "orient": "flow", "lines": "gold", "lineStyle": "line", "seed": 1618, "sigInk": "dua-pulau", "texture": "none", "rationale": "2-3 sentences: why this layout, flow and ground serve the brief, citing ink contrast and, for generators, the Fibonacci rule", "use": "short product use", "tip": "one practical production tip"}]}. Include only the fields that apply to the chosen layout.';
}

export function critiquePrompt(state, aim) {
  return context(state) + (aim ? '\n\nWhat the designer is aiming for: "' + aim.slice(0, 600) + '"' : '') +
    '\n\nGive a short critique of the current setup in plain text, under 140 words, as three labelled lines: "Works:", "Watch:", "Try next:". Be specific about scale, ground contrast, rhythm, flow direction and the end use; for a Fibonacci generator also judge whether the articulation keeps the golden structure legible. Name concrete control values in "Try next". No markdown symbols.';
}

export function errorCopy(e) {
  const c = e && e.code;
  if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(c)) return { off: true, msg: 'Claude isn’t available for this view, so the design partner is off. Studio presets below still work.' };
  if (c === 'rate_limited') return { msg: 'Claude is busy or your usage limit is reached. Try again in a little while.' };
  if (c === 'session_expired') return { msg: 'Sign in to Claude again, then retry.' };
  if (c === 'invalid_json') return { msg: 'Claude’s reply didn’t come back in a usable shape. Press Suggest again.' };
  if (c === 'refused') return { msg: 'Claude declined that brief. Try rewording it.' };
  if (c === 'prompt_too_large') return { msg: 'That brief is too long. Shorten it and try again.' };
  if (c === 'cancelled') return { msg: 'Stopped.' };
  return { msg: 'Something interrupted the request. Try again.' };
}

// A provider with the same two calls the artifact runtime offers: json(prompt, opts) and text(prompt, opts).
function endpointProvider(url) {
  async function call(mode, prompt, signal) {
    let r;
    try {
      r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, prompt }), signal });
    } catch (e) {
      if (e && e.name === 'AbortError') throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
      throw Object.assign(new Error('network'), { code: 'network' });
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(body.error || 'error'), { code: body.code || (r.status === 429 ? 'rate_limited' : 'error') });
    return body;
  }
  return {
    kind: 'endpoint',
    json: async (prompt, { signal } = {}) => (await call('json', prompt, signal)).json,
    text: async (prompt, { signal, onText } = {}) => { const b = await call('text', prompt, signal); if (onText) onText({ text: b.text }); return b.text; },
  };
}

export async function connectPartner() {
  if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
    let sample = null, downloads = null;
    try { sample = await window.claude.use('sample'); } catch (e) { sample = null; }
    try { downloads = await window.claude.use('downloads'); } catch (e) { downloads = null; }
    const partner = sample && {
      kind: 'artifact',
      json: (prompt, opts) => sample.json(prompt, { ...opts, cache: false }),
      text: (prompt, opts) => sample(prompt, opts),
    };
    return { partner, downloads, reason: partner ? '' : 'Claude isn’t available for this view, so the design partner is off. Studio presets below still work.' };
  }
  const url = typeof __PARTNER_URL__ !== 'undefined' ? __PARTNER_URL__ : '';
  if (url) return { partner: endpointProvider(url), downloads: null, reason: '' };
  return { partner: null, downloads: null, reason: 'The design partner is off in this build. Open the studio as a Claude artifact, or connect your own endpoint (see README, “Design partner”). Studio presets below still work.' };
}
