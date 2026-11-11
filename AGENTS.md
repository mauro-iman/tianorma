# AGENTS.md

Instrucciones para cualquier agente de IA (o persona) que trabaje en este repo.

## 1. La fuente de verdad

- [BRIEF.md](BRIEF.md) es el manifiesto. **No se edita.** Toda decisión se justifica contra él.
- [docs/CONDICIONES.md](docs/CONDICIONES.md) tiene las reglas del organizador: entrega el **martes 17/11/2026 a las 19:00 ART** con un hilo en X, y la solución tiene que ser 100 % funcional y fácil de probar. Tampoco se edita.
- Si una idea no le sirve a la tía Norma o a sus compradores tal como los describe el brief, no va.
- Ante la duda, se elige lo más simple.

## 2. Los entregables

1. **Presentación** (`presentacion/`): un storyboard ilustrado en una página web scrolleable que cuenta el problema de la tía y cómo se resuelve. Las ilustraciones son bocetos a mano del equipo. El guion está en [docs/STORYBOARD.md](docs/STORYBOARD.md).
2. **Solución** (`app/`): la página pública de productos y el bot de WhatsApp (texto y audios) con el que la tía la actualiza. Stack: Vercel + Supabase + WhatsApp Cloud API. La configuración corre por nuestra cuenta; la tía solo vende y gestiona sus piezas desde WhatsApp.
3. **Hilo en X** (`docs/HILO.md`): link, qué hace, por qué se hizo así. Las viñetas del storyboard son sus imágenes.

**Vara de calidad:** el código no se evalúa; el resultado sí. Un bug, un texto raro o un "AI quirk" (frases que suenan a robot, guiones largos, emojis de más, traducciones literales, errores en el formato de los precios) resta mucho. Antes de dar algo por terminado, **se prueba de verdad**: en un celular, por WhatsApp y con mensajes escritos como los escribiría una señora de 70 años.

## 3. Para quién es

| Quién | Qué necesita | Qué NO tiene |
|---|---|---|
| **Tía Norma** (70, ceramista, ex profesora de plástica) | Agregar una pieza, sacarla, cambiar foto o precio | Compu, mail, buena vista, paciencia con la tecnología. Solo usa WhatsApp. |
| **Compradores** (perfil parecido) | Ver las piezas, leer bien el nombre y el precio | Ganas de aprender una interfaz nueva |

## 4. Alcance (lo que pide el boceto)

- **Una sola página** con una grilla de productos.
- Cada producto: **una imagen, un título, un precio.** Nada más.
- **Sin** carrito, checkout, cuentas de usuario, link a WhatsApp, redes sociales ni formularios.
- La venta se arregla por fuera de la página, como ya lo hace ella.

Agregar algo que no esté en esta lista requiere justificarlo con el brief y anotarlo en [docs/DECISIONES.md](docs/DECISIONES.md).

## 5. Regla de la creatividad (cómo usamos la IA acá)

El brief pide que "la creatividad de algo tan sencillo sea nuestra". Por eso:

- **El agente propone, el equipo decide.** Los agentes no eligen solos la identidad visual, el nombre, los textos ni el modo de actualización. Ofrecen opciones con sus pros y contras, y la persona elige.
- Las decisiones creativas y de producto se registran en `docs/DECISIONES.md` con **quién decidió y por qué**.
- La IA se usa para escribir código, investigar, revisar accesibilidad y hacer el trabajo mecánico. **No** se usa para generar las imágenes de producto, las ilustraciones ni la identidad de marca.
- Las fotos son las de la tía. No se retocan con IA más allá de recortar, rotar o comprimir.
- Las ilustraciones del storyboard salen de bocetos a mano del equipo. La IA solo puede limpiarlas, vectorizarlas o recortarlas, sin agregar ni inventar elementos.

## 6. Reglas técnicas mínimas

- La página pública, lo más estática y liviana que se pueda. Tiene que cargar rápido en un celular viejo y con mala señal.
- Nada de dependencias que no hagan falta. Cada librería nueva se justifica.
- Los datos de los productos viven separados del código (por ejemplo un archivo de datos), para que actualizar no implique tocar el código.
- Nada de secretos en el repo (tokens, números de teléfono privados): van en variables de entorno.
- Las reglas visuales y de accesibilidad están en [DESIGN.md](DESIGN.md) y son obligatorias.

## 7. Idioma

- Todo lo que ve un usuario está en **español rioplatense**, con voseo y palabras simples ("Vendido", no "Sin stock").
- Código y nombres técnicos pueden ir en inglés. Los documentos del proyecto van en español.

## 8. Estructura

```
BRIEF.md          Manifiesto (no se toca)
AGENTS.md         Este archivo
DESIGN.md         Reglas de diseño y accesibilidad
CLAUDE.md         Apunta a AGENTS.md
docs/
  IDEAS.md        Lluvia de ideas
  DECISIONES.md   Registro de decisiones (qué, quién, por qué)
  STORYBOARD.md   Guion de la presentación, escena por escena
  CONDICIONES.md  Reglas del organizador (no se toca)
  PLAN.md         Plan día por día hasta la entrega
  HILO.md         Borrador del hilo de X
presentacion/     Entregable 1: storyboard web
  bocetos/        Fotos o escaneos de los dibujos a mano (originales, no se tocan)
  ilustraciones/  Versiones limpias en SVG
app/              Entregable 2: página + bot de WhatsApp (se crea al arrancar)
```
