// Humo: que las funciones de Vercel carguen y respondan (atrapa errores de sintaxis o imports rotos).

import { test } from 'node:test';
import assert from 'node:assert/strict';

function resFalsa() {
  const r = { statusCode: 200, headers: {}, cuerpo: '' };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (c) => { r.cuerpo = String(c ?? ''); };
  return r;
}

test('GET / responde la página (datos de ejemplo)', async () => {
  const { default: pagina } = await import('../api/pagina.js');
  const res = resFalsa();
  await pagina({ url: '/' }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.cuerpo, /<h1>Taller de Norma<\/h1>/);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('GET /p/<slug> inexistente o inválido da 404', async () => {
  const { default: pagina } = await import('../api/pagina.js');
  for (const url of ['/p/no-existe', '/p/NO_VALIDO!', '/api/pagina?slug=<script>']) {
    const res = resFalsa();
    await pagina({ url }, res);
    assert.equal(res.statusCode, 404, url);
  }
});

test('webhook: verificación de Meta', async () => {
  process.env.WHATSAPP_VERIFY_TOKEN = 'tok';
  const { GET, POST } = await import('../api/whatsapp.js');
  const ok = await GET(new Request('http://x/api/whatsapp?hub.mode=subscribe&hub.verify_token=tok&hub.challenge=987'));
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), '987');
  const mal = await GET(new Request('http://x/api/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1'));
  assert.equal(mal.status, 403);
  const sinFirma = await POST(new Request('http://x/api/whatsapp', { method: 'POST', body: '{}' }));
  assert.equal(sinFirma.status, 401);
});
