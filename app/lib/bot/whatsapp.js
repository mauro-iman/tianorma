// Cliente mínimo de la WhatsApp Cloud API (Meta).

import crypto from 'node:crypto';

const VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH = `https://graph.facebook.com/${VERSION}`;

async function graph(ruta, opciones = {}) {
  const resp = await fetch(`${GRAPH}${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...opciones.headers },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`WhatsApp ${ruta} -> ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export const wa = {
  /** Manda un texto. Si `responderA` viene, el mensaje aparece citando ese mensaje. Devuelve el id del mensaje enviado. */
  async enviarTexto(para, cuerpo, { responderA } = {}) {
    const r = await graph(`/${PHONE_ID}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: para,
        type: 'text',
        text: { body: cuerpo, preview_url: false },
        ...(responderA ? { context: { message_id: responderA } } : {}),
      }),
    });
    return r.messages?.[0]?.id ?? null;
  },

  /** Tildes azules: "lo leí". */
  async marcarLeido(waMessageId) {
    await graph(`/${PHONE_ID}/messages`, {
      method: 'POST',
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: waMessageId }),
    });
  },

  /** Baja una foto o audio que mandaron. */
  async descargarMedia(mediaId) {
    const info = await graph(`/${mediaId}`);
    const resp = await fetch(info.url, { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) throw new Error(`Descarga de media ${mediaId} -> ${resp.status}`);
    return { buffer: Buffer.from(await resp.arrayBuffer()), mime: info.mime_type || resp.headers.get('content-type') || '' };
  },
};

/** Verifica que el webhook venga de Meta (cabecera X-Hub-Signature-256). */
export function firmaValida(cuerpoCrudo, cabecera, secreto = process.env.WHATSAPP_APP_SECRET) {
  if (!secreto || !cabecera?.startsWith('sha256=')) return false;
  const esperada = crypto.createHmac('sha256', secreto).update(cuerpoCrudo).digest('hex');
  const recibida = cabecera.slice(7);
  return recibida.length === esperada.length && crypto.timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada));
}

/**
 * Pasa un mensaje del webhook al formato que entiende el bot.
 * @returns {{ de, nombre, msgId, tipo: 'texto'|'imagen'|'audio'|'otro'|'ignorar', texto?, mediaId?, respondeA? }}
 */
export function normalizarMensaje(m, contactos = []) {
  const base = {
    de: m.from,
    nombre: contactos.find((c) => c.wa_id === m.from)?.profile?.name ?? null,
    msgId: m.id,
    respondeA: m.context?.id ?? null,
  };
  switch (m.type) {
    case 'text': return { ...base, tipo: 'texto', texto: m.text?.body ?? '' };
    case 'image': return { ...base, tipo: 'imagen', mediaId: m.image.id, texto: m.image.caption ?? '' };
    case 'audio': return { ...base, tipo: 'audio', mediaId: m.audio.id };
    case 'document':
      // Hay quien manda la foto "como documento".
      if (m.document?.mime_type?.startsWith('image/')) return { ...base, tipo: 'imagen', mediaId: m.document.id, texto: m.document.caption ?? '' };
      return { ...base, tipo: 'otro' };
    case 'button': return { ...base, tipo: 'texto', texto: m.button?.text ?? '' };
    case 'interactive': return { ...base, tipo: 'texto', texto: m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '' };
    case 'reaction': return { ...base, tipo: 'ignorar' }; // un 👍 sobre un mensaje no requiere respuesta
    case 'unsupported': case 'system': return { ...base, tipo: 'ignorar' };
    default: return { ...base, tipo: 'otro' };
  }
}
