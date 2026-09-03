# SPEC 02 — Destrucción de ladrillos con animación

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-09-01
> **Objective:** Al destruir un ladrillo, reproducir en su lugar la animación de explosión de 4 frames (`EXPLOSION_FRAMES`) sin pausar el resto del juego.

---

## Scope

**In:**

- Al morir un ladrillo (`checkBrickCollision`), además de marcarlo `alive = false`, registrar una explosión activa en la posición y color de ese ladrillo.
- Animar la explosión usando los 4 frames de `EXPLOSION_FRAMES[color]` (definidos en `assets/spritesheet.js`), dibujados con `drawFrame(ctx, frame, x, y, w, h)`.
- Duración total de la animación: 150ms (`EXPLOSION_DURATION`), repartidos en partes iguales entre los 4 frames (~37.5ms cada uno), medida con timestamps reales (`performance.now()` / el timestamp que entrega `requestAnimationFrame`), no con conteo de frames de `requestAnimationFrame`.
- Soportar múltiples explosiones simultáneas: `state.explosions` es un array de entradas independientes, cada una con su propio tiempo de inicio.
- El juego sigue corriendo con normalidad mientras hay explosiones activas: la pelota, la paleta y el resto de colisiones no se detienen ni se ven afectados por la animación.
- Al terminar los 150ms de una explosión, esa entrada se elimina de `state.explosions` y deja de dibujarse.
- Al perder una vida (`checkFloorCollision` → `resetBallAndPaddle`) o al reiniciar la partida (`resetGame`), vaciar `state.explosions` de inmediato, cortando cualquier animación en curso.

**Out of scope (para specs futuras):**

- Cualquier sonido adicional o distinto a `break-sound.mp3` (ya implementado en SPEC 01, no cambia).
- Efectos de partículas, sacudida de cámara u otros efectos visuales más allá de los 4 frames existentes.
- Animaciones de destrucción para la paleta o la pelota.

---

## Data model

```js
// Nueva entrada en el estado global (SPEC 01 ya define state.score, state.lives, etc.)
state.explosions = [
  /* { x, y, w, h, color, startTime } */
];
```

Convenciones:

- `x, y, w, h`: posición y tamaño del ladrillo destruido (iguales a `brick.x, brick.y, brick.w, brick.h`), reutilizados tal cual para posicionar los frames de la explosión.
- `color`: el mismo string que `brick.color` (una de las claves de `EXPLOSION_FRAMES`: `red`, `cyan`, `green`, `magenta`, `yellow`, `hotpink`; `gray` existe en el spritesheet pero no se usa en el grid de SPEC 01).
- `startTime`: timestamp (ms) tomado del argumento que recibe el callback de `requestAnimationFrame`, capturado en el momento en que se crea la explosión.
- `state.explosions` se reconstruye vacío (`[]`) en cada `resetBallAndPaddle()` y en cada `resetGame()`.

---

## Implementation plan

1. Modificar `loop(timestamp)` y las funciones que dependen de él (`update`, `updateBall`, `checkBrickCollision`) para que reciban/tengan acceso al `timestamp` actual entregado por `requestAnimationFrame`, en vez del `loop()` sin argumentos actual. Prueba manual: el juego sigue funcionando exactamente igual que antes (sin regresión visible).
2. En `checkBrickCollision`, cuando un ladrillo se destruye, además de `brick.alive = false`, hacer `state.explosions.push({ x: brick.x, y: brick.y, w: brick.w, h: brick.h, color: brick.color, startTime: timestamp })`. Prueba manual: romper un ladrillo no cambia nada visible todavía (la explosión aún no se dibuja).
3. Añadir una función `updateExplosions(timestamp)` que recorra `state.explosions` y elimine (filtre) las que ya superaron los 150ms desde su `startTime`. Llamarla desde `update(timestamp)` en cada frame, incluso si `state.status !== 'playing'`. Prueba manual: sin cambios visibles aún (no hay dibujo todavía), pero no debe haber errores en consola.
4. Añadir una función `drawExplosions(timestamp)` que, para cada entrada de `state.explosions`, calcule el índice de frame (`Math.min(3, Math.floor((timestamp - startTime) / (150 / 4)))`) y dibuje `EXPLOSION_FRAMES[color][frameIndex]` con `drawFrame(ctx, frame, x, y, w, h)`. Llamarla desde `draw()` después de dibujar los ladrillos vivos. Prueba manual: al romper un ladrillo se ve la animación de 4 frames en su lugar durante ~150ms, mientras la pelota y la paleta siguen moviéndose con normalidad.
5. Vaciar `state.explosions = []` dentro de `resetBallAndPaddle()` y dentro de `resetGame()`. Prueba manual: perder una vida o reiniciar la partida justo cuando hay una explosión en curso la corta de inmediato, sin animaciones huérfanas en el frame siguiente.

---

## Acceptance criteria

- [ ] Al destruir un ladrillo se reproduce en su lugar la animación de 4 frames de `EXPLOSION_FRAMES[color]`, con el color correspondiente al del ladrillo destruido.
- [ ] La animación completa dura ~150ms, medidos con timestamps reales (no depende del framerate del navegador).
- [ ] Mientras la explosión se reproduce, la pelota y la paleta siguen moviéndose y respondiendo a colisiones con normalidad (el juego no se pausa).
- [ ] Romper dos o más ladrillos en sucesión rápida muestra varias explosiones simultáneas, cada una en su propia posición y con su propio timing.
- [ ] Al terminar sus 150ms, cada explosión desaparece del canvas sin dejar rastro.
- [ ] Perder una vida o ganar/perder la partida (y el reinicio consecuente) corta de inmediato cualquier explosión en curso.
- [ ] No hay errores en consola relacionados a `drawFrame`, `EXPLOSION_FRAMES` o `state.explosions`.

---

## Decisions

- **Sí:** el juego sigue corriendo en vivo durante la explosión (sin pausas). Es lo más fiel al Arkanoid clásico y evita que romper varios ladrillos seguidos se sienta entrecortado.
- **Sí:** `EXPLOSION_DURATION` (150) se interpreta como duración total de los 4 frames, no por frame. Con timestamps reales en vez de conteo de frames de `requestAnimationFrame`, para que la velocidad de la animación no dependa del framerate del navegador.
- **Sí:** `state.explosions` como array, soportando múltiples explosiones simultáneas desde el día uno. Aunque hoy `checkBrickCollision` rompe como máximo un ladrillo por frame, la estructura no cuesta más y evita rehacerla si eso cambia.
- **Sí:** cortar cualquier explosión en curso al perder una vida o reiniciar la partida, vaciando `state.explosions`. Es lo más simple y evita animaciones huérfanas sobre un grid que ya cambió de estado.
- **No:** sonido adicional para la explosión. `break-sound.mp3` ya se reproduce en el momento de la destrucción (SPEC 01) y no cambia.
- **No:** efectos de partículas o cámara. Fuera de alcance; solo se usan los 4 frames ya existentes en el spritesheet.

---

## What is **not** in this spec

- Sonido nuevo o distinto para la explosión (se mantiene `break-sound.mp3` de SPEC 01).
- Efectos de partículas, sacudida de cámara u otros efectos visuales adicionales.
- Animaciones de destrucción para la pelota o la paleta.

Cada uno de estos, si se implementa, va en su propio spec.
