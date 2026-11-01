# Bali Batik Motifs — Fine Edition v1.0.0 (LOCKED)

This edition uses the same production template as the standard edition (`bali-batik-motifs`), traced for finer detail.
Each motif links back to its exact region of the original uploaded pattern (`_source/original-pattern.png`).

| # | Folder | Motif | Symmetry |
|---|--------|-------|----------|
| 01 | 01-barong-mask | Barong Mask (hero) | mirrored |
| 02 | 02-sailing-ship | Sailing Ship on Waves | directional |
| 03 | 03-temple-gateway | Temple Gateway (Candi Bentar) | mirrored |
| 04 | 04-damask-medallion | Damask Medallion | mirrored |
| 05 | 05-gold-flourish | Gold Flourish | directional |
| 06 | 06-lotus-bud-finial | Lotus Bud Finial | mirrored |
| 07 | 07-gold-lotus | Gold Lotus | mirrored |

## Per folder
- `<motif>.svg`: the master, 9 ink layers bottom→top.
- `<motif>@2048.png`, `<motif>@512.png`: transparent exports. `<motif>.preview.png` is the same motif on white.
- `reference/original-crop.png`: the exact pixels from the uploaded design. `original-crop@8x.png` is the same crop enlarged.
- `reference/comparison.png`: Original | Standard | Fine, side by side.
- `spec.json`: source region (x, y, w, h in the original), source image SHA-256, inks, rules and file hashes.

## Palette: 9 inks + paper
The standard edition's 6 inks are unchanged. The fine edition adds three tonal steps: **pale-sand**, **steel-blue** and **deep-navy**.

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| deep-navy | #0D2740 | | temple-gold | #B39062 |
| navy-ink | #163A5A | | stone | #C8CCCD |
| harbour-blue | #46677F | | sand-wash | #D9C9B0 |
| steel-blue | #6A8699 | | pale-sand | #EAE1D2 |
| mist-blue | #93A8B6 | | paper | #FFFFFF |

## What's finer than the standard edition
- 8× upscale instead of 6×, with stronger edge recovery from the source.
- 9 tonal inks instead of 6, so the painterly washes in the original survive: the barong's eyes, teeth and crown leaves, and the wave highlights.
- About half the smoothing, and islands kept down to 220 px² (standard drops anything under 700 px²).
- Tighter curve tracing. Edges keep the original's brush bleed.

## When to use which
- **Fine:** hero or large use, roughly 300 px and up on screen, or 8 cm and up in print.
- **Standard:** small sizes, repeats, embroidery or single-screen printing, where fewer inks and bolder shapes reproduce better.

## Lock
Run `python3 verify_lock.py`. It checks every file, including the reference crops, against `manifest.lock.json`.
Any change means a new version and regenerated hashes.
