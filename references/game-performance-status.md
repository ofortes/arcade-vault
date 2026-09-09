# Performance por juego — Estado

> Mantenido por el agente `game-performance-booster`. Un juego por corrida. No editar manualmente sin avisar al agente.

## Estado por juego

| Juego      | save/restore por entidad | shadowBlur por entidad | Overlay FPS dev-only | Última auditoría     |
| ---------- | ------------------------ | ---------------------- | -------------------- | -------------------- |
| tetris     | —                        | —                      | —                    | —                    |
| arkanoid   | ✅ corregido             | ✅ agrupado            | ✅                   | 2026-09-09           |
| asteroides | —                        | —                      | —                    | —                    |
| snake      | —                        | —                      | —                    | —                    |
| frogger    | ✅ corregido             | ✅ agrupado            | ✅                   | 2026-09-09 (spec 10) |

Leyenda: `✅` corregido/presente y verificado · `🟡` en progreso · `—` pendiente de auditar

## Notas de auditoría — arkanoid (2026-09-09)

- `lib/games/arkanoid/engine.ts`, `drawBrick()`: hacía `ctx.save()`/`ctx.restore()` sin condición en cada ladrillo dibujado (hasta 80 en el nivel 3, un `save`/`restore` por entidad por frame). Fix: igual que `drawEntity` en `components/games/FroggerGame.tsx` — `save`/`restore` solo cuando `currentSkin.glow` es `true` (único caso que necesita aislar `shadowBlur`/`shadowColor`); el resto de propiedades (`fillStyle`, `strokeStyle`, `lineWidth`) ya se sobreescriben en cada llamada.
- `drawHud()`, loop de iconos de vida (modo vector, hasta 3 por frame): mismo patrón — `save`/`restore` incondicional. Fix idéntico: gateado por `currentSkin.glow`.
- `drawPaddle()` y `drawBall()` también usan `save`/`restore` con `shadowBlur` condicionado a `glow`, pero dibujan una sola instancia por frame (no un loop sobre entidades) — no calificaban como el patrón diagnosticado en spec 10 y se dejaron sin cambios para minimizar el diff.
- `lib/games/arkanoid/spritesheet.ts`: sin `ctx.save()`/`ctx.restore()` ni `shadowBlur`/`shadowColor` — sin cambios necesarios.
- No existía overlay de FPS dev-only en el motor (a diferencia de Frogger). Se añadió replicando el patrón exacto de `FroggerGame.tsx`: contadores `fpsInstant`/`fpsAvg`/`fpsMin` actualizados en `loop(timestamp)` a partir de un `dt` calculado localmente (sin alterar el `timestamp` que ya consumen `update()`/`draw()` para las explosiones), dibujados con un único `fillText` en la esquina inferior derecha del canvas, gateado por `process.env.NODE_ENV === "development"`.
- Sin cambios visuales en ningún skin (`classic`/`retro`/`neon`), ni en lógica de juego (colisiones, puntaje, niveles, guardado de score).
