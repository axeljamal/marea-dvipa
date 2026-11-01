---
name: heritage-signature-design
description: Design an original signature (motifs, marks, a pattern system) inspired by a cultural tradition, with researched origins, respectful placement rules and a credit line.
---

# Heritage signature design

Use this when a project should have its own signature drawn from a living tradition: a motif family, a mark, or a pattern system. It produced the Dua Pulau signature (Bomba-inspired, Central Sulawesi meeting Bali) and the Ntina system (inspired by taiganja of the Kaili and Kulawi peoples).

## Principles
- **Ours, not copied.** Study the tradition, then make new drawings. A signature must not reproduce a specific historic piece, a living maker's design or a trademark.
- **Always credit the origin.** Every signature motif carries an origins record and a credit line, shown wherever the work is shown. That is how art keeps evolving.
- **Respect meaning.** Some objects are ceremonial. Find out how the tradition honours them, and set placement rules (for Ntina: whole and upright, never filler, never on feet or floors, never cut by an edge).
- **Reproducible on any medium.** Translate structure and meaning, not material. A mark inspired by metal jewellery must not render metal: it must work in one flat ink, reversed, at 16–24 px, as a stamp, a screen print and an embroidery outline (see design-taste).
- **No Balinese base required.** A signature can stand alone. It may sit in conversation with other collections without depending on them.

## Process
1. **Research.** Gather at least three sources: one from the community or a museum record, one scholarly or journalistic, one visual. Note the names in the local language, their meanings, who makes and keeps the tradition, and any taboos. Record each in `ORIGIN_SOURCES` with a link.
2. **Find the grammar.** List the structures, not the pictures: for Bomba, the flower, the clove (cengkeh), the bamboo shoot (rebung), the ketupat diamond and the two-colour buya bomba cloth; for taiganja, the open oval (*tai* = womb, *ganja* = shape), the buffalo horns and the stem.
3. **Diverge in a sketchbook.** Draw several directions. Keep every one, including the failures: each gets the idea, what worked, what failed, the lesson and a status (developing, parked or retired). See `docs/ntina-sketchbook-CRITIQUE.md`.
4. **Check for misreadings.** For every option, ask what else it could be read as. Real catches in this project: an eye, ears, a moustache, antennae, a coffee bean, a face at small sizes.
5. **Build a system.** A primary mark, an optical small size (drawn separately, not just scaled down), a line version and a pattern unit, tested side by side.
6. **Document origins.** Each motif's `ORIGINS` entry records: title, from (people and place), inspired (what the tradition is), own (what we made our own), meaning (what we honour, including placement rules) and src (source keys).
7. **Credit line.** One sentence that names the tradition, the people and the place, with gratitude. Ntina's is: "Ntina: original designs inspired by taiganja of the Kaili and Kulawi peoples and the Bomba flower of Central Sulawesi, honouring the women who keep the custom."
8. **Lock and ship.** Package with the motif-asset-pipeline template, and include `ORIGINS.md` next to `LOCK.md`.

## In tools
- The studio's Origins panel shows the origins card and the credit line for whatever is on screen, with a Copy credit line button.
- AI prompts must carry the values: "design our own, credit the origins, leave ceremonial objects out of filler".
