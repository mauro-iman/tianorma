import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { prepararFoto, limpiarTranscripcion } from './medios.js';
import { firmaValida, normalizarMensaje } from './whatsapp.js';

test('prepararFoto achica a 1000 px, respeta la rotación EXIF y pasa a WebP', async () => {
  // Foto "acostada" de 2000x1000 marcada con orientación 6 (girada 90°), como sale de muchos celulares.
  const jpg = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#a0522d' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const r = await prepararFoto(jpg);
  assert.equal(r.contentType, 'image/webp');
  assert.deepEqual([r.ancho, r.alto], [500, 1000]);
  const meta = await sharp(r.buffer).metadata();
  assert.equal(meta.format, 'webp');
  assert.ok(r.buffer.length < jpg.length);
});

test('prepararFoto no agranda fotos chicas', async () => {
  const png = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#fff' } }).png().toBuffer();
  const r = await prepararFoto(png);
  assert.deepEqual([r.ancho, r.alto], [400, 300]);
});

test('transcripciones inventadas por Whisper se descartan', () => {
  for (const t of ['Subtítulos realizados por la comunidad de Amara.org', '¡Gracias por ver el video!', '...', ' ', '[Música]']) {
    assert.equal(limpiarTranscripcion(t), '', t);
  }
  assert.equal(limpiarTranscripcion(' Jarrón azul, quince mil. '), 'Jarrón azul, quince mil.');
});

test('firma del webhook', () => {
  const cuerpo = '{"a":1}';
  const firma = 'sha256=' + crypto.createHmac('sha256', 'secreto').update(cuerpo).digest('hex');
  assert.equal(firmaValida(cuerpo, firma, 'secreto'), true);
  assert.equal(firmaValida(cuerpo + ' ', firma, 'secreto'), false);
  assert.equal(firmaValida(cuerpo, 'sha256=abc', 'secreto'), false);
  assert.equal(firmaValida(cuerpo, null, 'secreto'), false);
  assert.equal(firmaValida(cuerpo, firma, ''), false);
});

test('normalizarMensaje', () => {
  const contactos = [{ wa_id: '549111', profile: { name: 'Norma' } }];
  assert.deepEqual(
    normalizarMensaje({ from: '549111', id: 'w1', type: 'image', image: { id: 'm1', caption: 'Taza 5000' }, context: { id: 'w0' } }, contactos),
    { de: '549111', nombre: 'Norma', msgId: 'w1', respondeA: 'w0', tipo: 'imagen', mediaId: 'm1', texto: 'Taza 5000' },
  );
  assert.equal(normalizarMensaje({ from: '1', id: 'w', type: 'text', text: { body: 'hola' } }).texto, 'hola');
  assert.equal(normalizarMensaje({ from: '1', id: 'w', type: 'audio', audio: { id: 'a' } }).tipo, 'audio');
  assert.equal(normalizarMensaje({ from: '1', id: 'w', type: 'document', document: { id: 'd', mime_type: 'image/jpeg' } }).tipo, 'imagen');
  assert.equal(normalizarMensaje({ from: '1', id: 'w', type: 'document', document: { id: 'd', mime_type: 'application/pdf' } }).tipo, 'otro');
  assert.equal(normalizarMensaje({ from: '1', id: 'w', type: 'reaction' }).tipo, 'ignorar');
  assert.equal(normalizarMensaje({ from: '1', id: 'w', type: 'sticker' }).tipo, 'otro');
});
