// Lectura de datos desde Supabase vía su API REST (sin dependencias).
// Si no hay Supabase configurado y NO estamos en Vercel, usa datos de ejemplo para desarrollo local.

import { catalogosDeEjemplo } from './ejemplo.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_SERVICE_KEY;

export const usandoEjemplo = !URL_SB && !process.env.VERCEL;

export class ErrorDatos extends Error {}

export function urlFoto(fotoPath) {
  if (/^(https?:)?\//.test(fotoPath)) return fotoPath; // ya es una URL (datos de ejemplo)
  return `${URL_SB}/storage/v1/object/public/fotos/${fotoPath.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Devuelve la página con sus piezas disponibles, de la más nueva a la más vieja.
 * @returns {Promise<null | {nombre: string, esPrueba: boolean, piezas: Array<{id, titulo, precio, foto, ancho, alto}>}>}
 */
export async function obtenerCatalogo(slug) {
  if (usandoEjemplo) return catalogosDeEjemplo[slug] ?? null;
  if (!URL_SB || !KEY_SB) throw new ErrorDatos('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY');

  const params = new URLSearchParams({
    slug: `eq.${slug}`,
    select: 'nombre,es_prueba,piezas(id,titulo,precio,foto_path,foto_ancho,foto_alto,creado_en)',
    'piezas.estado': 'eq.disponible',
    'piezas.order': 'creado_en.desc',
  });

  let resp;
  try {
    resp = await fetch(`${URL_SB}/rest/v1/catalogos?${params}`, {
      headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    throw new ErrorDatos(`No se pudo conectar con Supabase: ${e.message}`);
  }
  if (!resp.ok) throw new ErrorDatos(`Supabase respondió ${resp.status}: ${await resp.text()}`);

  const [fila] = await resp.json();
  if (!fila) return null;

  return {
    nombre: fila.nombre,
    esPrueba: fila.es_prueba,
    piezas: fila.piezas.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      precio: p.precio,
      foto: urlFoto(p.foto_path),
      ancho: p.foto_ancho,
      alto: p.foto_alto,
    })),
  };
}
