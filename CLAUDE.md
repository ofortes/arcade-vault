@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault — a platform to play games online and compete for high scores (per README.md, in Spanish).

There is no test runner configured yet; verification is manual (`npm run build` + playing a full match) per spec.

## Estado actual (specs implementadas, 01–11, 13 + game-jam/frogger)

- **01 MVP visual** — scaffold inicial de UI.
- **02 Home/Landing** — `components/HomeLanding.tsx` (Server Component en `app/page.tsx`).
- **03 Acerca de**.
- **04 Integración Supabase** — `lib/supabase/`, `lib/games.ts`; juegos y scores persistidos en base de datos real.
- **05 Juego Asteroides** — `lib/games/asteroides/engine.ts`, `components/GamePlayer.tsx`, guardado real de score al terminar partida.
- **06 Leaderboard y tabla de juegos** — Salón de la Fama y biblioteca alimentados con queries reales a Supabase (`HallOfFameClient.tsx`, `BibliotecaClient.tsx`).
- **07 Tetris** — `lib/games/tetris/engine.ts`, HUD condicional ("Líneas") en `GamePlayer.tsx`.
- **08 Arkanoid** — `lib/games/arkanoid/engine.ts` + `spritesheet.ts`, assets/sonidos en `public/`, ficha insertada en tabla `games`.
- **09 Snake** — `lib/games/snake/engine.ts` + `sprites.ts` (atlas `fruits.png` en `public/sprites/snake/`), portada `.cover-snake-real` en `globals.css`.
- **Frogger** (spec `specs/game-jam/frogger/01-frogger-core.md`, salida del agente game-jam) — **NO sigue el patrón registry**: vive en `components/games/FroggerGame.tsx` + `FroggerPlayer.tsx`, ruta `app/juegos/frogger/jugar/page.tsx`, sin entrada en `lib/games/registry.ts`. Ojo al tocarlo o al usarlo de referencia para nuevos juegos.
- **10 Performance en Frogger** — fix de `ctx.save()`/`ctx.restore()` y `ctx.shadowBlur`/`ctx.shadowColor` aplicados por entidad por frame en `FroggerGame.tsx`, más overlay de FPS dev-only. Patrón de referencia para el agente `game-performance-booster`.
- **11 Densidad de tráfico en Frogger** — ajuste de constantes en `buildRoadLane()`/`buildLanes()` de `FroggerGame.tsx` para que la partida sea superable (menos camiones, huecos mayores, velocidad amortiguada en niveles 1-3).
- **13 Arkanoid: pantalla y nitidez de canvas** — `lib/games/arkanoid/engine.ts` + `spritesheet.ts`: soporte DPR (`ctx.scale`), `imageSmoothingEnabled = false`, sprites a factores de escala enteros, `screen: { aspectRatio, maxWidth }` propio en `registry.ts` (consumido genéricamente por `GamePlayer.tsx`). Implementación de referencia para el agente `game-ui-context`.
- **12 HUD: stat META, skin en dropdown, botón FIN** — **Estado: Aprobado, sin implementar todavía** (no confundir con "implementada"; verificar en `lib/games/registry.ts` antes de asumir que `metaLabel`/`forceEnd` existen).
- **specs/game-jam/** (`deposito-express`, `empuje-de-combate`, `sokoban-expres`) — specs generadas por el agente `game-jam`, **Estado: Propuesto**, sin implementar.

Los motores de juego "clásicos" (asteroides/tetris/arkanoid/snake) se registran en `lib/games/registry.ts` (`gameEngines`); Frogger es la excepción, ver arriba.

Rutas clave: `/juegos` (biblioteca), `/juegos/[id]` (ficha), `/juegos/[id]/jugar` (reproductor), Salón de la Fama.

## Skills

Usa siempre /front-design para hacer interfaz de usuario.

## Agentes

- **game-planner** (`.claude/agents/game-planner.md`) — analiza el catálogo actual (`lib/games-types.ts`, `lib/games/registry.ts`) y decide qué juego(s) nuevos encajarían con la plataforma. No escribe specs ni código: solo propone ideas justificadas y las guarda en `references/game-suggestions-todo.md` para no repetirlas en futuras invocaciones. Invocalo cuando quieras evaluar el próximo juego a portar antes de correr `/add-game`.
- **game-jam** (`.claude/agents/game-jam.md`) — recibe un tema de game jam y genera tres specs completas (formato de `specs/07-tetris-game.md`/`08-arkanoid-game.md`/`09-snake-game.md`) en `specs/game-jam/[game-id]/spec.md`, con `Estado: Propuesto`. No implementa código ni ejecuta SQL. Úsalo para explorar rápido varias ideas de juego a partir de un tema antes de decidir cuál implementar.
- **skin-designer** (`.claude/agents/skin-designer.md`) — aplica los 3 skins canónicos (classic, retro, neon) a un juego concreto indicado por el usuario. Trabaja un juego a la vez, implementa directamente sobre `components/games/<Juego>.tsx` siguiendo el patrón de `TetrisGame`, y registra el progreso en `references/game-with-themes.md`. Úsalo cuando pidas "aplica skins a <juego>" o similar.
- **mobile-porter** (`.claude/agents/mobile-porter.md`) — cabla controles táctiles (`MobileGamepad`) en la play-page de un juego. **Desactualizado/no ejecutable tal cual**: referencia `specs/10-mobile-touch-controls.md`, `components/MobileGamepad.tsx` y rutas `app/games/<juego>/play/page.tsx` que no existen en este repo (las rutas reales son `app/juegos/[id]/jugar`). Revisar/actualizar el agente antes de invocarlo.
- **game-performance-booster** (`.claude/agents/game-performance-booster.md`) — audita y corrige un motor de juego (uno por corrida) para que no arrastre los problemas de canvas ya diagnosticados y corregidos en Frogger (`specs/10-frogger-performance.md`): `ctx.save()`/`ctx.restore()` y `ctx.shadowBlur`/`ctx.shadowColor` aplicados por entidad por frame, y falta de overlay de FPS dev-only. No cambia el aspecto visual de los skins ni la lógica del juego. Registra el progreso en `references/game-performance-status.md`. Úsalo cuando pidas "revisa el performance de <juego>" o similar.
- **game-ui-context** (`.claude/agents/game-ui-context.md`) — aplica a un juego concreto las técnicas de tamaño/nitidez de canvas validadas en Arkanoid (`specs/13-arkanoid-canvas-tamano-y-nitidez.md`): DPR + `ctx.scale`, `imageSmoothingEnabled = false`, coordenadas de mouse ajustadas a DPR, factores de escala enteros de sprites y, opcional, `screen` (aspect-ratio/maxWidth) propio en `registry.ts`. Un juego por corrida, exige juego objetivo explícito. Registra el progreso en `references/game-canvas-sharpness-status.md`. Úsalo cuando pidas "aplica el fix de nitidez de arkanoid a <juego>" o similar.

## Stack

- Next.js 16.3.4 (App Router only — no `pages/` directory), React 19.2, TypeScript (strict mode), Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in `app/globals.css`, no `tailwind.config.*` file)
- Path alias `@/*` maps to the repo root (see `tsconfig.json`)

**This Next.js version has breaking changes from what training data assumes.** Before writing framework-adjacent code (routing, data fetching, layouts, config), check `node_modules/next/dist/docs/` for the current API — e.g. route props are now typed generics like `LayoutProps<"/">` / `PageProps<"/">` (see `app/layout.tsx`) rather than hand-written prop interfaces.

## Spec-driven workflow

Per README.md, this project follows spec-driven development using the `/spec` and `/spec-impl` commands from the [fernando-skills](https://github.com/Klerith/fernando-skills) skill pack (installed via `npx skills@latest add Klerith/fernando-skills`). If those skills are present, prefer writing a spec first and implementing from it rather than jumping straight to code.
