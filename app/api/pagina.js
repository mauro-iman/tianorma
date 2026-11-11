// GET /            -> página de Norma
// GET /p/<slug>    -> página de prueba (rewrite en vercel.json)

import { obtenerCatalogo } from '../lib/datos.js';
import { paginaCatalogo, paginaError } from '../lib/render.js';

const SLUG_NORMA = process.env.NORMA_SLUG || 'norma';
const SLUG_VALIDO = /^[a-z0-9-]{3,40}$/;

function slugDe(req) {
  const url = new URL(req.url, 'http://x');
  const deQuery = url.searchParams.get('slug');
  if (deQuery) return deQuery.toLowerCase();
  const m = url.pathname.match(/^\/p\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : SLUG_NORMA;
}

function enviar(res, status, html, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(html);
}

export default async function handler(req, res) {
  const slug = slugDe(req);
  if (!SLUG_VALIDO.test(slug)) return enviar(res, 404, paginaError('no-existe'), 'no-store');

  try {
    const cat = await obtenerCatalogo(slug);
    if (!cat) return enviar(res, 404, paginaError('no-existe'), 'no-store');
    // Sin caché: cuando el bot le dice a Norma "ya está en tu página", tiene que estar.
    return enviar(res, 200, paginaCatalogo(cat), 'no-store');
  } catch (e) {
    console.error('[pagina]', slug, e);
    return enviar(res, 503, paginaError('caida'), 'no-store');
  }
}
