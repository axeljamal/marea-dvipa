// Marea Dvīpa service worker. On install it caches the page, its script and styles, the icons, every motif and
// every isen fill, so both rooms work offline. Google Fonts are cached the first time they load.
// Bump VERSION whenever you change a file, and add any new motif to MEDIA.
const VERSION = 'marea-dvipa-v4';
const FONTS = 'marea-dvipa-fonts';
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];
const MEDIA = [
  "motifs/barong-mask.png",
  "motifs/bomba-rose--buya.png",
  "motifs/bomba-rose.png",
  "motifs/bomba-rosette--buya.png",
  "motifs/bomba-rosette.png",
  "motifs/border-filler-ornament.png",
  "motifs/cengkeh-sprig--buya.png",
  "motifs/cengkeh-sprig.png",
  "motifs/dua-pulau-medallion--buya.png",
  "motifs/dua-pulau-medallion.png",
  "motifs/ketupat-lattice--buya.png",
  "motifs/ketupat-lattice.png",
  "motifs/large-floral-ornament.png",
  "motifs/lotus-bud.png",
  "motifs/lotus-floral-motif.png",
  "motifs/lotus-flower.png",
  "motifs/ntina-line--black.png",
  "motifs/ntina-line--gold.png",
  "motifs/ntina-mark--black.png",
  "motifs/ntina-mark--gold.png",
  "motifs/ntina-tile--black.png",
  "motifs/ntina-tile--gold.png",
  "motifs/rebung-border--buya.png",
  "motifs/rebung-border.png",
  "motifs/scroll-ornament.png",
  "motifs/split-gate-candi-bentar.png",
  "motifs/traditional-boat.png",
  "motifs/wave-cloud-ornament.png",
  "isen/isen-cecek--buya.svg",
  "isen/isen-cecek.svg",
  "isen/isen-sero--buya.svg",
  "isen/isen-sero.svg",
  "isen/isen-zigzag--buya.svg",
  "isen/isen-zigzag.svg"
];

// The single-file build ships app.js and app.css; the Vite build ships hashed files under assets/.
// Read the built page so either way the scripts and styles it links are cached too.
async function builtAssets() {
  try {
    const html = await (await fetch('index.html', { cache: 'no-store' })).text();
    return Array.from(html.matchAll(/(?:src|href)="(?:\.\/)?((?:assets\/[^"]+)|app\.js|app\.css)"/g), (m) => m[1]);
  } catch (e) { return []; }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    const list = SHELL.concat(MEDIA, await builtAssets());
    await Promise.all(list.map((u) => c.add(u).catch(() => null)));
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; } catch (err) { return Response.error(); }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { // the page: network first so updates arrive, cache when offline
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return res; })
      .catch(() => caches.match('index.html', { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res;
  })));
});
