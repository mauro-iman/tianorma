// TODOS los mensajes que manda el bot, en un solo lugar para revisarlos de un vistazo.
// ⚠️ BORRADOR: el tono y las palabras las define el equipo (AGENTS.md §5).
// Reglas: frases cortas, voseo, sin emojis de más, sin guiones largos, *negrita* de WhatsApp
// solo para lo importante (nombre y precio). Siempre decir qué pasó y cómo seguir.

import { precio as $ } from '../formato.js';

const pieza = (titulo, precio) => `*${titulo}*, ${$(precio)}`;

export const textos = {
  bienvenidaPrueba: (url) =>
    `¡Hola! Esta es una página de prueba para que juegues a ser Norma.\n\n` +
    `Mandame la foto de cualquier cosa con el nombre y el precio abajo, por ejemplo:\n*Jarrón azul 15000*\n\n` +
    `Tu página está acá:\n${url}`,

  ayuda: (url) =>
    `Así funciona tu página:\n\n` +
    `*Para agregar una pieza:* mandame la foto con el nombre y el precio abajo. Por ejemplo: *Jarrón azul 15000*\n\n` +
    `*Si se vendió:* respondé a la foto con la palabra *vendido*.\n\n` +
    `*Para cambiar el precio:* respondé a la foto con el precio nuevo.\n\n` +
    `*Para ver qué tenés:* escribí *lista*.\n\n` +
    `También me podés mandar audios.\n\nTu página: ${url}`,

  agregada: (titulo, precio, url) =>
    `¡Listo! Ya está en tu página:\n${pieza(titulo, precio)}\n\n${url}`,

  pedirTodo: () =>
    `Recibí la foto. ¿Cómo se llama y cuánto sale?\n\nEscribilo así: *Jarrón azul 15000*\nO mandame un audio.`,
  variosPrecios: () =>
    `Vi más de un precio y no sé cuál es. Mandá una foto por cada pieza, con su nombre y su precio.\n\n` +
    `Para esta foto, ¿cómo se llama y cuánto sale? Por ejemplo: *Jarrón azul 15000*`,
  pedirPrecio: (titulo) =>
    `¿Cuánto sale *${titulo}*?\n\nEscribí solo el número, por ejemplo: *15000*`,
  pedirTitulo: (precio) =>
    `¿Cómo se llama esta pieza de ${$(precio)}?\n\nPor ejemplo: *Jarrón azul*`,

  confirmar: (resumen) =>
    `Entendí esto:\n${resumen}\n\n¿Está bien? Respondé *sí* o *no*.`,
  resumen: {
    agregar: (a) => `Agregar ${pieza(a.titulo, a.precio)}`,
    vendida: (a, p) => `*${p.titulo}* se vendió`,
    disponible: (a, p) => `*${p.titulo}* vuelve a la página`,
    precio: (a, p) => `*${p.titulo}* ahora sale *${$(a.precio)}*`,
    titulo: (a, p) => `Cambiarle el nombre a *${p.titulo}* por *${a.titulo}*`,
    foto: (a, p) => `Cambiar la foto de *${p.titulo}*`,
    'borrar-datos': () => `Borrar tu página de prueba, con todas sus fotos, y tus datos. No se puede deshacer`,
  },
  datosBorrados: () => `Listo, borré tu página y tus datos. Si me volvés a escribir, empezamos de cero.`,
  noSeBorraLaReal: () => `Esta es la página real de Norma: no se puede borrar desde acá.`,

  vendida: (titulo) =>
    `¡Qué bien! Saqué *${titulo}* de la página.\n\nSi fue un error, respondé a la foto con *disponible*.`,
  disponible: (titulo) => `Listo, *${titulo}* volvió a la página.`,
  precio: (titulo, precio) => `Listo, *${titulo}* ahora sale *${$(precio)}*.`,
  titulo: (titulo) => `Listo, ahora se llama *${titulo}*.`,
  foto: (titulo) => `Listo, cambié la foto de *${titulo}*.`,

  yaVendida: (titulo) => `*${titulo}* ya estaba marcada como vendida.`,
  yaDisponible: (titulo) => `*${titulo}* ya está en la página.`,

  lista: (piezas, url) =>
    piezas.length
      ? `Tenés ${piezas.length === 1 ? '1 pieza' : `${piezas.length} piezas`} en la página:\n\n` +
        piezas.map((p, i) => `${i + 1}. ${p.titulo}, ${$(p.precio)}`).join('\n') +
        `\n\n${url}`
      : `Por ahora tu página no tiene piezas. Mandame una foto para agregar la primera.`,

  link: (url) => `Tu página es esta:\n${url}`,

  deshecho: (detalle) => `Listo, lo dejé como estaba antes: ${detalle}.`,
  nadaParaDeshacer: () => `No hay nada para deshacer.`,

  cancelado: () => `Bueno, no cambié nada.`,
  reintentarDatos: () =>
    `Bueno, no la guardé. Decime de nuevo cómo se llama y cuánto sale, por ejemplo: *Jarrón azul 15000*`,
  deNada: () => `¡De nada!`,

  cualPieza: () =>
    `¿De qué pieza me hablás? Buscá su foto en este chat, mantenela apretada, tocá *Responder* y escribí lo que quieras cambiar.`,
  cualCambio: (titulo) =>
    `¿Qué querés cambiar de *${titulo}*?\n\nSi se vendió, escribí *vendido*. Para cambiar el precio, escribí el número nuevo.`,
  faltaFoto: () =>
    `Para agregar una pieza necesito la foto. Mandame la foto y escribí el nombre y el precio abajo.`,
  noEntendi: () =>
    `Perdón, no te entendí.\n\nPara agregar una pieza, mandame la foto con el nombre y el precio. Si querés ver cómo funciona, escribí *ayuda*.`,
  noSoportado: () =>
    `Por ahora entiendo fotos, mensajes escritos y audios.`,
  audioVacio: () =>
    `No pude escuchar bien el audio. ¿Me lo mandás de nuevo o me lo escribís?`,
  error: () =>
    `Uy, algo falló de mi lado y no pude hacerlo. Probá de nuevo en un ratito.`,
};
