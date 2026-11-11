# DESIGN.md

Reglas mínimas e innegociables. Las dos personas que usan esto ven poco y no tienen paciencia con la tecnología. **Legible y obvio le gana a lindo.**

La identidad visual (paleta, tipografía, tono) **todavía no está definida** y la decide el equipo (ver AGENTS.md §5). Las reglas de abajo valen para cualquier identidad que se elija.

## 1. Lectura

- Texto base de **20px como mínimo**. Los precios, todavía más grandes y destacados.
- Contraste de texto de **7:1 como mínimo** (WCAG AAA). Nada de gris claro sobre blanco.
- Tipografía sans o serif simple y muy legible. Nada de letra manuscrita ni decorativa en títulos de producto ni en precios.
- Interlineado generoso (1.5 o más). Línea corta.
- El texto tiene que seguir funcionando con el zoom del celular al 200%.

## 2. La grilla

- **Celular: una columna.** Cada pieza ocupa el ancho de la pantalla.
- Pantallas grandes: 2 o 3 columnas como máximo.
- Orden fijo en cada tarjeta: **foto → título → precio.**
- La foto es grande y se ve entera, sin recortes agresivos.
- Precio en formato argentino: `$ 12.500`.

## 3. Lo que NO se usa

- Carruseles, sliders, popups, modales ni banners de cookies.
- Nada que dependa del hover (en el celular no existe).
- Animaciones, parallax, videos de fondo.
- Íconos sin texto al lado.
- Menús, filtros y buscadores (con pocas piezas no hacen falta).
- Scroll infinito: todas las piezas están en la página.

## 4. Interacción (para cualquier pantalla que use la tía)

- Botones de **56px de alto como mínimo**, con texto claro ("Agregar pieza", no "+").
- Una sola acción por pantalla.
- Siempre se confirma lo que pasó, con palabras ("Listo, la pieza ya está en la página").
- Todo se puede deshacer o corregir sin miedo.
- Nada de contraseñas ni pasos que dependan del mail.

## 5. Accesibilidad básica

- Cada foto tiene texto alternativo (puede ser el título de la pieza).
- HTML semántico: un `h1`, una lista de productos, títulos reales.
- Se tiene que poder recorrer con teclado y con lector de pantalla.
- Antes de publicar, revisar con el skill `wcag-2.2-aa`.

## 6. Rendimiento

- Imágenes comprimidas, en un tamaño razonable y con carga diferida (`loading="lazy"`).
- La página tiene que verse bien en un celular de gama baja con 3G.
- Si falla JavaScript, la página se tiene que poder ver igual.
