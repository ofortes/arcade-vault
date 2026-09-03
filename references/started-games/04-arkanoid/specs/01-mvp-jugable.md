# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-09-01
> **Objective:** Implementar `script.js` para tener un Arkanoid de un solo nivel completamente jugable: paleta, pelota, ladrillos, colisiones, puntuación, vidas, sonido y estados de inicio/victoria/derrota.

---

## Scope

**In:**

- Bucle de juego con `requestAnimationFrame`.
- Paleta controlable con mouse (seguir cursor sobre el canvas) y teclado (flechas izq/der o A/D).
- Pelota con posición y velocidad; rebota en paredes laterales y superior invirtiendo la componente correspondiente.
- Rebote en la paleta con ángulo variable según zona de impacto (división en franjas discretas).
- Grid de ladrillos: 8 columnas x 6 filas, un color por fila usando los 7 colores disponibles en `SPRITES.blocks` (una fila repite color si hacen falta 6 filas con 7 colores, ver Data model).
- Colisión pelota-ladrillo: destruye el ladrillo impactado, invierte la dirección vertical de la pelota, suma puntos.
- Puntuación: mismo valor por ladrillo (10 pts), mostrada en overlay de texto sobre el canvas.
- Vidas: 3 al empezar, mostradas en overlay de texto. Perder una vida = pelota cae por debajo de la paleta.
- Al perder una vida (si quedan vidas): pelota y paleta se reposicionan al centro, el juego se pausa hasta que el jugador pulse espacio o haga clic.
- Estados de juego: inicio, jugando, victoria (todos los ladrillos destruidos), derrota (0 vidas). Cada uno con overlay de texto dibujado en el propio canvas (sin HTML/CSS adicional).
- Reinicio completo de la partida (vidas, puntuación, grid de ladrillos, posición de pelota/paleta) pulsando espacio o clic desde el overlay de victoria o derrota.
- Sonido: reproducir `assets/sounds/ball-bounce.mp3` en cada rebote de la pelota (paredes y paleta) y `assets/sounds/break-sound.mp3` al destruir un ladrillo.
- Gráficos vía `assets/spritesheet.js`: `loadSpritesheet()` antes de iniciar el loop, `drawSprite(ctx, 'paddle', ...)`, `drawSprite(ctx, 'ball', ...)`, `drawSprite(ctx, 'block_<color>', ...)`.

**Out of scope (for future specs):**

- Power-ups (pelota más rápida, paleta más larga, vidas extra).
- Múltiples niveles o patrones de ladrillos distintos.
- Persistencia de puntuación/ranking entre sesiones (localStorage o similar).
- Animación de explosión de ladrillos (`EXPLOSION_FRAMES` ya existe en el spritesheet pero no se usa en este MVP).
- Pantallas de inicio/fin con elementos HTML/CSS superpuestos (se usa overlay de texto en canvas).

---

## Data model

```js
// Estado global del juego
const state = {
  status: "start", // 'start' | 'playing' | 'life-lost' | 'win' | 'lose'
  score: 0,
  lives: 3,
  paddle: { x: 0, y: 0, w: 64, h: 14 }, // y fija cerca del borde inferior
  ball: { x: 0, y: 0, vx: 0, vy: 0, r: 8 },
  bricks: [
    /* { x, y, w, h, color, alive } */
  ],
};

const BRICK_COLORS_BY_ROW = [
  "hotpink",
  "red",
  "magenta",
  "yellow",
  "green",
  "cyan",
];
const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_POINTS = 10;
const INITIAL_LIVES = 3;
```

Convenciones:

- Origen de coordenadas: esquina superior izquierda del canvas (448x600).
- Velocidades en píxeles/frame.
- `state.bricks` se reconstruye por completo en cada reinicio de partida (nunca se reutiliza el array anterior).
- El ancho de la paleta (`paddle.w`) usa `SPRITES.paddle.sw` como referencia visual pero puede escalarse; el valor exacto se fija al implementar, sin afectar el resto del modelo.

---

## Implementation plan

1. Crear `script.js` con el esqueleto: obtener `ctx` del canvas, llamar a `loadSpritesheet()`, y una vez cargado dibujar un frame estático con paleta, pelota y grid de ladrillos en sus posiciones iniciales. Prueba manual: abrir `index.html`, ver los sprites dibujados sin errores en consola.
2. Implementar el bucle principal con `requestAnimationFrame` y el estado `'start'`: overlay de texto "Pulsa espacio o haz clic para jugar". Escuchar espacio/clic para pasar a `'playing'`. Prueba manual: se ve el overlay y la transición funciona.
3. Implementar movimiento de la paleta con teclado y mouse, acotado a los límites del canvas. Prueba manual: la paleta se mueve con ambos inputs sin salirse del área.
4. Implementar movimiento de la pelota y rebote en paredes laterales/superior. Prueba manual: la pelota se mueve y rebota visualmente en los bordes.
5. Implementar colisión pelota-paleta con ángulo de rebote por franjas, y colisión pelota-suelo (pérdida de vida → estado `'life-lost'`, reposicionar y pausar hasta input). Prueba manual: la pelota rebota en la paleta con distintos ángulos según el punto de impacto; al caer, se pierde una vida y el juego se pausa.
6. Implementar colisión pelota-ladrillo: detección, destrucción del ladrillo, inversión de dirección vertical, suma de puntos, overlay de puntuación/vidas actualizado en vivo. Prueba manual: al romper ladrillos sube el marcador y desaparecen del grid.
7. Implementar detección de victoria (todos los ladrillos destruidos) y derrota (0 vidas), con sus overlays de texto y reinicio completo al pulsar espacio/clic. Prueba manual: vaciar el grid manualmente (o jugar) para ver el overlay de victoria; dejar caer la pelota 3 veces para ver el de derrota; confirmar que reinicia desde cero.
8. Añadir reproducción de `ball-bounce.mp3` en cada rebote (paredes y paleta) y `break-sound.mp3` al destruir un ladrillo. Prueba manual: se escuchan ambos sonidos en sus eventos correspondientes.

---

## Acceptance criteria

- [ ] Abrir `index.html` en el navegador carga el juego sin errores en consola.
- [ ] La paleta se mueve con el mouse y con flechas/A-D, sin salir del canvas.
- [ ] La pelota rebota correctamente en paredes laterales y superior.
- [ ] El ángulo de rebote en la paleta cambia según la franja de impacto.
- [ ] Golpear un ladrillo lo elimina del grid, invierte la dirección vertical de la pelota y suma 10 puntos al marcador visible.
- [ ] El marcador de vidas empieza en 3 y baja en 1 cada vez que la pelota cae por debajo de la paleta.
- [ ] Al perder una vida (quedando vidas > 0), la pelota y la paleta se recentran y el juego queda en pausa hasta pulsar espacio o clic.
- [ ] Al llegar a 0 vidas se muestra un overlay de derrota ("Game Over") y pulsar espacio/clic reinicia la partida completa (vidas, puntuación, grid).
- [ ] Al destruir todos los ladrillos se muestra un overlay de victoria y pulsar espacio/clic reinicia la partida completa.
- [ ] Se reproduce `ball-bounce.mp3` en cada rebote de pared o paleta.
- [ ] Se reproduce `break-sound.mp3` al destruir cada ladrillo.
- [ ] El grid inicial tiene 8 columnas x 6 filas de ladrillos, con un color por fila.

---

## Decisions

- **Sí:** usar los sprites de `assets/spritesheet.js` (`paddle`, `ball`, `block_*`) en vez de formas simples. Ya están integrados y CLAUDE.md indica que `script.js` debe apoyarse en ellos.
- **No:** animación de explosión (`EXPLOSION_FRAMES`) en este MVP. Es una mejora visual que no bloquea la jugabilidad; se puede añadir después sin tocar el resto del modelo.
- **Sí:** ángulo de rebote por franjas discretas (no fórmula continua). Más simple de implementar y suficiente para un MVP jugable.
- **Sí:** puntuación uniforme (10 pts por ladrillo, sin importar color/fila). Evita una tabla de valores que no aporta al MVP.
- **Sí:** pausa entre vidas (reposicionar y esperar input) en vez de reaparición automática. Da un respiro al jugador y evita perder varias vidas seguidas sin control.
- **No:** persistencia de puntuación (localStorage/ranking). Se deja para una spec futura si se decide implementar.
- **No:** power-ups ni múltiples niveles. Fuera del alcance de un MVP jugable de un solo nivel.

---

## What is **not** in this spec

- Power-ups.
- Múltiples niveles o patrones de ladrillos alternativos.
- Persistencia de puntuación/ranking entre sesiones.
- Animación de explosión de ladrillos al destruirlos.
- Pantallas de inicio/fin con HTML/CSS superpuesto (se usa overlay de texto en canvas).

Cada uno de estos, si se implementa, va en su propio spec.
