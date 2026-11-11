// De "Jarrón azul 15000" o "este plato verde sale doce mil pesos" saca { titulo, precio }.

import { tokenizar, tramosNumericos, elegirPrecio } from './texto.js';

const MAX_TITULO = 80;

// Palabras de relleno pegadas al precio: "a 15000", "sale 15000", "precio: 15000", "15000 c/u".
const RELLENO_ANTES = new Set(['a', 'sale', 'salen', 'cuesta', 'cuestan', 'vale', 'valen', 'precio', 'por', 'en', 'es', 'son', 'de', 'lo', 'la', 'le', 'pongo', 'puse', 'ponele', 'pone', '=', '-', ':', 'y']);
const RELLENO_DESPUES = new Set(['c/u', 'cada', 'uno', 'una', 'final', 'nomas', 'nada', 'mas']);

// Comienzos típicos de un audio: "este jarrón...", "es un plato...", "se llama...".
const INICIOS = [
  ['se', 'llama'], ['el', 'nombre', 'es'], ['nombre'], ['titulo'],
  ['es', 'un'], ['es', 'una'], ['este', 'es', 'un'], ['esta', 'es', 'una'],
  ['este'], ['esta'], ['estos'], ['estas'], ['aca', 'va'], ['aca', 'tenes'], ['bueno'], ['hola'],
];

function limpiarTitulo(tokens) {
  let ts = tokens.filter((t) => t.n !== '' && t.tipo !== 'signo');
  // Sacar comienzos de relleno (puede haber más de uno: "bueno, este jarrón").
  let cambio = true;
  while (cambio && ts.length) {
    cambio = false;
    for (const inicio of INICIOS) {
      if (ts.length > inicio.length && inicio.every((p, k) => ts[k].n === p)) {
        ts = ts.slice(inicio.length);
        cambio = true;
        break;
      }
    }
  }
  let titulo = ts.map((t) => t.original).join(' ');
  titulo = titulo
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s,.;:!?¿¡\-–—*_"']+|[\s,.;:!?¿¡\-–—*_"']+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1');
  if (titulo.length > MAX_TITULO) {
    titulo = titulo.slice(0, MAX_TITULO + 1).replace(/\s+\S*$/, '').replace(/[\s,.;:]+$/, '');
  }
  // "JARRON AZUL" (muy común con la vista cansada) -> "Jarron azul"
  if (/\p{L}{2}/u.test(titulo) && titulo === titulo.toLocaleUpperCase('es-AR')) titulo = titulo.toLocaleLowerCase('es-AR');
  return titulo ? titulo[0].toLocaleUpperCase('es-AR') + titulo.slice(1) : '';
}

/**
 * @returns {{ titulo: string, precio: number | null, variosPrecios?: true }}
 */
export function extraerPieza(texto) {
  const tokens = tokenizar(texto);
  const { elegido, varios } = elegirPrecio(tramosNumericos(tokens));
  // "Jarrón 15000 y plato 12000" o "1500 o 2000": mejor preguntar que adivinar.
  if (varios) return { titulo: '', precio: null, variosPrecios: true };
  if (!elegido) return { titulo: limpiarTitulo(tokens), precio: null };

  let { inicio, fin } = elegido;
  // Correr los bordes para incluir el relleno pegado al precio.
  while (inicio > 0 && (RELLENO_ANTES.has(tokens[inicio - 1].n) || tokens[inicio - 1].n === '')) inicio--;
  while (fin < tokens.length && (RELLENO_DESPUES.has(tokens[fin].n) || tokens[fin].n === '')) fin++;

  const resto = [...tokens.slice(0, inicio), ...tokens.slice(fin)];
  return { titulo: limpiarTitulo(resto), precio: elegido.valor };
}
