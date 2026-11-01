---
name: motif-asset-pipeline
description: Extract motifs from a pattern image into locked, reproducible asset folders (layered SVG master, PNG exports, spec, SHA-256 lock) in standard, fine and master editions.
---

# Motif asset pipeline

Use this when a person supplies a pattern, motif sheet or artwork and wants each motif as its own production asset that looks the same every time it is reproduced. It produced the Bali Batik Motifs standard (v1.0.0), fine (v1.0.0) and master (v2.0.0) editions, and the same template is used for the Dua Pulau signature.

## Goal
The result should be flawless at the pixel level but still look drawn by hand. Each motif gets its own folder, its own exports and a lock, so any later use can be checked against the original.

## Steps
1. **Keep the source.** Copy the upload into `_source/` and record its SHA-256. Every later step points back to this file.
2. **Find the motifs.** Separate figure from ground with OpenCV (threshold on Lab lightness, close small gaps, find connected components). Crop each motif with a margin and save the exact pixels as `reference/original-crop.png`.
3. **Sample the palette.** Cluster the source pixels in CIELAB (k-means) into named tokens (for example midnight #02213D, temple-gold #C39B65, pearl #FAF7F2). Classify every pixel to its nearest token. Never invent colours.
4. **Clean, but keep the hand.**
   - *Fringe fix:* anti-aliased edge pixels between two inks get reassigned to one of the two neighbours, not to a third colour. This removes halos.
   - *Keylines:* thin light lines between gold and navy become the `pearl` token, so the motif works on both light and dark grounds.
   - *Symmetry:* motifs that are mirrored in the source get averaged with their mirror image. Directional motifs (boats, waves, scrolls) are never symmetrised.
   - Sharpen with an unsharp mask before tracing. Don't smooth so much that the wobble of the hand disappears.
5. **Trace.** Run potrace once per ink layer, through ctypes on libpotrace (`ptrace.py`), with modest turd size and alphamax so curves stay lively. Stack the layers bottom to top into one SVG; each layer has an id and the token colour.
6. **Export.** Render with Playwright. Write the HTML to a file and open it with `page.goto(file://…)`, because `setContent` cannot load file:// images. Export `<motif>@2048.png` and `@512.png` with transparent backgrounds, plus `<motif>.preview.png` on the pearl ground and `reference/comparison.png` (original next to master).
7. **Specify.** `spec.json` holds the source region, the source SHA-256, the inks, the rules (symmetry, keyline, minimum stroke) and the hash of every file.
8. **Lock.** `manifest.lock.json` lists every file's SHA-256. `verify_lock.py` re-hashes everything and fails loudly on any drift. `LOCK.md` explains the template, palette and rules. A recolour or redraw becomes a new version with a version-history line; locked files are never edited in place.

## Editions
- **Standard:** clean vector, a small ink count, fast to use.
- **Fine:** more ink layers, more detail, compared against the original crops.
- **Master:** the highest detail the source allows (up to about 15 inks and 1,300–6,300 px masters), the motif names from the sheet, and `pattern-layouts/` with a reference panel, seamless tiles, swatches and `recipe.json` placements.

## Pattern layouts
- A layout is a recipe: a list of placements `[motif, cx, cy, width, flip]` in layout units, plus the tile size.
- `layouts.js` is the single engine shared by the exporter, the canvas builder and Batik Pattern Studio, so the same recipe renders the same everywhere.
- To prove a tile is seamless, export swatches of it repeated 3×3 on a light and a dark ground.

## Limits learned
- Artifact asset upload is capped at 2 MB per file. Ship 1024 px PNG web copies for the studio and keep the SVG masters in the package.
- Check each layer with a contact sheet before tracing: a mis-classified layer cannot be fixed once it is traced.
- Two-point Catmull-Rom paths render empty, so insert a midpoint.

## Credit
Always state where the source came from and what was done to it. For heritage motifs, follow heritage-signature-design.
