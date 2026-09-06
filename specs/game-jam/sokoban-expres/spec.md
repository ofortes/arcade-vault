# GJ · Juego Sokoban Exprés

- **Estado:** Propuesto
- **Depende de:** SPEC 05 (juego asteroides, motor + `GameEngineCallbacks`/`GameEngineHandle`), SPEC 06 (leaderboard y tabla de juegos), SPEC 07 (patrón de HUD condicional en `GamePlayer.tsx`, precedente de `isTetris`)
- **Fecha:** 2026-09-06
- **Objetivo:** Crear desde cero el juego Sokoban Exprés (id: `"sokoban-expres"`) con motor propio en TypeScript, ocho niveles fijos de empuje de cajas con presupuesto de movimientos limitado por nivel, integrado en la ruta `/juegos/sokoban-expres/jugar`.

## Alcance

**Incluye:**

- Nueva fila en `games` (vía SQL insert) con `id: "sokoban-expres"`, título "SOKOBAN EXPRÉS", categoría `PUZZLE`, `cover: "cover-sokoban"`, `color: "green"`.
- `lib/games/sokoban-expres/engine.ts`: motor nuevo en TypeScript estricto (grid variable por nivel, celda 48px, canvas fijo 480×384), como función factory `createSokobanExpresGame(canvas, callbacks)` con ciclo de vida controlado (`pause`, `resume`, `restart`, `destroy`), siguiendo la misma `GameEngineCallbacks`/`GameEngineHandle` de `lib/games/registry.ts` que usan asteroides, tetris, arkanoid y snake.
- `lib/games/sokoban-expres/levels.ts`: ocho niveles fijos codificados como mapas ASCII (paredes `#`, suelo ` `, jugador `@`, caja `$`, objetivo `.`, caja-en-objetivo `*`, jugador-en-objetivo `+`), con un presupuesto de movimientos (`maxMoves`) por nivel, creciente en dificultad (más cajas y layouts más laberínticos en niveles altos).
- Dibujo 100% con primitivas de Canvas (rectángulos para paredes/suelo, círculos o rectángulos redondeados para cajas y jugador, marcador distinto para los objetivos), sin assets gráficos.
- Controles: flechas y WASD empujan al jugador un paso en la dirección indicada; si hay una caja delante y la celda siguiente está libre, la caja se empuja junto con el jugador; si la celda siguiente está ocupada (pared u otra caja) el movimiento no se ejecuta y no consume presupuesto. Tecla `R` reinicia el nivel actual con el presupuesto de movimientos completo de ese nivel (no reinicia el progreso de niveles ya superados ni el score acumulado).
- HUD: `callbacks.onScoreChange` (ver fórmula de puntaje abajo) y `callbacks.onLevelChange` (nivel 1–8) se invocan en tiempo real; `callbacks.onLivesChange` se reinterpreta como "movimientos restantes" del nivel actual y se invoca cada vez que cambia (patrón ya usado por tetris con "Líneas").
- `components/GamePlayer.tsx`: cuando `game.id === "sokoban-expres"`, el HUD de React muestra "Movimientos" en vez de "Vidas" (mismo callback `onLivesChange`, reinterpretado), siguiendo el mismo patrón condicional que `isTetris`.
- Fin de partida real: si el presupuesto de movimientos del nivel llega a 0 sin haber colocado todas las cajas en sus objetivos, se dispara `onGameOver(score)` inmediatamente. Si el jugador completa el nivel 8 (el último), también se dispara `onGameOver(score)` como fin de partida por victoria total. En ambos casos se abre el modal "FIN DEL JUEGO" existente con el puntaje real e inserta la fila en `scores` (mismo flujo que asteroides/tetris/arkanoid/snake, spec 06).
- `app/globals.css`: nueva clase `.cover-sokoban` para la portada en Biblioteca/Detalle, siguiendo el patrón de `.cover-asteroides`/`.cover-tetris`.
- `lib/games/registry.ts`: nueva entrada `"sokoban-expres": { create: createSokobanExpresGame, width: 480, height: 384 }` en `gameEngines`.

**No incluye:**

- Función de deshacer (`undo`) movimientos — solo reinicio completo del nivel actual vía `R`.
- Niveles generados proceduralmente o editor de niveles — los ocho niveles son fijos y están codificados en `levels.ts`.
- Guardado de progreso entre partidas (qué nivel se alcanzó) — cada partida nueva empieza siempre en el nivel 1.
- Sonido o assets gráficos — el motor es 100% vectorial vía Canvas API, igual que tetris.
- Multijugador o comparación contra un fantasma de otro jugador.
- Modificar `GameEngineCallbacks`/`GameEngineHandle` en `lib/games/registry.ts` — se reutilizan tal cual, reinterpretando `onLivesChange` igual que hace tetris con las líneas.
- Persistencia de puntajes fuera de Supabase (`scores`).
- Integración especial en `/salon-de-la-fama` más allá de lo que ya provee el spec 06 — sokoban-expres se suma automáticamente por existir en `games`.
- Canvas responsive real; se mantiene 480×384 fijo, escalado visualmente por CSS.
- Portar cualquier juego de `references/started-games/` — este motor se construye desde cero para el jam.

## Modelo de datos

Fila nueva en `games` (esquema ya existente, spec 06):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'sokoban-expres',
  'SOKOBAN EXPRÉS',
  'Empuja cada caja a su objetivo antes de quedarte sin movimientos.',
  'Ocho bodegas cada vez más laberínticas te esperan: empuja las cajas hasta las marcas señaladas usando el menor número de pasos posible. Cada nivel tiene un presupuesto de movimientos fijo — si se agota antes de colocar todas las cajas, la partida termina. Completa la bodega final para conseguir el mejor puntaje posible.',
  'PUZZLE',
  'cover-sokoban',
  'green',
  0,
  '0'
);
```

No se introduce ninguna tabla ni columna nueva (reutiliza `games`/`scores` del spec 06). Se introduce el motor del juego, siguiendo la interfaz ya establecida en `lib/games/registry.ts`:

```ts
// lib/games/sokoban-expres/engine.ts
import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";

function createSokobanExpresGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngineHandle;
```

```ts
// lib/games/sokoban-expres/levels.ts
export interface SokobanLevel {
  map: string[]; // filas ASCII: '#' pared, ' ' suelo, '@' jugador, '$' caja, '.' objetivo, '*' caja-en-objetivo, '+' jugador-en-objetivo
  maxMoves: number;
}
export const LEVELS: SokobanLevel[]; // 8 niveles, dificultad creciente
```

Entrada nueva en `lib/games/registry.ts` (registro completo tras esta spec):

```ts
export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
  tetris: { create: createTetrisGame, width: 300, height: 600 },
  arkanoid: { create: createArkanoidGame, width: 448, height: 600 },
  snake: { create: createSnakeGame, width: 480, height: 480 },
  "sokoban-expres": {
    create: createSokobanExpresGame,
    width: 480,
    height: 384,
  },
};
```

`callbacks.onScoreChange` se invoca cada vez que una caja entra o sale de un objetivo, y al completar un nivel, con la siguiente fórmula acumulativa: +50 por cada caja colocada correctamente en un objetivo (una sola vez por caja, no se vuelve a sumar si se retira y se vuelve a colocar), +200 al completar un nivel, + (`movimientos restantes al completar el nivel` × 5) como bono de eficiencia. `callbacks.onLevelChange` se invoca al avanzar de nivel (1 a 8). `callbacks.onLivesChange` se invoca con el conteo de movimientos restantes del nivel actual cada vez que el jugador se mueve (consuma o no un movimiento útil) y al iniciar cada nivel (con `maxMoves` del nivel). `callbacks.onGameOver(score)` se invoca únicamente cuando el presupuesto de movimientos llega a 0 sin completar el nivel, o al completar el nivel 8.

El estado interno (`level: number`, `grid: string[][]`, `playerPos`, `boxesOnTarget: Set<string>`, `movesLeft`, `score`, `status`) se dibuja con primitivas de Canvas: paredes como rectángulos sólidos, suelo como fondo, objetivos como marcos punteados, cajas como rectángulos redondeados (verde si están en su objetivo, ámbar si no), jugador como círculo con indicador de dirección.

## Plan de implementación

1. **Niveles.** Crear `lib/games/sokoban-expres/levels.ts` con `LEVELS` (8 mapas ASCII de dificultad creciente, de 6×6 hasta 10×8 celdas, con `maxMoves` calculado como el óptimo teórico del nivel + margen del 40%).
2. **Motor.** Crear `lib/games/sokoban-expres/engine.ts`: parseo del mapa ASCII del nivel activo a grid interno, lógica de movimiento/empuje de cajas, detección de nivel completado (todas las cajas en objetivo), control de presupuesto de movimientos, transición automática al siguiente nivel al completarlo (reset de `movesLeft` al `maxMoves` del nuevo nivel), fórmula de puntaje del apartado anterior. Listeners de teclado (flechas/WASD + `R`) en `window`, removidos en `destroy()`. Todo expuesto vía `createSokobanExpresGame(canvas, callbacks)` con `pause`/`resume`/`restart`/`destroy` (`restart` reinicia toda la partida desde el nivel 1, score y movimientos incluidos).
3. **HUD condicional.** En `components/GamePlayer.tsx`, agregar `isSokobanExpres = game.id === "sokoban-expres"` y relabelar el campo de "Vidas" como "Movimientos" cuando aplique, siguiendo el mismo patrón ya usado por `isTetris` para "Líneas".
4. **Ficha del juego.** Insertar la fila `"sokoban-expres"` en `games` vía `mcp__supabase__execute_sql` con el INSERT de la sección anterior. Verificar con `mcp__supabase__execute_sql` (`select * from games where id = 'sokoban-expres'`) que la fila quedó creada.
5. **Registro del motor.** Agregar la entrada `"sokoban-expres"` a `gameEngines` en `lib/games/registry.ts` (import de `createSokobanExpresGame`, `width: 480, height: 384`).
6. **Portada visual y verificación.** Agregar `.cover-sokoban` (y sus pseudo-elementos) a `app/globals.css`, siguiendo el patrón de `.cover-asteroides`/`.cover-tetris`. `npm run build`; jugar una partida completa en `/juegos/sokoban-expres/jugar` de principio a fin (resolver o agotar movimientos en varios niveles, reiniciar un nivel con `R`, llegar a game over por movimientos agotados y también por completar el nivel 8, pausar/reanudar, guardar puntaje, reiniciar partida completa, salir y reentrar).

Cada paso deja la app compilando (`npm run build`) y, salvo el paso 4 (que solo toca la base de datos), sin romper ninguna pantalla existente.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `mcp__supabase__execute_sql` confirma que `games` tiene la fila `"sokoban-expres"` (título "SOKOBAN EXPRÉS", `cat` = `PUZZLE`, `cover` = `cover-sokoban`, `color` = `green`).
- [ ] `/juegos/sokoban-expres` (detalle) y `/biblioteca` muestran la ficha "SOKOBAN EXPRÉS" con la portada `cover-sokoban`.
- [ ] `/juegos/sokoban-expres/jugar` muestra un canvas de 480×384 con el nivel 1, arrancando en Puntuación 0, Nivel 01, y el HUD muestra "Movimientos" (no "Vidas") con el presupuesto del nivel 1.
- [ ] Las flechas y WASD mueven al jugador; empujar una caja contra otra caja o contra una pared no mueve nada y no consume movimientos.
- [ ] Colocar una caja sobre un objetivo suma 50 puntos una sola vez por caja; completar un nivel suma 200 puntos más el bono de movimientos restantes × 5 y avanza el Nivel.
- [ ] Agotar el presupuesto de movimientos sin completar el nivel dispara game over con el puntaje acumulado hasta ese momento.
- [ ] Completar el nivel 8 también dispara game over (victoria), con el puntaje final acumulado.
- [ ] La tecla `R` reinicia el nivel actual con el presupuesto de movimientos completo, sin afectar el puntaje ya acumulado de niveles anteriores.
- [ ] El botón "PAUSA" congela el juego y "REANUDAR" continúa sin saltos ni pérdida de estado.
- [ ] Game over abre el modal "FIN DEL JUEGO" con el puntaje real; guardar con iniciales inserta una fila real en `scores` (Supabase).
- [ ] "JUGAR DE NUEVO" reinicia el motor completo (Puntuación 0, Nivel 01, movimientos del nivel 1) sin recargar la página.
- [ ] Salir con "SALIR" y volver a entrar a `/juegos/sokoban-expres/jugar` no duplica listeners de teclado ni estado residual del motor anterior.
- [ ] `/salon-de-la-fama` (tab "SOKOBAN EXPRÉS") y el aside de `/juegos/sokoban-expres` muestran "AÚN SIN PUNTAJES" antes de guardar el primer puntaje, y el puntaje real después de guardarlo.
- [ ] Los demás juegos (`asteroides`, `tetris`, `arkanoid`, `snake`) siguen funcionando sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Sí:** interpretación literal del tema "Sokoban Exprés" — puzzle clásico de empujar cajas por turnos, con la palabra "Exprés" reflejada en el presupuesto de movimientos limitado por nivel (contrarreloj de pasos, no de tiempo real).
- **Sí:** `id: "sokoban-expres"`, no colisiona con ningún `id` de `gameEngines` ni con ninguna otra spec de este jam.
- **Sí:** `color: "green"` y `cover: "cover-sokoban"` — verde no está en uso por ningún otro juego `PUZZLE` (tetris usa cyan); cover nuevo, no colisiona con `cover-tetro`/`cover-bricks`/`cover-snake`/`cover-glot`/`cover-invaders`/`cover-rocas`/`cover-asteroides`/`cover-tetris`/`cover-arkanoid`/`cover-snake-real`/`cover-rana`/`cover-duelo`.
- **Sí:** HUD condicional reinterpretando `onLivesChange` como "Movimientos" — mismo patrón ya validado por tetris con "Líneas"; evita tocar `GameEngineCallbacks`.
- **Sí:** ocho niveles fijos codificados como mapas ASCII, sin generación procedural — mantiene el motor simple y verificable a mano, consistente con el resto del catálogo (niveles fijos también en arkanoid).
- **No:** función de deshacer — el sokoban clásico a menudo la incluye, pero se descarta para mantener la tensión del presupuesto de movimientos limitado (más fiel al espíritu "exprés" del tema) y para no complejizar el estado del motor con historial.
- **No:** guardado de progreso entre partidas — cada partida siempre empieza en el nivel 1, igual de simple que reiniciar cualquier otro juego del catálogo.
- **No:** sonido ni assets gráficos — motor 100% vectorial, igual que tetris; no hay assets de referencia para portar ya que el juego se construye desde cero para el jam.
