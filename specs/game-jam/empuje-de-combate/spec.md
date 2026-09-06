# GJ · Juego Empuje de Combate

- **Estado:** Propuesto
- **Depende de:** SPEC 05 (juego asteroides, motor + `GameEngineCallbacks`/`GameEngineHandle`), SPEC 06 (leaderboard y tabla de juegos), SPEC 07 (patrón de HUD condicional en `GamePlayer.tsx`, precedente de `isTetris`)
- **Fecha:** 2026-09-06
- **Objetivo:** Crear desde cero el juego Empuje de Combate (id: `"empuje-de-combate"`) con motor propio en TypeScript, un duelo por turnos contra una IA en una arena compartida donde ambos empujan cajas hacia su zona de meta, a mejor de 3 rondas, integrado en la ruta `/juegos/empuje-de-combate/jugar`. Es la primera ficha de la categoría `VERSUS`, hasta ahora vacía en el catálogo.

## Alcance

**Incluye:**

- Nueva fila en `games` (vía SQL insert) con `id: "empuje-de-combate"`, título "EMPUJE DE COMBATE", categoría `VERSUS`, `cover: "cover-empuje-combate"`, `color: "magenta"`.
- `lib/games/empuje-de-combate/engine.ts`: motor nuevo en TypeScript estricto (grid 8×8, celda 60px, canvas 480×480), como función factory `createEmpujeDeCombateGame(canvas, callbacks)` con ciclo de vida controlado (`pause`, `resume`, `restart`, `destroy`), siguiendo la misma `GameEngineCallbacks`/`GameEngineHandle` de `lib/games/registry.ts` que usan asteroides, tetris, arkanoid y snake.
- Arena compartida 8×8: jugador arranca en la esquina inferior izquierda, IA en la esquina superior derecha; cajas neutrales distribuidas en el centro al inicio de cada ronda; zona de meta del jugador en su propia esquina, zona de meta de la IA en la esquina opuesta.
- Turnos alternados a tick fijo (ambos se mueven una celda por tick, similar al loop de tick de snake): el jugador ingresa dirección con flechas/WASD antes de que expire el tick; si no ingresa nada, no se mueve ese tick. La IA decide su movimiento con una heurística simple: se dirige a la caja neutral más cercana, la empuja hacia su propia zona de meta y bloquea al jugador si detecta que está a una celda de completar una entrega.
- Empuje de cajas: cualquiera de los dos jugadores puede empujar una caja adyacente hacia una celda libre en su dirección de movimiento; una caja empujada hacia la zona de meta propia se considera "entregada" y desaparece del tablero, sumando un punto de ronda a quien la entregó.
- Condición de ronda: gana la ronda quien entregue 3 cajas en su zona de meta primero, o quien tenga más entregas cuando el temporizador de ronda (`roundTimeMs`) llegue a 0; empate en cajas entregadas al agotar el tiempo se resuelve como ronda repetida sin contar hacia el marcador.
- Partida a mejor de 3 rondas: quien gane 2 rondas primero gana la partida.
- HUD: `callbacks.onScoreChange` (+100 por caja entregada por el jugador durante toda la partida) se invoca en tiempo real; `callbacks.onLevelChange` se reinterpreta como el número de ronda en curso (1, 2 o 3); `callbacks.onLivesChange` se reinterpreta como "rondas ganadas por el jugador" (0, 1 o 2), incrementando cada vez que el jugador gana una ronda.
- `components/GamePlayer.tsx`: cuando `game.id === "empuje-de-combate"`, el HUD de React muestra "Rondas" en vez de "Vidas" (mismo callback `onLivesChange`, reinterpretado), y "Ronda" en vez de "Nivel" para el campo de `onLevelChange`, siguiendo el mismo patrón condicional que `isTetris`.
- Fin de partida real: cuando el jugador o la IA alcanzan 2 rondas ganadas, se dispara `onGameOver(score)` (tanto si gana el jugador como si gana la IA — perder también termina la partida con el puntaje acumulado hasta ese momento), lo que abre el modal "FIN DEL JUEGO" existente con el puntaje real e inserta la fila en `scores` (mismo flujo que asteroides/tetris/arkanoid/snake, spec 06).
- `app/globals.css`: nueva clase `.cover-empuje-combate` para la portada en Biblioteca/Detalle, siguiendo el patrón de `.cover-asteroides`/`.cover-arkanoid`.
- `lib/games/registry.ts`: nueva entrada `"empuje-de-combate": { create: createEmpujeDeCombateGame, width: 480, height: 480 }` en `gameEngines`.

**No incluye:**

- Multijugador real (dos jugadores humanos en la misma partida, local o en red) — la IA es el único rival, igual que asteroides no tiene modo multijugador.
- Dificultad de IA seleccionable — la heurística de la IA es fija para todas las partidas.
- Power-ups, cajas de distinto peso, u obstáculos fijos en la arena — solo cajas neutrales empujables y las dos zonas de meta.
- Modificar `GameEngineCallbacks`/`GameEngineHandle` en `lib/games/registry.ts` — se reutilizan tal cual, reinterpretando `onLivesChange` (rondas ganadas) y `onLevelChange` (ronda en curso) igual que tetris reinterpreta `onLivesChange` como líneas.
- Sonido o assets gráficos — el motor es 100% vectorial vía Canvas API, igual que tetris/sokoban-expres.
- Persistencia de puntajes fuera de Supabase (`scores`).
- Integración especial en `/salon-de-la-fama` más allá de lo que ya provee el spec 06 — empuje-de-combate se suma automáticamente por existir en `games`.
- Canvas responsive real; se mantiene 480×480 fijo, escalado visualmente por CSS.
- Portar cualquier juego de `references/started-games/` — este motor se construye desde cero para el jam.

## Modelo de datos

Fila nueva en `games` (esquema ya existente, spec 06):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'empuje-de-combate',
  'EMPUJE DE COMBATE',
  'Empuja cajas a tu zona antes que la IA en un duelo a 3 rondas.',
  'Tú y una IA rival comparten una bodega de 8x8: empujen cajas neutrales hacia sus zonas de meta opuestas, bloqueando al rival cuando puedan. Gana la ronda quien entregue 3 cajas primero, o quien tenga más entregas cuando se acabe el tiempo. La primera mente en ganar dos rondas se lleva el duelo.',
  'VERSUS',
  'cover-empuje-combate',
  'magenta',
  0,
  '0'
);
```

No se introduce ninguna tabla ni columna nueva (reutiliza `games`/`scores` del spec 06). Se introduce el motor del juego, siguiendo la interfaz ya establecida en `lib/games/registry.ts`:

```ts
// lib/games/empuje-de-combate/engine.ts
import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";

function createEmpujeDeCombateGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngineHandle;
```

Entrada nueva en `lib/games/registry.ts` (registro completo tras esta spec):

```ts
export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
  tetris: { create: createTetrisGame, width: 300, height: 600 },
  arkanoid: { create: createArkanoidGame, width: 448, height: 600 },
  snake: { create: createSnakeGame, width: 480, height: 480 },
  "empuje-de-combate": {
    create: createEmpujeDeCombateGame,
    width: 480,
    height: 480,
  },
};
```

`callbacks.onScoreChange` se invoca cada vez que el jugador entrega una caja en su zona de meta (+100; las entregas de la IA no suman al puntaje del jugador). `callbacks.onLevelChange` se invoca al iniciar cada ronda nueva (1, 2 o 3), reinterpretado como "Ronda" en el HUD. `callbacks.onLivesChange` se invoca cada vez que el jugador gana una ronda (0 → 1 → 2), reinterpretado como "Rondas" ganadas en el HUD. `callbacks.onGameOver(score)` se invoca únicamente cuando el jugador o la IA alcanzan 2 rondas ganadas (mejor de 3), con el puntaje acumulado del jugador durante toda la partida, gane o pierda.

El estado interno (`round: number`, `playerRoundsWon`, `aiRoundsWon`, `grid: {row,col}[]` de cajas activas, `playerPos`, `aiPos`, `playerZone`, `aiZone`, `roundTimeMsLeft`, `playerDeliveredThisRound`, `aiDeliveredThisRound`, `score`, `status`) se dibuja con primitivas de Canvas: arena como grid de celdas alternadas, zonas de meta con color distintivo (cyan para el jugador, rojo para la IA), cajas neutrales como rectángulos redondeados ámbar, jugador y IA como círculos de colores distintos, temporizador de ronda como barra superior.

## Plan de implementación

1. **Motor — arena y movimiento.** Crear `lib/games/empuje-de-combate/engine.ts`: grid 8×8, posiciones iniciales de jugador/IA/zonas de meta, spawn de cajas neutrales al inicio de cada ronda, loop de tick fijo (`requestAnimationFrame` con acumulador, mismo patrón que snake), lectura de input del jugador (flechas/WASD) por tick, lógica de empuje de cajas (jugador e IA), detección de entrega en zona de meta propia (+1 al marcador de esa ronda, caja desaparece).
2. **Motor — IA y rondas.** Agregar heurística de la IA (ir a la caja neutral más cercana, empujarla hacia su zona, bloquear al jugador si está a una celda de entregar), temporizador de ronda (`roundTimeMs`, ej. 45s), condición de fin de ronda (3 entregas o tiempo agotado), reinicio de tablero entre rondas (nuevas cajas, posiciones iniciales), acumulación de `playerRoundsWon`/`aiRoundsWon`, condición de fin de partida (2 rondas ganadas por cualquiera de los dos). Listeners de teclado en `window`, removidos en `destroy()`. Todo expuesto vía `createEmpujeDeCombateGame(canvas, callbacks)` con `pause`/`resume`/`restart`/`destroy`.
3. **HUD condicional.** En `components/GamePlayer.tsx`, agregar `isEmpujeDeCombate = game.id === "empuje-de-combate"` y relabelar "Vidas" como "Rondas" y "Nivel" como "Ronda" cuando aplique, siguiendo el mismo patrón condicional que `isTetris`.
4. **Ficha del juego.** Insertar la fila `"empuje-de-combate"` en `games` vía `mcp__supabase__execute_sql` con el INSERT de la sección anterior. Verificar con `mcp__supabase__execute_sql` (`select * from games where id = 'empuje-de-combate'`) que la fila quedó creada.
5. **Registro del motor.** Agregar la entrada `"empuje-de-combate"` a `gameEngines` en `lib/games/registry.ts` (import de `createEmpujeDeCombateGame`, `width: 480, height: 480`).
6. **Portada visual y verificación.** Agregar `.cover-empuje-combate` (y sus pseudo-elementos) a `app/globals.css`, siguiendo el patrón de `.cover-asteroides`/`.cover-arkanoid`. `npm run build`; jugar una partida completa en `/juegos/empuje-de-combate/jugar` de principio a fin (empujar cajas propias, ver a la IA empujar y bloquear, ganar una ronda por 3 entregas, ganar/perder una ronda por tiempo agotado, jugar las 3 rondas hasta que alguno llegue a 2 victorias, pausar/reanudar, guardar puntaje, reiniciar, salir y reentrar).

Cada paso deja la app compilando (`npm run build`) y, salvo el paso 4 (que solo toca la base de datos), sin romper ninguna pantalla existente.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `mcp__supabase__execute_sql` confirma que `games` tiene la fila `"empuje-de-combate"` (título "EMPUJE DE COMBATE", `cat` = `VERSUS`, `cover` = `cover-empuje-combate`, `color` = `magenta`).
- [ ] `/juegos/empuje-de-combate` (detalle) y `/biblioteca` muestran la ficha "EMPUJE DE COMBATE" con la portada `cover-empuje-combate`, y es la primera ficha visible en la categoría `VERSUS`.
- [ ] `/juegos/empuje-de-combate/jugar` muestra un canvas de 480×480 con la arena 8×8, cajas neutrales iniciales, arrancando en Puntuación 0, Ronda 01, Rondas 0.
- [ ] Las flechas y WASD mueven al jugador un paso por tick; la IA se mueve de forma autónoma en el mismo tick.
- [ ] Empujar una caja hacia la zona de meta propia la entrega (desaparece del tablero) y suma 100 puntos al puntaje del jugador si fue el jugador quien la entregó.
- [ ] Entregar 3 cajas antes que la IA (o tener más entregas al agotarse el tiempo de ronda) gana la ronda y suma 1 a "Rondas"; perder la ronda no suma "Rondas" pero sí avanza a la siguiente ronda.
- [ ] Al terminar una ronda se reinician las cajas y posiciones para la siguiente ronda, y "Ronda" avanza (01 → 02 → 03).
- [ ] Alcanzar 2 rondas ganadas (jugador o IA) dispara game over con el puntaje acumulado del jugador durante toda la partida.
- [ ] El botón "PAUSA" congela el juego (jugador, IA y temporizador de ronda) y "REANUDAR" continúa sin saltos ni pérdida de estado.
- [ ] Game over abre el modal "FIN DEL JUEGO" con el puntaje real; guardar con iniciales inserta una fila real en `scores` (Supabase).
- [ ] "JUGAR DE NUEVO" reinicia el motor (Puntuación 0, Ronda 01, Rondas 0) sin recargar la página.
- [ ] Salir con "SALIR" y volver a entrar a `/juegos/empuje-de-combate/jugar` no duplica listeners de teclado ni loops de tick.
- [ ] `/salon-de-la-fama` (tab "EMPUJE DE COMBATE") y el aside de `/juegos/empuje-de-combate` muestran "AÚN SIN PUNTAJES" antes de guardar el primer puntaje, y el puntaje real después de guardarlo.
- [ ] Los demás juegos (`asteroides`, `tetris`, `arkanoid`, `snake`) siguen funcionando sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Sí:** interpretación adversarial del tema "empujar cajas" — reutiliza el núcleo mecánico de sokoban (empuje espacial hacia una meta) pero como duelo contra IA, llenando el hueco de la categoría `VERSUS` (vacía hasta ahora en el catálogo, confirmado en `references/game-suggestions-todo.md`).
- **Sí:** `id: "empuje-de-combate"`, no colisiona con ningún `id` de `gameEngines` ni con ninguna otra spec de este jam.
- **Sí:** `color: "magenta"` y `cover: "cover-empuje-combate"` — magenta no está en uso por ningún otro juego `VERSUS` (no hay ninguno aún); cover nuevo, no colisiona con ninguna clase existente ni con las otras dos specs de este jam (`cover-sokoban`, `cover-deposito-express`).
- **Sí:** HUD condicional doble (Vidas→Rondas, Nivel→Ronda) — mismo patrón ya validado por tetris con "Líneas", extendido a dos campos porque el concepto de "vidas" y "nivel" no aplican literalmente a un duelo por rondas.
- **Sí:** IA con heurística simple (ir a la caja más cercana, empujar hacia su meta, bloquear si el jugador está por entregar) en vez de un rival humano local — evita la complejidad de un modo two-player en el mismo teclado, consistente con que el resto del catálogo es un solo jugador contra la máquina/el sistema.
- **Sí:** partida a mejor de 3 rondas con temporizador por ronda — dota de una condición de fin de partida clara y acotada en el tiempo, evitando duelos indefinidos.
- **No:** selector de dificultad de IA — se descarta para mantener el alcance del jam acotado a una única heurística verificable.
- **No:** power-ups, cajas de distinto peso u obstáculos — se mantiene una única mecánica central (empuje competitivo por turnos) para no diluir el foco del juego.
- **No:** sonido ni assets gráficos — motor 100% vectorial, consistente con el resto de juegos nuevos de este jam.
