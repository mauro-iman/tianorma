// Fotos (achicar con sharp) y audios (transcribir con Groq Whisper).

import sharp from 'sharp';

const LADO_MAX = 1000;

/** Rota según EXIF, achica a 1000 px como máximo y pasa a WebP. */
export async function prepararFoto(buffer) {
  const { data, info } = await sharp(buffer, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, ancho: info.width, alto: info.height, contentType: 'image/webp' };
}

/** Audio de WhatsApp (ogg/opus) -> texto en español. Devuelve '' si no se entendió nada. */
export async function transcribir(buffer, mime = 'audio/ogg') {
  const form = new FormData();
  const ext = mime.includes('mpeg') ? 'mp3' : mime.includes('mp4') ? 'm4a' : 'ogg';
  form.append('file', new Blob([buffer], { type: mime.split(';')[0] }), `audio.${ext}`);
  form.append('model', process.env.GROQ_MODELO_AUDIO || 'whisper-large-v3-turbo');
  form.append('language', 'es');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  // Sin "prompt" a propósito: con audios en silencio, Whisper tiende a repetirlo como si lo hubieran dicho.

  const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`Groq -> ${resp.status}: ${await resp.text()}`);
  const { text } = await resp.json();
  return limpiarTranscripcion(text);
}

// Frases que Whisper "inventa" cuando el audio está vacío o es puro ruido.
const ALUCINACIONES = [
  /amara\.org/i, /subt[ií]tulos? (realizados|por)/i, /gracias por ver/i, /suscr[ií]bete/i,
  /^\W*(m[uú]sica|aplausos|silencio|risas)\W*$/i, /^[\s.,…-]*$/,
];

export function limpiarTranscripcion(texto) {
  const t = String(texto ?? '').trim();
  return ALUCINACIONES.some((re) => re.test(t)) ? '' : t;
}
