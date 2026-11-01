# Bali Batik Motifs — Master Edition v2.0.0 (LOCKED)

This edition is built from your named motif sheet (`_source/original-motif-sheet.png`).
It follows the same production template as the standard and fine editions, at the highest detail the sheet allows.

| # | Folder | Name on sheet | Symmetry |
|---|--------|---------------|----------|
| 01 | 01-barong-mask | BARONG MASK | mirrored |
| 02 | 02-traditional-boat | TRADITIONAL BOAT | directional |
| 03 | 03-split-gate-candi-bentar | SPLIT GATE (CANDI BENTAR) | mirrored |
| 04 | 04-large-floral-ornament | LARGE FLORAL ORNAMENT | mirrored |
| 05 | 05-wave-cloud-ornament | WAVE / CLOUD ORNAMENT | directional |
| 06 | 06-lotus-floral-motif | LOTUS FLORAL MOTIF | mirrored |
| 07 | 07-scroll-ornament | SCROLL ORNAMENT | directional |
| 08 | 08-lotus-flower | LOTUS FLOWER | mirrored |
| 09 | 09-lotus-bud | LOTUS BUD | mirrored |
| 10 | 10-border-filler-ornament | BORDER / FILLER ORNAMENT | mirrored |

## Per motif folder (same template)
- `<motif>.svg`: the master, up to 15 ink layers bottom→top, about 1,300–6,300 px across.
- `<motif>@2048.png` and `<motif>@512.png`: transparent exports. `<motif>.preview.png` shows the motif on the pearl ground.
- `reference/original-crop.png`: the exact pixels from your sheet. `reference/comparison.png` puts the original next to the master.
- `spec.json`: source region on the sheet, sheet SHA-256, inks, rules and file hashes.

## Master palette: 15 inks, sampled from your sheet
| Token | Hex | Token | Hex | Token | Hex |
|---|---|---|---|---|---|
| midnight | #02213D | teal-blue | #527582 | light-gold | #D1B285 |
| deep-navy | #0F3049 | mist-grey | #7C8B8D | sand | #D2C7B6 |
| navy-ink | #1E4157 | bronze | #756C59 | ivory | #E5DFD4 |
| indigo-slate | #2C5063 | antique-gold | #A78960 | pearl | #FAF7F2 |
| harbour-blue | #3F616F | temple-gold | #C39B65 | silver-mist | #A2AAAA |

`pearl` holds the cream keylines and highlights: the eye whites, the teeth, and the thin lines between gold and navy.
They are part of each drawing, so every motif works unchanged on light or dark grounds.

## Pattern layouts (`pattern-layouts/`)
`00-reference-panel` recreates your pattern layout: a 3-column temple panel at 2 and 4 repeats, with lotus-bud finials.
Five seamless repeats then develop it in new directions:

| Folder | Layout | Idea |
|---|---|---|
| 01-temple-column | Temple Column | Your panel opened into an all-over repeat |
| 02-royal-damask | Royal Damask | Half-drop: barong and floral crown alternate, lotus fillers |
| 03-ocean-voyage | Ocean Voyage | Directional rows of boats and cloud-waves |
| 04-lotus-garden | Lotus Garden | Quiet diamond all-over of lotus blooms and scrolls |
| 05-temple-frieze | Temple Frieze | Border band over alternating barong and gates (hems, edges) |

Each layout folder contains:
- `*-tile.svg`: a seamless repeat tile with transparent ground, self-contained (motifs embedded as symbols).
- `*-tile@2048.png`: the same tile as a PNG.
- `*-swatch-pearl.png` and `*-swatch-midnight.png`: the tile repeated, as proof that the seams match.
- `recipe.json`: every placement (motif, centre x/y, width, flip) in layout units. The recipe is the locked layout.

`layouts.js` is the same recipe engine the canvas Pattern Builder runs. Change scale, spacing, ground, hero or crown motif there,
or add a new layout function, and it renders identically.

## Lock
- Run `python3 verify_lock.py`. It checks every file, including references and pattern layouts.
- Recolours map whole tokens and ship as a new version.
- Scale proportionally only, and keep the layer order.
