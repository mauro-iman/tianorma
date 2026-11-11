// Servidor local para desarrollo: imita las rutas de vercel.json.
// Uso: npm run dev  ->  http://localhost:3000

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pagina from '../api/pagina.js';
import { usandoEjemplo } from '../lib/datos.js';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');

  const foto = pathname.match(/^\/dev\/fotos\/(\d+)x(\d+)\.svg$/);
  if (foto) {
    const [, w, h] = foto;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#cfc6b8"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${Math.round(w / 12)}" fill="#5a5247">Foto ${w}×${h}</text></svg>`);
  }

  if (pathname === '/' || pathname.startsWith('/p/')) return pagina(req, res);

  if (pathname === '/api/whatsapp') {
    // Adaptador Node -> Request/Response web (la forma en que Vercel llama a esta función).
    const webhook = await import('../api/whatsapp.js');
    let cuerpo;
    if (req.method === 'POST') {
      const partes = [];
      for await (const p of req) partes.push(p);
      cuerpo = Buffer.concat(partes).toString();
    }
    const request = new Request(`http://localhost:${PUERTO}${req.url}`, { method: req.method, headers: req.headers, body: cuerpo });
    const resp = await (req.method === 'POST' ? webhook.POST : webhook.GET)(request);
    res.statusCode = resp.status;
    return res.end(await resp.text());
  }

  try {
    const archivo = await readFile(path.join(raiz, '..', 'public', path.normalize(pathname)));
    return res.end(archivo);
  } catch {
    res.statusCode = 404;
    res.end('No encontrado');
  }
}).listen(PUERTO, () => {
  console.log(`Página de Norma en http://localhost:${PUERTO}`);
  console.log(usandoEjemplo ? '(datos de ejemplo: no hay SUPABASE_URL)' : '(datos de Supabase)');
});
