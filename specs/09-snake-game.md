# 09 · Juego Snake

- **Estado:** Aprobado
- **Depende de:** SPEC 05 (juego asteroides), SPEC 06 (leaderboard y tabla de juegos)
- **Fecha:** 2026-09-05
- **Objetivo:** Crear desde cero el juego Snake (id: `"snake"`, distinto del mockup `"serpentina"` ya existente en `games`) con motor propio en TypeScript, usando el sprite de frutas `fruits.png` (`references/started-games/05-snake-assets/`) como único asset gráfico portado, integrado en `/juegos/snake/jugar`.

## Alcance

**Incluye:**

- Nueva fila en `games` (vía SQL insert) con `id: "snake"`, título "SNAKE", categoría `ARCADE`, `cover: "cover-snake-real"`, `color: "yellow"`.
- `lib/games/snake/engine.ts`: motor nuevo en TypeScript estricto (grid 20×20, celda 24px, canvas 480×480), como función factory `createSnakeGame(canvas, callbacks)` con ciclo de vida controlado (`pause`, `resume`, `restart`, `destroy`), siguiendo la misma `GameEngineCallbacks`/`GameEngineHandle` de `lib/games/registry.ts` que usan asteroides, tetris y arkanoid.
- Sprite de fruta: `fruits.png` (`references/started-games/05-snake-assets/fruits.png`) se copia a `public/sprites/snake/fruits.png`; el atlas de coordenadas de `sprites.js` (21 frutas: banana, naranja, uva, ajo, berenjena, fresa, cereza, zanahoria, hongo, brócoli, sandía, pimiento, kiwi, limón, durazno, maní, manzana, tomate, moras, uvas2, piña, melón) se porta a `lib/games/snake/sprites.ts`. Cada vez que se genera comida se elige una fruta aleatoria del atlas; todas valen los mismos puntos.
- La serpiente y el grid se dibujan con primitivas de Canvas (rectángulos redondeados), sin assets adicionales más allá de `fruits.png`.
- Controles: flechas y WASD; no se permite invertir la dirección 180° sobre sí misma en el mismo tick.
- Progresión: el nivel sube cada 5 frutas comidas; cada nivel reduce el intervalo de tick (velocidad) en 12ms, desde 150ms hasta un mínimo de 60ms.
- HUD: `callbacks.onScoreChange` (+10 por fruta) y `callbacks.onLevelChange` se invocan en tiempo real; `callbacks.onLivesChange(1)` se invoca una única vez al inicio y nunca más (sin tocar `GamePlayer.tsx`, que ya muestra "♥" con 1 vida).
- Fin de partida: chocar contra el propio cuerpo o contra el borde del canvas dispara `onGameOver(score)`, lo que abre el modal "FIN DEL JUEGO" existente con el puntaje real e inserta la fila en `scores` (mismo flujo que asteroides/tetris/arkanoid, spec 06).
- `app/globals.css`: nueva clase `.cover-snake-real` para la portada en Biblioteca/Detalle, siguiendo el patrón de `.cover-snake`/`.cover-tetris`. No se reutiliza `.cover-snake` (en uso por `"serpentina"`).
- `lib/games/registry.ts`: nueva entrada `snake: { create: createSnakeGame, width: 480, height: 480 }` en `gameEngines`.

**Fuera de alcance (para futuros specs):**

- Modificar el juego `"serpentina"` existente en `games`.
- Modificar `GamePlayer.tsx` o `GameEngineCallbacks`/`GameEngineHandle` en `lib/games/registry.ts` — se reutilizan tal cual.
- Sonido — `fruits.png` no trae audio; no se agregan sonidos nuevos.
- Modo wrap-around en los bordes, obstáculos, power-ups o multijugador.
- Usar el resto del atlas de `sprites.js` más allá de la sección `fruits`.
- Persistencia de puntajes fuera de Supabase (`scores`).
- Integración especial en `/salon-de-la-fama` más allá de lo que ya provee el spec 06 — snake se suma automáticamente por existir en `games`.
- Canvas responsive real; se mantiene 480×480 fijo, escalado visualmente por CSS.
- Portar cualquier otro juego de `references/started-games/`.

## Modelo de datos

Fila nueva en `games` (esquema ya existente, spec 06):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'snake',
  'SNAKE',
  'Come frutas, crece y no choques contigo mismo.',
  'Guía a la serpiente por un tablero de 20x20 celdas: cada fruta que comes te hace crecer y suma puntos, pero el juego termina si chocas contra el borde o contra tu propio cuerpo. La velocidad aumenta cada 5 frutas — sobrevive todo lo que puedas antes de que el ritmo te gane.',
  'ARCADE',
  'cover-snake-real',
  'yellow',
  0,
  '0'
);
```

No se introduce ninguna tabla ni columna nueva (reutiliza `games`/`scores` del spec 06). Se introduce el motor del juego, siguiendo la interfaz ya establecida en `lib/games/registry.ts`:

```ts
// lib/games/snake/engine.ts
import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";

function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngineHandle;
```

```ts
// lib/games/snake/sprites.ts (atlas de frutas, portado de sprites.js)
export interface FruitSprite {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const FRUITS: Record<string, FruitSprite>; // 21 entradas
export function loadFruitSheet(cb: () => void): void;
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void;
```

Entrada nueva en `lib/games/registry.ts`:

```ts
export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
  tetris: { create: createTetrisGame, width: 300, height: 600 },
  arkanoid: { create: createArkanoidGame, width: 448, height: 600 },
  snake: { create: createSnakeGame, width: 480, height: 480 },
};
```

`callbacks.onScoreChange`/`onLevelChange` se invocan con `score`/`level` del estado interno, solo cuando el valor cambia (mismo patrón que asteroides/tetris/arkanoid). `callbacks.onLivesChange(1)` se invoca una única vez al arrancar el motor y nunca más. `callbacks.onGameOver(score)` se invoca únicamente cuando la serpiente choca contra el borde del canvas o contra su propio cuerpo.

El estado interno (`snake: {x,y}[]`, `direction`, `nextDirection`, `food: {x,y,fruit}`, `score`, `level`, `tickInterval`, `status`) se dibuja con primitivas de Canvas para la serpiente y el grid, y con `drawFruit` para la comida.

## Plan de implementación

1. **Assets.** Copiar `references/started-games/05-snake-assets/fruits.png` a `public/sprites/snake/fruits.png`.
2. **Atlas de frutas.** Crear `lib/games/snake/sprites.ts` con `FRUITS` (21 entradas portadas de `sprites.js`), `loadFruitSheet(cb)` y `drawFruit(ctx, name, x, y, w, h)` apuntando a la imagen copiada en el paso 1.
3. **Motor.** Crear `lib/games/snake/engine.ts`: grid 20×20 (celda 24px, canvas 480×480), loop por tick (acumulador de tiempo sobre `requestAnimationFrame`), estado (`snake`, `direction`, `food`, `score`, `level`, `status`), colisión con borde y con el propio cuerpo, crecimiento al comer fruta (+10 puntos, fruta aleatoria del atlas para la siguiente comida), nivel +1 cada 5 frutas comidas con reducción del intervalo de tick (150ms → −12ms por nivel, mínimo 60ms). Serpiente y grid dibujados con primitivas de Canvas; la fruta se dibuja con `drawFruit` del paso 2, esperando a `loadFruitSheet` antes de arrancar el loop. Listeners de teclado (flechas/WASD) en `window`, removidos en `destroy()`. `onLivesChange(1)` se invoca una sola vez al inicio. `onGameOver(score)` se invoca al chocar. Todo expuesto vía `createSnakeGame(canvas, callbacks)` con `pause`/`resume`/`restart`/`destroy`.
4. **Ficha del juego.** Insertar la fila `"snake"` en `games` vía `mcp__supabase__execute_sql` con el INSERT de la sección anterior. Verificar con `mcp__supabase__execute_sql` (`select * from games where id = 'snake'`) que la fila quedó creada.
5. **Registro del motor.** Agregar la entrada `snake` a `gameEngines` en `lib/games/registry.ts` (import de `createSnakeGame`, `width: 480, height: 480`).
6. **Portada visual y verificación.** Agregar `.cover-snake-real` (y sus pseudo-elementos) a `app/globals.css`, siguiendo el patrón de `.cover-snake`/`.cover-tetris`. `npm run build`; jugar una partida completa en `/juegos/snake/jugar` de principio a fin (mover con flechas y WASD, comer frutas, subir de nivel, chocar contra el borde y contra el propio cuerpo, pausar/reanudar, guardar puntaje, reiniciar, salir y reentrar).

Cada paso deja la app compilando (`npm run build`) y, salvo el paso 4 (que solo toca la base de datos), sin romper ninguna pantalla existente.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `mcp__supabase__execute_sql` confirma que `games` tiene la fila `"snake"` (título "SNAKE", `cat` = `ARCADE`, `cover` = `cover-snake-real`, `color` = `yellow`); `"serpentina"` sigue intacto.
- [ ] `/juegos/snake` (detalle) y `/biblioteca` muestran la ficha "SNAKE" con la portada `cover-snake-real`.
- [ ] `/juegos/snake/jugar` muestra un canvas de 480×480 con grid 20×20, serpiente inicial de 3 celdas y una fruta, arrancando en Puntuación 0, Nivel 01.
- [ ] Las flechas y WASD mueven la serpiente; no se puede invertir 180° sobre sí misma en el mismo tick.
- [ ] Comer una fruta suma 10 puntos, hace crecer la serpiente en una celda y elige una fruta aleatoria distinta del atlas para la siguiente.
- [ ] Cada 5 frutas comidas el Nivel sube y la velocidad del juego aumenta perceptiblemente.
- [ ] Chocar contra el borde del canvas o contra el propio cuerpo dispara game over.
- [ ] El botón "PAUSA" congela el juego y "REANUDAR" continúa sin saltos ni pérdida de estado.
- [ ] Game over abre el modal "FIN DEL JUEGO" con el puntaje real; guardar con iniciales inserta una fila real en `scores` (Supabase).
- [ ] "JUGAR DE NUEVO" reinicia el motor (Puntuación 0, Nivel 01, serpiente inicial) sin recargar la página.
- [ ] Salir con "SALIR" y volver a entrar a `/juegos/snake/jugar` no duplica listeners de teclado ni loops de tick.
- [ ] `/salon-de-la-fama` (tab "SNAKE") y el aside de `/juegos/snake` muestran "AÚN SIN PUNTAJES" antes de guardar el primer puntaje, y el puntaje real después de guardarlo.
- [ ] Los demás juegos (incluido `"serpentina"`) siguen funcionando sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Sí:** `id: "snake"` como juego nuevo, distinto de `"serpentina"` (mockup existente). Mismo criterio que asteroides/rocas, tetris/caída, arkanoid/bloque-buster.
- **Sí:** `color: "yellow"` (en vez de `green`, ya usado por `"serpentina"`) para diferenciar visualmente real vs mockup.
- **Sí:** nueva clase `.cover-snake-real` en vez de reutilizar `.cover-snake`, que sigue en uso por `"serpentina"`.
- **Sí:** juego construido desde cero (sin `game.js` de referencia) — `references/started-games/05-snake-assets` solo aporta `fruits.png` + `sprites.js` (atlas de coordenadas), no hay lógica de juego que portar.
- **Sí:** único asset portado es `fruits.png` (atlas de 21 frutas); la serpiente y el grid se dibujan con primitivas de Canvas, sin assets adicionales.
- **Sí:** fruta aleatoria del atlas en cada spawn, todas valen 10 puntos — variedad visual sin complejizar el sistema de puntuación.
- **Sí:** sin vidas reales — `onLivesChange(1)` se llama una única vez al inicio y nunca más, mostrando 1 corazón fijo en el HUD genérico sin tocar `GamePlayer.tsx` (a diferencia de tetris, que agregó `isTetris` para relabelar a "Líneas").
- **Sí:** progresión de velocidad por nivel (cada 5 frutas, −12ms de intervalo, mínimo 60ms) en vez de velocidad constante — da sentido al campo Nivel del HUD.
- **No:** modo wrap-around en los bordes — se descarta la variante móvil de Snake; el snake clásico con colisión de borde es más simple y coherente con game over inmediato.
- **No:** sonido — `fruits.png` no trae audio y no se agregan sonidos nuevos, fuera de alcance de este spec.
- **No:** usar el resto del atlas de `sprites.js` (solo la sección `fruits`) — no hay otras secciones definidas en el archivo de referencia.
- **No:** modificar `GamePlayer.tsx` o `GameEngineCallbacks`/`GameEngineHandle` — se reutilizan tal cual, igual que arkanoid.
