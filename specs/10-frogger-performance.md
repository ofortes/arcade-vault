# 10 · Performance en Frogger

- **Estado:** Implementado
- **Depende de:** Frogger core (`specs/game-jam/frogger/01-frogger-core.md`)
- **Fecha:** 2026-09-09
- **Objetivo:** Diagnosticar con profiling y corregir el stutter/caídas de FPS de Frogger (`components/games/FroggerGame.tsx`), añadiendo un overlay de FPS solo en desarrollo para medir antes y después del fix.

## Alcance

**Incluye:**

- Overlay de FPS dev-only dibujado directamente en el canvas de `FroggerGame.tsx` (mismo mecanismo que `drawHud`), activo solo cuando `process.env.NODE_ENV === "development"`. Muestra FPS instantáneo, promedio móvil y mínimo de la ronda en curso.
- Instrumentación del loop `requestAnimationFrame` ya existente (`function loop(ts)`) para calcular esas métricas, sin alterar el `dt` que ya consumen `update()`/`draw()`.
- Profiling manual con Chrome DevTools Performance de una partida completa en cada uno de los 3 skins (`classic`, `retro`, `neon`) para localizar el cuello de botella real. Hipótesis principal por lectura de código (a confirmar, no asumir): `skin.glow = true` (skin `neon`) fuerza `ctx.shadowBlur`/`ctx.shadowColor` en cada entidad dibujada en `drawEntity`/`drawGoals`/`drawFrog` (hasta ~30 por frame), y los 3 skins hacen un `ctx.save()`/`ctx.restore()` por entidad — ambas son operaciones costosas conocidas de Canvas 2D cuando se repiten muchas veces por frame.
- Corrección dirigida en `components/games/FroggerGame.tsx`, basada en el hallazgo confirmado del profiling, sin cambiar el resultado visual final de ningún skin.
- Verificación con el propio overlay: FPS promedio ≥55 y piso ≥30 durante una ronda completa (5 metas llenadas) en los 3 skins.

**Fuera de alcance (para futuros specs):**

- Los otros 4 motores (asteroides, tetris, arkanoid, snake) — este spec es exclusivo de Frogger. Si el profiling revela que el problema es compartido, se documenta pero no se corrige aquí.
- Migrar Frogger al patrón `lib/games/registry.ts`/`GameEngineHandle` — sigue siendo la excepción documentada en `CLAUDE.md`; es un cambio de arquitectura mayor, ajeno a este problema puntual de rendimiento.
- Cambiar el diseño visual de cualquier skin (colores, formas, glow) — solo cómo se logra en el canvas.
- Tests automatizados de performance — no hay test runner configurado en el proyecto (verificación manual, per `CLAUDE.md`).
- Optimización específica para mobile o controles táctiles — Frogger no tiene controles táctiles todavía (el agente `mobile-porter` está desactualizado, ver `CLAUDE.md`).
- Un overlay de FPS reutilizable para los otros juegos — fuera de alcance mientras no se confirme que el problema es compartido.
- Reducir la densidad de entidades (coches/camiones) en los primeros niveles — es balance de dificultad, no performance; queda para un spec aparte.

## Modelo de datos

Este spec no introduce datos persistentes. Solo agrega estado efímero en memoria dentro del closure del `useEffect` ya existente en `FroggerGame.tsx` (contadores de frames/tiempo para calcular FPS instantáneo/promedio/mínimo), que se descarta al desmontar el componente igual que el resto del estado del loop.

## Plan de implementación

1. **Overlay de FPS.** Dentro del `useEffect` de `FroggerGame.tsx`, añadir contadores (`fpsFrames`, `fpsElapsedMs`, `fpsMin`, `fpsAvg`) actualizados en `loop(ts)` a partir del `dt` ya calculado. Dibujar un texto pequeño en una esquina del canvas (p. ej. `FPS 58 · avg 57 · min 42`) al final de `draw()`, solo si `process.env.NODE_ENV === "development"`. No se crean archivos nuevos. Verificación: `npm run dev`, abrir `/juegos/frogger/jugar`, confirmar que el overlay aparece y se actualiza; `npm run build && npm start` y confirmar que no aparece en producción.
2. **Profiling.** Con el overlay activo, jugar una ronda completa (hasta llenar las 5 metas) grabando un profile de Chrome DevTools Performance. Anotar en el commit/PR el hallazgo real: qué función concentra el tiempo de frame (confirmando o descartando la hipótesis de `shadowBlur`/`save`-`restore` de la sección de Alcance). Este paso no modifica código de producto, solo genera el diagnóstico que guía el paso 3.
3. **Corrección dirigida.** Aplicar en `components/games/FroggerGame.tsx` el fix que corresponda al hallazgo confirmado en el paso 2, sin cambiar el resultado visual de ningún skin:
   - Si se confirma la hipótesis principal (glow/`shadowBlur` + volumen de `ctx.save()`/`ctx.restore()` por entidad): agrupar los dibujos por estilo antes de aplicar `shadowBlur` (evitar alternar la propiedad decenas de veces por frame), o limitar el `shadowBlur` a una pasada por lane en vez de por entidad, manteniendo el mismo resultado visual.
   - Si el profiling apunta a otra causa concreta (p. ej. el `for` de 14 filas de fondo en `draw()`, o el volumen de entidades generado por `buildLanes`), corregir esa causa específica en este mismo paso y documentar por qué se descartó la hipótesis principal.
     Verificación: partida jugable de punta a punta en los 3 skins, sin cambios visuales perceptibles respecto al estado actual.
4. **Verificación final.** Con el overlay activo, jugar una ronda completa en los 3 skins y confirmar FPS promedio ≥55 y piso ≥30 en los tres. `npm run build` sin errores de TypeScript ni lint.

Cada paso deja el juego jugable de principio a fin.

## Criterios de aceptación

- [ ] El overlay de FPS aparece en `/juegos/frogger/jugar` con `npm run dev`, y no aparece en un build de producción (`npm run build && npm start`).
- [ ] El overlay muestra FPS instantáneo, promedio y mínimo de la ronda en curso, actualizándose en tiempo real.
- [ ] El hallazgo de profiling (causa real de la caída de FPS, confirmada con Chrome DevTools Performance) queda documentado en el commit/PR de este spec.
- [ ] Jugando una ronda completa (5 metas llenadas) en skin `classic`, el overlay reporta FPS promedio ≥55 y nunca por debajo de 30.
- [ ] Igual para skin `retro`.
- [ ] Igual para skin `neon`.
- [ ] El aspecto visual de los 3 skins es idéntico al actual (mismos colores, glow, formas) — sin regresión visual.
- [ ] Controles (flechas/WASD), colisiones de carretera/río, metas, timer, vidas, game over y guardado de score en Supabase siguen funcionando igual que antes del cambio.
- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] Los otros 4 juegos (asteroides, tetris, arkanoid, snake) no tienen cambios de código ni de comportamiento.

## Decisiones tomadas y descartadas

- **Sí:** overlay dev-only dibujado directamente en el canvas, igual técnica que `drawHud` — no agrega dependencias ni componentes nuevos, y por estar detrás de `process.env.NODE_ENV === "development"` el bundler de Next.js lo elimina del build de producción.
- **Sí:** activación automática por `NODE_ENV`, sin query param — no requiere pasos manuales extra para verificar el fix durante el desarrollo.
- **Sí:** el overlay se queda de forma permanente en el código (no se retira al cerrar el spec) — sirve como herramienta de diagnóstico ante futuras regresiones de performance en este juego.
- **Sí:** umbral de aceptación (FPS promedio ≥55, piso ≥30) medido con el propio overlay del juego, no con una herramienta externa — es lo que percibe un jugador real y es reproducible por cualquiera sin instrumentación adicional.
- **Sí:** alcance limitado a Frogger — es el único motor que no sigue el patrón `lib/games/registry.ts` (ver `CLAUDE.md`); antes de generalizar cualquier fix a los otros 4 juegos conviene confirmar primero si el problema es propio de esta implementación.
- **Pendiente (se resuelve en el paso 2 del plan, no antes de tener el profile):** técnica exacta para reducir el costo de `shadowBlur`/`save`-`restore` en `drawEntity`/`drawGoals`/`drawFrog`. Razón: la causa exacta se confirma con Chrome DevTools Performance, no se asume de antemano — la hipótesis de la sección de Alcance es el punto de partida, no la conclusión.
- **No:** migrar Frogger al patrón `registry`/`GameEngineHandle` en este spec — cambio de arquitectura mayor, ajeno al problema puntual de rendimiento.
- **No:** overlay de FPS reutilizable para los otros juegos — fuera de alcance mientras no haya evidencia de que el problema es compartido; evita construir algo genérico sin necesidad confirmada.
- **No:** quitar o reducir el `glow` del skin `neon` como forma de arreglar el performance — el criterio explícito es no cambiar el aspecto visual de ningún skin.

## Riesgos

| Riesgo                                                                                                   | Mitigación                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El profiling no revela una causa única, o el fix no alcanza el umbral (≥55 avg / ≥30 piso) en algún skin | Documentar el hallazgo real igual (aunque sea parcial); no bajar el umbral por cuenta propia, consultarlo con el usuario antes de cerrar el spec como cumplido |
| El fix de canvas introduce una regresión visual sutil (sombra, contorno, alpha)                          | Captura de pantalla manual antes/después por skin durante el paso 3, comparando contra el estado actual                                                        |
| El overlay de FPS en sí mismo agrega overhead que distorsiona la medición                                | Mantener el overlay simple (un solo `fillText`, sin gráficos ni historial dibujado), coherente con el resto de `drawHud`                                       |

## Qué **no** incluye este spec

- Cambios en asteroides, tetris, arkanoid o snake.
- Migrar Frogger al patrón `lib/games/registry.ts`.
- Cambios visuales en cualquier skin.
- Tests automatizados de performance.
- Soporte táctil/mobile para Frogger.

Cada uno de esos, si se necesita, va en su propio spec.
