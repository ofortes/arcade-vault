---
name: add-game
description: Genera un spec para añadir un nuevo juego canvas a Arcade Vault (componente React, play-page, fila en tabla games de Supabase y wiring del modal de leaderboard). Acepta una carpeta de references/started-games/ o una descripción libre del juego. No escribe código; solo produce specs/NN-<slug>-game.md.
disable-model-invocation: true
argument-hint: "<carpeta references/started-games/NN-name> o <descripción corta del juego>"
---

# /add-game — Generador de spec para nuevo juego

Este skill produce un spec siguiendo el patrón consolidado de `specs/05-juego-asteroids.md` + `specs/06-leaderboard-y-tabla-de-juegos.md`. **No escribe código.** Solo genera el `.md` del spec que luego se ejecuta con `/spec-impl`.

Asume que el spec 06 ya está implementado: las tablas `games` y `scores` existen en Supabase, `lib/games.ts` expone `getGames()`/`getGame(id)` (tipos `Game`, `GameCategory`, `GameColor`, `CATS` en `lib/games-types.ts`), y las rutas `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar` y `/salon-de-la-fama` ya consumen esas tablas dinámicamente.

Tus respuestas deben estar siempre en el **mismo idioma que el prompt inicial** (si el usuario escribe en español, responde en español).

---

## Fase 1 — Contexto del proyecto

Antes de preguntar nada, recoge contexto:

1. Leer `CLAUDE.md` y `AGENTS.md`.
2. **Leer `~/.claude/skills/spec/SKILL.md` y `~/.claude/skills/spec/template.md`** (skill `/spec`, instalada a nivel usuario — no existe copia a nivel proyecto). Antes de crear el archivo de especificación, estos dos archivos son la referencia canónica obligatoria: interioriza sus reglas de formato, tono, desarrollo sección por sección con confirmación, numeración/estado `Borrador`, reglas invariantes, y la estructura de secciones de `template.md`. La Fase 4 de este skill debe seguir ese mismo molde (ajustado al dominio de juegos), no un formato inventado.
3. Listar `specs/` para determinar el número `NN` del próximo spec (el mayor número existente + 1).
4. Leer los dos specs más recientes (`specs/05-juego-asteroides.md`, `specs/06-leaderboard-y-tabla-de-juegos.md`) para mantener convención de idioma, formato y nivel de detalle.
5. Verificar que `lib/games.ts` exporta `getGames()`/`getGame(id)` y que existe `lib/games/registry.ts` con `gameEngines`. Si no existen, abortar y pedir al usuario que implemente primero el spec 06 (`06-leaderboard-y-tabla-de-juegos`).
6. Verificar que `lib/games/asteroides/engine.ts` (motor) y `components/GamePlayer.tsx` (integración en el reproductor) existen — sirven como referencia de patrón: motor TS con factory `create<Slug>Game(canvas, callbacks)` registrado en `gameEngines`.

---

## Fase 2 — Resolución de la fuente del juego

Evalúa `$ARGUMENTS`:

**Caso A — Reference folder.** Si `$ARGUMENTS` coincide con una ruta dentro de `references/started-games/` (ej. `references/started-games/03-tetris` o simplemente `03-tetris`):

- Leer `game.js` de esa carpeta.
- Leer `index.html` para identificar dimensiones del canvas y script de arranque.
- Leer `README.md` o `requirements.md` si existe.
- Extraer internamente: controles de teclado, variables de estado (score, lives, level, u otros), condición de game over, si hay overlay GAME OVER dibujado en canvas.
- Usar los valores extraídos como respuestas tentativas en los bloques de preguntas (proponlos al usuario y pide confirmación, no los asumas silenciosamente).

**Caso B — Descripción libre.** Si `$ARGUMENTS` es texto descriptivo (o está vacío):

- Si está vacío, pedir una frase de descripción del juego antes de continuar.
- Tratar los datos del juego como desconocidos; preguntar todo en el Bloque B.

**Caso C — Sin argumentos claros.** Preguntar: "¿El juego viene de `references/started-games/` o lo describimos desde cero?"

---

## Fase 3 — Preguntas por bloques

Haz preguntas en bloques de 3-5. Espera respuesta antes de avanzar al siguiente bloque. Usa recomendaciones concretas, no preguntas abiertas.

### Bloque A — Identidad del juego

1. **ID / slug** — será la PK en la tabla `games` y el segmento de URL (ej. `tetris`, `arkanoid`). Propón uno basado en `$ARGUMENTS` si puedes.
2. **Title** — nombre en mayúsculas para mostrar en la UI (ej. `TETRIS`).
3. **short** — una línea sensorial, máx. 50 caracteres (ej. "Apila tetrominos antes de que el techo te aplaste.").
4. **long** — 2-3 frases para la página de detalle.
5. **cat** — `ARCADE`, `PUZZLE`, `SHOOTER` o `VERSUS` (`CATS` en `lib/games-types.ts`). Propón el más obvio.
6. **cover** — clase CSS (ej. `cover-rocas`). Leer `app/globals.css` para ver las disponibles y proponer la más adecuada. Si no hay ninguna apropiada, indicar que habrá que añadir una nueva al CSS (fuera del alcance de este spec).
7. **color** — `cyan`, `magenta`, `yellow` o `green`. Propón basándote en la estética del juego.

### Bloque B — Mecánica

1. **Canvas size** — ancho × alto en px. Si viene de reference, extrae de `index.html`; propón como valor por defecto.
2. **Controles** — teclas o eventos. Si viene de reference, extraer de `game.js`.
3. **Estado HUD** — ¿qué valores expone el juego al HUD React? Las opciones estándar son `score`, `lives`, `level`. Si el juego no tiene alguno de ellos, preguntar si se omite del HUD o se sustituye por otro campo (ej. `lines`, `next-piece`, `time`). El HUD custom debe documentarse en el spec.
4. **Condición de game over** — ¿cuándo termina la partida?
5. **Pausa** — ¿el motor expone `pause()`/`resume()` en el `GameEngineHandle` devuelto por la factory? (recomendado sí, coherente con `createAsteroidsGame`).

### Bloque C — Leaderboard

Estos tres puntos tienen respuestas por defecto que el usuario puede cambiar:

1. **¿Se guarda el score al terminar?** — sí por defecto. Si no, el spec omite el modal de guardado.
2. **Top N del leaderboard** — 10 por defecto (como asteroides).
3. **¿Aparece tab en `/salon-de-la-fama`?** — sí automáticamente por estar en `games`; mencionarlo como info, no como pregunta.

### Bloque D — Adaptación canvas → motor TS (solo si Caso A)

1. **Overlay GAME OVER del canvas** — ¿se conserva dibujado dentro del canvas (patrón asteroides: HUD duplicado canvas + React) o se elimina para que solo el modal React lo muestre? Confirmar explícitamente.
2. **HUD interno del canvas** — ¿se conserva sin cambios? (recomendado sí, doble HUD). Confirmar.
3. **Event listeners de teclado/mouse** — el motor debe removerlos en `destroy()` (parte del `GameEngineHandle`), no en un `useEffect` de React. Preguntar si el `game.js` original los añade a `window` o al canvas, para portarlo igual.

---

## Fase 4 — Generación del spec, sección por sección

Una vez tienes todas las respuestas, genera el spec usando `~/.claude/skills/spec/template.md` (leído en la Fase 1) como molde estructural, ajustando las secciones al dominio de juegos según se detalla abajo. Muestra **una sección a la vez**, espera confirmación antes de avanzar.

Orden obligatorio:

1. **Header** — bloqueo de metadatos + objetivo en una sola frase.
2. **Scope** — In y Fuera de alcance. El "Fuera" debe incluir explícitamente las exclusiones estándar.
3. **Data model** — INSERT SQL listo para copiar (fila de `games`) + firma de la factory del motor (`create<Slug>Game(canvas, callbacks): GameEngineHandle`, usando `GameEngineCallbacks`/`GameEngineHandle` de `lib/games/registry.ts`) + entrada nueva a agregar en `gameEngines`.
4. **Implementation plan** — 4 pasos numerados, cada uno dejando el sistema funcional.
5. **Acceptance criteria** — checklist booleano.
6. **Decisions** — Sí/No con razón breve.

Tras cada sección: "¿Esta sección queda así o quieres ajustar algo?"

---

## Fase 5 — Guardado del spec

Cuando todas las secciones estén confirmadas:

1. Calcular `NN` = número más alto en `specs/` + 1 (con cero a la izquierda si NN < 10).
2. Slug de archivo: `NN-<id>-game.md` (ej. `07-tetris-game.md`).
3. Confirmar el nombre de archivo con el usuario antes de escribir.
4. Crear `specs/NN-<id>-game.md` con todo el contenido aprobado.
5. Marcar estado como `Borrador` (para mantener la convención en español del proyecto).
6. Confirmar al usuario:
   - Ruta del archivo creado.
   - Recordatorio: el spec está en estado `Borrador`. Cámbialo a `Aprobado` cuando lo hayas releído.
   - Sugerencia del siguiente paso: _"Implementa el spec NN paso a paso con: `/spec-impl NN`"_.

---

## Reglas invariantes

- **Nunca escribir código durante este skill.** Solo el archivo `.md` del spec al final.
- **Nunca asumir decisiones que el usuario no confirmó.** Si falta información, preguntar.
- **Nunca generar el spec completo de un golpe.** Sección por sección, con confirmación.
- **Si `lib/games.ts` no expone `getGames()`/`getGame()` o no existe `lib/games/registry.ts`**, detener y pedir que se implemente el spec 06 primero.
- **Si el juego ya existe** — si `<id>` ya está en `gameEngines` (`lib/games/registry.ts`) o es una fila conocida en `games`, avisar al usuario antes de continuar.
- **El spec que produces no incluye pasos para crear las tablas `games` o `scores`** — ya existen. Solo incluye el INSERT de la fila nueva.
