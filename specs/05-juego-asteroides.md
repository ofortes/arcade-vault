# 05 · Juego Asteroides

- **Estado:** Aprovado
- **Depende de:** (ninguno)
- **Fecha:** 2026-09-03
- **Objetivo:** Portar el clon de Asteroids (vanilla JS + Canvas de `references/started-games/02-asteroids/`) como un juego nuevo y jugable en Arcade Vault, con `id: "asteroides"` (distinto de `"rocas"`, que ya existe en `lib/games.ts` y no se toca), integrado en la ruta `/juegos/asteroides/jugar`.

## Alcance

**Incluye:**

- Nueva entrada en `lib/games.ts` con `id: "asteroides"`, título "ASTEROIDES", categoría `SHOOTER`.
- `lib/games/asteroides/engine.ts`: puerto a TypeScript estricto del motor original (`game.js`), incluyendo `drawHUD`/`drawOverlay` (el motor sigue dibujando su propio HUD y el overlay de "GAME OVER" dentro del canvas, igual que el original), como función factory `createAsteroidsGame(canvas, callbacks)` con ciclo de vida controlado (`pause`, `resume`, `restart`, `destroy`) en vez del bootstrap de script clásico que corre una sola vez al cargar.
- `components/GamePlayer.tsx`: cuando `game.id === "asteroides"`, monta un `<canvas>` real conectado al motor en lugar del `<div className="game-arena">` decorativo, y el HUD de React (Puntuación/Vidas/Nivel) también muestra estado real en vez de las constantes `DEMO_*` — puntuación/vidas/nivel quedan reflejados **por duplicado**: dentro del canvas (dibujo original del motor) y en el HUD de React (`.player-hud`). El resto de juegos sigue usando el mockup sin cambios.
- `app/globals.css`: nueva clase `.cover-asteroides` para la portada en Biblioteca/Detalle, siguiendo el patrón de `.cover-rocas`/`.cover-invaders`.
- Fin de partida real: al perder las 3 vidas se dispara el modal "FIN DEL JUEGO" existente con el puntaje real, y `saveScore()` (`lib/session.ts`, ya existente) lo persiste en `localStorage` sin cambios en esa función.

**No incluye:**

- Modificar el juego `"rocas"` existente en `lib/games.ts`.
- Persistencia de puntajes en Supabase (el spec 04 dejó el proyecto sin tablas a propósito); se sigue usando `lib/session.ts` (`localStorage`).
- Integración con `/salon-de-la-fama` (usa `seededScores()`, datos falsos deterministas); no se conecta a los puntajes reales guardados.
- Portar cualquier otro juego de `lib/games.ts`.
- Sonido o assets gráficos nuevos (el juego original es 100% vectorial vía Canvas API).
- Canvas responsive real (reescribir la física a un tamaño dinámico); se mantiene 800×600 fijo, escalado visualmente por CSS.

## Modelo de datos

No se introduce persistencia nueva (sigue usando `SavedScoreEntry` de `lib/session.ts`, sin cambios). Se introduce una interfaz de comunicación entre el motor y React:

```ts
// lib/games/asteroides/engine.ts
interface AsteroidsCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface AsteroidsGameHandle {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void;
}

function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGameHandle;
```

Los callbacks se invocan solo cuando el valor cambia (no cada frame), para no re-renderizar React a 60 FPS. La física interna (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, constantes `RADII`/`SPEEDS`/`POINTS`/`LARGE_ASTEROID_SHAPES`) es la misma que el original, en un canvas fijo de 800×600.

## Plan de implementación

1. **Motor portado.** Crear `lib/games/asteroides/engine.ts` con las clases y la física del `game.js` original, mantener `drawHUD`/`drawOverlay`, expuestas a través de `createAsteroidsGame(canvas, callbacks)`. Listeners de teclado (`keydown`/`keyup`) y `requestAnimationFrame` quedan controlados por el handle devuelto (`pause`/`resume`/`restart`/`destroy`), corrigiendo que el original nunca los limpia.
2. **Ficha del juego.** Agregar la entrada `"asteroides"` a `lib/games.ts` (título, descripciones, categoría `SHOOTER`, `cover: "cover-asteroides"`, `best: 0`, `plays: "0"`).
3. **Portada visual.** Agregar `.cover-asteroides` (y sus pseudo-elementos) a `app/globals.css`, siguiendo el patrón de `.cover-rocas`.
4. **Reproductor real.** Editar `components/GamePlayer.tsx`: estado React (`score`, `lives`, `level`, `finalScore`) reemplaza las constantes `DEMO_*`; cuando `game.id === "asteroides"`, un `useEffect` monta `createAsteroidsGame` sobre un `<canvas ref>` dentro de `.crt-screen` y limpia con `handle.destroy()` al desmontar; los botones "PAUSA"/"REANUDAR" y "JUGAR DE NUEVO" llaman a `handle.pause()/resume()/restart()`; el botón "SIMULAR FIN DE PARTIDA" se oculta para este juego porque el fin de partida ya es real.
5. **Verificación.** `npm run build`, jugar una partida completa en `/juegos/asteroides/jugar` de principio a fin (mover, disparar, pausar, perder las 3 vidas, guardar puntaje, reiniciar, salir y reentrar); `npm run build` para confirmar TypeScript estricto sin errores.

Cada paso deja compila la app con `npm run build` y sin errores de TypeScript/build.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `/juegos/asteroides` (detalle) y `/biblioteca` muestran la ficha "ASTEROIDES" con la portada `cover-asteroides`; `"rocas"` sigue intacto.
- [ ] `/juegos/asteroides/jugar` muestra un canvas real con la nave, asteroides y HUD arrancando en Puntuación 0, Vidas 3, Nivel 01.
- [ ] Las flechas rotan/aceleran la nave y Espacio dispara; los asteroides se fragmentan y la Puntuación del HUD de React sube en tiempo real.
- [ ] El botón "PAUSA" congela el juego (nave/asteroides dejan de moverse) y "REANUDAR" continúa sin saltos.
- [ ] Perder las 3 vidas abre el modal "FIN DEL JUEGO" con el puntaje real (no un valor fijo); guardar con iniciales persiste la entrada en `localStorage` (`av_scores`).
- [ ] "JUGAR DE NUEVO" reinicia el motor (Puntuación 0, Vidas 3, Nivel 01) sin recargar la página.
- [ ] Salir con "SALIR" y volver a entrar a `/juegos/asteroides/jugar` no duplica listeners de teclado ni bucles de `requestAnimationFrame` (el juego no acelera ni responde a inputs fantasma tras varias entradas/salidas).
- [ ] Los demás juegos de `lib/games.ts` (incluido `"rocas"`) siguen mostrando el mockup `game-arena` sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **`id: "asteroides"` como juego nuevo, en vez de reutilizar `"rocas"`**: decisión explícita del usuario — son juegos distintos aunque temáticamente similares; `"rocas"` queda sin tocar.
- **HUD duplicado (canvas + React) en vez de solo React**: a pedido del usuario, el motor conserva `drawHUD`/`drawOverlay` del original (dibuja puntuación/vidas/nivel/game-over dentro del canvas) y el HUD de `.player-hud` en React también refleja el mismo estado en paralelo, alimentado por los mismos callbacks.
- **Canvas fijo 800×600 escalado por CSS, no responsive real**: mantiene la física original intacta (mismo comportamiento verificado del juego de referencia) sin reescribir coordenadas/velocidades a un tamaño dinámico; se descarta la opción de recalcular la física por tamaño de contenedor por ser sobre-ingeniería para este spec.
- **Motor en `lib/games/asteroides/engine.ts` (TypeScript, separado de React) en vez de todo dentro de un componente**: sigue la convención `lib/` del proyecto (`lib/games.ts`, `lib/session.ts`, `lib/supabase/`) y permite testear/reutilizar el motor sin acoplarlo al ciclo de render de React.
- **Alcance limitado a `"asteroides"`**: los otros 7 juegos de `lib/games.ts` siguen siendo mockup; portar cada uno es trabajo para specs futuros independientes.
- **Persistencia en `localStorage` vía `lib/session.ts`, sin Supabase**: el spec 04 dejó la base de datos intencionalmente vacía; crear un esquema de puntajes ahora sería alcance no pedido en este spec.
