# Skins por juego — Estado

> Mantenido por el agente `skin-designer`. Un juego por corrida. No editar manualmente sin avisar al agente.

## Estado por juego

| Juego     | classic | retro | neon | Skins extra | Dark-mode revisado | Última actualización |
| --------- | ------- | ----- | ---- | ----------- | ------------------ | -------------------- |
| tetris    | —       | —     | —    | —           | —                  | —                    |
| arkanoid  | ✅      | ✅    | ✅   | —           | sí                 | 2026-09-06           |
| asteroids | —       | —     | —    | —           | —                  | —                    |
| snake     | ✅      | ✅    | ✅   | —           | sí                 | 2026-09-06           |
| frogger   | ✅      | ✅    | ✅   | —           | sí                 | 2026-09-08           |

Leyenda: `✅` aplicado y verificado · `🟡` en progreso · `—` pendiente

## Notas de arquitectura

- **frogger**: excepción deliberada (spec `specs/game-jam/frogger/01-frogger-core.md`) — no usa `lib/games/<juego>/engine.ts` ni `lib/games/registry.ts`. Vive entero en `components/games/FroggerGame.tsx` (tabla `SKINS`, prop `skinKey`, `skinKeyRef` sincronizado por `useEffect` como `pausedRef`) + `components/games/FroggerPlayer.tsx` (selector de skins propio, no pasa por `GamePlayer.tsx`).
