# GJ · Juego Depósito Exprés

- **Estado:** Propuesto
- **Depende de:** SPEC 05 (juego asteroides, motor + `GameEngineCallbacks`/`GameEngineHandle`), SPEC 06 (leaderboard y tabla de juegos)
- **Fecha:** 2026-09-06
- **Objetivo:** Crear desde cero el juego Depósito Exprés (id: `"deposito-express"`) con motor propio en TypeScript, un almacén en tiempo real con bandas transportadoras que empujan cajas automáticamente y guardias patrullando, contrarreloj por nivel, integrado en la ruta `/juegos/deposito-express/jugar`.

## Alcance

**Incluye:**

- Nueva fila en `games` (vía SQL insert) con `id: "deposito-express"`, título "DEPÓSITO EXPRÉS", categoría `ARCADE`, `cover: "cover-deposito-express"`, `color: "cyan"`.
- `lib/games/deposito-express/engine.ts`: motor nuevo en TypeScript estricto (grid 14×15, celda 40px, canvas 560×600), como función factory `createDepositoExpressGame(canvas, callbacks)` con ciclo de vida controlado (`pause`, `resume`, `restart`, `destroy`), siguiendo la misma `GameEngineCallbacks`/`GameEngineHandle` de `lib/games/registry.ts` que usan asteroides, tetris, arkanoid y snake.
- Movimiento en tiempo real (no por turnos): el jugador se desplaza celda a celda a velocidad fija con animación de interpolación; puede empujar una caja adyacente en la dirección de su movimiento si la celda destino está libre.
- Bandas transportadoras: celdas especiales que, en cada tick del motor, desplazan automáticamente cualquier caja apoyada sobre ellas un paso en su dirección fija (definida por nivel), incluso si el jugador no la está empujando. Una caja empujada hacia una banda queda sujeta a su arrastre hasta que sale de la banda o llega a una zona marcada.
- Fosos: celdas que, si una caja cae en ellas (empujada por el jugador o arrastrada por una banda), se pierden permanentemente (no se pueden recuperar) — sin penalizar vidas directamente, pero reducen las cajas disponibles para completar el nivel.
- Guardias patrulleros: 1 a 3 enemigos por nivel (según nivel) que se mueven en rutas fijas de ida y vuelta; tocar a un guardia resta una vida (`callbacks.onLivesChange`, 3 vidas iniciales) y reinicia al jugador en su posición de partida del nivel (las cajas ya colocadas no se pierden).
- Contrarreloj por nivel: cada nivel tiene un límite de tiempo (`levelTimeMs`, decreciente conforme sube el nivel); si el tiempo llega a 0 sin haber colocado todas las cajas requeridas en las zonas marcadas, se resta una vida y el nivel se reinicia con el mismo layout y tiempo completo.
- Progresión: completar un nivel (todas las cajas requeridas en zona marcada, dentro del tiempo) avanza `callbacks.onLevelChange` al siguiente nivel, con más bandas, más fosos y más guardias.
- HUD: `callbacks.onScoreChange` (+30 por caja entregada en zona, + bono de tiempo restante al completar nivel) y `callbacks.onLevelChange` en tiempo real; `callbacks.onLivesChange` con vidas reales (3 iniciales), igual patrón que arkanoid (sin relabelar en `GamePlayer.tsx`).
- Fin de partida real: al perder las 3 vidas (tocar guardias o agotar tiempo repetidamente) se dispara `onGameOver(score)`, lo que abre el modal "FIN DEL JUEGO" existente con el puntaje real e inserta la fila en `scores` (mismo flujo que asteroides/tetris/arkanoid/snake, spec 06).
- `app/globals.css`: nueva clase `.cover-deposito-express` para la portada en Biblioteca/Detalle, siguiendo el patrón de `.cover-asteroides`/`.cover-arkanoid`.
- `lib/games/registry.ts`: nueva entrada `"deposito-express": { create: createDepositoExpressGame, width: 560, height: 600 }` en `gameEngines`.

**No incluye:**

- HUD de React con campos custom — vidas reales, sin relabelar (a diferencia de sokoban-expres/empuje-de-combate en este mismo jam); `GamePlayer.tsx` no requiere ningún cambio condicional nuevo.
- Modificar `GameEngineCallbacks`/`GameEngineHandle` en `lib/games/registry.ts` — se reutilizan tal cual.
- Recuperar cajas caídas en fosos — una vez perdida una caja, el nivel puede volverse imposible de completar al 100%; el diseño de niveles garantiza suficiente margen de cajas de sobra para absorber errores razonables, pero no hay mecánica de recuperación.
- Sonido o assets gráficos — el motor es 100% vectorial vía Canvas API (bandas, fosos, guardias y cajas dibujados con primitivas), igual que tetris/sokoban-expres.
- Multijugador, power-ups, o cajas de distinto peso/tipo.
- Persistencia de puntajes fuera de Supabase (`scores`).
- Integración especial en `/salon-de-la-fama` más allá de lo que ya provee el spec 06 — deposito-express se suma automáticamente por existir en `games`.
- Canvas responsive real; se mantiene 560×600 fijo, escalado visualmente por CSS.
- Portar cualquier juego de `references/started-games/` — este motor se construye desde cero para el jam.

## Modelo de datos

Fila nueva en `games` (esquema ya existente, spec 06):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'deposito-express',
  'DEPÓSITO EXPRÉS',
  'Empuja cajas contrarreloj, esquiva guardias y no las pierdas en los fosos.',
  'Un almacén automatizado con bandas transportadoras que arrastran las cajas por su cuenta. Empújalas hacia las zonas marcadas antes de que se acabe el tiempo del turno, esquiva a los guardias que patrullan en rutas fijas y cuida que ninguna caja caiga en un foso — cada nivel suma más bandas, más guardias y menos margen de error.',
  'ARCADE',
  'cover-deposito-express',
  'cyan',
  0,
  '0'
);
```

No se introduce ninguna tabla ni columna nueva (reutiliza `games`/`scores` del spec 06). Se introduce el motor del juego, siguiendo la interfaz ya establecida en `lib/games/registry.ts`:

```ts
// lib/games/deposito-express/engine.ts
import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";

function createDepositoExpressGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngineHandle;
```

```ts
// lib/games/deposito-express/levels.ts
export type CellKind = "floor" | "wall" | "belt" | "pit" | "zone";
export interface DepositoLevel {
  grid: CellKind[][]; // 15 filas x 14 columnas
  beltDirections: Record<string, "up" | "down" | "left" | "right">; // clave "row,col"
  boxesStart: { row: number; col: number }[];
  guardPatrols: { row: number; col: number }[][]; // ruta cerrada por guardia
  levelTimeMs: number;
}
export const LEVELS: DepositoLevel[]; // niveles con dificultad creciente
```

Entrada nueva en `lib/games/registry.ts` (registro completo tras esta spec):

```ts
export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
  tetris: { create: createTetrisGame, width: 300, height: 600 },
  arkanoid: { create: createArkanoidGame, width: 448, height: 600 },
  snake: { create: createSnakeGame, width: 480, height: 480 },
  "deposito-express": {
    create: createDepositoExpressGame,
    width: 560,
    height: 600,
  },
};
```

`callbacks.onScoreChange` se invoca al entregar una caja en su zona marcada (+30) y al completar un nivel (bono = tiempo restante en ms / 100, redondeado). `callbacks.onLevelChange` se invoca al avanzar de nivel. `callbacks.onLivesChange` se invoca con las vidas reales restantes (inicia en 3) cada vez que un guardia toca al jugador o el temporizador del nivel llega a 0 sin completarlo. `callbacks.onGameOver(score)` se invoca únicamente cuando las vidas llegan a 0.

El estado interno (`level`, `grid`, `boxes: {row,col}[]`, `guards: {route, index, dir}[]`, `player: {row,col}`, `timeLeftMs`, `lives`, `score`, `status`) se dibuja con primitivas de Canvas: piso y paredes como rectángulos, bandas con flechas de dirección animadas, fosos como círculos oscuros, zonas marcadas con borde punteado, cajas como rectángulos con textura de cruz, guardias como triángulos con color de alerta, jugador como círculo.

## Plan de implementación

1. **Niveles.** Crear `lib/games/deposito-express/levels.ts` con `LEVELS` (layouts de dificultad creciente: nivel 1 sin bandas ni guardias como tutorial, niveles siguientes agregan bandas, fosos y hasta 3 guardias, con `levelTimeMs` decreciente).
2. **Motor — movimiento y bandas.** Crear `lib/games/deposito-express/engine.ts`: loop en tiempo real (`requestAnimationFrame`), movimiento interpolado del jugador celda a celda, empuje de cajas, arrastre automático de cajas sobre bandas en cada tick, detección de caja caída en foso (se remueve del estado), detección de caja entregada en zona marcada (+30 puntos).
3. **Motor — guardias y contrarreloj.** Agregar patrullaje de guardias sobre rutas fijas, detección de colisión jugador-guardia (resta vida, reposiciona al jugador), temporizador por nivel con `onLivesChange` al agotarse sin completar el nivel (reinicia el nivel con el mismo layout y tiempo completo), transición a `onLevelChange` al completar todas las entregas requeridas antes de que el tiempo llegue a 0. Listeners de teclado (flechas/WASD) en `window`, removidos en `destroy()`. Todo expuesto vía `createDepositoExpressGame(canvas, callbacks)` con `pause`/`resume`/`restart`/`destroy`.
4. **Ficha del juego.** Insertar la fila `"deposito-express"` en `games` vía `mcp__supabase__execute_sql` con el INSERT de la sección anterior. Verificar con `mcp__supabase__execute_sql` (`select * from games where id = 'deposito-express'`) que la fila quedó creada.
5. **Registro del motor.** Agregar la entrada `"deposito-express"` a `gameEngines` en `lib/games/registry.ts` (import de `createDepositoExpressGame`, `width: 560, height: 600`).
6. **Portada visual y verificación.** Agregar `.cover-deposito-express` (y sus pseudo-elementos) a `app/globals.css`, siguiendo el patrón de `.cover-asteroides`/`.cover-arkanoid`. `npm run build`; jugar una partida completa en `/juegos/deposito-express/jugar` de principio a fin (empujar cajas manualmente, ver el arrastre automático sobre bandas, perder una caja en un foso, chocar con un guardia y perder una vida, agotar el tiempo de un nivel, completar varios niveles, perder las 3 vidas, pausar/reanudar, guardar puntaje, reiniciar, salir y reentrar).

Cada paso deja la app compilando (`npm run build`) y, salvo el paso 4 (que solo toca la base de datos), sin romper ninguna pantalla existente.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `mcp__supabase__execute_sql` confirma que `games` tiene la fila `"deposito-express"` (título "DEPÓSITO EXPRÉS", `cat` = `ARCADE`, `cover` = `cover-deposito-express`, `color` = `cyan`).
- [ ] `/juegos/deposito-express` (detalle) y `/biblioteca` muestran la ficha "DEPÓSITO EXPRÉS" con la portada `cover-deposito-express`.
- [ ] `/juegos/deposito-express/jugar` muestra un canvas de 560×600 con el nivel 1 (tutorial sin bandas ni guardias), arrancando en Puntuación 0, Nivel 01, Vidas 3.
- [ ] Las flechas y WASD mueven al jugador en tiempo real; empujar una caja hacia una celda libre la desplaza; empujarla contra pared u otra caja no la mueve.
- [ ] Una caja apoyada sobre una banda transportadora se desplaza automáticamente sin intervención del jugador, en la dirección definida por el nivel.
- [ ] Una caja que cae en un foso desaparece permanentemente del nivel.
- [ ] Tocar a un guardia resta una vida y reposiciona al jugador en su punto de partida del nivel, sin perder las cajas ya entregadas.
- [ ] Agotar el tiempo del nivel sin completar las entregas requeridas resta una vida y reinicia el nivel con el mismo layout y tiempo completo.
- [ ] Entregar una caja en su zona marcada suma 30 puntos; completar un nivel dentro del tiempo suma el bono de tiempo restante y avanza el Nivel.
- [ ] Perder las 3 vidas dispara game over con el puntaje acumulado.
- [ ] El botón "PAUSA" congela el juego (incluyendo bandas y guardias) y "REANUDAR" continúa sin saltos ni pérdida de estado.
- [ ] Game over abre el modal "FIN DEL JUEGO" con el puntaje real; guardar con iniciales inserta una fila real en `scores` (Supabase).
- [ ] "JUGAR DE NUEVO" reinicia el motor (Puntuación 0, Nivel 01, Vidas 3) sin recargar la página.
- [ ] Salir con "SALIR" y volver a entrar a `/juegos/deposito-express/jugar` no duplica listeners de teclado ni loops de animación.
- [ ] `/salon-de-la-fama` (tab "DEPÓSITO EXPRÉS") y el aside de `/juegos/deposito-express` muestran "AÚN SIN PUNTAJES" antes de guardar el primer puntaje, y el puntaje real después de guardarlo.
- [ ] Los demás juegos (`asteroides`, `tetris`, `arkanoid`, `snake`) siguen funcionando sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Sí:** interpretación del tema "empujar cajas" en clave de tiempo real y contrarreloj — mantiene el espíritu "exprés" (velocidad, presión de tiempo) pero como variante ARCADE distinta de la variante PUZZLE por turnos de sokoban-expres.
- **Sí:** `id: "deposito-express"`, no colisiona con ningún `id` de `gameEngines` ni con ninguna otra spec de este jam.
- **Sí:** `color: "cyan"` y `cover: "cover-deposito-express"` — cyan no está en uso por ningún otro juego `ARCADE` (arkanoid usa magenta, snake usa yellow); cover nuevo, no colisiona con ninguna clase existente ni con las de las otras dos specs de este jam (`cover-sokoban`, `cover-empuje-combate`).
- **Sí:** vidas reales (sin relabelar) — a diferencia de sokoban-expres y empuje-de-combate en este mismo jam, aquí "vidas" tiene sentido literal (colisión con guardias/tiempo agotado), igual patrón que arkanoid; no requiere tocar `GamePlayer.tsx`.
- **Sí:** bandas transportadoras como mecánica distintiva frente al sokoban clásico — introduce movimiento de cajas fuera del control directo del jugador, obligando a planear en tiempo real en vez de por turnos.
- **No:** recuperación de cajas caídas en fosos — se descarta para mantener tensión real; el diseño de niveles compensa dejando cajas de sobra.
- **No:** sonido — motor 100% vectorial, consistente con el resto de juegos nuevos de este jam (sin assets de referencia que portar).
- **No:** cajas de distinto peso o tipo, ni power-ups — se mantiene una única mecánica central (empuje + bandas + fosos + guardias) para no diluir el foco del juego dentro del alcance del jam.
