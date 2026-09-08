---
name: spec-impl-game
description: Implementa un spec de juego aprobado igual que /spec-impl (reutiliza ese mismo skill) y, al terminar el plan de implementación, encadena automáticamente skin-designer y luego mobile-porter (uno después del otro, nunca en paralelo) sobre el juego recién implementado. Úsalo en vez de /spec-impl cuando el spec añade o modifica un juego jugable.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementador de specs de juego + post-proceso automático

Este comando hace exactamente lo mismo que `/spec-impl`, y al terminar la implementación **encadena automáticamente dos agentes, uno después del otro**: primero `skin-designer`, después `mobile-porter`, sobre el juego que el spec acaba de crear o modificar.

**No dupliques la lógica de `/spec-impl` en este archivo.** Léela y ejecútala en vivo.

---

## Fase 0 — Ejecutar `/spec-impl` tal cual

1. Lee el archivo completo `~/.claude/skills/spec-impl/SKILL.md`.
2. Ejecuta sus Fases 1 a 4 al pie de la letra, usando `$ARGUMENTS` exactamente como ese skill lo especifica (identificar el spec, validar que el estado significa "Aprobado", crear/cambiar de rama, implementar paso a paso con pausas para revisar cada diff).
3. Este es un flujo **multi-turno**: igual que `/spec-impl`, pausa después de cada paso del plan y espera confirmación explícita del usuario antes de continuar con el siguiente. No lo colapses en un solo turno.
4. Si la Fase 2 de `/spec-impl` determina que el spec **no** está en estado Aprobado (o equivalente), o si hay cualquier ambigüedad que detiene el flujo original, este comando se detiene exactamente igual que `/spec-impl` lo haría. **La Fase 5 de abajo nunca se ejecuta** si la Fase 0 no llegó a buen término.
5. Cuando `/spec-impl` llegue a su mensaje final de Fase 4 ("✅ All steps of the plan are implemented" / equivalente en el idioma del spec), **no esperes una nueva invocación del comando**: continúa automáticamente con la Fase 5 de este skill, en el mismo hilo de conversación.

Se sigue respetando la regla de `/spec-impl` de **no commitear automáticamente** en ningún momento de este flujo, incluida la Fase 5.

---

## Fase 5 — Post-proceso automático de juego (exclusiva de `/spec-impl-game`)

Se dispara sola, sin pedir confirmación al usuario para arrancar, en cuanto cierra la Fase 4.

### a. Detectar el `game-id` implementado

En este orden de fiabilidad:

1. **Señal primaria** — diff de `lib/games/registry.ts` contra la rama base de la que se creó `spec-NN-slug` (normalmente `main`): `git diff main...HEAD -- lib/games/registry.ts`. Busca qué clave nueva apareció dentro de `gameEngines`.
2. **Señal secundaria** (si el diff es ambiguo, vacío, o el spec es parcial) — heurística por ruta del archivo de spec identificado en la Fase 1 de `/spec-impl`:
   - `specs/NN-<id>-game.md` → `id` = slug entre el número y el sufijo `-game` (ej. `specs/08-arkanoid-game.md` → `arkanoid`).
   - `specs/game-jam/<tema>/<game-id>/<archivo>.md` → `id` = nombre de la carpeta inmediatamente superior al archivo (ej. `specs/game-jam/deposito-express/frogger/01-frogger-core.md` → `frogger`).
   - `specs/game-jam/<tema>/spec.md` (sin subcarpeta de juego) → `id` = `<tema>`.
3. **Validación final obligatoria** — confirma con Glob que existe `lib/games/<id>/engine.ts` **y** que `<id>` aparece como clave dentro de `gameEngines` en `lib/games/registry.ts`. Un candidato que no pase esta validación se descarta.

Resultado:

- **Exactamente un candidato válido** → continúa automáticamente con el paso (b), sin preguntar nada.
- **Cero candidatos o más de uno** → única excepción a "no preguntar": usa `AskUserQuestion` para que el usuario indique el `game-id` correcto antes de invocar cualquier agente.

### b. Invocar `skin-designer` (primero, solo)

Lanza un único `Agent` call con `subagent_type: "skin-designer"`. El prompt debe indicar explícitamente:

- El juego objetivo (`<id>` detectado).
- Que aplique los 3 skins canónicos (classic, retro, neon) siguiendo su propio patrón interno.
- El spec de origen, para contexto.

**No lances `mobile-porter` en el mismo mensaje ni en el mismo batch de tool calls.**

### c. Esperar el cierre de `skin-designer`

Espera la notificación de finalización de ese agente antes de continuar. No sondees, no asumas ni fabriques su resultado.

### d. Invocar `mobile-porter` (después, solo)

Una vez confirmado que `skin-designer` terminó, lanza un único `Agent` call con `subagent_type: "mobile-porter"`, en un mensaje separado, indicando el mismo `<id>` y que aplique el soporte táctil mobile (spec 10) sobre la play-page de ese juego.

### e. Resumen final al usuario

Cuando `mobile-porter` termine, resume en pocas líneas:

- Juego procesado (`<id>`) y spec de origen.
- Qué hizo `skin-designer` (según su propio reporte final).
- Qué hizo `mobile-porter` (según su propio reporte final).
- Recordatorio pendiente, igual que ya indica `/spec-impl`: verificar los criterios de aceptación del spec, marcar su estado como Implementado, y hacer el/los commit(s) — el usuario decide si agrupa la implementación base + skins + mobile en un solo commit o en varios.

---

## Reglas invariantes

- **Nunca commitear automáticamente**, en ninguna fase.
- **Nunca avanzar de fase sin que la anterior haya cerrado correctamente** (si `/spec-impl` se detiene, este comando se detiene con él).
- **`skin-designer` y `mobile-porter` son estrictamente secuenciales**: nunca en la misma llamada, nunca en paralelo. El segundo solo arranca tras confirmar que el primero terminó.
- **No preguntar el `game-id`** salvo que la detección automática (paso a) resulte en cero o más de un candidato válido.
