# Registro de decisiones

Cada decisión de producto, diseño o técnica importante se anota acá. Así queda claro que la creatividad y el criterio son del equipo (ver AGENTS.md §5).

| # | Fecha | Decisión | Por qué (relación con el brief) | Quién decidió | Alternativas descartadas |
|---|---|---|---|---|---|
| 1 | 2026-11-11 | El brief se guarda intacto en `BRIEF.md` y es el criterio de evaluación | Es la fuente de verdad del challenge | Equipo | — |
| 2 | 2026-11-11 | Hay **dos entregables**: la presentación (storyboard ilustrado) y la solución (página + sistema de actualización) | La presentación cuenta el porqué y el cómo de forma visual y "a prueba de tontos". La solución es lo que usa la tía. | Mauro | Entregar solo la solución |
| 3 | 2026-11-11 | La tía actualiza la página con un **bot de WhatsApp que acepta texto y audios**. Siempre confirma lo que entendió. | WhatsApp es lo único que la tía usa. Hablar le resulta más fácil que escribir si no ve bien. | Mauro | App de 3 botones (A5), sobrino de intermediario (A4, queda como plan B posible) |
| 4 | 2026-11-11 | Stack: **Vercel** (hosting y funciones), **Supabase** (datos e imágenes), **WhatsApp Cloud API de Meta**. Toda la configuración corre por nuestra cuenta. | La tía solo se ocupa de vender y de gestionar sus piezas desde WhatsApp. No configura nada. | Mauro | Sitio estático con un JSON en el repo |
| 5 | 2026-11-11 | Las ilustraciones del storyboard son **bocetos a mano de Mauro**. La IA solo los limpia y los pasa a SVG (trabajo mecánico, sin agregar contenido). | "Que la creatividad de algo tan sencillo sea nuestra." Es lo que haría una profe de plástica. | Mauro | SVG dibujado por código, imágenes generadas con IA |
| 6 | 2026-11-11 | La presentación es una **página web scrolleable** (storyboard vertical), hosteada en Vercel junto a la solución | Se ve bien en el celular, se comparte con un link y sigue el mismo criterio de simpleza | Mauro | Slides, PDF |
| 7 | 2026-11-11 | El jurado prueba con un **número propio de WhatsApp en modo live**, sin simulador web. Quien le escribe al bot y no es la tía recibe **su propia página de prueba** para jugar a ser Norma. La página real solo se edita desde números autorizados (la tía y Mauro). | "Mientras más fácil de probar, mejor": se prueba con el celular propio, sin credenciales. La página de Norma no queda expuesta a que cualquiera la modifique. | Mauro | Número de prueba de Meta (5 números verificados), simulador de chat en la web |
| 8 | 2026-11-11 | Página pública **sin framework**: una función de Vercel arma el HTML en el servidor y lee Supabase por REST. Sin caché, para que los cambios se vean al instante. | Liviana, rápida en celulares viejos y funciona sin JavaScript (DESIGN §6). Si el bot dice "ya está", tiene que estar. | Claude (propuesta técnica, a revisar por Mauro) | Next.js con ISR |
| 9 | 2026-11-11 | El bot entiende los mensajes con **reglas propias, sin IA generativa**. Lee precios escritos de mil formas ("15.000", "15 mil", "quince mil", "25 lucas"). Si hay dudas (dos precios, una pieza nombrada sin responder a la foto, un audio, un nombre nuevo), **pregunta antes de cambiar nada**. | Respuestas predecibles y sin "AI quirks". Un error en la página de la tía es peor que una pregunta de más. Es lógica pensada por nosotros, no delegada a un modelo. | Claude (propuesta técnica, a revisar por Mauro) | Pasarle cada mensaje a un LLM |
| 10 | 2026-11-11 | Los audios se transcriben con **Groq Whisper** (`whisper-large-v3-turbo`, en español) | Es gratis, rápido y suficiente para frases cortas. Siempre se confirma lo que entendió. | Mauro | OpenAI |
| 11 | 2026-11-11 | Las fotos se achican al recibirlas (**sharp**: rota según EXIF, máximo 1000 px, WebP). Es la única dependencia del proyecto. | Las fotos de WhatsApp pesan cientos de KB y la página tiene que cargar en 3G. Las fotos de celular suelen venir rotadas. | Claude (propuesta técnica) | Servir la foto original |
| 12 | 2026-11-11 | Si la tía manda **varias fotos seguidas sin texto**, el bot las pone en fila y pregunta por una por vez, citando cada foto | Es lo que hace la gente con un álbum. Sin fila, los datos quedarían en la foto equivocada. | Claude (propuesta técnica) | Preguntar por todas juntas |

## Pendientes

- ¿Las piezas vendidas desaparecen o quedan con un sello "Vendido"? (IDEAS B2)
- ¿El número de la tía aparece escrito en la página? (IDEAS B3)
- ~~Transcripción de audios~~ resuelto (#10).
- Identidad visual de la página (paleta, tipografía, nombre). Hoy usa estilos neutros y el nombre provisorio "Taller de Norma".
