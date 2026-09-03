# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids arcade clone, pure HTML5 canvas. No build tools, no bundler, no dependencies, no package.json. Entire game logic lives in one file: `game.js`. Loaded directly by `index.html` via `<script src="game.js">`.

## Running

No build/lint/test tooling exists. Open `index.html` directly in browser, or serve locally:

```bash
npx serve .
```

Then visit `http://localhost:3000`.

There is no test suite. Verify changes by loading the page in a browser and playing.

## Architecture

Single-file game (`game.js`), structured as:

- **Input**: `keys`/`justPressed` maps populated by keydown/keyup listeners. `pressed(code)` consumes a one-shot press (used for shooting/restart); `keys[code]` gives held-down state (used for rotation/thrust).
- **Entity classes**: `Bullet`, `Asteroid`, `Ship`, `Particle` — each owns its own `update(dt)` and `draw()`. No shared base class or ECS; the main loop just calls these per-array.
- **World wrap**: space is toroidal — `wrap(v, max)` wraps position on both axes for ship, asteroids, and bullets. `W`/`H` (800×600) are the fixed canvas dimensions, hardcoded (not responsive).
- **Asteroid sizing**: size is an integer 3→2→1 (large→small); `RADII`, `SPEEDS`, `POINTS` arrays are indexed by size. `split()` produces two smaller asteroids on destruction; size 1 has no split.
- **Global mutable state**: `ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state` are module-level `let` bindings, reset in `initGame()`. `state` is one of `'playing' | 'dead' | 'gameover'` and gates behavior in `update()`.
- **Game loop**: `requestAnimationFrame(loop)` computes `dt` (clamped to 0.05s max) and calls `update(dt)` then `draw()` each frame. Collision detection (bullet-vs-asteroid, ship-vs-asteroid) happens inline inside `update()`, not in a separate system.
- **Ship death/respawn**: `killShip()` decrements lives and either ends the game (`gameover`) or enters a timed `dead` state (`deadTimer`) before respawning with temporary invincibility (blinking sprite).

Text (HUD, game over) is in Spanish, matching `index.html`'s `lang="es"`. Keep new UI text consistent with that.
