// Lleva a cabo lo que decidió interpretar.js: guarda en la base, arma la respuesta y la manda.
// Recibe sus dependencias (db, wa, medios) para poder probarlo entero sin internet.

import crypto from 'node:crypto';
import { interpretar } from './interpretar.js';
import { textos } from './textos.js';

const MAX_PIEZAS_PRUEBA = 40;

/**
 * @param {object} deps
 * @param {object} deps.db        ver db.js
 * @param {object} deps.wa        { enviarTexto, marcarLeido, descargarMedia }
 * @param {object} deps.medios    { prepararFoto, transcribir }
 * @param {string[]} deps.telefonosNorma  números autorizados a editar la página real
 * @param {string} deps.slugNorma
 * @param {(slug: string) => string} deps.urlPagina
 * @param {(e: Error) => void} [deps.log]
 */
export function crearBot(deps) {
  const { db, wa, medios, telefonosNorma, slugNorma, urlPagina, log = console.error } = deps;

  async function catalogoDe(telefono) {
    if (telefonosNorma.includes(telefono)) {
      const c = await db.catalogoPorSlug(slugNorma);
      if (!c) throw new Error(`No existe el catálogo "${slugNorma}"`);
      return { catalogo: c, nuevo: false };
    }
    const existente = await db.catalogoPorTelefono(telefono);
    if (existente) return { catalogo: existente, nuevo: false };
    // Slug al azar: el número de teléfono no aparece en ningún link.
    const slug = `prueba-${crypto.randomBytes(4).toString('hex')}`;
    return { catalogo: await db.crearCatalogoPrueba(telefono, slug), nuevo: true };
  }

  /** Procesa un mensaje ya normalizado (ver whatsapp.js > normalizarMensaje). */
  async function procesar(m) {
    if (m.tipo === 'ignorar') return;
    if (!(await db.marcarProcesado(m.msgId))) return; // reenvío de WhatsApp: ya se procesó

    wa.marcarLeido(m.msgId).catch(() => {});

    let ctx;
    try {
      const { catalogo, nuevo } = await catalogoDe(m.de);
      const url = urlPagina(catalogo.slug);
      ctx = { m, catalogo, url, responder: (texto, op) => wa.enviarTexto(m.de, texto, op) };

      if (nuevo) {
        await ctx.responder(textos.bienvenidaPrueba(url));
        // Un "hola" ya quedó contestado con la bienvenida. Una foto o un pedido concreto se sigue procesando.
        if (m.tipo === 'texto' && !m.respondeA) {
          const a = interpretar(m, { piezas: [] });
          if (['ayuda', 'nada', 'de-nada', 'no-entendi', 'link', 'lista'].includes(a.tipo)) return;
        }
      }

      if (m.tipo === 'audio') {
        try {
          const { buffer, mime } = await wa.descargarMedia(m.mediaId);
          m.texto = await medios.transcribir(buffer, mime);
        } catch (e) {
          log(e);
          m.texto = '';
        }
      }

      await ejecutar(ctx);
    } catch (e) {
      log(e);
      await wa.enviarTexto(m.de, textos.error(), { responderA: m.msgId }).catch(log);
    }
  }

  async function ejecutar(ctx) {
    const { m, catalogo, url } = ctx;
    const conv = await db.conversacion(m.de);
    const piezas = await db.piezas(catalogo.id);
    const piezaRespondida = m.respondeA ? await db.piezaPorReferencia(m.respondeA, catalogo.id) : null;
    const accion = interpretar(m, { piezaRespondida, pendiente: conv.pendiente, piezas });

    const buscar = (id) => piezas.find((p) => p.id === id) ?? null;
    // Mensaje de la foto que se está completando (para citarla y para vincularla a la pieza).
    const fotoMsgId = m.tipo === 'imagen' ? m.msgId : conv.pendiente?.msgId ?? conv.pendiente?.accion?.fotoMsgId ?? null;

    // Qué guardar después. undefined = no tocar.
    let pendiente = conv.pendiente?.tipo === 'confirmar' ? null : undefined;
    let ultima;
    let respuesta = null;
    let citar = m.msgId;
    let piezaDeLaRespuesta = null;

    const ahora = () => new Date().toISOString();
    const snapshot = (p) => ({ titulo: p.titulo, precio: p.precio, estado: p.estado, vendida_en: p.vendida_en, foto_path: p.foto_path, foto_ancho: p.foto_ancho, foto_alto: p.foto_alto });

    switch (accion.tipo) {
      case 'agregar': {
        const disponibles = piezas.filter((p) => p.estado === 'disponible').length;
        if (catalogo.es_prueba && disponibles >= MAX_PIEZAS_PRUEBA) {
          respuesta = `Esta página de prueba ya tiene ${MAX_PIEZAS_PRUEBA} piezas, que es el máximo. Marcá alguna como vendida para seguir probando.`;
          pendiente = null;
          break;
        }
        const foto = await subirFoto(catalogo.id, accion.mediaId);
        const pieza = await db.crearPieza({ catalogo_id: catalogo.id, titulo: accion.titulo, precio: accion.precio, ...foto });
        if (fotoMsgId) await db.agregarReferencia(fotoMsgId, pieza.id);
        respuesta = textos.agregada(pieza.titulo, pieza.precio, url);
        citar = fotoMsgId ?? m.msgId;
        piezaDeLaRespuesta = pieza.id;
        ultima = { tipo: 'agregar', piezaId: pieza.id, titulo: pieza.titulo };
        pendiente = null;
        break;
      }

      case 'pedir-datos':
      case 'varios-precios': {
        if (m.tipo === 'imagen') {
          // Foto nueva sin datos completos: a la fila (o pasa a ser la actual).
          const lugar = await db.encolarFoto(m.de, catalogo.id, {
            mediaId: accion.mediaId, msgId: m.msgId, titulo: accion.titulo ?? null, precio: accion.precio ?? null,
          });
          pendiente = undefined; // ya lo guardó encolarFoto
          if (lugar === 'cola') break; // se pregunta por ella cuando termine con la anterior
          respuesta = accion.tipo === 'varios-precios' ? textos.variosPrecios() : preguntaDatos(accion);
        } else {
          pendiente = { ...conv.pendiente, titulo: accion.titulo ?? null, precio: accion.precio ?? null };
          respuesta = accion.tipo === 'varios-precios' ? textos.variosPrecios() : preguntaDatos(accion);
        }
        citar = fotoMsgId ?? m.msgId;
        break;
      }

      case 'confirmar': {
        const a = { ...accion.accion };
        if (a.tipo === 'agregar' && fotoMsgId) a.fotoMsgId = fotoMsgId;
        if (a.tipo === 'foto') a.fotoMsgId = m.msgId;
        const p = a.piezaId ? buscar(a.piezaId) : null;
        if (a.piezaId && !p) { respuesta = textos.cualPieza(); pendiente = null; break; }
        pendiente = { tipo: 'confirmar', accion: a };
        respuesta = textos.confirmar(textos.resumen[a.tipo](a, p));
        break;
      }

      case 'vendida':
      case 'disponible':
      case 'precio':
      case 'titulo':
      case 'foto': {
        const p = buscar(accion.piezaId);
        if (!p) { respuesta = textos.cualPieza(); break; }
        let campos;
        if (accion.tipo === 'vendida') campos = { estado: 'vendida', vendida_en: ahora() };
        if (accion.tipo === 'disponible') campos = { estado: 'disponible', vendida_en: null };
        if (accion.tipo === 'precio') campos = { precio: accion.precio };
        if (accion.tipo === 'titulo') campos = { titulo: accion.titulo };
        if (accion.tipo === 'foto') {
          campos = await subirFoto(catalogo.id, accion.mediaId);
          if (accion.precio) campos.precio = accion.precio;
        }
        const nueva = await db.actualizarPieza(p.id, campos);
        if (accion.tipo === 'foto') await db.agregarReferencia(accion.fotoMsgId ?? m.msgId, p.id);
        respuesta = {
          vendida: () => textos.vendida(nueva.titulo),
          disponible: () => textos.disponible(nueva.titulo),
          precio: () => textos.precio(nueva.titulo, nueva.precio),
          titulo: () => textos.titulo(nueva.titulo),
          foto: () => textos.foto(nueva.titulo),
        }[accion.tipo]();
        piezaDeLaRespuesta = p.id;
        ultima = { tipo: 'editar', piezaId: p.id, antes: snapshot(p) };
        break;
      }

      case 'ya-vendida': respuesta = textos.yaVendida(buscar(accion.piezaId).titulo); break;
      case 'ya-disponible': respuesta = textos.yaDisponible(buscar(accion.piezaId).titulo); break;

      case 'lista': respuesta = textos.lista(piezas.filter((p) => p.estado === 'disponible'), url); break;
      case 'link': respuesta = textos.link(url); break;
      case 'ayuda': respuesta = textos.ayuda(url); break;

      case 'deshacer': {
        const u = conv.ultima_accion;
        if (!u) { respuesta = textos.nadaParaDeshacer(); break; }
        if (u.tipo === 'agregar') {
          await db.borrarPieza(u.piezaId);
          respuesta = textos.deshecho(`saqué *${u.titulo}* de la página`);
        } else {
          const p = await db.actualizarPieza(u.piezaId, u.antes);
          respuesta = p ? textos.deshecho(`*${p.titulo}* quedó como antes`) : textos.nadaParaDeshacer();
        }
        ultima = null;
        break;
      }

      case 'cancelado': {
        const a = conv.pendiente?.accion;
        if (conv.pendiente?.tipo === 'confirmar' && a?.tipo === 'agregar') {
          // Entendí mal los datos de la foto: la foto sigue esperando, se pide de nuevo.
          pendiente = { tipo: 'datos-de-foto', mediaId: a.mediaId, msgId: a.fotoMsgId ?? null, titulo: null, precio: null };
          respuesta = textos.reintentarDatos();
          citar = a.fotoMsgId ?? m.msgId;
        } else {
          respuesta = textos.cancelado();
          pendiente = null; // también descarta una foto que esperaba datos
        }
        break;
      }

      case 'de-nada': respuesta = textos.deNada(); break;
      case 'nada': break;
      case 'cual-pieza': respuesta = textos.cualPieza(); break;
      case 'cual-cambio': respuesta = textos.cualCambio(buscar(accion.piezaId)?.titulo ?? 'esa pieza'); break;
      case 'falta-foto': respuesta = textos.faltaFoto(); break;
      case 'no-soportado': respuesta = textos.noSoportado(); break;
      case 'audio-vacio': respuesta = textos.audioVacio(); break;
      default: respuesta = textos.noEntendi();
    }

    const campos = {};
    if (pendiente !== undefined) campos.pendiente = pendiente;
    if (ultima !== undefined) campos.ultima_accion = ultima;
    if (Object.keys(campos).length) await db.guardarConversacion(m.de, catalogo.id, campos);

    if (respuesta) {
      const id = await ctx.responder(respuesta, { responderA: citar });
      // Responder al "¡Listo!" del bot también sirve para editar esa pieza.
      if (id && piezaDeLaRespuesta) await db.agregarReferencia(id, piezaDeLaRespuesta);
    }

    // Si quedó libre y hay fotos en fila, preguntar por la siguiente.
    if (pendiente === null) {
      const sig = await db.siguienteFoto(m.de);
      if (sig) await ctx.responder(preguntaDatos(sig), { responderA: sig.msgId });
    }
  }

  async function subirFoto(catalogoId, mediaId) {
    const { buffer } = await wa.descargarMedia(mediaId);
    const foto = await medios.prepararFoto(buffer);
    const ruta = await db.subirFoto(`${catalogoId}/${crypto.randomUUID()}.webp`, foto.buffer, foto.contentType);
    return { foto_path: ruta, foto_ancho: foto.ancho, foto_alto: foto.alto };
  }

  return { procesar };
}

function preguntaDatos({ titulo, precio }) {
  if (titulo && !precio) return textos.pedirPrecio(titulo);
  if (precio && !titulo) return textos.pedirTitulo(precio);
  return textos.pedirTodo();
}
