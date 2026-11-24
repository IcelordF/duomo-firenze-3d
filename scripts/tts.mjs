// Genera il parlato delle schede con ElevenLabs.  Uso: node scripts/tts.mjs problema concorso
// La chiave ELEVEN_LABS_KEY si legge da .env.local e non viene mai stampata.
import { readFileSync as rd, writeFileSync as wr, existsSync } from 'node:fs';
const KEY = rd('.env.local', 'utf8').match(/^ELEVEN_LABS_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
if (!KEY) throw new Error('ELEVEN_LABS_KEY mancante in .env.local');
const EN = process.env.LANG_TTS === 'en';
const VOICE = process.env.VOICE || (EN ? 'UnOINkXZ3yK4vVg3Iayj' : 'QttbagfgqUCm9K0VgUyT');   // Beatrice (inglese britannico) / Aida (italiano)
const MODEL = process.env.MODEL || 'eleven_v4';

globalThis.window = { THREE: {} };                          // il motore serve solo per la geometria
new Function(rd('src/engine.js', 'utf8'))(); new Function(rd('src/data.js', 'utf8'))();
if (EN) new Function(rd('src/i18n-en.js', 'utf8'))();
const { STAGES, CURIOSITA, AFFRESCHI, BASILICA } = window.CUPOLA_DATA;
const plain = s => s.replace(/<[^>]+>/g, '').replace(/(\d{4})–(\d{4})/g, EN ? 'from $1 to $2' : 'dal $1 al $2');
export const narration = st => Array.isArray(st.text) ? plain(`${st.title}. ${st.text.join(' ')}${st.fact ? ` ${EN ? 'Did you know?' : 'Lo sapevi?'} ${st.fact}` : ''}`)
  : plain(`${st.title}. ${st.date}. ${st.text} ${st.more.join(' ')} ${EN ? 'Did you know?' : 'Lo sapevi?'} ${st.fact}`);

import { mkdirSync } from 'node:fs'; mkdirSync(EN ? 'vendor/audio-en' : 'vendor/audio', { recursive: true });
const ALL = [...STAGES, ...CURIOSITA, ...AFFRESCHI, ...BASILICA];
const ids = process.argv[2] === 'all' ? ALL.map(s => s.id) : process.argv.slice(2);
for (const id of ids) {
  const st = ALL.find(s => s.id === id); if (!st) { console.error('tappa sconosciuta', id); continue; }
  const out = `vendor/audio${EN ? '-en' : ''}/${id}.mp3`;
  if (existsSync(out) && !process.env.FORCE) { console.log('già presente', out); continue; }
  const text = narration(st);
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
    method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL, language_code: EN ? 'en' : 'it', voice_settings: { stability: 0.5, similarity_boost: 0.8 } })
  });
  if (!r.ok) { console.error(id, r.status, (await r.text()).slice(0, 300)); process.exitCode = 1; continue; }
  wr(out, Buffer.from(await r.arrayBuffer()));
  console.log(out, text.length, 'caratteri');
}
