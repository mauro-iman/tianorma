// Utilidades de texto: normalizar, tokenizar y leer números escritos "a su manera".
// La tía puede escribir "15000", "15.000", "$15.000", "15 mil", "15mil", "quince mil",
// y una transcripción de audio puede devolver "$15,000" o "doce mil quinientos pesos".

/** minúsculas y sin tildes: "Jarrón" -> "jarron" */
export function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const UNIDADES = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
  noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

/** "15.000" -> 15000 · "12,5" -> 12.5 · "12.000,50" -> 12000.5 · "1500" -> 1500 */
function leerDigitos(s) {
  if (/^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(s) && !/^\d+[.,]\d{1,2}$/.test(s)) {
    const m = s.match(/^(.*?)(?:[.,](\d{1,2}))?$/);
    const entero = Number(m[1].replace(/[.,]/g, ''));
    return m[2] ? entero + Number(`0.${m[2]}`) : entero;
  }
  if (/^\d+[.,]\d{1,2}$/.test(s)) return Number(s.replace(',', '.'));
  if (/^\d+$/.test(s)) return Number(s);
  const solo = s.replace(/[.,]/g, '');
  return /^\d+$/.test(solo) ? Number(solo) : NaN;
}

/**
 * Parte el texto en tokens conservando el original (para armar el título)
 * y marcando qué es cada uno (para encontrar el precio).
 */
export function tokenizar(texto) {
  const tokens = [];
  for (const crudo of String(texto ?? '').split(/\s+/).filter(Boolean)) {
    // "$15.000" -> "$" + "15.000" · "15mil" -> "15" + "mil" · "15k" -> "15" + "k"
    const partes = [];
    let resto = crudo;
    const pesos = resto.match(/^(\$)(.+)$/);
    if (pesos) { partes.push('$'); resto = pesos[2]; }
    const pegado = resto.match(/^(\d[\d.,]*)(mil|k|lucas?)([.,;:!?)]*)$/i);
    if (pegado) partes.push(pegado[1], pegado[2] + pegado[3]);
    else partes.push(resto);

    for (const original of partes) {
      const n = normalizar(original).replace(/^[¿¡("'*_-]+|[.,;:!?)"'*_-]+$/g, '');
      const t = { original, n, tipo: 'palabra' };
      if (n === '$') t.tipo = 'signo';
      else if (/^\d[\d.,]*$/.test(n)) { t.tipo = 'digitos'; t.valor = leerDigitos(n); }
      else if (n === 'mil' || n === 'k' || n === 'luca' || n === 'lucas') t.tipo = 'mil';
      else if (n === 'millon' || n === 'millones' || n === 'palo' || n === 'palos') t.tipo = 'millon';
      else if (n in UNIDADES) { t.tipo = 'numpalabra'; t.valor = UNIDADES[n]; }
      else if (n === 'pesos' || n === 'peso' || n === 'mangos') t.tipo = 'moneda';
      else if (n === 'y') t.tipo = 'y';
      tokens.push(t);
    }
  }
  return tokens;
}

const ES_NUMERICO = new Set(['digitos', 'mil', 'millon', 'numpalabra']);

/**
 * Busca "tramos" de tokens que forman un número ("doce mil quinientos", "15 mil", "$ 15.000 pesos")
 * y devuelve cada uno con su valor y si tiene marcas fuertes de ser un precio.
 */
export function tramosNumericos(tokens) {
  const tramos = [];
  let i = 0;
  while (i < tokens.length) {
    let inicio = i;
    let conSigno = false;
    if (tokens[i].tipo === 'signo') { conSigno = true; i++; }
    if (i >= tokens.length || !ES_NUMERICO.has(tokens[i].tipo) || tokens[i].tipo === 'mil' && tokens[i].n === 'k') {
      i = inicio + 1;
      continue;
    }
    let total = 0;
    let actual = 0;
    let marcas = conSigno;
    let conPalabras = false;
    let j = i;
    for (; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.tipo === 'digitos') {
        if (Number.isNaN(t.valor)) break;
        // Dos grupos de dígitos seguidos son dos números distintos ("4 12000").
        if (j > i && (tokens[j - 1].tipo === 'digitos')) break;
        actual += t.valor;
      } else if (t.tipo === 'numpalabra') {
        // "5000 dos tazas": un número en palabras justo después de dígitos es otra cosa.
        if (j > i && tokens[j - 1].tipo === 'digitos') break;
        conPalabras = true;
        actual += t.valor;
      } else if (t.tipo === 'mil') {
        marcas = true;
        total += (actual || 1) * 1000;
        actual = 0;
      } else if (t.tipo === 'millon') {
        marcas = true;
        total = (total + (actual || 1)) * 1_000_000;
        actual = 0;
      } else if (t.tipo === 'y' && tokens[j + 1]?.tipo === 'numpalabra' && j > i) {
        continue;
      } else break;
    }
    let fin = j; // exclusivo
    if (tokens[fin]?.tipo === 'moneda') { marcas = true; fin++; }
    const valor = Math.round(total + actual);
    if (conPalabras) marcas = marcas || valor >= 100;
    tramos.push({ inicio, fin, valor, marcas, conPalabras });
    i = Math.max(fin, inicio + 1);
  }
  return tramos;
}

/**
 * Elige el tramo que más parece un precio.
 * Los que tienen "$", "pesos" o "mil" ganan; si no, cuentan los números de 100 para arriba
 * ("4 tazas" o "30 cm" no son precios). Si quedan dos o más candidatos, es ambiguo.
 * @returns {{ elegido: object | null, varios: boolean }}
 */
export function elegirPrecio(tramos) {
  const candidatos = tramos.filter((t) => t.valor > 0 && (t.marcas ? t.valor >= 10 : t.valor >= 100));
  const marcados = candidatos.filter((t) => t.marcas);
  const pool = marcados.length ? marcados : candidatos;
  if (pool.length > 1) return { elegido: null, varios: true };
  return { elegido: pool[0] ?? null, varios: false };
}
