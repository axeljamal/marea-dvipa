// OPTIONAL: a tiny server so the design partner can work outside Claude. Not connected by default.
// It keeps your Anthropic API key on the server; the browser only ever talks to this endpoint.
// Run only if you choose to connect an API:
//   ANTHROPIC_API_KEY=sk-... node server/partner-proxy.mjs          (listens on :8787)
//   VITE_PARTNER_URL=http://localhost:8787/partner npm run build
// Env: ANTHROPIC_API_KEY (required), PARTNER_MODEL (default claude-sonnet-5-5), PORT (default 8787),
//      ALLOW_ORIGIN (default http://localhost:5173).
import http from 'node:http';

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.PARTNER_MODEL || 'claude-sonnet-5-5';
const PORT = Number(process.env.PORT || 8787);
const ORIGIN = process.env.ALLOW_ORIGIN || 'http://localhost:5173';
if (!KEY) { console.error('Set ANTHROPIC_API_KEY to run the partner proxy.'); process.exit(1); }

function send(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': 'content-type' });
  res.end(JSON.stringify(body));
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST' || req.url !== '/partner') return send(res, 404, { error: 'not found' });
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 60000) return send(res, 413, { code: 'prompt_too_large' }); }
  let mode, prompt;
  try { ({ mode, prompt } = JSON.parse(raw)); } catch (e) { return send(res, 400, { error: 'bad json' }); }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: 'user', content: String(prompt).slice(0, 50000) }] }),
  });
  if (!r.ok) return send(res, r.status === 429 ? 429 : 502, { code: r.status === 429 ? 'rate_limited' : 'error' });
  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (mode !== 'json') return send(res, 200, { text });
  const m = text.match(/\{[\s\S]*\}/);
  try { return send(res, 200, { json: JSON.parse(m ? m[0] : text) }); } catch (e) { return send(res, 502, { code: 'invalid_json' }); }
}).listen(PORT, () => console.log('Design partner proxy on http://localhost:' + PORT + '/partner'));
