# 08 · Juego Arkanoid

- **Estado:** Aprobado
- **Depende de:** SPEC 05 (juego asteroides), SPEC 06 (leaderboard y tabla de juegos), SPEC 07 (juego tetris)
- **Fecha:** 2026-09-04
- **Objetivo:** Portar el clon de Arkanoid (vanilla JS + Canvas de `references/started-games/04-arkanoid/`) como un juego nuevo y jugable en Arcade Vault, con `id: "arkanoid"` (distinto de `"bloque-buster"`, que ya existe en la tabla `games` y no se toca), integrado en la ruta `/juegos/arkanoid/jugar`.

## Alcance

**Incluye:**

- Nueva fila en `games` (vía SQL insert) con `id: "arkanoid"`, título "ARKANOID", categoría `ARCADE`, `cover: "cover-arkanoid"`, `color: "magenta"`.
- `lib/games/arkanoid/engine.ts`: puerto a TypeScript estricto del motor original (`script.js`), como función factory `createArkanoidGame(canvas, callbacks)` con ciclo de vida controlado (`pause`, `resume`, `restart`, `destroy`), siguiendo la misma `GameEngineCallbacks`/`GameEngineHandle` de `lib/games/registry.ts` que usan asteroides y tetris. El motor porta el spritesheet original (`assets/spritesheet.js` + `assets/spritesheet-breakout.png`) a TypeScript (`SPRITES`, `drawSprite`, `drawFrame`, `loadSpritesheet`), incluida la animación de explosión al romper un ladrillo (`EXPLOSION_FRAMES`), y espera a que la imagen cargue (`loadSpritesheet`) antes de arrancar el loop.
- El motor conserva `drawHud`/`drawOverlay` dibujados dentro del canvas (Score/Nivel/vidas como corazones o iconos simples, y los overlays de texto "Pulsa espacio...", "Vida perdida", "Nivel completado", "Victoria!", "Game Over"), igual que el original — patrón de HUD duplicado canvas + React, como asteroides.
- `lib/games/registry.ts`: nueva entrada `arkanoid: { create: createArkanoidGame, width: 448, height: 600 }` en `gameEngines`.
- Assets gráficos: `assets/spritesheet-breakout.png` se copia a `public/sprites/arkanoid/spritesheet-breakout.png`; el helper de sprites (`SPRITES`, `drawSprite`, `drawFrame`, `loadSpritesheet`) se porta a `lib/games/arkanoid/spritesheet.ts`.
- Sonido: `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` del original se copian a `public/sounds/arkanoid/` y se reproducen desde el motor (rebote de pelota, destrucción de ladrillo), igual que el original.
- Control de paleta por teclado (flechas izquierda/derecha o `A`/`D`) y por mouse (`mousemove` sobre el canvas), igual que el original; `Space` o click avanzan el estado (`start` → jugar, `life-lost`/`level-complete` → continuar).
- 3 niveles progresivos fijos (`LEVELS`: filas 8/9/10, huecos en el grid en niveles 2 y 3, `ballSpeedMultiplier` creciente), igual que el original; completar el nivel 3 sin perder vuelve automáticamente a `start` (nueva partida) sin abrir el modal de fin de partida.
- Fin de partida real: al perder las 3 vidas (`status: "lose"`) se dispara `onGameOver(score)`, lo que abre el modal "FIN DEL JUEGO" existente con el puntaje real e inserta la fila en `scores` (mismo flujo que asteroides/tetris, spec 06).
- `app/globals.css`: nueva clase `.cover-arkanoid` para la portada en Biblioteca/Detalle, siguiendo el patrón de `.cover-asteroides`/`.cover-tetris`. No se reutiliza `.cover-bricks` (en uso por `"bloque-buster"`).

**No incluye:**

- Modificar el juego `"bloque-buster"` existente en `games`.
- Nuevos assets gráficos más allá del spritesheet original (no se agregan sprites nuevos ni se reemplaza el arte del kit de referencia).
- Ganar los 3 niveles (`status: "win"`) como fin de partida guardable — solo perder las 3 vidas (`status: "lose"`) dispara el modal y el guardado en `scores`; ganar reinicia la partida automáticamente sin pasar por el modal.
- HUD de React con campos custom (a diferencia de tetris) — el HUD de React ya muestra Puntuación/Vidas/Nivel de forma genérica para cualquier `isRealGame`; arkanoid usa vidas reales (no reinterpretadas), así que no requiere ningún cambio condicional en `GamePlayer.tsx`.
- Modificar `GameEngineCallbacks`/`GameEngineHandle` en `lib/games/registry.ts` — se reutilizan tal cual.
- Persistencia de puntajes fuera de Supabase (`scores`).
- Integración especial en `/salon-de-la-fama` más allá de lo que ya provee el spec 06 — arkanoid se suma automáticamente por existir en `games`.
- Portar cualquier otro juego de `references/started-games/`.
- Canvas responsive real; se mantiene 448×600 fijo, escalado visualmente por CSS.
- Power-ups u otras mecánicas no presentes en `script.js` original.

## Modelo de datos

Fila nueva en `games` (esquema ya existente, spec 06):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'arkanoid',
  'ARKANOID',
  'Rompe ladrillos antes de perder la pelota.',
  'Controla la paleta con teclado o mouse y hace rebotar la pelota contra tres niveles de ladrillos cada vez más complejos. El ángulo de rebote depende de dónde golpea la pelota en la paleta — usalo a tu favor para despejar los huecos difíciles antes de quedarte sin vidas.',
  'ARCADE',
  'cover-arkanoid',
  'magenta',
  0,
  '0'
);
```

No se introduce ninguna tabla ni columna nueva (reutiliza `games`/`scores` del spec 06). Se introduce el motor del juego, siguiendo la interfaz ya establecida en `lib/games/registry.ts`:

```ts
// lib/games/arkanoid/engine.ts
import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";

function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngineHandle;
```

`callbacks.onScoreChange`/`onLivesChange`/`onLevelChange` se invocan con `score`/`lives`/`level` del original, solo cuando el valor cambia (mismo patrón que asteroides/tetris). `callbacks.onGameOver(score)` se invoca únicamente cuando `state.status` pasa a `'lose'` (las 3 vidas perdidas), no en `'win'`.

Entrada nueva en `lib/games/registry.ts`:

```ts
export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
  tetris: { create: createTetrisGame, width: 300, height: 600 },
  arkanoid: { create: createArkanoidGame, width: 448, height: 600 },
};
```

La física interna (`state` con `status`/`score`/`lives`/`level`/`paddle`/`ball`/`bricks`/`explosions`, `LEVELS` de 3 niveles con `rows`/`layout`/`ballSpeedMultiplier`, `PADDLE_BOUNCE_ANGLES`, detección de colisión pelota-ladrillo/paleta/paredes/piso) es la misma que el original, dibujada vía `drawSprite`/`drawFrame` contra el spritesheet portado.

## Plan de implementación

1. **Assets.** Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/sprites/arkanoid/spritesheet-breakout.png`, y `assets/sounds/ball-bounce.mp3`/`break-sound.mp3` a `public/sounds/arkanoid/`.
2. **Spritesheet portado.** Crear `lib/games/arkanoid/spritesheet.ts` con el puerto a TypeScript de `assets/spritesheet.js` (`SPRITES`, `EXPLOSION_FRAMES`, `loadSpritesheet(cb)`, `drawSprite(ctx, name, x, y, w, h)`, `drawFrame(ctx, frame, x, y, w, h)`), apuntando a la imagen copiada en el paso 1.
3. **Motor portado.** Crear `lib/games/arkanoid/engine.ts` con el estado, la física y el dibujo (vía `drawSprite`/`drawFrame` del paso 2, incluida la animación de explosión al romper un ladrillo) del `script.js` original, incluyendo `drawHud`/`drawOverlay` dentro del canvas, expuestos a través de `createArkanoidGame(canvas, callbacks)`. El motor llama a `loadSpritesheet()` y espera su callback antes de arrancar el loop. Los listeners de teclado (`keydown`/`keyup` en `window`) y de mouse (`mousemove`/`click` en el canvas) quedan controlados por el handle devuelto (`pause`/`resume`/`restart`/`destroy`), removiéndose en `destroy()`. `onGameOver` se invoca solo cuando `state.status` llega a `'lose'`.
4. **Ficha del juego.** Insertar la fila `"arkanoid"` en `games` vía `mcp__supabase__execute_sql` con el INSERT de la sección anterior. Verificar con `mcp__supabase__execute_sql` (`select * from games where id = 'arkanoid'`) que la fila quedó creada.
5. **Registro del motor.** Agregar la entrada `arkanoid` a `gameEngines` en `lib/games/registry.ts` (import de `createArkanoidGame`, `width: 448, height: 600`).
6. **Portada visual.** Agregar `.cover-arkanoid` (y sus pseudo-elementos) a `app/globals.css`, siguiendo el patrón de `.cover-asteroides`/`.cover-tetris`.
7. **Verificación.** `npm run build`; jugar una partida completa en `/juegos/arkanoid/jugar` de principio a fin (mover la paleta con teclado y mouse, lanzar la pelota, romper ladrillos, perder una vida y continuar, completar un nivel y avanzar, perder las 3 vidas, guardar puntaje, reiniciar, salir y reentrar).

Cada paso deja la app compilando (`npm run build`) y, salvo el paso 4 (que solo toca la base de datos), sin romper ninguna pantalla existente.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `mcp__supabase__execute_sql` confirma que `games` tiene la fila `"arkanoid"` (título "ARKANOID", `cat` = `ARCADE`, `cover` = `cover-arkanoid`, `color` = `magenta`).
- [ ] `/juegos/arkanoid` (detalle) y `/biblioteca` muestran la ficha "ARKANOID" con la portada `cover-arkanoid`; `"bloque-buster"` sigue intacto.
- [ ] `/juegos/arkanoid/jugar` muestra un canvas real de 448×600 con la paleta, la pelota y 8 filas de ladrillos (nivel 1), arrancando en Puntuación 0, Vidas 3, Nivel 01.
- [ ] Las flechas izquierda/derecha (o `A`/`D`) y el mouse mueven la paleta; `Space` o click lanzan la pelota.
- [ ] Romper un ladrillo suma 10 puntos, reproduce el sonido de rotura y el HUD de React ("Puntuación") sube en tiempo real.
- [ ] Perder una vida (pelota bajo la paleta) muestra el overlay "Vida perdida" dentro del canvas y descuenta una vida del HUD de React sin terminar la partida (si quedan vidas).
- [ ] Romper todos los ladrillos de un nivel avanza al siguiente (huecos en el grid, pelota más rápida) sin perder el progreso de puntuación.
- [ ] El botón "PAUSA" congela el juego (paleta/pelota dejan de moverse) y "REANUDAR" continúa sin saltos.
- [ ] Perder las 3 vidas abre el modal "FIN DEL JUEGO" con el puntaje real; guardar con iniciales inserta una fila real en `scores` (Supabase). Completar los 3 niveles sin perder reinicia la partida automáticamente sin abrir ese modal.
- [ ] "JUGAR DE NUEVO" reinicia el motor (Puntuación 0, Vidas 3, Nivel 01, tablero del nivel 1) sin recargar la página.
- [ ] Salir con "SALIR" y volver a entrar a `/juegos/arkanoid/jugar` no duplica listeners de teclado/mouse ni bucles de `requestAnimationFrame`.
- [ ] `/salon-de-la-fama` (tab "ARKANOID") y el aside de `/juegos/arkanoid` muestran "AÚN SIN PUNTAJES" antes de guardar el primer puntaje, y el puntaje real después de guardarlo.
- [ ] Los demás juegos (incluidos `"bloque-buster"`, `"asteroides"` y `"tetris"`) siguen funcionando sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **`id: "arkanoid"` como juego nuevo, en vez de reutilizar `"bloque-buster"`**: decisión explícita del usuario — mismo criterio que asteroides/rocas (spec 05) y tetris/caída (spec 07); `"bloque-buster"` (mockup ARCADE/cyan/`cover-bricks`) queda sin tocar.
- **`color: "magenta"` en vez de reutilizar `cyan` (ya usado por `"bloque-buster"`)**: decisión explícita del usuario, siguiendo el mismo patrón de diferenciación visual real-vs-mockup de asteroides/rocas y tetris/caída.
- **Spritesheet original portado (`assets/spritesheet.js`/`spritesheet-breakout.png`), a diferencia de asteroides/tetris (100% vectoriales)**: decisión explícita del usuario — el arte del kit de referencia de arkanoid se conserva tal cual, incluida la animación de explosión de ladrillos (`EXPLOSION_FRAMES`), en vez de redibujar con primitivas de Canvas.
- **Sonido sí se porta (`ball-bounce.mp3`/`break-sound.mp3` a `public/sounds/arkanoid/`)**: decisión explícita del usuario — a diferencia de asteroides/tetris (que no tenían sonido en el original y quedó fuera de alcance), el original de arkanoid sí tiene sonido y se decide conservarlo.
- **Control de paleta por mouse + teclado, igual que el original**: decisión explícita del usuario — se preserva el `mousemove` sobre el canvas además de las flechas/`A`-`D`, con el listener removido en `destroy()` igual que los de teclado.
- **`onGameOver` solo en `'lose'`, no en `'win'`**: decisión explícita del usuario — completar los 3 niveles sin perder reinicia la partida automáticamente (como en el original, que vuelve a `start` tras click/espacio en el estado `'win'`) en vez de abrir el modal de fin de partida; mantiene el mismo criterio que asteroides/tetris (un único camino de "fin de partida real" ligado a quedarse sin vidas).
- **HUD duplicado (canvas + React), igual que asteroides y a diferencia de tetris**: decisión explícita del usuario — el motor conserva `drawHud`/`drawOverlay` del original (incluye los overlays intermedios "Vida perdida"/"Nivel completado"/"Victoria!" que no tienen equivalente en el modal de React), y el HUD de `.player-hud` en React refleja el mismo estado en paralelo.
- **Sin cambios condicionales en `GamePlayer.tsx`**: a diferencia de tetris (que reinterpretó `onLivesChange` como "líneas" y cambió el label del HUD), arkanoid usa vidas reales sin reinterpretar, así que el HUD genérico existente (corazones) ya es correcto sin tocar el componente.
- **Motor en `lib/games/arkanoid/engine.ts` (TypeScript, separado de React)**: sigue la convención ya establecida por `lib/games/asteroides/engine.ts` y `lib/games/tetris/engine.ts`.
- **Inserción de la fila `games` vía `mcp__supabase__execute_sql` directo, sin migración versionada**: coherente con que el esquema de `games`/`scores` ya existe desde el spec 06; esto es solo una fila de datos semilla, no un cambio de esquema.
