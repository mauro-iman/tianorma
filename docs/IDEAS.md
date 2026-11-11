# Lluvia de ideas

Nada de esto está decidido. Son opciones para discutir; lo que se elija va a [DECISIONES.md](DECISIONES.md).

El problema difícil no es la página (es una grilla). Es **cómo actualiza la tía** si solo sabe usar WhatsApp y no ve bien.

---

## A. Cómo actualiza la tía

### A1. "Le mandás la foto a la página" (bot de WhatsApp) ⭐
La tía agenda un contacto, por ejemplo **"Mi Página"**, y le escribe como a una persona:
- **Agregar:** manda una foto con un texto al pie: `Jarrón azul 15000`. El bot contesta: *"Listo Norma, el Jarrón azul ya está en la página."*
- **Vendido / sacar:** responde a la foto que ya había mandado con `vendido`.
- **Cambiar precio:** responde a la foto con el número nuevo: `18000`.
- **Cambiar foto:** responde a la vieja con una foto nueva.
- **Ver qué hay:** escribe `lista` y recibe las piezas que están publicadas.

**A favor:** usa lo único que ella ya sabe hacer. No hay nada que instalar ni contraseñas, y el "responder a un mensaje" ya lo conoce.
**En contra:** la API de WhatsApp Business necesita un número aparte, verificación de Meta y puede tener costo. Hay que leer bien textos escritos "a su manera" (`15.000`, `$15mil`, `quince mil`).

### A2. Notas de voz
Lo mismo que A1, pero puede mandar un audio: *"este jarrón verde sale doce mil"*. Se transcribe y se interpreta.
**A favor:** si no ve bien, hablar es más fácil que escribir.
**En contra:** se puede equivocar. Siempre tiene que contestar qué entendió y pedir que confirme con un "sí".

### A3. La ficha escrita a mano (idea de profe de plástica)
Saca la foto de la pieza con un **cartelito escrito a mano al lado** con el nombre y el precio. El sistema lee el cartelito y recorta la pieza.
**A favor:** es su forma de trabajar, con papel y lápiz. La ficha queda como registro físico en el taller.
**En contra:** es la más frágil técnicamente. Puede servir como complemento de A1, no como el único camino.

### A4. Sobrino de intermediario (cero tecnología nueva)
La tía le manda las fotos a un familiar por WhatsApp y esa persona actualiza una planilla de Google Sheets que alimenta la página.
**A favor:** sale andando mañana y es gratis.
**En contra:** depende de otra persona y la tía no gana autonomía. Igual sirve como **plan B**: el bot de A1 puede aceptar mensajes de dos números autorizados (la tía y el sobrino).

### A5. App web con tres botones gigantes
Un link guardado en la pantalla de inicio del celular (sin contraseña, con un enlace privado) que abre tres botones: **Agregar pieza / Marcar vendida / Cambiar precio**. Abre la cámara directo.
**A favor:** no depende de Meta y es barata.
**En contra:** es una interfaz nueva para ella, que tiene que aprender a abrir "la otra cosa".

### Descartadas
- **Mail, Instagram, Telegram:** no los tiene o no los quiere.
- **CMS clásico (WordPress, Shopify, etc.):** requiere compu y loguearse.
- **Que la tía edite un archivo:** no.

---

## B. Cómo es la página para el comprador

- **B1. Grilla fiel al boceto:** foto, título y precio. Una columna en el celular, letra grande.
- **B2. ¿Qué pasa con lo vendido?**
  - Desaparece (más simple y fiel al boceto).
  - Queda con un sello **"Vendido"** (muestra el trabajo de la tía y genera confianza, pero puede frustrar).
- **B3. ¿Cómo sabe el comprador a quién escribirle?** El boceto no tiene link a WhatsApp a propósito. Opciones: no poner nada (los compradores ya la conocen), o mostrar un texto simple tipo *"Si te gusta alguna, escribile a Norma"* con el número escrito, sin link. **Hay que preguntarle a la tía.**
- **B4. Las piezas más nuevas primero**, así quien vuelve ve enseguida lo que agregó.

---

## C. Identidad: que sea nuestra (y de ella)

Ideas para que la página tenga alma sin perder legibilidad:

- **C1. Su firma o un dibujo suyo como logo.** Le pedimos que dibuje algo en papel, lo fotografiamos y lo vectorizamos a mano. La única pieza "artística" de la página la hace ella.
- **C2. Colores sacados de sus esmaltes.** La paleta se toma de las fotos reales de sus piezas o de sus frascos de esmalte (con el contraste validado).
- **C3. Fondo o textura de arcilla real**, fotografiada en su taller y muy sutil, sin tapar la lectura.
- **C4. Nombre de la página:** que lo elija ella. Por ejemplo *"El taller de Norma"*.
- **C5. Una sola línea de presentación escrita por ella**, de puño y letra (como imagen decorativa, con el texto también en HTML para que sea accesible).
- **C6. Las piezas de la grilla como "estante":** la grilla se presenta como los estantes del taller. Es un recurso visual simple, sin efectos.

---

## D. Técnica (a definir según A)

- **Sitio:** HTML/CSS estático, sin framework o con uno mínimo. Hosting gratis (GitHub Pages, Netlify, Cloudflare Pages).
- **Datos:** un `productos.json` (o una planilla) separado del HTML.
- **Imágenes:** se guardan y se comprimen automáticamente al recibirlas.
- **Si va A1:** un servicio chico (función serverless) que recibe el webhook de WhatsApp, actualiza los datos y vuelve a publicar el sitio.

---

## Preguntas abiertas para la tía (o el sobrino)

1. ¿Puede tener un segundo número o contacto para "la página"?
2. ¿Prefiere escribir o mandar audios?
3. ¿Las piezas vendidas desaparecen o quedan marcadas?
4. ¿Va su número de teléfono escrito en la página?
5. ¿Cuántas piezas tiene más o menos a la vez? ¿10? ¿50?
6. ¿Quiere que la página tenga nombre? ¿Cuál?
