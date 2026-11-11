-- Esquema de la página de la tía Norma.
-- Se corre una vez en Supabase: SQL Editor > New query > pegar > Run. (Se puede volver a correr.)
-- Todo el acceso es desde el servidor (Vercel) con la service key.
-- RLS queda activado y sin políticas: nadie puede leer ni escribir desde el navegador.

create extension if not exists pgcrypto;

-- Una "página": la real de Norma o una de prueba (una por cada número que le escribe al bot).
create table if not exists catalogos (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  nombre      text not null check (char_length(nombre) between 1 and 60),
  -- Dueño de una página de prueba: número de WhatsApp, solo dígitos con código de país.
  -- La página de Norma no lleva teléfono: sus números autorizados van en la variable NORMA_TELEFONOS.
  telefono    text unique check (telefono ~ '^[0-9]{8,15}$'),
  es_prueba   boolean not null default false,
  creado_en   timestamptz not null default now()
);

create table if not exists piezas (
  id              uuid primary key default gen_random_uuid(),
  catalogo_id     uuid not null references catalogos(id) on delete cascade,
  titulo          text not null check (char_length(titulo) between 1 and 80),
  precio          integer not null check (precio > 0 and precio < 100000000),
  foto_path       text not null,           -- ruta dentro del bucket "fotos"
  foto_ancho      integer check (foto_ancho > 0),
  foto_alto       integer check (foto_alto > 0),
  estado          text not null default 'disponible' check (estado in ('disponible', 'vendida')),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  vendida_en      timestamptz
);

create index if not exists piezas_catalogo_idx on piezas (catalogo_id, estado, creado_en desc);

-- Mensajes de WhatsApp que "son" una pieza: la foto que mandó la tía y las respuestas del bot sobre esa pieza.
-- Así, responder a cualquiera de ellos ("vendido", "18000") sabe de qué pieza se habla.
create table if not exists referencias (
  wa_message_id  text primary key,
  pieza_id       uuid not null references piezas(id) on delete cascade,
  creado_en      timestamptz not null default now()
);

-- Estado de la charla con cada número: lo que el bot está esperando y la última acción (para "deshacer").
create table if not exists conversaciones (
  telefono       text primary key check (telefono ~ '^[0-9]{8,15}$'),
  catalogo_id    uuid not null references catalogos(id) on delete cascade,
  pendiente      jsonb,                         -- { tipo: 'datos-de-foto', ... } | { tipo: 'confirmar', accion }
  cola_fotos     jsonb not null default '[]',   -- fotos sin datos que esperan su turno
  ultima_accion  jsonb,
  actualizado_en timestamptz not null default now()
);

-- WhatsApp a veces reenvía el mismo mensaje: se procesa una sola vez.
create table if not exists mensajes_procesados (
  wa_message_id  text primary key,
  creado_en      timestamptz not null default now()
);

create or replace function tocar_actualizado_en() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

drop trigger if exists piezas_actualizado_en on piezas;
create trigger piezas_actualizado_en before update on piezas
  for each row execute function tocar_actualizado_en();

-- Llega una foto sin datos. Si el bot no estaba esperando otra, pasa a ser "la actual" (y se pregunta por ella).
-- Si ya estaba esperando, queda en fila. Es atómico: un álbum de fotos llega en paralelo.
create or replace function encolar_foto(p_telefono text, p_catalogo uuid, p_foto jsonb)
returns text language plpgsql as $$
declare v_pend jsonb;
begin
  insert into conversaciones (telefono, catalogo_id) values (p_telefono, p_catalogo)
  on conflict (telefono) do nothing;
  select pendiente into v_pend from conversaciones where telefono = p_telefono for update;
  if v_pend is not null and v_pend->>'tipo' = 'datos-de-foto' then
    update conversaciones set cola_fotos = cola_fotos || jsonb_build_array(p_foto), actualizado_en = now()
      where telefono = p_telefono;
    return 'cola';
  end if;
  update conversaciones set pendiente = p_foto || '{"tipo":"datos-de-foto"}'::jsonb, actualizado_en = now()
    where telefono = p_telefono;
  return 'actual';
end $$;

-- Si el bot no espera nada y hay fotos en fila, la primera pasa a ser la actual.
create or replace function siguiente_foto(p_telefono text)
returns jsonb language plpgsql as $$
declare v_cola jsonb; v_sig jsonb;
begin
  select cola_fotos into v_cola from conversaciones
    where telefono = p_telefono and pendiente is null for update;
  if v_cola is null or jsonb_array_length(v_cola) = 0 then return null; end if;
  v_sig := (v_cola->0) || '{"tipo":"datos-de-foto"}'::jsonb;
  update conversaciones set pendiente = v_sig, cola_fotos = v_cola - 0, actualizado_en = now()
    where telefono = p_telefono;
  return v_sig;
end $$;

revoke execute on function encolar_foto(text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function siguiente_foto(text) from public, anon, authenticated;

alter table catalogos           enable row level security;
alter table piezas              enable row level security;
alter table referencias         enable row level security;
alter table conversaciones      enable row level security;
alter table mensajes_procesados enable row level security;

-- Bucket público de fotos (lectura pública; se sube solo desde el servidor).
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

-- La página real de Norma.
insert into catalogos (slug, nombre, es_prueba)
values ('norma', 'Taller de Norma', false)
on conflict (slug) do nothing;
