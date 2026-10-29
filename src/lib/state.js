// Studio state: sanitising (presets, saved state and Claude's proposals all pass through here), labels and storage.
import { FIB_COUNTS, ORIGINS, GENERATORS, CREDIT_LINE } from '../engine';
import {
  LAYOUT_LIST, HEROES, CROWNS, DIRECTIONS, ORIENTS, LINE_INKS, SIG_INKS, TEXTURES, GROUNDS, LABELS, DEFAULTS, STORE, FOLDER,
} from '../data/catalog';
import { validHex, nameOf, clamp } from './color';

export function sanitize(p) {
  const o = {};
  if (!p || typeof p !== 'object') return o;
  if (nameOf(LAYOUT_LIST, p.layout)) o.layout = p.layout;
  if (validHex(p.ground)) o.ground = p.ground.toUpperCase();
  if (nameOf(HEROES, p.hero)) o.hero = p.hero;
  if (nameOf(CROWNS, p.crown)) o.crown = p.crown;
  if (p.scale !== undefined) o.scale = clamp(p.scale, 0.4, 1.6, 1);
  if (p.spacing !== undefined) o.spacing = clamp(p.spacing, 0.8, 1.5, 1);
  if (p.rows !== undefined) o.rows = Math.round(clamp(p.rows, 1, 6, 2));
  if (p.boats === 'same' || p.boats === 'mirrored') o.boats = p.boats;
  if (nameOf(DIRECTIONS, p.direction)) o.direction = p.direction;
  if (p.articulation !== undefined) o.articulation = clamp(p.articulation, 0, 1, 0.3);
  if (FIB_COUNTS.indexOf(Number(p.count)) >= 0) o.count = Number(p.count);
  if (nameOf(ORIENTS, p.orient)) o.orient = p.orient;
  if (nameOf(LINE_INKS, p.lines)) o.lines = p.lines;
  if (p.seed !== undefined && isFinite(Number(p.seed))) o.seed = Math.abs(Math.round(Number(p.seed))) % 1000000;
  if (nameOf(SIG_INKS, p.sigInk)) o.sigInk = p.sigInk;
  if (nameOf(TEXTURES, p.texture)) o.texture = p.texture;
  if (ORIGINS[p.origin]) o.origin = p.origin;
  if (p.lineStyle === 'line' || p.lineStyle === 'rebung') o.lineStyle = p.lineStyle;
  return o;
}

export const isGen = (k) => !!GENERATORS[k];

export function describe(k, v) {
  const lists = { layout: LAYOUT_LIST, ground: GROUNDS, hero: HEROES, crown: CROWNS, direction: DIRECTIONS, orient: ORIENTS, lines: LINE_INKS, sigInk: SIG_INKS, texture: TEXTURES };
  const n = lists[k] ? nameOf(lists[k], v) : null;
  return (LABELS[k] || k) + ': ' + (n || (typeof v === 'number' ? Math.round(v * 100) / 100 : v));
}

export const groundName = (h) => nameOf(GROUNDS, h) || 'Custom ' + h.toUpperCase();

export function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}
export function saveJSON(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage can be blocked; the studio still works */ }
}
export function initialState() {
  return { ...DEFAULTS, ...sanitize(loadJSON(STORE)) };
}

export function recipe(state, resKey) {
  const r = { collection: 'Bali master v2.0.0 + Dua Pulau signature v1.0.0', layout: state.layout, ground: state.ground, hero: state.hero, crown: state.crown, scale: state.scale, signature_ink: state.sigInk, isen_ground: state.texture, credit: CREDIT_LINE };
  if (isGen(state.layout)) {
    Object.assign(r, { articulation: state.articulation, count: state.count, orient: state.orient, lines: state.lines, lineStyle: state.lineStyle, seed: state.seed, engine: 'fibonacci.js (deterministic: same values + seed = same pattern)' });
  } else {
    Object.assign(r, { spacing: state.spacing, rows: state.rows, boats: state.boats, direction: state.direction });
    if (state.direction === 'tossed') r.seed = state.seed;
    r.recipe_file = resKey && FOLDER[resKey] ? 'pattern-layouts/' + FOLDER[resKey] + '-' + resKey + '/recipe.json' : null;
  }
  return r;
}
