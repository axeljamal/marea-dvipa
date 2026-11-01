# Bali Batik Motifs — v1.0.0 (LOCKED)

Seven motifs extracted from the source pattern tile, each in its own folder:

| # | Folder | Motif | Symmetry |
|---|--------|-------|----------|
| 01 | 01-barong-mask | Barong Mask (hero) | mirrored |
| 02 | 02-sailing-ship | Sailing Ship on Waves | directional |
| 03 | 03-temple-gateway | Temple Gateway (Candi Bentar) | mirrored |
| 04 | 04-damask-medallion | Damask Medallion | mirrored |
| 05 | 05-gold-flourish | Gold Flourish | directional |
| 06 | 06-lotus-bud-finial | Lotus Bud Finial | mirrored |
| 07 | 07-gold-lotus | Gold Lotus | mirrored |

## What's in each folder
- `<motif>.svg` — **the master**. Layered vector, one path per ink, bottom→top.
- `<motif>@2048.png`, `<motif>@512.png` — transparent exports rendered from the master.
- `<motif>.preview.png` — on white, for quick reference.
- `spec.json` — palette, size, symmetry, reproduction rules and SHA-256 of every file.

## Locked palette (6 inks + paper)
| Token | Hex |
|---|---|
| navy-ink | #163A5A |
| harbour-blue | #46677F |
| mist-blue | #93A8B6 |
| temple-gold | #B39062 |
| stone | #C8CCCD |
| sand-wash | #D9C9B0 |
| paper (ground) | #FFFFFF |

Also in `palette.json` and `palette.css`.

## How the look stays fixed
1. The SVG master is the single source of truth. Every PNG is re-rendered from it, never edited.
2. `manifest.lock.json` stores the SHA-256 of every file. Run `python3 verify_lock.py`: it prints ALL LOCKED or names the file that changed.
3. Colours are tokens. A recolour (e.g. a one-ink navy version) maps whole tokens to new hexes and ships as a new version. It never edits individual paths.
4. Scale proportionally only, keep the layer order, and keep clear space of at least 8% of the motif's width around it.
5. Any intentional change bumps the version (1.0.0 → 1.1.0) and regenerates the manifest.

## Treatment notes
Cleaned from a ~200 px source: AI-blur fringes removed, upscaled 6×, quantised to the six inks, then traced with smooth curves.
Edges keep the source's brush wobble, so the motifs read as hand-printed rather than geometric.
Symmetric motifs were averaged with their mirror image, so both sides now match exactly.
