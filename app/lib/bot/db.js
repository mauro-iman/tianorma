// Acceso a Supabase para el bot (REST + RPC + Storage), con la service key. Sin dependencias.

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_SERVICE_KEY;

async function sb(ruta, { method = 'GET', body, headers = {}, crudo = false } = {}) {
  const resp = await fetch(`${URL_SB}${ruta}`, {
    method,
    headers: {
      apikey: KEY_SB,
      Authorization: `Bearer ${KEY_SB}`,
      ...(body !== undefined && !crudo ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : crudo ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Supabase ${method} ${ruta.split('?')[0]} -> ${resp.status}: ${await resp.text()}`);
  const texto = await resp.text();
  return texto ? JSON.parse(texto) : null;
}

const q = (o) => new URLSearchParams(o).toString();
const DEVOLVER = { Prefer: 'return=representation' };
const CAMPOS_PIEZA = 'id,titulo,precio,estado,foto_path,foto_ancho,foto_alto,vendida_en,creado_en';

export const db = {
  /** true si el mensaje es nuevo; false si ya se había procesado. */
  async marcarProcesado(waMessageId) {
    const filas = await sb('/rest/v1/mensajes_procesados?on_conflict=wa_message_id', {
      method: 'POST',
      body: { wa_message_id: waMessageId },
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    });
    return filas.length > 0;
  },

  async catalogoPorSlug(slug) {
    const [c] = await sb(`/rest/v1/catalogos?${q({ slug: `eq.${slug}`, select: 'id,slug,nombre,es_prueba' })}`);
    return c ?? null;
  },

  async catalogoPorTelefono(telefono) {
    const [c] = await sb(`/rest/v1/catalogos?${q({ telefono: `eq.${telefono}`, select: 'id,slug,nombre,es_prueba' })}`);
    return c ?? null;
  },

  async crearCatalogoPrueba(telefono, slug) {
    const [c] = await sb('/rest/v1/catalogos?select=id,slug,nombre,es_prueba', {
      method: 'POST',
      body: { slug, nombre: 'Página de prueba', telefono, es_prueba: true },
      headers: DEVOLVER,
    });
    return c;
  },

  async conversacion(telefono) {
    const [c] = await sb(`/rest/v1/conversaciones?${q({ telefono: `eq.${telefono}`, select: 'pendiente,ultima_accion' })}`);
    return c ?? { pendiente: null, ultima_accion: null };
  },

  /** Guarda solo los campos que vienen (pendiente y/o ultima_accion). */
  async guardarConversacion(telefono, catalogoId, campos) {
    await sb('/rest/v1/conversaciones?on_conflict=telefono', {
      method: 'POST',
      body: { telefono, catalogo_id: catalogoId, ...campos, actualizado_en: new Date().toISOString() },
      headers: { Prefer: 'resolution=merge-duplicates' },
    });
  },

  async encolarFoto(telefono, catalogoId, foto) {
    return sb('/rest/v1/rpc/encolar_foto', { method: 'POST', body: { p_telefono: telefono, p_catalogo: catalogoId, p_foto: foto } });
  },

  async siguienteFoto(telefono) {
    return sb('/rest/v1/rpc/siguiente_foto', { method: 'POST', body: { p_telefono: telefono } });
  },

  async piezas(catalogoId) {
    return sb(`/rest/v1/piezas?${q({ catalogo_id: `eq.${catalogoId}`, select: CAMPOS_PIEZA, order: 'creado_en.desc' })}`);
  },

  async piezaPorReferencia(waMessageId, catalogoId) {
    const [r] = await sb(`/rest/v1/referencias?${q({
      wa_message_id: `eq.${waMessageId}`,
      select: `piezas!inner(${CAMPOS_PIEZA},catalogo_id)`,
      'piezas.catalogo_id': `eq.${catalogoId}`,
    })}`);
    return r?.piezas ?? null;
  },

  async crearPieza(datos) {
    const [p] = await sb(`/rest/v1/piezas?select=${CAMPOS_PIEZA}`, { method: 'POST', body: datos, headers: DEVOLVER });
    return p;
  },

  async actualizarPieza(id, campos) {
    const [p] = await sb(`/rest/v1/piezas?${q({ id: `eq.${id}`, select: CAMPOS_PIEZA })}`, { method: 'PATCH', body: campos, headers: DEVOLVER });
    return p ?? null;
  },

  async borrarPieza(id) {
    await sb(`/rest/v1/piezas?${q({ id: `eq.${id}` })}`, { method: 'DELETE' });
  },

  async agregarReferencia(waMessageId, piezaId) {
    await sb('/rest/v1/referencias?on_conflict=wa_message_id', {
      method: 'POST',
      body: { wa_message_id: waMessageId, pieza_id: piezaId },
      headers: { Prefer: 'resolution=ignore-duplicates' },
    });
  },

  /** Borra una página de prueba entera: sus fotos en Storage y, en cascada, piezas, referencias y conversación. */
  async borrarCatalogo(catalogoId) {
    const objetos = await sb('/storage/v1/object/list/fotos', {
      method: 'POST',
      body: { prefix: catalogoId, limit: 1000 },
    });
    const rutas = (objetos ?? []).map((o) => `${catalogoId}/${o.name}`);
    if (rutas.length) await sb('/storage/v1/object/fotos', { method: 'DELETE', body: { prefixes: rutas } });
    await sb(`/rest/v1/catalogos?${q({ id: `eq.${catalogoId}`, es_prueba: 'eq.true' })}`, { method: 'DELETE' });
  },

  async subirFoto(ruta, buffer, contentType) {
    await sb(`/storage/v1/object/fotos/${ruta}`, {
      method: 'POST',
      body: buffer,
      crudo: true,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'max-age=31536000', 'x-upsert': 'true' },
    });
    return ruta;
  },
};
