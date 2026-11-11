# app/ — página de Norma + bot

Sin framework y con una sola dependencia (sharp, para achicar fotos): una función de Vercel arma el HTML en el servidor, así la página se ve aunque falle JavaScript, y lee los datos de Supabase por su API REST.

```
api/pagina.js      GET / (Norma) y /p/<slug> (páginas de prueba)
api/whatsapp.js    Webhook de WhatsApp (verificación + mensajes)
lib/datos.js       Lectura de Supabase (o datos de ejemplo en local)
lib/render.js      HTML + CSS en línea
lib/formato.js     Precio "$ 15.000" y escape de HTML (con tests)
lib/bot/texto.js       Tokens y números escritos de cualquier forma
lib/bot/extraer.js     "Jarrón azul 15 mil" -> { titulo, precio }
lib/bot/interpretar.js Qué quiso hacer quien escribe (función pura)
lib/bot/textos.js      Todos los mensajes del bot (borrador para revisar)
lib/bot/ejecutar.js    Guarda, responde, fila de fotos, deshacer, páginas de prueba
lib/bot/db.js          Supabase (REST, RPC, Storage)
lib/bot/whatsapp.js    Cloud API: enviar, leer, bajar fotos/audios, firma
lib/bot/medios.js      sharp (fotos) + Groq Whisper (audios)
supabase/schema.sql
dev/servidor.js    Servidor local que imita las rutas de Vercel
```

## Local

```bash
npm run dev
```

Abre en http://localhost:3000. Sin `.env.local` usa datos de ejemplo. Con `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` en `.env.local`, lee los datos reales.

Rutas de ejemplo: `/`, `/p/prueba-demo`, `/p/vacia`, `/p/no-existe` (404).

```bash
npm test
```

## Puesta en marcha (una vez)

1. **Supabase:** crear el proyecto en la región **São Paulo** (es la más cercana a Argentina y coincide con `gru1` de Vercel). En el SQL Editor, correr `supabase/schema.sql`.
2. **Vercel:** importar el repo con **Root Directory = `app`** y Framework = *Other*. Cargar las variables de `.env.example` (los números de la tía van en `NORMA_TELEFONOS`).
3. **Meta:** seguir `docs/SETUP-META.md`. El webhook es `https://<dominio>/api/whatsapp`.
4. **Groq:** crear una API key en console.groq.com y cargarla en `GROQ_API_KEY`.

## Decisiones técnicas

- **Sin caché de CDN** (`no-store`). Cuando el bot le dice a Norma "ya está en tu página", la pieza tiene que estar. La consulta a Supabase en la misma región tarda poco.
- **RLS activado y sin políticas.** Solo el servidor, con la service key, lee y escribe. Los teléfonos nunca llegan al navegador.
- Las fotos se van a guardar **ya achicadas** por el bot (con ancho y alto) para que carguen rápido y la página no "salte" mientras carga.

## Cómo se comporta el bot

- Cualquier número que no esté en `NORMA_TELEFONOS` recibe **su propia página de prueba** (`/p/prueba-xxxxxxxx`, con un slug al azar que no deja ver el teléfono) y no puede tocar la de Norma.
- Cada mensaje se procesa **una sola vez**, aunque WhatsApp lo reenvíe.
- Responder a la foto de una pieza **o** al "¡Listo!" del bot sirve para editarla.
- Las fotos que llegan juntas y sin texto se ponen **en fila**: el bot pregunta por una por vez, citando cada foto.
- Todo lo que llega por audio, lo que se entiende por el nombre de la pieza y los nombres nuevos **se confirman** con sí o no.
- "me equivoqué" deshace la última acción.
- Las páginas de prueba tienen un máximo de 40 piezas.
