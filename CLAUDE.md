@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault — a platform to play games online and compete for high scores (per README.md, in Spanish). The project is currently a fresh `create-next-app` scaffold with no custom app code yet — `app/page.tsx` and `app/layout.tsx` are still the default template.

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`, using `eslint-config-next`'s `core-web-vitals` + `typescript` rule sets)

There is no test runner configured yet.

## Stack

- Next.js 16.3.4 (App Router only — no `pages/` directory), React 19.2, TypeScript (strict mode), Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in `app/globals.css`, no `tailwind.config.*` file)
- Path alias `@/*` maps to the repo root (see `tsconfig.json`)

**This Next.js version has breaking changes from what training data assumes.** Before writing framework-adjacent code (routing, data fetching, layouts, config), check `node_modules/next/dist/docs/` for the current API — e.g. route props are now typed generics like `LayoutProps<"/">` / `PageProps<"/">` (see `app/layout.tsx`) rather than hand-written prop interfaces.

## Spec-driven workflow

Per README.md, this project follows spec-driven development using the `/spec` and `/spec-impl` commands from the [fernando-skills](https://github.com/Klerith/fernando-skills) skill pack (installed via `npx skills@latest add Klerith/fernando-skills`). If those skills are present, prefer writing a spec first and implementing from it rather than jumping straight to code.
