// Conversaciones completas contra una base y un WhatsApp falsos (en memoria).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBot } from './ejecutar.js';

const NORMA = '5491111111111';
const JURADO = '5491199999999';

function armar() {
  const catalogos = [{ id: 'c-norma', slug: 'norma', nombre: 'Taller de Norma', es_prueba: false, telefono: null }];
  const piezas = [];
  const referencias = new Map();
  const conversaciones = new Map();
  const procesados = new Set();
  const enviados = [];
  let n = 0;
  const id = (p) => `${p}${++n}`;

  const conv = (tel) => conversaciones.get(tel) ?? { pendiente: null, cola_fotos: [], ultima_accion: null };

  const db = {
    async marcarProcesado(mid) { if (procesados.has(mid)) return false; procesados.add(mid); return true; },
    async catalogoPorSlug(slug) { return catalogos.find((c) => c.slug === slug) ?? null; },
    async catalogoPorTelefono(tel) { return catalogos.find((c) => c.telefono === tel) ?? null; },
    async crearCatalogoPrueba(telefono, slug) { const c = { id: id('c'), slug, nombre: 'Página de prueba', es_prueba: true, telefono }; catalogos.push(c); return c; },
    async conversacion(tel) { const c = conv(tel); return { pendiente: c.pendiente, ultima_accion: c.ultima_accion }; },
    async guardarConversacion(tel, catalogoId, campos) { conversaciones.set(tel, { ...conv(tel), ...structuredClone(campos) }); },
    async encolarFoto(tel, catalogoId, foto) {
      const c = conv(tel);
      if (c.pendiente?.tipo === 'datos-de-foto') { c.cola_fotos = [...c.cola_fotos, foto]; conversaciones.set(tel, c); return 'cola'; }
      c.pendiente = { ...foto, tipo: 'datos-de-foto' }; conversaciones.set(tel, c); return 'actual';
    },
    async siguienteFoto(tel) {
      const c = conv(tel);
      if (c.pendiente || !c.cola_fotos.length) return null;
      const [sig, ...resto] = c.cola_fotos;
      c.pendiente = { ...sig, tipo: 'datos-de-foto' }; c.cola_fotos = resto; conversaciones.set(tel, c);
      return c.pendiente;
    },
    async piezas(cid) { return piezas.filter((p) => p.catalogo_id === cid).map((p) => ({ ...p })).reverse(); },
    async piezaPorReferencia(mid, cid) { const p = piezas.find((x) => x.id === referencias.get(mid)); return p && p.catalogo_id === cid ? { ...p } : null; },
    async crearPieza(d) { const p = { id: id('p'), estado: 'disponible', vendida_en: null, ...d }; piezas.push(p); return { ...p }; },
    async actualizarPieza(pid, campos) { const p = piezas.find((x) => x.id === pid); if (!p) return null; Object.assign(p, campos); return { ...p }; },
    async borrarPieza(pid) { const i = piezas.findIndex((x) => x.id === pid); if (i >= 0) piezas.splice(i, 1); },
    async agregarReferencia(mid, pid) { referencias.set(mid, pid); },
    async subirFoto(ruta) { return ruta; },
  };

  const wa = {
    async enviarTexto(para, texto, { responderA } = {}) { const mid = id('bot'); enviados.push({ para, texto, responderA, mid }); return mid; },
    async marcarLeido() {},
    async descargarMedia(mediaId) { return { buffer: Buffer.from(mediaId), mime: mediaId.startsWith('aud') ? 'audio/ogg' : 'image/jpeg' }; },
  };

  const transcripciones = new Map();
  const medios = {
    async prepararFoto() { return { buffer: Buffer.from('x'), ancho: 800, alto: 600, contentType: 'image/webp' }; },
    async transcribir(buffer) { return transcripciones.get(buffer.toString()) ?? ''; },
  };

  const errores = [];
  const bot = crearBot({
    db, wa, medios, telefonosNorma: [NORMA], slugNorma: 'norma',
    urlPagina: (s) => (s === 'norma' ? 'https://norma.test' : `https://norma.test/p/${s}`),
    log: (e) => errores.push(e),
  });

  // Helpers para escribir conversaciones como guiones.
  const decir = async (de, texto, extra = {}) => { const msgId = id('w'); await bot.procesar({ de, msgId, tipo: 'texto', texto, ...extra }); return msgId; };
  const foto = async (de, texto = '', extra = {}) => { const msgId = id('w'); await bot.procesar({ de, msgId, tipo: 'imagen', mediaId: id('img'), texto, ...extra }); return msgId; };
  const audio = async (de, dicho, extra = {}) => { const mediaId = id('aud'); transcripciones.set(mediaId, dicho); const msgId = id('w'); await bot.procesar({ de, msgId, tipo: 'audio', mediaId, ...extra }); return msgId; };
  const ultimo = () => enviados.at(-1);
  const leer = () => enviados.splice(0);

  return { bot, db, piezas, enviados, errores, conversaciones, decir, foto, audio, ultimo, leer };
}

test('Norma agrega una pieza con foto y texto', async () => {
  const t = armar();
  const msg = await t.foto(NORMA, 'Jarrón azul 15000');
  assert.equal(t.piezas.length, 1);
  assert.deepEqual([t.piezas[0].titulo, t.piezas[0].precio, t.piezas[0].catalogo_id], ['Jarrón azul', 15000, 'c-norma']);
  assert.match(t.ultimo().texto, /Listo.*\n\*Jarrón azul\*, \$ 15\.000\n\nhttps:\/\/norma\.test$/s);
  assert.equal(t.ultimo().responderA, msg);
  assert.deepEqual(t.errores, []);
});

test('Norma marca vendida respondiendo a la foto, y lo deshace', async () => {
  const t = armar();
  const msg = await t.foto(NORMA, 'Jarrón azul 15000');
  await t.decir(NORMA, 'vendido', { respondeA: msg });
  assert.equal(t.piezas[0].estado, 'vendida');
  assert.match(t.ultimo().texto, /Saqué \*Jarrón azul\* de la página/);
  await t.decir(NORMA, 'me equivoqué');
  assert.equal(t.piezas[0].estado, 'disponible');
  assert.match(t.ultimo().texto, /quedó como antes/);
  await t.decir(NORMA, 'deshacer');
  assert.match(t.ultimo().texto, /No hay nada para deshacer/);
});

test('responder al "¡Listo!" del bot también edita la pieza', async () => {
  const t = armar();
  await t.foto(NORMA, 'Jarrón azul 15000');
  const listo = t.ultimo().mid;
  await t.decir(NORMA, '18000', { respondeA: listo });
  assert.equal(t.piezas[0].precio, 18000);
  assert.match(t.ultimo().texto, /ahora sale \*\$ 18\.000\*/);
});

test('foto sola, después los datos', async () => {
  const t = armar();
  const msg = await t.foto(NORMA);
  assert.match(t.ultimo().texto, /¿Cómo se llama y cuánto sale\?/);
  assert.equal(t.ultimo().responderA, msg);
  await t.decir(NORMA, 'Maceta');
  assert.match(t.ultimo().texto, /¿Cuánto sale \*Maceta\*\?/);
  await t.decir(NORMA, '9800');
  assert.equal(t.piezas.length, 1);
  assert.deepEqual([t.piezas[0].titulo, t.piezas[0].precio], ['Maceta', 9800]);
  assert.equal(t.ultimo().responderA, msg, 'el "Listo" cita la foto');
  // Responder a la foto original ahora edita esa pieza.
  await t.decir(NORMA, 'vendida', { respondeA: msg });
  assert.equal(t.piezas[0].estado, 'vendida');
});

test('álbum de tres fotos sin texto: pregunta de a una, en orden', async () => {
  const t = armar();
  const f1 = await t.foto(NORMA);
  const f2 = await t.foto(NORMA);
  const f3 = await t.foto(NORMA);
  const preguntas = t.leer();
  assert.equal(preguntas.length, 1, 'solo pregunta por la primera');
  assert.equal(preguntas[0].responderA, f1);

  await t.decir(NORMA, 'Taza 5000');
  let r = t.leer();
  assert.equal(r.length, 2);
  assert.match(r[0].texto, /Taza/);
  assert.match(r[1].texto, /¿Cómo se llama y cuánto sale\?/);
  assert.equal(r[1].responderA, f2);

  await t.decir(NORMA, 'Plato 7000');
  r = t.leer();
  assert.equal(r[1].responderA, f3);
  await t.decir(NORMA, 'Bowl 4000');
  r = t.leer();
  assert.equal(r.length, 1);
  assert.deepEqual(t.piezas.map((p) => p.titulo), ['Taza', 'Plato', 'Bowl']);
});

test('audio: confirma antes de guardar; "no" vuelve a pedir los datos', async () => {
  const t = armar();
  const f = await t.foto(NORMA);
  await t.audio(NORMA, 'Este plato verde sale doce mil pesos.');
  assert.match(t.ultimo().texto, /Entendí esto:\nAgregar \*Plato verde\*, \$ 12\.000\n\n¿Está bien\? Respondé \*sí\* o \*no\*\./);
  assert.equal(t.piezas.length, 0);

  await t.decir(NORMA, 'no');
  assert.match(t.ultimo().texto, /no la guardé/);
  assert.equal(t.ultimo().responderA, f);

  await t.audio(NORMA, 'Plato verde, doce mil quinientos');
  await t.audio(NORMA, 'Sí.');
  assert.equal(t.piezas.length, 1);
  assert.deepEqual([t.piezas[0].titulo, t.piezas[0].precio], ['Plato verde', 12500]);
  assert.equal(t.ultimo().responderA, f);
});

test('audio vacío o alucinado', async () => {
  const t = armar();
  await t.audio(NORMA, '');
  assert.match(t.ultimo().texto, /No pude escuchar bien/);
});

test('lista y link', async () => {
  const t = armar();
  await t.decir(NORMA, 'lista');
  assert.match(t.ultimo().texto, /no tiene piezas/);
  await t.foto(NORMA, 'Jarrón azul 15000');
  await t.foto(NORMA, 'Taza 5000');
  await t.decir(NORMA, 'lista');
  assert.equal(t.ultimo().texto, 'Tenés 2 piezas en la página:\n\n1. Taza, $ 5.000\n2. Jarrón azul, $ 15.000\n\nhttps://norma.test');
  await t.decir(NORMA, 'link');
  assert.match(t.ultimo().texto, /https:\/\/norma\.test/);
});

test('el jurado recibe su propia página de prueba y no toca la de Norma', async () => {
  const t = armar();
  await t.foto(NORMA, 'Jarrón azul 15000');
  const deNorma = t.ultimo().responderA;
  t.leer();

  await t.decir(JURADO, 'Hola');
  const r = t.leer();
  assert.equal(r.length, 1, 'solo la bienvenida');
  assert.match(r[0].texto, /página de prueba/);
  assert.match(r[0].texto, /https:\/\/norma\.test\/p\/prueba-[0-9a-f]{8}/);

  await t.foto(JURADO, 'Mate 3500');
  const cJurado = t.piezas.at(-1).catalogo_id;
  assert.notEqual(cJurado, 'c-norma');
  assert.match(t.ultimo().texto, /\/p\/prueba-/);

  // Aunque responda a un id de mensaje de Norma, no puede tocar sus piezas.
  await t.decir(JURADO, 'vendido', { respondeA: deNorma });
  assert.equal(t.piezas[0].estado, 'disponible');
});

test('el jurado arranca directo con una foto: bienvenida y la pieza agregada', async () => {
  const t = armar();
  await t.foto(JURADO, 'Taza 5000');
  const r = t.leer();
  assert.equal(r.length, 2);
  assert.match(r[0].texto, /página de prueba/);
  assert.match(r[1].texto, /Ya está en tu página/);
});

test('mensaje repetido por WhatsApp se procesa una vez', async () => {
  const t = armar();
  const m = { de: NORMA, msgId: 'dup', tipo: 'imagen', mediaId: 'img-x', texto: 'Taza 5000' };
  await t.bot.procesar(m);
  await t.bot.procesar({ ...m });
  assert.equal(t.piezas.length, 1);
});

test('vendí el jarrón sin responder: pregunta y confirma', async () => {
  const t = armar();
  await t.foto(NORMA, 'Jarrón azul 15000');
  await t.decir(NORMA, 'Vendí el jarrón azul');
  assert.match(t.ultimo().texto, /Entendí esto:\n\*Jarrón azul\* se vendió/);
  await t.decir(NORMA, 'sí');
  assert.equal(t.piezas[0].estado, 'vendida');
});

test('si falla algo, avisa con un mensaje amable', async () => {
  const t = armar();
  t.db.crearPieza = async () => { throw new Error('se cayó la base'); };
  await t.foto(NORMA, 'Taza 5000');
  assert.match(t.ultimo().texto, /algo falló de mi lado/);
  assert.equal(t.errores.length, 1);
});
