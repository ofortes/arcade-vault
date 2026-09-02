# 01 · MVP visual de Arcade Vault

- **Estado:** Aprobado
- **Depende de:** (ninguno)
- **Fecha:** 2026-09-02
- **Objetivo:** Portar las 5 pantallas visuales de `references/templates/` (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama) a la app Next.js del proyecto, con navegación, datos de ejemplo y persistencia local funcionando, sin implementar lógica de ningún juego real.

## Alcance

**Incluye:**

- 5 rutas de Next.js (App Router), una por pantalla:
  - `/` → Biblioteca (grid de juegos, búsqueda, filtro por categoría)
  - `/juegos/[id]` → Detalle del juego (info, tabla de mejores puntuaciones)
  - `/juegos/[id]/jugar` → Reproductor (maqueta estática del HUD/CRT de juego)
  - `/auth` → Inicio de sesión / registro
  - `/salon-de-la-fama` → Salón de la Fama (podio + tabla, con pestañas por juego)
- Componente de navegación (`Nav`) con estado de sesión, menú móvil y contador de créditos, presente en todas las rutas vía `app/layout.tsx`.
- Datos de ejemplo (`GAMES`, `CATS`, `PLAYERS`, generador `seededScores`) portados a TypeScript, tipados, en un módulo compartido.
- Sesión de usuario simulada: login/registro sin backend (acepta cualquier dato, igual que `auth.jsx`), guardada en `localStorage` bajo la clave `av_user`. Incluye opción "jugar como invitado".
- Guardado de puntuación simulado desde el modal de fin de partida del Reproductor: persiste en `localStorage` bajo la clave `av_scores`, igual que `app.jsx`.
- Sistema visual retro-neón: tema oscuro, tipografías `Press Start 2P` / `JetBrains Mono` / `Courier Prime` vía `next/font/google`, fondo con grid en perspectiva + scanlines, portadas de juego generadas por CSS (gradientes, sin imágenes).
- Botón "Simular fin de partida" en el Reproductor que abre el modal de resultado final (con datos de ejemplo fijos) para poder ver ese estado sin lógica de juego real.

**No incluye:**

- Ningún juego jugable real (Bloque Buster, Caída, Serpentina, etc.) ni motor/loop de juego.
- Backend, API routes, base de datos o autenticación real (OAuth de Google/GitHub son botones decorativos, no funcionales).
- Validación de formulario más allá de HTML nativo (campos no vacíos por `required`, sin reglas de negocio).
- Multijugador, chat, sistema de créditos funcional (el contador "CRÉDITOS · 03" es decorativo, como en el template).
- Tests automatizados (no hay test runner configurado en el proyecto).
- Responsive/accesibilidad más allá de lo que ya trae el template de referencia.

## Modelo de datos

Todo dato es mock, en memoria/localStorage — sin base de datos ni API.

**`lib/games.ts`** (o ubicación equivalente bajo `lib/`):

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // nombre de clase CSS .cover-*
  color: GameColor;
  best: number;
  plays: string;
}

export const GAMES: Game[]; // los 8 juegos de data.jsx, portados literal
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
```

**`lib/scores.ts`**:

```ts
export const PLAYERS: string[]; // nombres de jugadores de ejemplo, de data.jsx

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // DD/MM/AAAA
}

export function seededScores(seed: number, count?: number): ScoreRow[]; // misma función determinista de data.jsx
```

**`lib/session.ts`** (persistencia en `localStorage`):

```ts
export interface SessionUser {
  name: string;
}

export function getUser(): SessionUser | null; // lee av_user
export function setUser(u: SessionUser | null): void; // escribe/borra av_user

export interface SavedScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}
export function saveScore(entry: Omit<SavedScoreEntry, "at">): void; // append a av_scores
```

Claves de `localStorage` idénticas al template (`av_user`, `av_scores`) para mantener compatibilidad de comportamiento.

## Plan de implementación

1. **Fuentes y tema base.** Configurar `next/font/google` para Press Start 2P, JetBrains Mono y Courier Prime en `app/layout.tsx`; portar `styles.css` a `app/globals.css` adaptando selectores globales (`.av-bg`, `.av-noise`, variables `:root`) sin romper el reset de Tailwind v4 existente. La app sigue arrancando (`npm run dev`) sin pantallas nuevas todavía.
2. **Datos compartidos.** Crear `lib/games.ts`, `lib/scores.ts`, `lib/session.ts` con los tipos y datos anteriores, portados literalmente desde `data.jsx` y la lógica de `localStorage` de `app.jsx`.
3. **Layout y navegación.** Crear el componente `Nav` (cliente) en `app/layout.tsx` — logo, links Biblioteca/Salón de la Fama, contador de créditos, botón de sesión (Iniciar sesión / nombre de usuario), menú móvil — leyendo la sesión desde `lib/session.ts`. La app renderiza el layout con nav funcional en cualquier ruta (aunque las rutas aún no existan, se puede verificar en `/`).
4. **Biblioteca (`/`).** Página con hero, buscador, chips de categoría y grid de `GameCard`, filtrando `GAMES` por texto/categoría. Cada card navega a `/juegos/[id]`. Estado vacío "NO HAY RESULTADOS" cuando el filtro no matchea.
5. **Detalle (`/juegos/[id]`).** Página con portada, tags, descripción, stat-strip (partidas, mejor global, dificultad), botones "Jugar ahora" → `/juegos/[id]/jugar` y "Volver al vault" → `/`, y tabla de mejores puntuaciones vía `seededScores`. `id` inválido → `notFound()`.
6. **Auth (`/auth`).** Formulario con tabs Iniciar sesión / Crear cuenta, campos usuario/email/contraseña (email solo en registro), botón "Jugar como invitado", botones sociales decorativos. Al enviar, guarda sesión vía `lib/session.ts` y redirige a `/`.
7. **Reproductor (`/juegos/[id]/jugar`).** Maqueta estática: HUD con jugador/puntuación/vidas/nivel fijos, marco CRT con escena de juego estática (sin animación de puntuación), botones Pausa/Fin/Salir. Botón "Simular fin de partida" (o el botón "Fin") abre el modal de resultado con puntuación de ejemplo fija, campo de iniciales y botón "Guardar puntuación" que persiste vía `lib/session.ts::saveScore` y muestra el estado "guardado". Botones "Jugar de nuevo" (reinicia la maqueta) y "Volver al vault".
8. **Salón de la Fama (`/salon-de-la-fama`).** Pestañas por juego (`GAMES`), podio top 3 y tabla completa vía `seededScores`, fila destacada "tu mejor marca" si hay sesión iniciada. Botón "Volver a la biblioteca" → `/`.
9. **Cierre visual.** Footer global en el layout ("© 2026 ARCADE VAULT..."), revisar transición entre rutas (fade-in) y responsive básico igual que el template en las 5 pantallas.

Cada paso deja la app arrancable con `npm run dev` y sin errores de TypeScript/build.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] Las 5 rutas (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon-de-la-fama`) renderizan y son navegables entre sí mediante los controles de UI (nav, botones, cards) sin recargar la página.
- [ ] La Biblioteca filtra correctamente por texto de búsqueda y por categoría, y muestra el estado "NO HAY RESULTADOS" cuando corresponde.
- [ ] El Detalle de un `id` inexistente muestra un 404 (`notFound()`), no una pantalla en blanco o error no controlado.
- [ ] Iniciar sesión (con cualquier usuario) o entrar como invitado actualiza el nav (nombre de usuario visible / botón de sesión) y persiste en `localStorage` (`av_user`) tras recargar la página.
- [ ] Cerrar sesión limpia `av_user` de `localStorage` y el nav vuelve a mostrar "Iniciar sesión".
- [ ] En el Reproductor, guardar una puntuación desde el modal de fin de partida añade una entrada a `localStorage` (`av_scores`) y la UI muestra el estado "guardado".
- [ ] El Reproductor no incrementa puntuación, nivel ni vidas automáticamente — todos los valores del HUD son estáticos hasta que el usuario interactúa explícitamente (pausa, fin, reinicio).
- [ ] El Salón de la Fama cambia de pestaña por juego y muestra podio + tabla coherentes con `seededScores`; con sesión iniciada aparece la fila "tu mejor marca".
- [ ] No hay ninguna importación ni referencia a lógica de juego real (colisiones, física, input de teclado/gamepad para jugar) en el código.
- [ ] El tema visual (colores neón, tipografías, fondo con grid/scanlines, portadas CSS) es reconocible como el mismo diseño de `references/templates/`.

## Decisiones tomadas y descartadas

- **Routing por archivos de Next.js en vez de router por hash**: se descarta replicar el router hash-based del template (`app.jsx`) porque el proyecto ya usa App Router; usar rutas de archivos da URLs reales, mejor integración con `next/navigation` y es el patrón idiomático del stack declarado en `CLAUDE.md`.
- **Reproductor como maqueta estática, no simulación dinámica**: se descarta el `setInterval` que incrementa el score automáticamente en `reproductor.jsx`, porque simular una partida en progreso (aunque sea con números aleatorios) se considera "implementar un juego" y el pedido explícito fue solo visual. Se añade un botón para ver el estado de "fin de partida" sin loop de juego.
- **Persistencia real en `localStorage`**: se mantiene el comportamiento de `app.jsx` (claves `av_user`, `av_scores`) porque el pedido es un MVP navegable y creíble, no solo imágenes estáticas; no requiere backend.
- **CSS global adaptado en vez de traducción a Tailwind**: se porta `styles.css` casi literal a `globals.css` en lugar de reescribir todo a utilidades Tailwind, para minimizar el riesgo de desviarse del diseño de referencia en este MVP. Convertir a Tailwind puro queda fuera de alcance de este spec.
- **Fuentes vía `next/font/google`**: se prefiere sobre los `<link>` tags del HTML original porque es el mecanismo nativo y optimizado de Next.js para fuentes de Google Fonts.
- **Sin validación de formulario de negocio en Auth**: se mantiene el comportamiento "acepta cualquier dato" de `auth.jsx` porque no hay backend real que valide credenciales; añadir validación de negocio sería inventar un requisito no pedido.
- **Portadas de juego 100% CSS**: confirmado que `.cover-*` en `styles.css` son gradientes/pseudo-elementos, no imágenes — se portan tal cual, sin buscar ni generar assets.
