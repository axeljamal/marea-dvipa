# Walkthrough film

Motion-graphics walkthrough of the website guidance work, narrated by the ElevenLabs voice "Axelle British".

- `script.json` — the eleven chapters: id, scene kind, screenshot and narration text.
- `motion/index.html` — the film as an interactive web player. Every scene is a pure function of time, so the same page is seeked frame by frame for the MP4.
- `shots/` — tall screenshots of the live pages (headless Chrome, `--window-size=1920,N`). Re-shoot after a page changes.
- `vo/axelle/` — narration per chapter. Regenerate with `ELEVENLABS_API_KEY=… node tts-axelle.mjs` (key needs the Text to Speech permission).
- `check.mjs` — the loop check: walks the timeline every half second and fails on clipped, off-stage or overlapping text. Run it before every render.
- `render.mjs` — frame capture through puppeteer-core and the installed Chrome, piped to ffmpeg, narration mixed in. Needs `npm i ffmpeg-static puppeteer-core` in a `tools/` folder beside it.

Order: edit → `VOICE=axelle node check.mjs` → `VOICE=axelle node render.mjs` → `out/marea-dvipa-walkthrough-motion.mp4`.

## Soundtrack

The bed is the studio's own music, rendered offline from its engine rather than recorded:

- `music/render-music.mjs <kind> <seconds>` loads a copy of the app whose `src/lab/lab.js` has two one-line patches (`var c = window.__OFF || new AC()` in `ensureCtx`, and `window.__lab = {…}` after `startSound`), bundled with esbuild using the repo's `node_modules`. It hands the engine an `OfflineAudioContext`, schedules every event of the score and writes a WAV. `marea` is the mark's song (40 bars at 112 bpm), `bomba` is Bunga Kaili.
- `music/bed.mjs <seconds>` alternates the two with 3 s crossfades, fades in and out, and normalises to about −22 LUFS → `bed.wav` and `vo/music-bed.mp3`.
- `render.mjs` mixes the bed at −14 dB under the voice and ducks it a further few dB whenever Axelle speaks (sidechain compression on the narration).
- `music/marea.mp3` and `music/bomba.mp3` are the rendered scores for reference.

`check.mjs` now also tests drawings, images and frames for overlaps and reports any element that never reaches full opacity.
