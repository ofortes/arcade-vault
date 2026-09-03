# 06 · Leaderboard y tabla de juegos en Supabase

- **Estado:** Aprobado
- **Depende de:** SPEC 04 (integración de Supabase), SPEC 05 (asteroides jugable)
- **Fecha:** 2026-09-03
- **Objetivo:** Crear las tablas `games` y `scores` en Supabase, migrar `lib/games.ts` para que lea de `games` en vez de un array estático, y reemplazar el leaderboard falso (`seededScores`) por puntajes reales insertados desde "asteroides" (el único juego con fin de partida real).

## Alcance

**Incluye:**

- Migración de Supabase que crea la tabla `games` (una fila por juego, semilla = los 8 juegos actuales de `lib/games.ts`) y la tabla `scores` (una fila por partida terminada), con RLS habilitado.
- `lib/games.ts` deja de exportar el array `GAMES`; expone `getGames()` y `getGame(id)` que consultan la tabla `games` vía `lib/supabase/server.ts`. Los tipos `Game`, `GameCategory`, `GameColor`, `CATS` se conservan.
- Reemplazo de **todas** las pantallas que hoy importan `GAMES` de `lib/games.ts`: `/` (home), `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon-de-la-fama`. Cada una pasa a obtener los juegos desde Supabase.
- `components/GamePlayer.tsx`: al terminar una partida de "asteroides", el puntaje final se inserta como fila real en `scores` (Supabase, vía `lib/supabase/client.ts`) en vez de `saveScore()` de `lib/session.ts`.
- `/salon-de-la-fama` y el aside "MEJORES PUNTUACIONES" de `/juegos/[id]` muestran puntajes reales de `scores` (top real por juego, orden descendente). Para los 7 juegos que no son "asteroides" esto se traduce en una lista vacía con un estado "AÚN SIN PUNTAJES" — es el comportamiento esperado y correcto, no un bug.
- `game.best` (mejor puntaje mostrado en `GameCard` y en el detalle) se calcula así: para "asteroides", `MAX(score)` real de `scores`; para los otros 7 juegos, el valor fijo sembrado en `games` (igual que hoy).
- Eliminar `lib/scores.ts` (`seededScores`/`PLAYERS`) y `saveScore()`/`SavedScoreEntry` de `lib/session.ts` por quedar sin uso.

**No incluye:**

- Autenticación real (Supabase Auth). Los inserts a `scores` son públicos vía anon key, identificados solo por un nombre de texto libre (el mock de `lib/session.ts` o las iniciales del modal de fin de partida) — decisión explícita del usuario, sin RLS por usuario.
- Migrar los otros 7 juegos mockup a fin de partida real ni hacer que su botón "SIMULAR FIN DE PARTIDA" inserte filas en `scores`. Siguen siendo mockup sin cambios de comportamiento.
- `game.plays` (cantidad de partidas): sigue siendo un valor fijo sembrado en `games`, sin tracking real de partidas jugadas.
- `av_scores` como fallback o dato mezclado: `seededScores()` no se usa ni como relleno visual una vez reemplazado.
- Cualquier UI nueva de administración para editar la tabla `games` (alta/baja/modificación de juegos) — se sigue sembrando solo vía migración.

## Modelo de datos

Dos tablas nuevas en Supabase (proyecto `qcrfxyeuwtikttfdaxph`, ya conectado desde el spec 04):

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best integer not null default 0,
  plays text not null default '0'
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table games enable row level security;
alter table scores enable row level security;

create policy "games are publicly readable" on games for select using (true);
create policy "scores are publicly readable" on scores for select using (true);
create policy "anyone can insert a score" on scores for insert with check (true);
```

`games` se siembra en la misma migración con las 8 filas que hoy están hardcodeadas en `lib/games.ts` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `asteroides`, y el octavo juego restante del array actual).

`lib/games.ts` conserva las interfaces TypeScript (`Game`, `GameCategory`, `GameColor`) y `CATS`, y agrega:

```ts
// lib/games.ts
export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
```

Ambas usan `createClient()` de `lib/supabase/server.ts`. Para "asteroides", `getGames()`/`getGame()` sobrescriben `best` con el resultado de `select max(score) from scores where game_id = 'asteroides'` (si no hay filas, se conserva el valor sembrado en `games`).

## Plan de implementación

1. **Migración de base de datos.** Vía `mcp__supabase__apply_migration`, crear `games` y `scores` con el esquema de arriba, habilitar RLS con las tres políticas, y sembrar `games` con los 8 juegos actuales de `lib/games.ts`. Verificar con `mcp__supabase__list_tables` que ambas tablas y sus políticas quedaron creadas.
2. **`lib/games.ts` real.** Quitar el array `GAMES`; agregar `getGames()`/`getGame(id)` usando `lib/supabase/server.ts`, con el cálculo especial de `best` para "asteroides" descrito arriba. Conservar `Game`, `GameCategory`, `GameColor`, `CATS`.
3. **Limpieza de lo que queda sin uso.** Eliminar `lib/scores.ts`. En `lib/session.ts`, quitar `saveScore()` y la interfaz `SavedScoreEntry` (conservar `getUser`/`setUser`, que no cambian).
4. **Home (`/`).** Extraer el contenido actual de `app/page.tsx` (con su `"use client"`, `useReveal`, etc.) a `components/HomeLanding.tsx`, recibiendo `games: Game[]` como prop en vez de importar `GAMES`. `app/page.tsx` pasa a ser un Server Component `async` que llama a `getGames()` y renderiza `<HomeLanding games={games} />`.
5. **Biblioteca (`/biblioteca`).** Mismo patrón: extraer el contenido actual a `components/BibliotecaClient.tsx` (recibe `games: Game[]`), `app/biblioteca/page.tsx` pasa a ser Server Component `async` que llama a `getGames()`.
6. **Salón de la Fama (`/salon-de-la-fama`).** Mismo patrón: extraer a `components/HallOfFameClient.tsx` (recibe `games: Game[]` y `scoresByGame: Record<string, ScoreRow[]>` ya resueltos). `app/salon-de-la-fama/page.tsx` pasa a ser Server Component `async` que llama a `getGames()` y, para cada juego, hace `select name, score, created_at from scores where game_id = ? order by score desc limit 12`. El componente cliente arma el podio (top 3) y la tabla a partir de los datos reales recibidos; si un juego no tiene filas, muestra el estado "AÚN SIN PUNTAJES" en vez del podio/tabla.
7. **Detalle (`/juegos/[id]`).** Cambiar `GAMES.find(...)` por `await getGame(id)`; reemplazar `seededScores(...)` por una consulta real (`select name, score, created_at from scores where game_id = id order by score desc limit 10`) con el mismo estado vacío que el paso anterior si no hay filas.
8. **Reproductor (`/juegos/[id]/jugar`).** Cambiar `GAMES.find(...)` por `await getGame(id)`.
9. **Guardado real en `GamePlayer.tsx`.** Al confirmar el modal de fin de partida para "asteroides", reemplazar la llamada a `saveScore()` por un insert real: `createClient().from("scores").insert({ game_id: game.id, name, score: finalScore })` usando `lib/supabase/client.ts`.
10. **Verificación.** `npm run build` sin errores de TypeScript/lint; recorrido manual completo (ver criterios de aceptación).

Cada paso deja la app compilando (`npm run build`) y, salvo el paso 1 (que solo toca la base de datos), sin romper ninguna pantalla existente.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `mcp__supabase__list_tables` muestra `games` (8 filas) y `scores` (0 filas iniciales), ambas con RLS habilitado.
- [ ] `/`, `/biblioteca`, `/juegos/[id]` y `/salon-de-la-fama` siguen mostrando los 8 juegos, ahora leídos desde Supabase (no desde un array en el código) — verificable comentando/renombrando temporalmente `lib/games.ts` y confirmando que las pantallas dejan de compilar por falta del import, o inspeccionando que ya no existe el array `GAMES`.
- [ ] Jugar una partida completa de "asteroides" hasta perder las 3 vidas y guardar con iniciales inserta una fila real en la tabla `scores` de Supabase (verificable con `mcp__supabase__execute_sql` o en el dashboard).
- [ ] Tras guardar ese puntaje, `/salon-de-la-fama` (tab "ASTEROIDES") y el aside de `/juegos/asteroides` muestran esa fila real, con el nombre e importe correctos.
- [ ] `/salon-de-la-fama` y `/juegos/[id]` para los otros 7 juegos (sin partidas reales) muestran el estado "AÚN SIN PUNTAJES" en vez de datos inventados.
- [ ] `GameCard` de "asteroides" en `/biblioteca` muestra como "MEJOR PUNTUACIÓN" el `MAX(score)` real una vez que existe al menos un puntaje guardado.
- [ ] Los otros 7 juegos siguen mostrando su `best`/`plays` fijo sembrado, sin cambios visuales.
- [ ] `lib/scores.ts` ya no existe; `lib/session.ts` ya no exporta `saveScore` ni `SavedScoreEntry`.
- [ ] Recargar cualquiera de las 5 pantallas migradas no muestra errores en consola ni pantallas en blanco.

## Decisiones tomadas y descartadas

- **Reemplazo total de `GAMES` en las 5 pantallas, en vez de solo sembrar la tabla sin conectar nada**: decisión explícita del usuario — a diferencia del spec 04 (que dejó la infraestructura sin conectar a propósito), acá el pedido es que el leaderboard y la tabla de juegos queden realmente funcionando.
- **Sin autenticación real; inserts públicos a `scores` vía anon key**: decisión explícita del usuario para no bloquear este spec detrás de un spec de auth. Riesgo aceptado y documentado abajo.
- **Solo "asteroides" inserta puntajes reales**: es el único juego con fin de partida real (spec 05); portar los otros 7 juegos mockup a partidas reales es trabajo de specs futuros independientes.
- **Leaderboards vacíos para los 7 juegos mockup, sin `seededScores` como relleno**: decisión explícita del usuario — mostrar datos falsos junto a datos reales sería engañoso; se prefiere un estado vacío honesto.
- **`best` real solo para "asteroides" vía `MAX(score)`, resto fijo en `games`**: decisión explícita del usuario — evita inventar partidas para los 7 juegos que no las tienen, y mantiene el cálculo simple.
- **`plays` se mantiene fijo (sin tracking real)**: no hay ningún flujo hoy que cuente partidas iniciadas; instrumentarlo sería alcance no pedido en este spec.
- **`lib/scores.ts` y `saveScore()`/`SavedScoreEntry` se eliminan en vez de dejarse sin uso**: `av_scores` de localStorage no tiene ningún lector en el código actual (se verificó con grep); mantener código muerto no aporta valor y el proyecto prefiere no dejar abstracciones sin uso.
- **Páginas `"use client"` (home, biblioteca, salón de la fama) se dividen en Server Component + componente cliente, en vez de fetchear desde el cliente con `lib/supabase/client.ts`**: permite usar `lib/supabase/server.ts` (ya existente desde el spec 04) de forma consistente para lecturas, y evita un parpadeo de carga (loading state) en la carga inicial de cada pantalla.

## Riesgos identificados

- **Spam de puntajes falsos**: al no haber autenticación ni límite de tasa, cualquiera con la anon key puede insertar filas arbitrarias en `scores` (incluyendo puntajes absurdamente altos) directamente contra la API de Supabase, sin pasar por el juego. Aceptado por el usuario como parte de no requerir auth real todavía; quedaría mitigado en un spec futuro de autenticación real y/o validación server-side del puntaje.
- **Migración de 5 pantallas de cliente a Server Component + cliente**: es el cambio de mayor superficie del spec; un error de props entre el Server Component y su componente cliente extraído (`HomeLanding`, `BibliotecaClient`, `HallOfFameClient`) rompería la pantalla completa. Se mitiga verificando cada pantalla individualmente en el paso de verificación (paso 10).
