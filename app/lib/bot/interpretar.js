// Decide QUÉ quiso hacer quien escribe. Es una función pura: no toca la base ni WhatsApp.
// El ejecutor (otro módulo) lleva a cabo la acción y responde con los textos de textos.js.
//
// Mensaje de entrada (ya normalizado desde el webhook):
//   { tipo: 'imagen' | 'texto' | 'audio' | 'otro', texto?, mediaId?, respondeA? }
//   - en 'audio', `texto` es la transcripción.
//   - `respondeA` es el id del mensaje al que responde (si lo hay).
// Contexto:
//   { piezaRespondida?: Pieza, pendiente?: Pendiente, piezas: Pieza[] }
//   Pieza = { id, titulo, precio, estado: 'disponible' | 'vendida' }
//   Pendiente = { tipo: 'datos-de-foto', mediaId, titulo?, precio? }
//             | { tipo: 'confirmar', accion }
//
// Acciones que devuelve: ver los `tipo` al final de cada rama.

import { normalizar } from './texto.js';
import { extraerPieza } from './extraer.js';

const tiene = (n, re) => re.test(n);

const RE = {
  si: /^(si+|sip|sii+|dale|ok|okey|okay|oka|bueno|bueno si|si si|correcto|perfecto|exacto|esta bien|asi es|claro|joya|genial|si esta bien|si, esta bien|👍|✅|👌)[\s.!]*$/u,
  no: /^(no+|nop|nope|no no|cancelar|cancela|cancelalo|mal|esta mal|no es asi|no esta bien|❌|👎)[\s.!]*$/u,
  vendida: /\b(vendid[oa]s?|vendi|la vendi|lo vendi|se vendio|ya no esta|ya no hay|no esta mas|sacal[oa]|sacar|borral[oa]|borrar|elimin(ar|al[oa])|quit(ar|al[oa])|chau)\b/,
  disponible: /\b(disponible|volvio|no se vendio|la devolvieron|lo devolvieron|devolvieron|ponel[oa] de nuevo|de nuevo en venta|sigue en venta|otra vez)\b/,
  ayuda: /^(hola+|buenas|buen dia|buenos dias|buenas tardes|buenas noches|ayuda|ayudame|menu|como (se )?(hago|funciona|es)|que hago|instrucciones|\?+|empezar|inicio)\b/,
  lista: /^(lista|la lista|mis piezas|que tengo|que hay|que piezas tengo|ver lista|ver piezas|piezas|inventario|catalogo)[\s?!.]*$/,
  link: /^(link|el link|enlace|pagina|mi pagina|la pagina|direccion|ver pagina|ver mi pagina|pasame el link|cual es (el link|la pagina|mi pagina))[\s?!.]*$/,
  deshacer: /^(deshacer|deshace|deshacelo|me equivoque|volver atras|volve atras|error|era un error|anular)[\s?!.]*$/,
  gracias: /^(gracias|muchas gracias|mil gracias|grac|gracias!+|genia|genio|que bien|barbaro)[\s?!.]*$/,
  cortesia: /^(listo|ok|okey|bueno|joya|perfecto|dale|jaja+|jeje+|👍|👌|🙂|😊|❤️|♥️)[\s?!.]*$/u,
};

/** Puntaje de cuánto se parece un texto al título de una pieza (0 a 1). */
function parecido(texto, titulo) {
  const palabras = (s) => normalizar(s).split(/[^a-z0-9ñ]+/).filter((p) => p.length > 2);
  const enTexto = new Set(palabras(texto));
  const delTitulo = palabras(titulo);
  if (!delTitulo.length) return 0;
  return delTitulo.filter((p) => enTexto.has(p)).length / delTitulo.length;
}

/** Busca UNA pieza nombrada en el texto ("vendí el jarrón azul"). Si hay dudas, devuelve null. */
export function buscarPiezaNombrada(texto, piezas) {
  const puntajes = piezas
    .map((p) => ({ p, s: parecido(texto, p.titulo) }))
    .filter((x) => x.s >= 0.6)
    .sort((a, b) => b.s - a.s);
  if (!puntajes.length) return null;
  if (puntajes.length > 1 && puntajes[1].s === puntajes[0].s) return null; // empate: mejor preguntar
  return puntajes[0].p;
}

/** Acciones que cambian la página: si vinieron por audio, primero se confirman. */
const MODIFICA = new Set(['agregar', 'vendida', 'disponible', 'precio', 'titulo', 'foto']);

export function interpretar(msg, ctx = {}) {
  const accion = interpretarSinConfirmar(msg, ctx);
  // Un "sí" (aunque sea por audio) a una confirmación pendiente ejecuta: no se vuelve a preguntar.
  if (ctx.pendiente?.tipo === 'confirmar' && accion === ctx.pendiente.accion) return accion;
  if (msg.tipo === 'audio' && MODIFICA.has(accion.tipo)) return { tipo: 'confirmar', accion };
  return accion;
}

function interpretarSinConfirmar(msg, ctx) {
  const { piezaRespondida, pendiente, piezas = [] } = ctx;
  const texto = (msg.texto ?? '').trim();
  const n = normalizar(texto).replace(/^[¿¡\s]+/, '');

  if (msg.tipo === 'otro') return { tipo: 'no-soportado' };
  if (msg.tipo === 'audio' && !n) return { tipo: 'audio-vacio' };

  // 1. Esperando un "sí" o "no".
  if (pendiente?.tipo === 'confirmar' && msg.tipo !== 'imagen') {
    if (tiene(n, RE.si)) return pendiente.accion;
    if (tiene(n, RE.no)) return { tipo: 'cancelado' };
    // Cualquier otra cosa: se descarta la confirmación y se interpreta como mensaje nuevo.
  }

  // 2. Foto.
  if (msg.tipo === 'imagen') {
    const datos = texto ? extraerPieza(texto) : { titulo: '', precio: null };
    if (piezaRespondida) {
      // Responder a una pieza con otra foto = cambiarle la foto (y si trae texto, también los datos).
      return { tipo: 'foto', piezaId: piezaRespondida.id, mediaId: msg.mediaId, titulo: datos.titulo || null, precio: datos.precio };
    }
    if (datos.variosPrecios) return { tipo: 'varios-precios', mediaId: msg.mediaId };
    if (datos.titulo && datos.precio) return { tipo: 'agregar', mediaId: msg.mediaId, titulo: datos.titulo, precio: datos.precio };
    return { tipo: 'pedir-datos', mediaId: msg.mediaId, titulo: datos.titulo || null, precio: datos.precio };
  }

  // 3. Comandos y cortesía (valen siempre).
  if (tiene(n, RE.lista)) return { tipo: 'lista' };
  if (tiene(n, RE.link)) return { tipo: 'link' };
  if (tiene(n, RE.deshacer)) return { tipo: 'deshacer' };
  if (tiene(n, RE.gracias)) return { tipo: 'de-nada' };
  if (tiene(n, RE.cortesia)) return { tipo: 'nada' };
  if (!piezaRespondida && tiene(n, RE.ayuda) && !extraerPieza(texto).precio) return { tipo: 'ayuda' };

  // 4. Respuesta a la foto de una pieza.
  if (piezaRespondida) return sobrePieza(piezaRespondida, texto, n, false);

  // 5. Completando los datos de una foto que mandó antes.
  if (pendiente?.tipo === 'datos-de-foto') {
    if (tiene(n, RE.no)) return { tipo: 'cancelado' };
    const datos = extraerPieza(texto);
    if (datos.variosPrecios) return { tipo: 'varios-precios', mediaId: pendiente.mediaId };
    const titulo = pendiente.titulo || datos.titulo || null;
    const precio = datos.precio ?? pendiente.precio ?? null;
    // Si ya tenía título y ahora manda solo un texto sin precio, puede estar corrigiendo el nombre.
    const tituloFinal = pendiente.titulo && datos.titulo && !datos.precio ? datos.titulo : titulo;
    if (tituloFinal && precio) return { tipo: 'agregar', mediaId: pendiente.mediaId, titulo: tituloFinal, precio };
    return { tipo: 'pedir-datos', mediaId: pendiente.mediaId, titulo: tituloFinal, precio };
  }

  // 6. Habla de una pieza por su nombre, sin responder a la foto ("vendí el jarrón azul").
  const nombrada = buscarPiezaNombrada(texto, piezas);
  if (nombrada) {
    const accion = sobrePieza(nombrada, texto, n, true);
    // Adivinar la pieza por el nombre puede fallar: siempre se confirma.
    if (MODIFICA.has(accion.tipo)) return { tipo: 'confirmar', accion };
    return accion;
  }
  if (tiene(n, RE.vendida) || tiene(n, RE.disponible)) return { tipo: 'cual-pieza' };

  // 7. Mandó nombre y precio pero sin foto.
  const suelto = extraerPieza(texto);
  if (suelto.precio || suelto.variosPrecios) return { tipo: 'falta-foto' };

  return { tipo: 'no-entendi' };
}

function sobrePieza(pieza, texto, n, porNombre) {
  if (tiene(n, RE.disponible)) {
    return pieza.estado === 'vendida' ? { tipo: 'disponible', piezaId: pieza.id } : { tipo: 'ya-disponible', piezaId: pieza.id };
  }
  if (tiene(n, RE.vendida)) {
    return pieza.estado === 'vendida' ? { tipo: 'ya-vendida', piezaId: pieza.id } : { tipo: 'vendida', piezaId: pieza.id };
  }
  const datos = extraerPieza(texto);
  if (datos.variosPrecios) return { tipo: 'cual-cambio', piezaId: pieza.id };
  // Si trae un número, es un cambio de precio. El resto del texto ("ahora sale", "nuevo precio",
  // o el mismo nombre) se ignora: renombrar con un precio en el medio es más riesgoso que útil.
  if (datos.precio) return { tipo: 'precio', piezaId: pieza.id, precio: datos.precio };
  if (porNombre) return { tipo: 'cual-cambio', piezaId: pieza.id };
  if (datos.titulo) {
    // Un texto suelto respondiendo a la foto podría ser un nombre nuevo... o un "qué lindo".
    // Nunca se renombra sin preguntar.
    return { tipo: 'confirmar', accion: { tipo: 'titulo', piezaId: pieza.id, titulo: datos.titulo } };
  }
  return { tipo: 'cual-cambio', piezaId: pieza.id };
}
