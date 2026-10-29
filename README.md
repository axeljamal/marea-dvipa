# Marea Dvīpa

**Live:** https://marea-dvipa.axeltaj.workers.dev

Marea Dvīpa brings the Batik Pattern Studio and the Batik Media Lab together in one installable, offline web app.
It opens on a **welcome film**, and a bar at the top switches between the welcome and the two rooms:

- **Welcome**: a 1½-minute film on a live display panel, drawn by the studio's own engine. The Ntina mark opens it; 34 motifs land one by one at the golden angle, each on a kakula note; repeats glide into one another; the ground changes by Albers' rule (lighter, then darker than the gold) with a two-ground card and its bridge; the Dua Pulau and Ntina signatures; then the Media Lab chapter shows only the motif being made: the Bomba Rose growing its petal rings in the centre, drawn by the Media Lab from the reel's own progress, while its Bunga Kaili score plays on. The seven kakula kettles and two gongs sit around the rose and light up with the score; a golden-angle seed field turns behind it. Drag the rose to spin it, tap a ring to hear its petals, tap the heart for a gong, tap any kettle or gong to play it, switch the turn between rings from golden to none to see the petals stack into spokes, or press Hear the rings. It starts silent (browsers need a tap for sound): press **Play with sound**. It plays full screen as a 3D scene: move the pointer (or tilt the phone) to look around it, drag to turn it further, and tap a motif to ring it and see its name. Captions run right to left along the bottom with no box behind them. The controls float at the bottom centre (play, chapters, sound, full screen, the two rooms) and hide with the arrow, a tap on the scene or H; Space plays, ← → jump chapters, F goes full screen. It ends on the way into each room. Everything is timed to the 138 bpm of the Bomba Rose score and uses the Media Lab's own instruments.

- **Pattern Studio**: repeats and Fibonacci flows from the Bali master motifs and the Dua Pulau and Ntina signatures, ink readouts, the Albers colour test, the katagami check, Origins, Save PNG and Copy recipe. Unchanged from the standalone Pattern Studio.
- **Media Lab**: the Ntina and Bomba Rose reels with their scores, the explore bench and WebM recording. Unchanged from the standalone Media Lab.

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
- `#lab` opens the Media Lab; `#ntina` and `#bomba` open a reel directly
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
public/       motifs/, isen/, icons/ (the Ntina mark), manifest.webmanifest, sw.js
```

## Design partner (Claude)
Same as the studio: inside a Claude artifact with the `sample` and `downloads` capabilities it uses Claude directly; elsewhere it is off unless you host `server/partner-proxy.mjs` with your own key and build with `VITE_PARTNER_URL`.

## Credit
Keep the Origins panels and credit lines in both rooms whenever you show work from them. Dua Pulau and Ntina are our own designs inspired by the Bomba and taiganja traditions of Central Sulawesi. The Media Lab scores are original compositions for a synthesized ensemble inspired by kakula and dero; no traditional piece is quoted.

## Tested
Built with esbuild (`build:single`) and opened in Chromium on 28 October 2026: both rooms render, switching keeps state and pauses the reel, lab keys stay quiet in the studio, `#bomba` deep links and reloads work, both rooms work offline after the first visit, and at 390 px there is no horizontal scroll. The Vite build was not run here.
