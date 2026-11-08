# Marea Dvīpa

**Live:** https://marea-dvipa.uk

Marea Dvīpa brings the Batik Pattern Studio and the Batik Media Lab together in one installable, offline web app.
It opens on a **welcome film**, and a bar at the top switches between the welcome and the two rooms:

- **Welcome**: a 1½-minute film on a live display panel, drawn by the studio's own engine. The Ntina mark opens it; 34 motifs land one by one at the golden angle, each on a kakula note; repeats glide into one another; the ground changes by Albers' rule (lighter, then darker than the gold) with a two-ground card and its bridge; the Dua Pulau and Ntina signatures; then the Media Lab chapter shows only the motif being made: the Bomba Rose growing its petal rings in the centre, drawn by the Media Lab from the reel's own progress, while its Bunga Kaili score plays on. The seven kakula kettles and two gongs sit around the rose and light up with the score; a golden-angle seed field turns behind it. Drag the rose to spin it, tap a ring to hear its petals, tap the heart for a gong, tap any kettle or gong to play it, switch the turn between rings from golden to none to see the petals stack into spokes, or press Hear the rings. It starts silent (browsers need a tap for sound): press **Play with sound**. It plays full screen as a 3D scene: move the pointer (or tilt the phone) to look around it, drag to turn it further, and tap a motif to ring it and see its name. Captions run right to left along the bottom with no box behind them. The controls float at the bottom centre (play, chapters, sound, full screen, the two rooms) and hide with the arrow, a tap on the scene or H; Space plays, ← → jump chapters, F goes full screen. It ends on the way into each room. Everything is timed to the 138 bpm of the Bomba Rose score and uses the Media Lab's own instruments.

- **Pattern Studio**: repeats and Fibonacci flows from the Bali master motifs and the Dua Pulau and Ntina signatures, ink readouts, the Albers colour test, the katagami check, Origins, Save PNG and Copy recipe. Unchanged from the standalone Pattern Studio.
- **Media Lab**: the Ntina, Bomba Rose, Marea Dvīpa and Rebung border reels with their scores, the explore bench and WebM recording. Reel 04, Rebung border, draws the Dua Pulau bamboo-shoot border with the studio's own ribbon engine, eight steps from the cloth to the hem, to Pucuk Rebung, an original piece for the Kaili ensemble at 100 bpm where the shoot is a rising five-note run and the zigzag spine is the low gongs alternating each chord's root and fifth.

Both rooms stay loaded, so switching keeps your pattern and your place in the reel. The reel pauses when you leave the Media Lab, and its keys (Space, arrows, E, F) only work while it is showing. The top bar takes on each room's colours: midnight for the studio, Bomba black for the lab.

## Run it
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run build:single   # esbuild-only build in dist-single/ (app.js + app.css)
```
`dist-single/` is already built. Serve it with any static server, e.g. `python3 -m http.server -d dist-single`. The service worker needs http(s), not file://.

## Links
- `#welcome` (or no link) opens the welcome film
- `#studio` opens the Pattern Studio
- `#lab` opens the Media Lab; `#ntina`, `#bomba`, `#marea` and `#rebung` open a reel directly
The app also remembers which reel you were last on.

## Install and offline
- Android / Chrome / Edge: press **Install app** in the top bar. iPhone / iPad: Safari → Share → **Add to Home Screen**.
- Long-press the installed icon for shortcuts to the Pattern Studio, the Ntina reel and the Bomba Rose reel.
- On first visit the service worker caches the page, scripts, icons, every motif and every isen fill, so both rooms work offline afterwards.
- After changing any file, bump `VERSION` in `public/sw.js`. If you add a motif, add it to `MEDIA` there too. Visitors see “A new version is ready → Reload”.

## Put it online
It runs on Cloudflare Workers as static files (`wrangler.jsonc` serves `dist-single/`):
```bash
npm run build:single
npx wrangler deploy
```
Any static host works too: upload the contents of `dist-single/` (or `dist/`) to GitHub Pages, Netlify, Cloudflare Pages or Vercel.

## Structure
```
src/
  shell/      Shell.jsx (top bar, rooms, #links), pwa.js (service worker, install, toast), shell.css
  welcome/    timeline.js (the film's acts, beats and sounds), Welcome.jsx (display panel, transport), welcome.css
  App.jsx     the Pattern Studio, with engine/ data/ lib/ components/ hooks/ as before
  styles.css  the studio's styles, scoped to .studio-view
  lab/        lab.js (the Media Lab, now startLab(), which also lends the welcome its instruments and the Bomba Rose clip), markup.js (its page), LabView.jsx, lab.css (scoped to .lab-view)
  lab/        also stage.js (the stage: a pattern made in the centre with its score, or a full reel with the ticker) and markStage.js (the Ntina mark drawn live)
public/       motifs/, isen/, icons/ (the Marea Dvīpa mark), logo/ (the mark’s layers, day and night sets, layout.json), manifest.webmanifest, sw.js
```

## Project material
The collections, tools and documents behind both rooms live alongside the app (brought over from the project archive on 1 November 2026):
```
assets/
  01-bali-batik-motifs-standard-v1.0.0   Standard edition: 7 motifs, SVG masters, PNGs, specs, SHA-256 lock
  02-bali-batik-motifs-fine-v1.0.0       Fine edition, with reference crops beside each master
  03-bali-batik-motifs-master-v2.0.0     Master edition: 10 named motifs, 15 inks, pattern-layouts/ (tiles, swatches, recipe.json, layouts.js)
  04-dua-pulau-signature-v1.1.0          Dua Pulau signature: 6 motifs, 2 colourways, isen-isen fills, the rebung ribbon, ORIGINS.md
  05-ntina-system                        The Ntina system as SVG: primary mark, small size, line version, pattern unit, in three inks
  06-ntina-sketchbook                    Every Ntina exploration from rounds 1 to 4, with CRITIQUE.md and the drawing source
pipeline/     the scripts that built every edition: tracing, palette, packaging, layout export, signature and Ntina drawing
skills/       pattern-aesthetics-craft, design-taste, heritage-signature-design, motif-asset-pipeline, batik-pattern-studio
docs/         every LOCK.md, the Dua Pulau origins, the sketchbook critique and the development log
```
The four locked collections each carry `verify_lock.py`; run `python3 verify_lock.py` inside the folder and it prints `ALL LOCKED`. Never edit a locked file in place: a change ships as a new version. The app's own copies of the motifs stay in `public/`.

## The mark, and your picture
The Marea Dvīpa mark is a bandstand pavilion between candi bentar gates, with palms, frangipani, the pier, the sea and the mountains. Its layers live in `public/logo` (a day set for light grounds, a night set for dark ones; `layout.json` places them as fractions of a square). The Media Lab’s third reel draws the mark layer by layer, each moving with the ensemble of whichever score plays.

"Hear your picture" in the Media Lab takes a PNG or JPG and composes a score from it: 128 columns over 16 bars, the brightest row of each column picking one of the seven kettles, dark masses ringing the gongs, edges driving the drum. The picture becomes a reel (and a stage tile), can be recorded as video, and never leaves the browser.

## Design partner (Claude)
Same as the studio: inside a Claude artifact with the `sample` and `downloads` capabilities it uses Claude directly; elsewhere it is off unless you host `server/partner-proxy.mjs` with your own key and build with `VITE_PARTNER_URL`.

## Credit
Keep the Origins panels and credit lines in both rooms whenever you show work from them. Dua Pulau and Ntina are our own designs inspired by the Bomba and taiganja traditions of Central Sulawesi. The Media Lab scores are original compositions for a synthesized ensemble inspired by kakula and dero; no traditional piece is quoted.

## Tested
Built with esbuild (`build:single`) and opened in Chromium on 28 October 2026: both rooms render, switching keeps state and pauses the reel, lab keys stay quiet in the studio, `#bomba` deep links and reloads work, both rooms work offline after the first visit, and at 390 px there is no horizontal scroll. The Vite build was not run here.
