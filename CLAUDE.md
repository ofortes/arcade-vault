@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault — a platform to play games online and compete for high scores (per README.md, in Spanish).

There is no test runner configured yet; verification is manual (`npm run build` + playing a full match) per spec.

## Estado actual (specs implementadas, 01–09)

- **01 MVP visual** — scaffold inicial de UI.
- **02 Home/Landing** — `components/HomeLanding.tsx` (Server Component en `app/page.tsx`).
- **03 Acerca de**.
- **04 Integración Supabase** — `lib/supabase/`, `lib/games.ts`; juegos y scores persistidos en base de datos real.
- **05 Juego Asteroides** — `lib/games/asteroides/engine.ts`, `components/GamePlayer.tsx`, guardado real de score al terminar partida.
- **06 Leaderboard y tabla de juegos** — Salón de la Fama y biblioteca alimentados con queries reales a Supabase (`HallOfFameClient.tsx`, `BibliotecaClient.tsx`).
- **07 Tetris** — `lib/games/tetris/engine.ts`, HUD condicional ("Líneas") en `GamePlayer.tsx`.
- **08 Arkanoid** — `lib/games/arkanoid/engine.ts` + `spritesheet.ts`, assets/sonidos en `public/`, ficha insertada en tabla `games`.
- **09 Snake** — `lib/games/snake/engine.ts` + `sprites.ts` (atlas `fruits.png` en `public/sprites/snake/`), portada `.cover-snake-real` en `globals.css`.

Todos los motores de juego se registran en `lib/games/registry.ts` (`gameEngines`).

Rutas clave: `/juegos` (biblioteca), `/juegos/[id]` (ficha), `/juegos/[id]/jugar` (reproductor), Salón de la Fama.

## Skills

Usa siempre /front-design para hacer interfaz de usuario.

## Agentes

- **game-planner** (`.claude/agents/game-planner.md`) — analiza el catálogo actual (`lib/games-types.ts`, `lib/games/registry.ts`) y decide qué juego(s) nuevos encajarían con la plataforma. No escribe specs ni código: solo propone ideas justificadas y las guarda en `references/game-suggestions-todo.md` para no repetirlas en futuras invocaciones. Invocalo cuando quieras evaluar el próximo juego a portar antes de correr `/add-game`.
- **game-jam** (`.claude/agents/game-jam.md`) — recibe un tema de game jam y genera tres specs completas (formato de `specs/07-tetris-game.md`/`08-arkanoid-game.md`/`09-snake-game.md`) en `specs/game-jam/[game-id]/spec.md`, con `Estado: Propuesto`. No implementa código ni ejecuta SQL. Úsalo para explorar rápido varias ideas de juego a partir de un tema antes de decidir cuál implementar.
- **skin-designer** (`.claude/agents/skin-designer.md`) — aplica los 3 skins canónicos (classic, retro, neon) a un juego concreto indicado por el usuario. Trabaja un juego a la vez, implementa directamente sobre `components/games/<Juego>.tsx` siguiendo el patrón de `TetrisGame`, y registra el progreso en `references/game-with-themes.md`. Úsalo cuando pidas "aplica skins a <juego>" o similar.

## Stack

- Next.js 16.3.4 (App Router only — no `pages/` directory), React 19.2, TypeScript (strict mode), Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in `app/globals.css`, no `tailwind.config.*` file)
- Path alias `@/*` maps to the repo root (see `tsconfig.json`)

**This Next.js version has breaking changes from what training data assumes.** Before writing framework-adjacent code (routing, data fetching, layouts, config), check `node_modules/next/dist/docs/` for the current API — e.g. route props are now typed generics like `LayoutProps<"/">` / `PageProps<"/">` (see `app/layout.tsx`) rather than hand-written prop interfaces.

## Spec-driven workflow

Per README.md, this project follows spec-driven development using the `/spec` and `/spec-impl` commands from the [fernando-skills](https://github.com/Klerith/fernando-skills) skill pack (installed via `npx skills@latest add Klerith/fernando-skills`). If those skills are present, prefer writing a spec first and implementing from it rather than jumping straight to code.
