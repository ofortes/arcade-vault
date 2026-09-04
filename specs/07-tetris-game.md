# 07 · Juego Tetris

- **Estado:** Implementado
- **Depende de:** SPEC 05 (juego asteroides), SPEC 06 (leaderboard y tabla de juegos)
- **Fecha:** 2026-09-04
- **Objetivo:** Portar el clon de Tetris (vanilla JS + Canvas de `references/started-games/03-tetris-commands/`) como un juego nuevo y jugable en Arcade Vault, con `id: "tetris"` (distinto de `"caida"`, que ya existe en la tabla `games` y no se toca), integrado en la ruta `/juegos/tetris/jugar`.

## Alcance

**Incluye:**

- Nueva fila en `games` (vía SQL insert) con `id: "tetris"`, título "TETRIS", categoría `PUZZLE`, `cover: "cover-tetris"`, `color: "cyan"`.
- `lib/games/tetris/engine.ts`: puerto a TypeScript estricto del motor original (`game.js`), como función factory `createTetrisGame(canvas, callbacks)` con ciclo de vida controlado (`pause`, `resume`, `restart`, `destroy`), siguiendo la misma `GameEngineCallbacks`/`GameEngineHandle` de `lib/games/registry.ts` que usa asteroides. El motor dibuja únicamente el tablero (10×20, un solo `<canvas>` de 300×600): grid, piezas fijas, ghost piece y pieza actual — igual que el original, sin HUD ni overlay de game over dibujados dentro del canvas.
- `lib/games/registry.ts`: nueva entrada `tetris: { create: createTetrisGame, width: 300, height: 600 }` en `gameEngines`.
- `components/GamePlayer.tsx`: cuando `game.id === "tetris"`, el HUD de React muestra "Líneas" en vez de "Vidas" (mismo callback `onLivesChange`, reinterpretado como conteo de líneas limpiadas para este juego). El resto del reproductor (canvas real, pausa/reanudar, modal "FIN DEL JUEGO", guardado en `scores`) reutiliza el flujo ya existente para juegos reales (`isRealGame`).
- `app/globals.css`: nueva clase `.cover-tetris` para la portada en Biblioteca/Detalle, siguiendo el patrón de `.cover-asteroides`. No se reutiliza `.cover-tetro` (en uso por `"caida"`).
- Fin de partida real: cuando la pieza recién generada colisiona al aparecer (tablero desbordado), se dispara `onGameOver(score)`, lo que abre el modal "FIN DEL JUEGO" existente con el puntaje real e inserta la fila en `scores` (mismo flujo que asteroides, spec 06).
- Tecla `P` dentro del motor sigue alternando pausa (comportamiento del original), invocando internamente la misma lógica de `pause()`/`resume()` y notificando el cambio de estado para mantener sincronizado el botón "PAUSA"/"REANUDAR" de React.

**No incluye:**

- Modificar el juego `"caida"` existente en `games`.
- Vista previa de la "siguiente pieza" (`next-piece`) en el HUD de React ni en el canvas — el original la mostraba en un `<canvas>` separado de 120×120; queda fuera de alcance de este spec (no se agrega un segundo canvas ni un callback nuevo para la forma de la pieza).
- Modificar `GameEngineCallbacks`/`GameEngineHandle` en `lib/games/registry.ts` — se reutilizan tal cual (`onLivesChange` se reinterpreta como líneas solo dentro del motor de tetris y del label del HUD).
- Persistencia de puntajes fuera de Supabase (`scores`); no se reintroduce `lib/session.ts`/`saveScore()`, ya eliminados en el spec 06.
- Integración especial en `/salon-de-la-fama` más allá de lo que ya provee el spec 06 (top real por `game_id`, estado "AÚN SIN PUNTAJES" si no hay filas) — tetris se suma automáticamente por existir en `games`.
- Portar cualquier otro juego de `references/started-games/` (ej. `04-arkanoid`).
- Sonido o assets gráficos nuevos (el juego original es 100% vectorial vía Canvas API).
- Canvas responsive real (reescribir la física a un tamaño dinámico); se mantiene 300×600 fijo, escalado visualmente por CSS.
- Wall kicks avanzados, hold piece, o cualquier mecánica no presente en `game.js` original (el puerto es fiel a la referencia, no una mejora).

## Modelo de datos

Fila nueva en `games` (esquema ya existente, spec 06):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'tetris',
  'TETRIS',
  'Apila piezas antes de que el tablero desborde.',
  'Las piezas caen sin pausa y el tablero se estrecha con cada nivel. Gira, desliza y encaja los siete tetrominós clásicos para limpiar líneas antes de que lleguen al techo. La pieza fantasma te muestra dónde vas a aterrizar — el resto depende de tus reflejos.',
  'PUZZLE',
  'cover-tetris',
  'cyan',
  0,
  '0'
);
```

No se introduce ninguna tabla ni columna nueva (reutiliza `games`/`scores` del spec 06). Se introduce el motor del juego, siguiendo la interfaz ya establecida en `lib/games/registry.ts`:

```ts
// lib/games/tetris/engine.ts
import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";

function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngineHandle;
```

`callbacks.onLivesChange` se invoca con el conteo de `lines` (líneas limpiadas) cada vez que cambia — no representa vidas para este juego. `callbacks.onScoreChange`/`onLevelChange` se invocan con `score`/`level` del original. `callbacks.onGameOver(score)` se invoca cuando `spawn()` detecta colisión inmediata de la pieza nueva. Los callbacks se invocan solo cuando el valor cambia, igual que en asteroides.

Entrada nueva en `lib/games/registry.ts`:

```ts
export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
  tetris: { create: createTetrisGame, width: 300, height: 600 },
};
```

La física interna (`board` 10×20, piezas `PIECES`/`COLORS`, `rotateCW`, `collide`, `tryRotate` con wall kicks `[0,±1,±2]`, `clearLines`, `LINE_SCORES`, `dropInterval`) es la misma que el original.

## Plan de implementación

1. **Motor portado.** Crear `lib/games/tetris/engine.ts` con el estado, la física y el dibujo del `game.js` original (tablero, ghost piece, pieza actual y siguiente — sin dibujar HUD ni overlay dentro del canvas), expuestos a través de `createTetrisGame(canvas, callbacks)`. El listener de teclado (`keydown`, incluida la tecla `P` para pausa) y el `requestAnimationFrame` quedan controlados por el handle devuelto (`pause`/`resume`/`restart`/`destroy`), removiendo el listener en `destroy()`.
2. **Ficha del juego.** Insertar la fila `"tetris"` en `games` vía `mcp__supabase__execute_sql` con el INSERT de la sección anterior. Verificar con `mcp__supabase__execute_sql` (`select * from games where id = 'tetris'`) que la fila quedó creada.
3. **Registro del motor.** Agregar la entrada `tetris` a `gameEngines` en `lib/games/registry.ts` (import de `createTetrisGame`, `width: 300, height: 600`).
4. **Portada visual.** Agregar `.cover-tetris` (y sus pseudo-elementos) a `app/globals.css`, siguiendo el patrón de `.cover-asteroides`.
5. **HUD condicional.** Editar `components/GamePlayer.tsx`: cuando `game.id === "tetris"`, el label del `hud-stat` de vidas muestra "Líneas" en vez de "Vidas" y el valor se renderiza como número (`lives`) en vez de corazones (`"♥ ".repeat(lives)`); el resto del componente (canvas, pausa, modal, guardado en `scores`) no cambia porque ya es genérico para cualquier `isRealGame`.
6. **Verificación.** `npm run build`; jugar una partida completa en `/juegos/tetris/jugar` de principio a fin (mover, rotar, soft/hard drop, pausar con el botón y con `P`, limpiar líneas, subir de nivel, perder por desborde, guardar puntaje, reiniciar, salir y reentrar).

Cada paso deja la app compilando (`npm run build`) y, salvo el paso 2 (que solo toca la base de datos), sin romper ninguna pantalla existente.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `mcp__supabase__execute_sql` confirma que `games` tiene la fila `"tetris"` (título "TETRIS", `cat` = `PUZZLE`, `cover` = `cover-tetris`, `color` = `cyan`).
- [ ] `/juegos/tetris` (detalle) y `/biblioteca` muestran la ficha "TETRIS" con la portada `cover-tetris`; `"caida"` sigue intacto.
- [ ] `/juegos/tetris/jugar` muestra un canvas real de 300×600 con el tablero vacío arrancando en Puntuación 0, Líneas 0, Nivel 01.
- [ ] Las flechas izquierda/derecha mueven la pieza, arriba (o `X`) rota con wall kicks, abajo hace soft drop, Espacio hace hard drop; la pieza fantasma se ve semitransparente en su posición de aterrizaje.
- [ ] Limpiar una línea suma puntos según `LINE_SCORES × nivel` y el HUD de React ("Líneas") sube en tiempo real.
- [ ] El botón "PAUSA" congela el juego y "REANUDAR" continúa sin saltos; la tecla `P` hace lo mismo y mantiene sincronizado el botón.
- [ ] Cuando una pieza nueva colisiona al aparecer (tablero desbordado), se abre el modal "FIN DEL JUEGO" con el puntaje real; guardar con iniciales inserta una fila real en `scores` (Supabase).
- [ ] "JUGAR DE NUEVO" reinicia el motor (tablero vacío, Puntuación 0, Líneas 0, Nivel 01) sin recargar la página.
- [ ] Salir con "SALIR" y volver a entrar a `/juegos/tetris/jugar` no duplica listeners de teclado ni bucles de `requestAnimationFrame`.
- [ ] `/salon-de-la-fama` (tab "TETRIS") y el aside de `/juegos/tetris` muestran "AÚN SIN PUNTAJES" antes de guardar el primer puntaje, y el puntaje real después de guardarlo.
- [ ] Los demás juegos (incluido `"caida"` y `"asteroides"`) siguen funcionando sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **`id: "tetris"` como juego nuevo, en vez de reutilizar `"caida"`**: decisión explícita del usuario — mismo criterio que asteroides/rocas en el spec 05; `"caida"` (mockup `PUZZLE`, `cover-tetro`) queda sin tocar.
- **`color: "cyan"` en vez de reutilizar `magenta` (ya usado por `"caida"`)**: decisión explícita del usuario para diferenciar visualmente el juego real del mockup.
- **Un solo `<canvas>` de 300×600 (solo tablero), sin el segundo `<canvas>` de 120×120 para "siguiente pieza" del original**: decisión explícita del usuario — respeta el patrón de `gameEngines` (un canvas por juego, `width`/`height` fijos en `registry.ts`) sin extender la interfaz compartida; la vista previa de siguiente pieza queda fuera de alcance.
- **Sin HUD ni overlay de "GAME OVER" dibujados dentro del canvas (a diferencia de asteroides)**: decisión explícita del usuario — el original ya mostraba score/lines/level y el overlay de game over como HTML fuera del `<canvas>` (no como dibujo de canvas), así que se preserva esa separación: el HUD real vive en React y el fin de partida lo maneja el modal "FIN DEL JUEGO" existente, sin duplicar esa lógica dentro del motor.
- **`onLivesChange` reinterpretado como "líneas limpiadas" en vez de extender `GameEngineCallbacks` con un campo nuevo**: decisión explícita del usuario — evita tocar la interfaz compartida con asteroides por un spec de un solo juego; el HUD de React solo cambia el label ("Líneas" en vez de "Vidas") condicionado a `game.id === "tetris"`.
- **Tecla `P` se mantiene como atajo de pausa dentro del motor, además del botón de React**: decisión explícita del usuario — preserva el control original; el motor debe notificar el cambio de estado (vía el mismo mecanismo interno de pausa) para que el botón "PAUSA"/"REANUDAR" de React quede sincronizado.
- **Motor en `lib/games/tetris/engine.ts` (TypeScript, separado de React)**: sigue la convención ya establecida por `lib/games/asteroides/engine.ts` en el spec 05.
- **Inserción de la fila `games` vía `mcp__supabase__execute_sql` directo, sin migración versionada**: coherente con que el esquema de `games`/`scores` ya existe desde el spec 06; esto es solo una fila de datos semilla, no un cambio de esquema.
