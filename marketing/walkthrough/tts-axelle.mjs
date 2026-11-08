// Generates the narration with the "Axelle British" ElevenLabs voice (voice id from windfall/marketing/ads/vo/remix/previews.json).
//   ELEVENLABS_API_KEY=... node tts-axelle.mjs
// Writes vo/axelle/<chapter id>.mp3; build.mjs then uses them automatically.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'qjS6pDEKufEVovXLZake';
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Set ELEVENLABS_API_KEY in the environment for this one command.'); process.exit(1); }
const script = JSON.parse(readFileSync(resolve(root, 'script.json'), 'utf8'));
mkdirSync(resolve(root, 'vo/axelle'), { recursive: true });
for (const ch of script) {
  const out = resolve(root, `vo/axelle/${ch.id}.mp3`);
  if (existsSync(out) && !process.env.FORCE) { console.log('kept', ch.id); continue; }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: ch.text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true } })
  });
  if (!res.ok) { console.error(ch.id, res.status, await res.text()); process.exit(1); }
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log('wrote', ch.id);
}
console.log('Done. Now: node build.mjs');
