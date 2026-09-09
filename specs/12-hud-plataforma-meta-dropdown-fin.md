# 12 · HUD de plataforma: stat META, selector de skin en dropdown y botón FIN

- **Estado:** Aprobado
- **Depende de:** Integración Supabase (`specs/04-integracion-supabase.md`), Tetris (`specs/07-tetris-game.md`), Arkanoid (`specs/08-arkanoid-game.md`), Snake (`specs/09-snake-game.md`), Frogger core (`specs/game-jam/frogger/01-frogger-core.md`)
- **Fecha:** 2026-09-09
- **Objetivo:** Añadir al HUD compartido de los 5 juegos un stat META opcional por juego, convertir el selector de skin de fila de botones a dropdown, y añadir un botón FIN que termina la partida actual sin salir de la pantalla, replicando el layout de la captura de referencia del usuario.

## Alcance

**Incluye:**

- **Stat META**, oculto por defecto y visible solo en juegos que lo definan:
  - Nuevo campo opcional `metaLabel?: string` en `GameEngineEntry` (`lib/games/registry.ts`).
  - Nuevo callback opcional `onMetaChange?: (value: number) => void` en `GameEngineCallbacks` (`lib/games/registry.ts`).
  - `components/GamePlayer.tsx` añade estado `meta` y renderiza el bloque `.hud-stat` de META solo si `engine.metaLabel` existe. Los 4 motores actuales (asteroides, tetris, arkanoid, snake) dejan `metaLabel` sin definir → el stat no aparece, sin dejar hueco vacío.
  - Frogger expone META de forma obligatoria (siempre lo tiene): nuevo contador `roundsCompleted` en `components/games/FroggerGame.tsx`, incrementado en `completeRound()`, reportado mediante un nuevo prop requerido `onMetaChange` con el mismo patrón que `onScoreChange`/`onLivesChange`/`onLevelChange`. `components/games/FroggerPlayer.tsx` añade estado `meta`, lo pasa a `<FroggerGame onMetaChange={setMeta} />`, lo resetea en `restart()` y renderiza el bloque META de forma incondicional (Frogger siempre lo tiene).
- **Botón FIN**, junto a PAUSA y SALIR, que termina la partida actual de inmediato (con guardado de score si aplica) sin navegar fuera de la pantalla de juego:
  - Nuevo método opcional `forceEnd?(): void` en `GameEngineHandle` (`lib/games/registry.ts`).
  - Implementación de `forceEnd()` en los 4 motores (`lib/games/asteroides/engine.ts`, `lib/games/tetris/engine.ts`, `lib/games/arkanoid/engine.ts`, `lib/games/snake/engine.ts`): si el estado es `"playing"`, marca el estado como terminado y llama a `callbacks.onGameOver(score)` de forma **síncrona**, sin esperar al siguiente tick del loop de `requestAnimationFrame` — necesario porque el loop de estos 4 motores no reporta estado mientras está en pausa, y FIN debe funcionar incluso con el juego pausado.
  - `components/GamePlayer.tsx` añade el botón FIN, que llama `handleRef.current?.forceEnd?.()`, reutilizando el flujo existente `onGameOver` → modal de guardado de score. Si un motor no implementa `forceEnd` (no debería ocurrir tras este spec, pero por seguridad), el botón no hace nada en vez de romper.
  - Para Frogger: nuevo prop opcional `forceEndSignal?: number` en `FroggerGame.tsx` (contador incremental, mismo patrón de ref sincronizado que `pausedRef`/`skinKeyRef`). Al detectar un cambio, fuerza `status = "gameover"` en el siguiente frame de `update()`, lo cual `reportState()` recoge de inmediato porque en Frogger ese reporte corre en cada iteración de `loop()` sin depender de si está en pausa. `FroggerPlayer.tsx` añade estado `forceEndSignal` y el botón FIN que lo incrementa.
- **Selector de skin como dropdown**, en vez de fila de botones:
  - `components/GamePlayer.tsx` y `components/games/FroggerPlayer.tsx`: sustituir la fila de botones (`AVAILABLE_SKINS`/`availableSkins`) por un `<select className="skin-select">` sobre el mismo estado `skinKey`/`setSkinKey` ya existente.
  - Nueva clase `.skin-select` en `app/globals.css`, con la estética CRT/pixel de la plataforma (borde, mayúsculas, `appearance: none` con flecha custom, glow de foco a juego con `.modal .input-row input`) — regla nueva, sin modificar las existentes.

**Fuera de alcance (para futuros specs):**

- Cambios de gameplay en cualquier motor más allá de exponer `forceEnd()`/`onMetaChange` — no se toca lógica de puntuación, colisiones, niveles ni dificultad.
- Densidad/velocidad de tráfico en Frogger — cubierto por `specs/11-frogger-densidad-trafico.md`.
- Definir un stat META propio para asteroides, tetris, arkanoid o snake (p. ej. oleadas, líneas objetivo) — hoy ninguno lo define; si en el futuro se quiere, es una decisión de diseño por juego, spec aparte.
- Migrar Frogger al patrón `lib/games/registry.ts`/`GameEngineHandle` — excepción arquitectónica documentada en `CLAUDE.md`, ajena a este spec.
- Rediseñar el resto del marco CRT (`.crt`, `.crt-screen`, `.crt-bottom`) — ya existe y coincide con la captura de referencia, no se toca.
- Decidir si el botón demo `SIMULAR FIN DE PARTIDA` de `GamePlayer.tsx` (usado cuando `!isRealGame`) se retira o convive con el nuevo botón FIN — se conserva sin cambios en este spec porque sirve a un flujo de demo distinto (forzar game over sin motor real conectado); el botón FIN real llama a `forceEnd()` del motor, no a ese `endGame()` local.
- Controles táctiles/mobile para el nuevo botón FIN o el dropdown — fuera de alcance mientras `mobile-porter` siga desactualizado (ver `CLAUDE.md`).

## Modelo de datos

No hay datos persistentes nuevos. Cambios de contrato en memoria/props:

- `lib/games/registry.ts`:
  - `GameEngineEntry.metaLabel?: string`
  - `GameEngineCallbacks.onMetaChange?: (value: number) => void`
  - `GameEngineHandle.forceEnd?: () => void`
- `components/games/FroggerGame.tsx`:
  - Prop requerido `onMetaChange: (value: number) => void`
  - Prop opcional `forceEndSignal?: number`
  - Contador interno `roundsCompleted` (efímero, en closure, no persistido)

## Plan de implementación

1. **Extender contratos en `lib/games/registry.ts`.** Añadir `metaLabel?`, `onMetaChange?` y `forceEnd?` a las interfaces correspondientes, sin marcarlos como requeridos (retrocompatible con los 4 motores actuales). Verificación: `npm run build` compila sin errores de tipos aunque ningún motor los implemente todavía.
2. **Implementar `forceEnd()` en los 4 motores.** En cada uno de `lib/games/{asteroides,tetris,arkanoid,snake}/engine.ts`, añadir el método al objeto `GameEngineHandle` devuelto, marcando el estado como terminado y llamando `callbacks.onGameOver(score)` de forma síncrona si el estado actual es `"playing"` (no-op si ya terminó). Verificación: en cada juego, jugar, pausar, y confirmar (con un log temporal o probando el botón del paso 4) que forzar el fin funciona incluso en pausa.
3. **Añadir META y FIN a `components/GamePlayer.tsx`.** Estado `meta`, wiring de `onMetaChange` en el `engine.create(...)`, bloque `.hud-stat` condicionado a `engine.metaLabel`, botón FIN llamando `handleRef.current?.forceEnd?.()`. Verificación: en los 4 juegos, el stat META no aparece (ninguno define `metaLabel` todavía) y el botón FIN termina la partida y abre el modal de guardado de score, incluso en pausa.
4. **Añadir META y FIN a Frogger.** En `FroggerGame.tsx`: contador `roundsCompleted`, prop `onMetaChange` requerido, prop opcional `forceEndSignal` con el patrón de ref existente (`pausedRef`/`skinKeyRef`). En `FroggerPlayer.tsx`: estado `meta` (reseteado en `restart()`), estado `forceEndSignal`, botón FIN, bloque META incondicional. Verificación: jugar, completar una meta y confirmar que META sube; pulsar FIN (en juego y en pausa) y confirmar game-over inmediato con guardado de score.
5. **Selector de skin como dropdown.** En `GamePlayer.tsx` y `FroggerPlayer.tsx`, reemplazar la fila de botones por `<select className="skin-select">`. Añadir `.skin-select` en `app/globals.css` con la estética CRT/pixel. Verificación visual en los 5 juegos: el dropdown lista los skins disponibles, cambia el skin en vivo igual que antes, y el estilo encaja con el resto del HUD.
6. **Playtest completo de los 5 juegos.** Confirmar en cada uno: HUD con PAUSA/FIN/SALIR, dropdown de skin funcional, META visible solo en Frogger, ningún cambio de comportamiento de gameplay ni regresión visual fuera del HUD. `npm run build` sin errores de TypeScript ni lint.

Cada paso deja la plataforma jugable de principio a fin.

## Criterios de aceptación

- [ ] Los 5 juegos (asteroides, tetris, arkanoid, snake, frogger) muestran botones PAUSA, FIN y SALIR en el HUD.
- [ ] El stat META es visible únicamente en Frogger; en los otros 4 juegos no aparece ni deja hueco vacío en el HUD.
- [ ] En Frogger, META refleja el número de metas/rondas completadas y se resetea a 0 al reiniciar partida.
- [ ] FIN termina la partida actual de inmediato (con el modal de guardado de score, cuando aplique) sin navegar fuera de la pantalla de juego, tanto jugando como en pausa, en los 5 juegos.
- [ ] El selector de skin es un `<select>` funcional en los 5 juegos, con el mismo comportamiento de cambio en vivo que la versión anterior de botones.
- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] No hay regresión de comportamiento en controles, colisiones, puntuación, niveles ni guardado de score en Supabase en ninguno de los 5 juegos.

## Decisiones tomadas y descartadas

- **Sí:** META es opcional a nivel de `GameEngineEntry`/`GameEngineCallbacks` (`metaLabel?`, `onMetaChange?`) en vez de forzar un valor genérico en los 4 juegos que no tienen ese concepto — evita mostrar un stat sin significado (p. ej. "META: 0" permanente en Tetris) y deja la puerta abierta a que un futuro juego lo defina sin cambiar el contrato de nuevo.
- **Sí:** en Frogger, `onMetaChange` es un prop requerido (no opcional) porque ahí el concepto de meta siempre existe — evita un `undefined` innecesario en el único juego que sí lo usa hoy.
- **Sí:** `forceEnd()` se implementa en los 4 `engine.ts` de forma síncrona (llamando `onGameOver` directamente) en vez de depender del siguiente tick del loop — porque los 4 loops actuales no reportan estado mientras `paused === true`, y FIN debe funcionar también en pausa; confirmado leyendo el gating `if (!paused && status === "playing")` en los 4 motores.
- **Sí:** este spec toca los 6 archivos del lado registry (`registry.ts`, `GamePlayer.tsx` + los 4 `engine.ts`) para FIN, no solo 2 — no existe una clase base o mixin compartido entre los motores donde añadir `forceEnd()` una sola vez; se documenta explícitamente como el mayor riesgo de alcance de este spec.
- **Sí:** Frogger no migra al patrón `registry`/`GameEngineHandle` en este spec — sigue la excepción arquitectónica ya documentada en `CLAUDE.md`; el mecanismo de FIN para Frogger se implementa con el mismo patrón de prop+ref que ya usa (`pausedRef`/`skinKeyRef`), no forzando una migración de patrón fuera de alcance.
- **Sí:** el selector de skin se convierte en `<select>` nativo en vez de un dropdown custom con `<div>`/`<ul>` — menos código, accesible por teclado de forma nativa, y el único requisito visual (estética CRT/pixel) se resuelve con CSS (`appearance: none` + flecha custom) sin sacrificar la semántica nativa del elemento.
- **No:** retirar o modificar el botón demo `SIMULAR FIN DE PARTIDA` de `GamePlayer.tsx` — pertenece a un flujo de demostración distinto (sin motor real conectado); se deja intacto para no romper esa ruta de demo.
- **No:** definir un stat META propio para los otros 4 juegos en este spec — no hay un concepto equivalente obvio para todos (oleadas en asteroides, líneas objetivo en Tetris, etc.), y forzarlo ahora sería inventar diseño de juego fuera del pedido original del usuario.

## Riesgos

| Riesgo                                                                                                                                                                                 | Mitigación                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forceEnd()` requiere tocar 4 archivos de motor distintos con estados internos (`status`/`score`/flags de "ya reportado") ligeramente distintos entre sí, con riesgo de inconsistencia | Implementar y verificar motor por motor en el paso 2, reutilizando exactamente el mismo patrón que cada motor ya usa para su propio game-over natural (mismo camino de código, no uno nuevo en paralelo) |
| Llamar `forceEnd()` dos veces seguidas (doble click) dispara `onGameOver` dos veces                                                                                                    | Cada implementación de `forceEnd()` comprueba el flag de "ya reportado"/estado `"playing"` antes de actuar, igual que ya hacen los motores para su condición de game-over natural                        |
| El nuevo `<select>` de skin no hereda visualmente el estilo pixel/CRT por defecto del navegador                                                                                        | Verificación visual explícita en el paso 5 en los 5 juegos antes de dar el paso por cerrado; usar `appearance: none` + flecha custom en vez de depender del estilo nativo del navegador                  |
| Cambiar `GameEngineHandle`/`GameEngineCallbacks` (interfaces compartidas) sin implementar `forceEnd`/`onMetaChange` en algún motor deja ese juego sin FIN funcional silenciosamente    | Marcar ambos como opcionales en la interfaz pero requerir en los criterios de aceptación que los 4 motores lo implementen antes de cerrar el spec — no se considera completo si falta alguno             |

## Qué **no** incluye este spec

- Densidad/velocidad de tráfico en Frogger — ver `specs/11-frogger-densidad-trafico.md`.
- Cambios de gameplay, puntuación o dificultad en ningún motor.
- Stat META propio para asteroides, tetris, arkanoid o snake.
- Migrar Frogger al patrón `lib/games/registry.ts`.
- Rediseño del marco CRT/scanlines/footer — ya existe y no cambia.
- Soporte táctil/mobile para el botón FIN o el dropdown.

Cada uno de esos, si se necesita, va en su propio spec.
