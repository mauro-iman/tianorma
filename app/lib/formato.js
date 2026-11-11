// Formatos de texto que ve la gente. Pequeños y testeados: un precio mal escrito es un bug visible.

const NBSP = ' ';

/** 15000 -> "$ 15.000" (con espacio que no se corta, para que "$" y el número no queden en renglones distintos). */
export function precio(n) {
  if (!Number.isInteger(n) || n < 0) throw new TypeError(`Precio inválido: ${n}`);
  const miles = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${NBSP}${miles}`;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para meterlo en HTML (contenido o atributos). */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}
