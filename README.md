## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Estado actual

- Home, Biblioteca de juegos, Acerca de, Salón de la Fama y ficha/reproductor de juego (`/juegos/[id]` y `/juegos/[id]/jugar`).
- Integración con Supabase: juegos y puntuaciones (scores) persistidos en base de datos real (`lib/supabase/`, `lib/games.ts`).
- Primer juego jugable: **Asteroides** (`lib/games/asteroides/engine.ts`, `components/GamePlayer.tsx`), con guardado real de puntuación al finalizar la partida.
- Salón de la Fama y tabla de juegos alimentados con datos reales de Supabase (spec 06).

## Specs implementadas

1.  MVP visual · 02. Home/Landing · 03. Acerca de · 04. Integración Supabase · 05. Juego Asteroides · 06. Leaderboard y tabla de juegos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```
