// Webhook de la WhatsApp Cloud API.
// GET  -> verificación inicial de Meta (hub.challenge)
// POST -> mensajes entrantes. Se valida la firma, se procesa cada mensaje y se responde 200.

import { firmaValida, normalizarMensaje, wa } from '../lib/bot/whatsapp.js';
import { db } from '../lib/bot/db.js';
import { prepararFoto, transcribir } from '../lib/bot/medios.js';
import { crearBot } from '../lib/bot/ejecutar.js';

const SLUG_NORMA = (process.env.NORMA_SLUG || 'norma').trim().toLowerCase();
const BASE = (process.env.PUBLIC_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || 'http://localhost:3000').replace(/\/$/, '');

const bot = crearBot({
  db,
  wa,
  medios: { prepararFoto, transcribir },
  telefonosNorma: (process.env.NORMA_TELEFONOS || '').split(',').map((t) => t.replace(/\D/g, '')).filter(Boolean),
  slugNorma: SLUG_NORMA,
  urlPagina: (slug) => (slug === SLUG_NORMA ? BASE : `${BASE}/p/${slug}`),
});

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN?.trim()) {
    return new Response(p.get('hub.challenge') ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(request) {
  const crudo = await request.text();
  if (!firmaValida(crudo, request.headers.get('x-hub-signature-256'))) {
    console.error('[webhook] Firma inválida: revisá que WHATSAPP_APP_SECRET sea el "App secret" de la app de Meta.');
    return new Response('Firma inválida', { status: 401 });
  }

  let cuerpo;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }

  for (const entry of cuerpo.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      // Mensajes de una misma persona, en orden. (Los "statuses" de entrega se ignoran.)
      for (const m of v.messages ?? []) {
        // Sin contenido ni número completo en los logs: solo lo necesario para diagnosticar.
        console.log(`[webhook] mensaje ${m.type} de …${String(m.from).slice(-4)}${m.context ? ' (respuesta)' : ''}`);
        await bot.procesar(normalizarMensaje(m, v.contacts));
      }
      for (const s of v.statuses ?? []) {
        // Si Meta no pudo entregar una respuesta del bot, el motivo llega acá.
        if (s.status === 'failed') console.error('[webhook] Meta no pudo entregar un mensaje:', JSON.stringify(s.errors));
      }
    }
  }
  return new Response('ok', { status: 200 });
}
