// Datos de ejemplo SOLO para desarrollo local (nunca se usan en Vercel).
// Las "fotos" son rectángulos grises con distintas proporciones, para probar el layout.

const pieza = (id, titulo, precio, ancho, alto) => ({
  id, titulo, precio, ancho, alto, foto: `/dev/fotos/${ancho}x${alto}.svg`,
});

export const catalogosDeEjemplo = {
  norma: {
    nombre: 'Taller de Norma',
    esPrueba: false,
    piezas: [
      pieza('1', 'Jarrón azul', 15000, 900, 1200),
      pieza('2', 'Plato hondo verde', 12000, 1200, 900),
      pieza('3', 'Taza con asa grande', 6500, 1000, 1000),
      pieza('4', 'Fuente ovalada esmaltada en blanco y celeste para servir', 28000, 1200, 800),
      pieza('5', 'Maceta', 9800, 900, 1200),
      pieza('6', 'Juego de 4 cuencos', 125000, 1200, 900),
    ],
  },
  'prueba-demo': {
    nombre: 'Página de prueba',
    esPrueba: true,
    piezas: [pieza('7', 'Mi primera pieza', 1000, 1000, 1000)],
  },
  vacia: { nombre: 'Taller de Norma', esPrueba: false, piezas: [] },
};
