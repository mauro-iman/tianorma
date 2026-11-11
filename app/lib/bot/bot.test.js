import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraerPieza } from './extraer.js';
import { interpretar } from './interpretar.js';

// ---------- extraerPieza: cómo escribe (o dicta) la gente ----------

const casos = [
  ['Jarrón azul 15000', 'Jarrón azul', 15000],
  ['Jarrón azul 15.000', 'Jarrón azul', 15000],
  ['Jarrón azul $15.000', 'Jarrón azul', 15000],
  ['Jarrón azul $ 15.000', 'Jarrón azul', 15000],
  ['jarrón azul a 15000', 'Jarrón azul', 15000],
  ['Jarrón azul, sale 15.000 pesos', 'Jarrón azul', 15000],
  ['Jarrón azul 15 mil', 'Jarrón azul', 15000],
  ['Jarrón azul 15mil', 'Jarrón azul', 15000],
  ['Jarrón azul 15k', 'Jarrón azul', 15000],
  ['Jarrón azul quince mil', 'Jarrón azul', 15000],
  ['15000 jarrón azul', 'Jarrón azul', 15000],
  ['$15.000 Jarrón azul', 'Jarrón azul', 15000],
  ['Plato hondo verde 12.500', 'Plato hondo verde', 12500],
  ['Plato 12,5 mil', 'Plato', 12500],
  ['Plato doce mil quinientos', 'Plato', 12500],
  ['Fuente 15 mil quinientos', 'Fuente', 15500],
  ['Juego de 4 cuencos 12000', 'Juego de 4 cuencos', 12000],
  ['12000 juego de 4 cuencos', 'Juego de 4 cuencos', 12000],
  ['Maceta 30 cm 8000', 'Maceta 30 cm', 8000],
  ['Taza grande 6.500,00', 'Taza grande', 6500],
  ['Jarra 1.250.000', 'Jarra', 1250000],
  ['Mate 3500.', 'Mate', 3500],
  ['Fuente ovalada. Precio: 28000', 'Fuente ovalada', 28000],
  ['Bowl 9000 c/u', 'Bowl', 9000],
  // Transcripciones de audio
  ['Este plato verde sale doce mil pesos.', 'Plato verde', 12000],
  ['Bueno, este jarrón celeste lo pongo a veinte mil', 'Jarrón celeste', 20000],
  ['Es una taza con flores, cuesta $8,000.', 'Taza con flores', 8000],
  ['Se llama cuenco rústico y vale cinco mil', 'Cuenco rústico', 5000],
  ['Una fuente grande, treinta y cinco mil', 'Una fuente grande', 35000],
  ['Cien pesos el posavasos', 'El posavasos', 100],
  // Sin precio
  ['Jarrón azul', 'Jarrón azul', null],
  ['Juego de 4 tazas', 'Juego de 4 tazas', null],
  ['Taza de dos colores', 'Taza de dos colores', null],
  // Solo precio
  ['15000', '', 15000],
  ['$ 15.000', '', 15000],
  ['quince mil', '', 15000],
];

for (const [texto, titulo, precio] of casos) {
  test(`extraer: "${texto}"`, () => {
    assert.deepEqual(extraerPieza(texto), { titulo, precio });
  });
}

test('extraer: limpia emojis y mayúsculas sostenidas', () => {
  assert.deepEqual(extraerPieza('Cuenco 4500 😊'), { titulo: 'Cuenco', precio: 4500 });
  assert.deepEqual(extraerPieza('JARRÓN AZUL 15000'), { titulo: 'Jarrón azul', precio: 15000 });
  assert.deepEqual(extraerPieza('Fuente para 6 personas 25 lucas'), { titulo: 'Fuente para 6 personas', precio: 25000 });
  assert.deepEqual(extraerPieza('Tetera 12.000 \nhecha a mano'), { titulo: 'Tetera hecha a mano', precio: 12000 });
});

test('extraer: dos precios es ambiguo', () => {
  for (const t of ['Jarrón azul 15000 y plato 12000', 'Plato 1500 o 2000 los dos', 'Jarra de 500 ml 9000']) {
    assert.deepEqual(extraerPieza(t), { titulo: '', precio: null, variosPrecios: true }, t);
  }
  // Si uno solo tiene "$", ese es el precio.
  assert.deepEqual(extraerPieza('Jarra de 500 ml $9000'), { titulo: 'Jarra de 500 ml', precio: 9000 });
});

test('foto con dos precios: pregunta', () => {
  assert.deepEqual(interpretar(foto('Jarrón 15000 y plato 12000'), {}), { tipo: 'varios-precios', mediaId: 'm1' });
});

test('extraer: títulos larguísimos se cortan en una palabra entera', () => {
  const { titulo } = extraerPieza('Fuente '.repeat(30) + '1000');
  assert.ok(titulo.length <= 80, titulo.length);
  assert.ok(!titulo.endsWith(' '));
  assert.match(titulo, /Fuente$/);
});

// ---------- interpretar ----------

const jarron = { id: 'p1', titulo: 'Jarrón azul', precio: 15000, estado: 'disponible' };
const plato = { id: 'p2', titulo: 'Plato hondo verde', precio: 12000, estado: 'disponible' };
const vendido = { id: 'p3', titulo: 'Taza roja', precio: 5000, estado: 'vendida' };
const piezas = [jarron, plato, vendido];

const txt = (texto, extra = {}) => ({ tipo: 'texto', texto, ...extra });
const foto = (texto = '', extra = {}) => ({ tipo: 'imagen', mediaId: 'm1', texto, ...extra });
const audio = (texto) => ({ tipo: 'audio', texto });

test('foto con nombre y precio: agrega', () => {
  assert.deepEqual(interpretar(foto('Jarrón azul 15000'), { piezas }),
    { tipo: 'agregar', mediaId: 'm1', titulo: 'Jarrón azul', precio: 15000 });
});

test('foto sola: pide los datos', () => {
  assert.deepEqual(interpretar(foto(), { piezas }),
    { tipo: 'pedir-datos', mediaId: 'm1', titulo: null, precio: null });
});

test('foto con nombre sin precio: pide el precio', () => {
  assert.deepEqual(interpretar(foto('Maceta'), { piezas }),
    { tipo: 'pedir-datos', mediaId: 'm1', titulo: 'Maceta', precio: null });
});

test('después de la foto, manda los datos en otro mensaje', () => {
  const pendiente = { tipo: 'datos-de-foto', mediaId: 'm9', titulo: null, precio: null };
  assert.deepEqual(interpretar(txt('Maceta 9800'), { pendiente, piezas }),
    { tipo: 'agregar', mediaId: 'm9', titulo: 'Maceta', precio: 9800 });
});

test('después de la foto con nombre, manda solo el precio', () => {
  const pendiente = { tipo: 'datos-de-foto', mediaId: 'm9', titulo: 'Maceta', precio: null };
  assert.deepEqual(interpretar(txt('9.800'), { pendiente, piezas }),
    { tipo: 'agregar', mediaId: 'm9', titulo: 'Maceta', precio: 9800 });
});

test('después de la foto, manda solo el precio sin nombre: pide el nombre', () => {
  const pendiente = { tipo: 'datos-de-foto', mediaId: 'm9', titulo: null, precio: null };
  assert.deepEqual(interpretar(txt('9800'), { pendiente, piezas }),
    { tipo: 'pedir-datos', mediaId: 'm9', titulo: null, precio: 9800 });
});

test('después de la foto, dicta los datos por audio: confirma', () => {
  const pendiente = { tipo: 'datos-de-foto', mediaId: 'm9' };
  assert.deepEqual(interpretar(audio('Este plato verde sale doce mil'), { pendiente, piezas }), {
    tipo: 'confirmar',
    accion: { tipo: 'agregar', mediaId: 'm9', titulo: 'Plato verde', precio: 12000 },
  });
});

test('confirmación: "sí" ejecuta, "no" cancela', () => {
  const accion = { tipo: 'agregar', mediaId: 'm9', titulo: 'Plato verde', precio: 12000 };
  const pendiente = { tipo: 'confirmar', accion };
  for (const si of ['sí', 'Si', 'SI', 'sii', 'dale', 'Sí, está bien', 'ok', '👍', 'si.']) {
    assert.deepEqual(interpretar(txt(si), { pendiente, piezas }), accion, si);
  }
  assert.deepEqual(interpretar(audio('Sí.'), { pendiente, piezas }), accion);
  for (const no of ['no', 'No', 'NO', 'no no', 'cancelar']) {
    assert.deepEqual(interpretar(txt(no), { pendiente, piezas }), { tipo: 'cancelado' }, no);
  }
});

test('responder "vendido" a la foto', () => {
  for (const t of ['vendido', 'Vendido!', 'VENDIDA', 'se vendió', 'la vendí', 'ya no está', 'sacala']) {
    assert.deepEqual(interpretar(txt(t), { piezaRespondida: jarron, piezas }), { tipo: 'vendida', piezaId: 'p1' }, t);
  }
});

test('responder "vendido" por audio: confirma', () => {
  assert.deepEqual(interpretar(audio('Esta ya se vendió'), { piezaRespondida: jarron, piezas }),
    { tipo: 'confirmar', accion: { tipo: 'vendida', piezaId: 'p1' } });
});

test('vendido a una pieza ya vendida', () => {
  assert.deepEqual(interpretar(txt('vendido'), { piezaRespondida: vendido, piezas }), { tipo: 'ya-vendida', piezaId: 'p3' });
});

test('volver a poner una pieza vendida', () => {
  assert.deepEqual(interpretar(txt('disponible'), { piezaRespondida: vendido, piezas }), { tipo: 'disponible', piezaId: 'p3' });
  assert.deepEqual(interpretar(txt('no se vendió'), { piezaRespondida: vendido, piezas }), { tipo: 'disponible', piezaId: 'p3' });
});

test('responder con un precio nuevo', () => {
  for (const t of ['18000', '18.000', '$18.000', 'ahora sale 18000', 'nuevo precio 18 mil', 'Jarrón azul 18000']) {
    assert.deepEqual(interpretar(txt(t), { piezaRespondida: jarron, piezas }), { tipo: 'precio', piezaId: 'p1', precio: 18000 }, t);
  }
});

test('responder con texto suelto: pregunta antes de renombrar', () => {
  assert.deepEqual(interpretar(txt('Jarrón celeste'), { piezaRespondida: jarron, piezas }),
    { tipo: 'confirmar', accion: { tipo: 'titulo', piezaId: 'p1', titulo: 'Jarrón celeste' } });
});

test('responder "gracias" u "ok" a la foto no cambia nada', () => {
  assert.deepEqual(interpretar(txt('gracias'), { piezaRespondida: jarron, piezas }), { tipo: 'de-nada' });
  assert.deepEqual(interpretar(txt('ok'), { piezaRespondida: jarron, piezas }), { tipo: 'nada' });
  assert.deepEqual(interpretar(txt('👍'), { piezaRespondida: jarron, piezas }), { tipo: 'nada' });
});

test('responder con otra foto: cambia la foto', () => {
  assert.deepEqual(interpretar(foto('', { mediaId: 'm2' }), { piezaRespondida: jarron, piezas }),
    { tipo: 'foto', piezaId: 'p1', mediaId: 'm2', titulo: null, precio: null });
});

test('vendido sin responder a la foto, nombrando la pieza: confirma', () => {
  assert.deepEqual(interpretar(txt('Vendí el jarrón azul'), { piezas }),
    { tipo: 'confirmar', accion: { tipo: 'vendida', piezaId: 'p1' } });
});

test('cambio de precio nombrando la pieza: confirma', () => {
  assert.deepEqual(interpretar(txt('El plato hondo verde ahora sale 14000'), { piezas }),
    { tipo: 'confirmar', accion: { tipo: 'precio', piezaId: 'p2', precio: 14000 } });
});

test('vendido sin decir cuál: pregunta', () => {
  assert.deepEqual(interpretar(txt('vendido'), { piezas }), { tipo: 'cual-pieza' });
});

test('comandos', () => {
  assert.deepEqual(interpretar(txt('lista'), { piezas }), { tipo: 'lista' });
  assert.deepEqual(interpretar(txt('¿Qué tengo?'), { piezas }), { tipo: 'lista' });
  assert.deepEqual(interpretar(txt('Hola'), { piezas }), { tipo: 'ayuda' });
  assert.deepEqual(interpretar(txt('Buen día!'), { piezas }), { tipo: 'ayuda' });
  assert.deepEqual(interpretar(txt('ayuda'), { piezas }), { tipo: 'ayuda' });
  assert.deepEqual(interpretar(txt('link'), { piezas }), { tipo: 'link' });
  assert.deepEqual(interpretar(txt('Mi página'), { piezas }), { tipo: 'link' });
  assert.deepEqual(interpretar(txt('me equivoqué'), { piezas }), { tipo: 'deshacer' });
  assert.deepEqual(interpretar(audio('Lista'), { piezas }), { tipo: 'lista' });
});

test('nombre y precio sin foto: pide la foto', () => {
  assert.deepEqual(interpretar(txt('Maceta 9800'), { piezas }), { tipo: 'falta-foto' });
});

test('cualquier otra cosa', () => {
  assert.deepEqual(interpretar(txt('asdf'), { piezas }), { tipo: 'no-entendi' });
  assert.deepEqual(interpretar({ tipo: 'otro' }, { piezas }), { tipo: 'no-soportado' });
  assert.deepEqual(interpretar(audio(''), { piezas }), { tipo: 'audio-vacio' });
});
