// HTML de la página pública. Todo en una sola respuesta (CSS en línea) para que cargue rápido.
// Reglas en DESIGN.md. La identidad visual todavía no está definida: estos estilos son neutros a propósito.

import { esc, precio } from './formato.js';

const CSS = `
:root{
  --fondo:#fbf8f3; --tarjeta:#ffffff; --texto:#1b1b1b; --suave:#3d3d3d;
  --borde:#d9d2c7; --aviso-fondo:#fff1c2; --aviso-texto:#1b1b1b;
  color-scheme: light;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;background:var(--fondo);color:var(--texto);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  font-size:1.25rem;line-height:1.5}
.contenedor{max-width:1200px;margin:0 auto;padding:1.5rem 1rem 3rem}
h1{font-size:2.25rem;line-height:1.2;margin:.5rem 0 1.5rem;text-align:center}
.aviso{background:var(--aviso-fondo);color:var(--aviso-texto);border:2px solid var(--texto);
  border-radius:12px;padding:1rem 1.25rem;margin:0 0 1.5rem;font-size:1.25rem}
.piezas{list-style:none;margin:0;padding:0;display:grid;gap:1.5rem;grid-template-columns:1fr;align-items:start}
@media (min-width:700px){
  .piezas{grid-template-columns:repeat(2,1fr)}
  /* En la grilla, todas las fotos en un marco cuadrado (se ven enteras, sin recorte) para que las tarjetas queden parejas. */
  .pieza img{aspect-ratio:1/1;max-height:none}
}
@media (min-width:1100px){.piezas{grid-template-columns:repeat(3,1fr)}}
.pieza{background:var(--tarjeta);border:1px solid var(--borde);border-radius:16px;overflow:hidden}
.pieza img{display:block;width:100%;height:auto;max-height:75vh;object-fit:contain;background:#efebe4}
.pieza .texto{padding:1rem 1.25rem 1.25rem}
.pieza h2{font-size:1.5rem;line-height:1.25;margin:0 0 .5rem;font-weight:600;overflow-wrap:anywhere}
.pieza .precio{font-size:2rem;line-height:1.1;font-weight:800;margin:0;white-space:nowrap}
.vacio{text-align:center;font-size:1.5rem;color:var(--suave);padding:3rem 1rem}
`;

function documento({ titulo, cuerpo, robots = 'index,follow' }) {
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="${robots}">
<title>${esc(titulo)}</title>
<link rel="icon" href="data:,">
<style>${CSS}</style>
</head>
<body>
<main class="contenedor">
${cuerpo}
</main>
</body>
</html>`;
}

function tarjeta(p, i) {
  const dims = p.ancho && p.alto ? ` width="${p.ancho}" height="${p.alto}"` : '';
  // Las primeras dos fotos cargan enseguida; el resto, a medida que se scrollea.
  const carga = i < 2 ? 'eager" fetchpriority="high' : 'lazy';
  return `<li class="pieza">
<img src="${esc(p.foto)}" alt="${esc(p.titulo)}"${dims} loading="${carga}" decoding="async">
<div class="texto">
<h2>${esc(p.titulo)}</h2>
<p class="precio">${precio(p.precio)}</p>
</div>
</li>`;
}

export function paginaCatalogo(cat) {
  const aviso = cat.esPrueba
    ? `<p class="aviso" role="note"><strong>Esta es una página de prueba.</strong> Mandale fotos al WhatsApp de la página y fijate cómo aparecen acá.</p>`
    : '';
  const lista = cat.piezas.length
    ? `<ul class="piezas">\n${cat.piezas.map(tarjeta).join('\n')}\n</ul>`
    : `<p class="vacio">Por ahora no hay piezas. Volvé en unos días.</p>`;
  return documento({
    titulo: cat.nombre,
    robots: cat.esPrueba ? 'noindex,nofollow' : 'index,follow',
    cuerpo: `<h1>${esc(cat.nombre)}</h1>\n${aviso}\n${lista}`,
  });
}

export function paginaError(tipo) {
  const textos = {
    'no-existe': ['No encontramos esta página', 'Revisá que el link esté bien escrito.'],
    'caida': ['La página no se pudo cargar', 'Probá de nuevo en un ratito.'],
  };
  const [titulo, detalle] = textos[tipo] ?? textos.caida;
  return documento({
    titulo,
    robots: 'noindex,nofollow',
    cuerpo: `<h1>${esc(titulo)}</h1>\n<p class="vacio">${esc(detalle)}</p>`,
  });
}
