# 11 · Densidad de tráfico en Frogger

- **Estado:** Implementada
- **Depende de:** Frogger core (`specs/game-jam/frogger/01-frogger-core.md`), Performance en Frogger (`specs/10-frogger-performance.md`)
- **Fecha:** 2026-09-09
- **Objetivo:** Reducir de forma moderada la densidad y velocidad de tráfico en los carriles de carretera y de río de Frogger (`components/games/FroggerGame.tsx`) para que la partida sea superable, sin tocar skins, HUD ni la progresión de dificultad en niveles avanzados.

## Alcance

**Incluye:**

- Ajuste de constantes en `buildRoadLane()` (carretera):
  - Probabilidad de camión: `0.35` → `0.2` (menos camiones anchos bloqueando el paso).
  - Hueco mínimo entre entidades tras cada una: `randInt(2, 4)` → `randInt(3, 5)`.
  - Los rangos de ancho de coche (`randInt(1, 2)`) y camión (`randInt(2, 3)`) no cambian — la densidad se controla por probabilidad y hueco, no por tamaño.
- Ajuste de constantes en `buildRiverLane()` (río, troncos/tortugas):
  - Hueco mínimo entre entidades tras cada una: mismo ensanchado que carretera, `randInt(2, 4)` → `randInt(3, 5)`, para reducir el amontonamiento visual.
  - Probabilidad de grupo de tortugas: `0.4` → `0.3`.
  - Los rangos de ancho de tronco (`randInt(2, 4)`) y tortuga (`randInt(2, 3)`) no cambian.
- Amortiguación de velocidad base en niveles 1-3, aplicada tanto a carretera como a río, dentro de `buildLanes(level)`:
  - `const earlyLevelDamp = level <= 3 ? 0.75 : 1;`
  - Se aplica multiplicando el `baseSpeed` calculado (`0.5 + Math.random() * 2.5` en carretera, `0.3 + Math.random() * 2` en río) antes de pasarlo a `buildRoadLane`/`buildRiverLane`.
  - El escalado por nivel ya existente (`Math.pow(1.1, level - 1)` en carretera, `Math.pow(1.15, level - 1)` en río) queda intacto — a partir del nivel 4 el juego se comporta exactamente igual que hoy.

**Fuera de alcance (para futuros specs):**

- Cambios de skins, colores o formas de cualquier entidad — solo cambian probabilidades/huecos/velocidad, no el renderizado.
- Cambios en el HUD, temporizador de ronda, sistema de metas, vidas o guardado de score.
- `components/games/FroggerPlayer.tsx` y cualquier archivo fuera de `FroggerGame.tsx` — este spec es exclusivo del motor de Frogger.
- Los otros 4 motores (asteroides, tetris, arkanoid, snake) — no tienen carriles de tráfico ni este problema.
- Rediseño del HUD compartido de la plataforma (stat META, selector de skin en dropdown, botón FIN) — cubierto por `specs/12-hud-plataforma-meta-dropdown-fin.md`.
- Migrar Frogger al patrón `lib/games/registry.ts`/`GameEngineHandle` — excepción arquitectónica documentada en `CLAUDE.md`, ajena a este ajuste de balance.
- Rebalanceo adicional en niveles ≥4 — se mantiene la progresión de dificultad actual sin cambios.

## Modelo de datos

Este spec no introduce estructuras ni datos persistentes. Son constantes de tuning (probabilidades, rangos de huecos, multiplicador de velocidad) dentro de funciones ya existentes en `FroggerGame.tsx`.

## Plan de implementación

1. **Ajustar `buildRoadLane()`.** Cambiar la probabilidad de camión de `0.35` a `0.2` y el hueco `randInt(2, 4)` a `randInt(3, 5)`. Verificación: `npm run dev`, jugar nivel 1 en `/juegos/frogger/jugar`, confirmar visualmente menos camiones y más espacio entre vehículos.
2. **Ajustar `buildRiverLane()`.** Cambiar el hueco `randInt(2, 4)` a `randInt(3, 5)` y la probabilidad de grupo de tortugas de `0.4` a `0.3`. Verificación: jugar el tramo de río, confirmar que sigue habiendo suficientes troncos/tortugas para cruzar sin quedarse sin apoyo, con menos amontonamiento visual que antes.
3. **Amortiguar velocidad en niveles 1-3.** En `buildLanes(level)`, introducir `earlyLevelDamp` y aplicarlo al `baseSpeed` de ambos tipos de carril antes de construir las lanes. Verificación: comparar sensación de velocidad en nivel 1 vs. nivel 4-5 — nivel 1 debe notarse más lento, nivel 4+ igual que antes del cambio.
4. **Playtest completo.** Jugar una partida de principio a fin (varios niveles) confirmando que: (a) es posible cruzar carretera y río en los primeros niveles sin bloqueos permanentes, (b) la dificultad sigue subiendo de forma perceptible a partir del nivel 4, (c) no hay regresión visual ni de comportamiento en colisiones, metas, timer, vidas o guardado de score. `npm run build` sin errores de TypeScript ni lint.

Cada paso deja el juego jugable de principio a fin.

## Criterios de aceptación

- [x] En `buildRoadLane()`, la probabilidad de camión es `0.2` y el hueco mínimo es `randInt(3, 5)`.
- [x] En `buildRiverLane()`, el hueco mínimo es `randInt(3, 5)` y la probabilidad de grupo de tortugas es `0.3`.
- [x] `buildLanes(level)` aplica `earlyLevelDamp` (`0.75` en niveles 1-3, `1` en niveles ≥4) al `baseSpeed` de carretera y de río.
- [x] Playtest manual: nivel 1 es superable sin bloqueos permanentes en carretera ni pérdida de apoyo en río.
- [x] Playtest manual: a partir del nivel 4, la velocidad/densidad percibida es igual que antes del cambio (progresión de dificultad no alterada).
- [x] Ningún cambio visual en ningún skin (`classic`, `retro`, `neon`).
- [x] Controles, colisiones, metas, timer, vidas, game over y guardado de score en Supabase funcionan igual que antes del cambio.
- [x] `npm run build` completa sin errores de TypeScript ni de lint.
- [x] Los otros 4 juegos (asteroides, tetris, arkanoid, snake) no tienen cambios de código ni de comportamiento.

## Decisiones tomadas y descartadas

- **Sí:** reducción "moderada", no agresiva — se ajustan probabilidades y huecos con incrementos pequeños (35%→20%, hueco 2-4→3-5) en vez de imponer un tope duro de entidades por carril, para mantener variedad aleatoria y desafío creciente por nivel.
- **Sí:** aplicar el ajuste también al río (troncos/tortugas), no solo a carretera — el usuario pidió explícitamente "menos tráfico" en ambos tipos de carril, revirtiendo el alcance inicial de `specs/10-frogger-performance.md` que solo mencionaba coches/camiones.
- **Sí:** en el río, el ajuste es más conservador que en carretera (mismo ensanchado de hueco, pero solo -10 puntos en probabilidad de grupo de tortugas, sin tocar anchos) — las entidades de río son superficies de apoyo, no obstáculos; reducir su densidad tanto como en carretera podría hacer la travesía más difícil, el efecto contrario al buscado.
- **Sí:** amortiguar solo niveles 1-3 y mantener intacto el escalado `Math.pow(...)` existente para niveles ≥4 — la queja del usuario es sobre la jugabilidad inicial, no sobre la curva de dificultad ya establecida en niveles avanzados.
- **No:** tocar el ancho de coches/camiones/troncos/tortugas — el problema reportado es cantidad/velocidad, no tamaño de las entidades individuales.
- **No:** introducir un sistema de dificultad configurable/data-driven (tabla de constantes por nivel, JSON de balance, etc.) — serían tres constantes hardcodeadas más las de siempre; no hay necesidad actual de tunearlas fuera de código.

## Riesgos

| Riesgo                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reducir demasiado la densidad de río hace la travesía trivial o, al contrario, deja huecos sin apoyo si el hueco ensanchado deja tramos sin troncos/tortugas | Playtest manual del paso 2 específicamente en río, antes de pasar al paso 3; si se detecta un tramo intransitable, revertir el ensanchado de hueco solo en río a `randInt(2, 4)` y dejar únicamente el recorte de probabilidad de grupo de tortugas |
| La amortiguación de velocidad en niveles 1-3 genera un salto brusco de sensación al llegar al nivel 4                                                        | Playtest comparando nivel 3 vs. nivel 4 en el paso 4; si el salto es perceptible, usar la variante de amortiguación gradual (`0.7 + (level - 1) * 0.05` en vez de un escalón fijo `0.75`) documentada como alternativa en este spec                 |

## Qué **no** incluye este spec

- Cambios en el HUD, selector de skin o botón FIN — ver `specs/12-hud-plataforma-meta-dropdown-fin.md`.
- Cambios visuales en cualquier skin.
- Cambios en asteroides, tetris, arkanoid o snake.
- Migrar Frogger al patrón `lib/games/registry.ts`.
- Tests automatizados de balance.

Cada uno de esos, si se necesita, va en su propio spec.
