// Fallback build without Vite: bundles the app with esbuild into dist-single/ (one JS file, one CSS file,
// plus motifs/, isen/, icons/, the manifest and the service worker from public/). Useful offline or where only esbuild is installed.
//   node scripts/build-single.mjs            # uses ./node_modules
//   NODE_PATH=/path/to/node_modules node scripts/build-single.mjs
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist-single');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/main.jsx')],
  bundle: true, minify: true, format: 'iife', target: 'es2020',
  jsx: 'automatic', loader: { '.js': 'jsx' },
  outfile: resolve(out, 'app.js'),
  nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false', __PARTNER_URL__: JSON.stringify(process.env.VITE_PARTNER_URL || '') },
  logLevel: 'info',
});

const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  .replace('<script type="module" src="/src/main.jsx"></script>', '<script src="app.js"></script>')
  .replace('</head>', '  <link rel="stylesheet" href="app.css">\n</head>');
writeFileSync(resolve(out, 'index.html'), html);
cpSync(resolve(root, 'public'), out, { recursive: true });
console.log('Built', out);
