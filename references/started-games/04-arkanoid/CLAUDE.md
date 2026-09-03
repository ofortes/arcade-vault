# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

Clon de Arkanoid en HTML/CSS/JS puro, sin build tooling ni dependencias — se ejecuta abriendo `index.html` directamente en el navegador (o sirviéndolo con un servidor estático simple). No hay tests, linter, ni gestor de paquetes.

`script.js` implementa el juego completo (bucle, input, colisiones, puntuación, vidas, niveles). Toda feature de más de un archivo se ha construido vía el flujo spec-driven descrito abajo; las specs implementadas hasta ahora viven en `specs/` (ver más abajo).

## Arquitectura

- `index.html` — un único `<canvas id="game" width="448" height="600">` dentro de `#game-container`. Carga `assets/spritesheet.js` y luego `script.js`, en ese orden (el segundo depende de las funciones globales del primero).
- `style.css` — solo centra el canvas y da estilo al contenedor; toda la lógica visual del juego se dibuja en el canvas vía JS, no en el DOM/CSS.
- `script.js` — estado global único (`state`: `status`, `score`, `lives`, `level`, `paddle`, `ball`, `bricks`, `explosions`, ...) mutado directamente por funciones de update/input, sin framework ni módulos. `state.status` es la máquina de estados del juego (`start`, `playing`, `life-lost`, `level-complete`, `win`, `lose`) y controla qué overlay dibuja `drawOverlay`. `LEVELS` es un array fijo de configuración por nivel (filas, huecos, multiplicador de velocidad de la pelota); `state.level` (1-indexado) indexa contra él y se reinicia a 1 en cada partida nueva. El loop corre con `requestAnimationFrame`.
- `assets/spritesheet.js` — carga `assets/spritesheet-breakout.png` en un canvas offscreen y expone helpers globales sin módulos (`SPRITES`, `EXPLOSION_FRAMES`, `loadSpritesheet(cb)`, `drawSprite(ctx, name, x, y, w, h)`, `drawFrame(ctx, frame, x, y, w, h)`). `script.js` debe llamar `loadSpritesheet()` y esperar su callback antes de dibujar. Los nombres de bloque para `drawSprite` usan el prefijo `block_` (p. ej. `block_red`), resuelto internamente contra `SPRITES.blocks`.
- `assets/sounds/` — `ball-bounce.mp3` y `break-sound.mp3`, para reproducir en el rebote de la pelota y la destrucción de ladrillos respectivamente.
- `assets/SPEC.md` — no es la spec del juego; es el README del kit de skills spec-driven (`/spec`, `/spec-impl`) instalado en `.claude/skills/`. No confundir con la documentación del propio Arkanoid.
- `specs/` — specs de features implementadas o en curso vía el flujo spec-driven (ver abajo). `specs/.spec-config.yml` controla `AutoCreateBranch` para `/spec-impl` (por defecto `true`).

## Flujo de trabajo spec-driven (skills instaladas)

Este proyecto tiene instaladas las skills `/spec` y `/spec-impl` (`.claude/skills/spec/`, `.claude/skills/spec-impl/`). Es el flujo estándar del repo — todas las features no triviales hasta ahora (MVP jugable, animación de destrucción de ladrillos, niveles con dificultad progresiva) se han hecho así, no ad hoc:

1. `/spec <slug>` — diseña la feature por fases (contexto → clarificación → desarrollo por secciones → guardado) y la deja en `specs/NN-slug.md` con estado `Borrador`. `NN` es el siguiente número secuencial (el último usado es `03`).
2. El humano relee el spec fuera del chat y cambia manualmente el estado a `Aprobado` — Claude nunca aprueba su propio spec.
3. `/spec-impl <NN-slug>` — valida que el estado sea `Aprobado`, crea la rama `spec-NN-slug`, e implementa paso a paso pausando entre pasos para revisar el diff. Al terminar, actualiza el estado del spec a `Implementado` y el merge a `main` se hace fuera del flujo (commit `Merge spec-NN-slug: ...`).

Cada spec en `specs/` sigue el mismo encabezado: `Status` (`Borrador` / `Aprobado` / `Implementado`), `Depends on` (specs previas de las que depende), `Date`, `Objective`, y una sección `Scope` con `In:`/`Out:` explícitos. Para features nuevas, preferir este flujo antes que editar `script.js` directamente cuando el cambio toca varios archivos o implica decisiones caras de revertir (p. ej. estructura de `state`, la máquina de estados de `status`, o el formato de `LEVELS`).

## Mecánicas del juego (spec original en README.md; implementadas y extendidas vía specs/)

- La pelota tiene posición y velocidad; invierte dirección al chocar con paredes.
- La paleta se mueve con mouse o teclado (flechas / A-D); el ángulo de rebote en la paleta depende del punto de contacto (`PADDLE_BOUNCE_ANGLES`).
- Golpear un ladrillo lo destruye con una animación de explosión, invierte la dirección de la pelota y suma puntos (`BRICK_POINTS`).
- La pelota cayendo por debajo de la paleta resta una vida. Estados de juego: `start`, `playing`, `life-lost`, `level-complete`, `win`, `lose`.
- 3 niveles fijos y progresivos (`LEVELS`): más filas de ladrillos, huecos en el grid y pelota más rápida en cada uno; completar el nivel 3 gana la partida, perder todas las vidas la termina. Un reset completo de partida vuelve siempre al nivel 1.
- El loop se controla con `requestAnimationFrame`.

Extras opcionales mencionados en la spec original y aún no implementados: power-ups, pantallas de inicio/fin más elaboradas, marcador/ranking persistente.
