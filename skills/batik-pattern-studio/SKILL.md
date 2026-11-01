---
name: batik-pattern-studio
description: Build, extend and maintain Batik Pattern Studio, the interactive pattern builder (artifact page and React app) with layouts, Fibonacci flows, rebung ribbons, signatures, colour and stencil tests and a Claude design partner.
---

# Batik Pattern Studio

The studio turns the locked motif collections into a live pattern builder. It exists in two forms that share one engine:
- **Artifact page:** a single HTML file published as a Claude artifact with the capabilities `sample` (the design partner) and `downloads` (Save PNG). Its source is in `studio-artifact/`.
- **React app:** `app/`, a Vite + React 19 project. `npm run build` builds it with Vite; `npm run build:single` builds it with esbuild alone.

## Engine (`src/engine/`, unchanged logic)
- `layouts.js`: `AR` (each motif's height/width ratio), `LAYOUTS[key] = {title, note, tw, th, items(o)}`, where items are `[motif, cx, cy, width, flip]`, and `placeLayout(opts, vw, vh)`. Panel mode is the reference 3-column temple panel.
- `fibonacci.js`: PHI, the golden angle, `FIB_COUNTS` [13, 21, 34, 55, 89], the seeded mulberry32 PRNG, the `GENERATORS` (fibonacci-bloom, golden-section, fibonacci-river, golden-spiral; each has `rule` and `make`), `placeGenerator` and `applyDirection` (upright, diagonal 45°, tossed, alternate). The same options plus the same seed always give the same pattern.
- `signature.js`: the Dua Pulau motifs, the dua-pulau-sarong and ketupat-field layouts, the bomba-garden generator, `ORIGINS`, `ORIGIN_SOURCES` and `CREDIT_LINE`.
- `rebung.js`: `polyFromPath`, `rebungRibbon(pts, h, ink, phase)` (two rows of shoots that bend with the path, skipped where the bend exceeds 0.75 rad), and `rebungToSvg` / `rebungToCanvas`.
- `ntina.js`: the Ntina mark, line and tile; the ntina-stream and ntina-cascade layouts; Ntina origins and credit. Ntina items are always upright (`rot = 0`). Their ink switches between `--black` and `--gold` when ground luminance is below 0.22.

## State rules
- Every change goes through `set(patch)` → `sanitize` → apply. The stage flashes and the badge says "Updated · …", or "Already selected" when nothing changed.
- Presets and Claude's proposals apply from `DEFAULTS` (`applyLook`), so no leftover settings leak in.
- `USES[layout]` lists the controls each layout uses. Unused controls dim and give their reason ("not used in …"). The Re-toss button shows only for the tossed direction.
- In repeats, `rebung-border` items become continuous bands that follow the direction. In generators with `lineStyle: 'rebung'`, flow lines of width ≥ 1.5 become ribbons.
- State persists in localStorage: `batik-studio-v3`, with `batik-albers-v1` and `batik-kata-v1` for the test panels. Every read and write is wrapped in try/catch.

## Panels
- **Design partner:** the prompt context lists every layout, generator, signature, value and control. Proposals come back as JSON and pass through `sanitize`; the critique streams in. In an artifact it calls `window.claude.use('sample')`. In the React app outside Claude it is off, unless the person approves connecting an endpoint they host (`server/partner-proxy.mjs`, with the key kept server-side). Never connect an API without the person's approval.
- **Ink readout:** WCAG contrast of temple gold, midnight navy and pearl against the ground, with a mood line for each preset ground.
- **One colour, two grounds** (after Albers): the CIELAB L* shift of one ink on the studio ground and on a second ground. Inks within 15 L* of the ground are flagged as muddy in print. Includes "Find the strongest split" and "Swap into the studio".
- **Katagami bridge check:** rasterises a motif at a chosen width (3, 8 or 20 cm). Finds paper islands (4-connected), strands thinner than 1 mm and cuts thinner than 0.6 mm (bounded distance transforms). Suggests silk-thread ties, nearest first, with a second tie for large pieces. Repeats are checked with wrap-around. Shows stencil and print views, with per-screen layers.
- **Origins & recognition:** the origin card and the credit line, with a copy button.
- **Save PNG and Copy recipe:** the recipe is enough to reproduce the pattern exactly.

## Working on it
1. Read the latest published artifact first; other sessions may have added features. Port from that version, not from older local copies.
2. Keep the engine identical in both forms. Change it once, then copy it to both.
3. Click-test: every enabled chip and stepper must change the stage or its panel. Check that state persists across reloads, check a 390 px width with no horizontal scroll, and check Save PNG.
4. Every new feature must cite its reference (person, work, link) on the page, as the Albers and katagami panels do.
5. Log each development idea in the ideas log so none repeat, and follow design-taste and pattern-aesthetics-craft.

## Performance (React app)
- Memoise placement on the geometry keys only (layout, hero, crown, scale, spacing, rows, boats, direction, articulation, count, orient, seed, lineStyle). Ground, inks, isen and linework colour are draw-time.
- Render rebung ribbons as one `<g>` of markup, not thousands of elements. Cache `polyFromPath` by path string and reuse ribbon markup when bands and ink are unchanged.
- Click-test after every change: walk every layout, click every enabled control and check the stage fingerprint (including stroke and fill) changes or the badge says "Already selected".
