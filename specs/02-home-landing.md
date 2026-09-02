# 02 · Pantalla de Inicio (Home)

- **Estado:** Implementado
- **Depende de:** SPEC 01
- **Fecha:** 2026-09-02
- **Objetivo:** Portar la pantalla visual "Home" de `references/templates/home-about/home.jsx` como nueva ruta `/`, moviendo la Biblioteca actual a `/biblioteca` y añadiendo "Inicio" al navbar justo delante de "Biblioteca".

## Alcance

**Incluye:**

- Nueva pantalla Home en `/`: hero con silhouettes flotantes decorativas, sección "¿Por qué Arcade Vault?" (4 feature cards), rail de "Juegos disponibles ahora" (6 primeros de `GAMES`), sección de estadísticas, "Actividad en vivo" (últimas puntuaciones + top jugadores del día), sección de precios (plan único gratuito + FAQ), y CTA final.
- La Biblioteca actual (grid de juegos con búsqueda y filtros, hoy en `app/page.tsx`) se mueve a `app/biblioteca/page.tsx`, sin cambios de comportamiento.
- `components/Nav.tsx`: nuevo link "Inicio" apuntando a `/`, ubicado antes de "Biblioteca" (que pasa a apuntar a `/biblioteca`), tanto en el nav de escritorio como en el panel móvil. Estado activo de "Inicio" cuando `pathname === "/"`; estado activo de "Biblioteca" cuando `pathname === "/biblioteca"` o `pathname.startsWith("/juegos/")`.
- Actualizar todos los enlaces/redirecciones internas que hoy apuntan a `/` asumiendo que es la Biblioteca, para que apunten a `/biblioteca`: botón "Volver al vault" en Detalle (`app/juegos/[id]/page.tsx`), botón "Volver a la biblioteca" en Salón de la Fama (`app/salon-de-la-fama/page.tsx`), y las redirecciones tras iniciar sesión / registrarse en `app/auth/page.tsx`.
- Los CTAs de Home navegan así: "EXPLORAR JUEGOS" / "VER TODOS LOS JUEGOS" / CTA final → `/biblioteca`; tarjetas de juego del rail → `/juegos/[id]`; "CREAR CUENTA" / "EMPEZAR GRATIS" → `/auth`; "VER SALÓN →" → `/salon-de-la-fama`.
- Estilos: portar el bloque `/* ===== HOME PAGE ===== */` de `references/templates/home-about/styles.css` (clases `.home`, `.home-hero`, `.home-silos`, `.feature-grid`, `.mini-rail`, `.home-stats`, `.home-final`, `.reveal`, etc.) a `app/globals.css`.
- Animación "reveal on scroll" de las secciones de Home mediante `IntersectionObserver` (hook `useReveal`, portado literal).
- Contenido de "Actividad en vivo" (últimas puntuaciones, top jugadores del día) y FAQ de precios: datos estáticos de ejemplo, hardcodeados igual que en el template, sin conectar a `lib/scores.ts` ni a sesión real.

**No incluye:**

- La pantalla "About" (`about.jsx`): no se porta, no se enlaza desde el navbar ni desde ningún otro lugar.
- Cualquier lógica de juego real, backend, o conexión de las secciones mock de Home a datos reales.
- Cambios en `lib/games.ts`, `lib/scores.ts` o `lib/session.ts` (se reutilizan tal cual).
- Cambios visuales o de contenido en la Biblioteca, Detalle, Reproductor, Auth o Salón de la Fama más allá de actualizar las URLs de navegación mencionadas arriba.

## Modelo de datos

No se introduce ningún dato o estructura nueva. Home reutiliza `GAMES` de `lib/games.ts` (primeros 6 elementos para el rail de juegos); el resto del contenido de Home (features, stats, actividad, precios, FAQ) es texto/JSX estático, sin modelo de datos propio.

## Plan de implementación

1. **Mover Biblioteca a `/biblioteca`.** Crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (sin cambios de lógica). La app sigue arrancando y `/biblioteca` muestra el grid de juegos igual que antes.
2. **Actualizar enlaces internos a la Biblioteca.** Cambiar a `/biblioteca` los `router.push("/")` de `app/auth/page.tsx` y los `<Link href="/">` de `app/salon-de-la-fama/page.tsx` y `app/juegos/[id]/page.tsx`.
3. **Estilos de Home.** Añadir a `app/globals.css` el bloque de estilos `HOME PAGE` portado de `references/templates/home-about/styles.css`, sin tocar el resto de reglas existentes.
4. **Componente Home.** Crear el nuevo `app/page.tsx` (cliente, con `"use client"` por el hook de reveal) portando `home.jsx`: hero con silhouettes SVG, secciones de features/rail de juegos/stats/actividad/precios/CTA final, usando `useRouter().push(...)` para las navegaciones según el mapeo de rutas definido en el Alcance. El rail de juegos usa `GAMES.slice(0, 6)` de `lib/games.ts` y cada tarjeta navega a `/juegos/[id]`.
5. **Navbar.** Actualizar `components/Nav.tsx`: añadir el link "Inicio" → `/` antes de "Biblioteca" en el nav de escritorio y en el panel móvil; cambiar el link "Biblioteca" para que apunte a `/biblioteca`; ajustar `isActive` para los nuevos criterios de "inicio" y "biblioteca".
6. **Verificación visual.** Arrancar `npm run dev`, navegar entre `/`, `/biblioteca`, `/juegos/[id]`, `/auth` y `/salon-de-la-fama` confirmando que el nav resalta la sección activa correctamente y que ningún enlace quedó apuntando a la Biblioteca antigua en `/`.

Cada paso deja la app arrancable con `npm run dev` y sin errores de TypeScript/build.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `/` muestra la pantalla Home (hero, features, rail de juegos, stats, actividad, precios, CTA final); `/biblioteca` muestra el grid de juegos con búsqueda y filtros que antes vivía en `/`.
- [ ] El navbar muestra "Inicio" antes de "Biblioteca", en el menú de escritorio y en el panel móvil, y ambos enlaces resaltan como activos en la ruta correspondiente (`/` para Inicio, `/biblioteca` y `/juegos/[id]` para Biblioteca).
- [ ] "About" no aparece en ningún menú de navegación ni tiene ruta asociada.
- [ ] Todos los CTAs de Home navegan a la pantalla correcta: biblioteca, detalle de un juego del rail, auth, y salón de la fama.
- [ ] Los botones "Volver al vault" (Detalle) y "Volver a la biblioteca" (Salón de la Fama), y la redirección tras iniciar sesión/registrarse/crear cuenta de invitado en Auth, llevan a `/biblioteca` (no a `/`).
- [ ] Las secciones de Home hacen su animación de aparición al hacer scroll (clase `.reveal` + `.in`).
- [ ] El tema visual de Home (colores neón, tipografías, silhouettes flotantes, portadas de juego CSS) es reconocible como el mismo diseño de `references/templates/home-about/home.jsx`.

## Decisiones tomadas y descartadas

- **Home ocupa `/` y la Biblioteca se mueve a `/biblioteca`**: se descarta dejar Home en una ruta secundaria (`/inicio`) porque la home es la portada natural del sitio; mover la Biblioteca a su propia URL es el patrón convencional y evita que la raíz del sitio muestre dos pantallas distintas según la versión.
- **Contenido mock de "Actividad en vivo" y precios, estático y literal**: coherente con la decisión ya tomada en el spec 01 de mantener el proyecto visual-only; conectar estas secciones a `lib/scores.ts` o a sesión real sería inventar alcance no pedido.
- **About no se porta ni se enlaza**: instrucción explícita del pedido; el archivo `about.jsx` de referencia se ignora por completo en este spec.
- **Rail de juegos alimentado por `GAMES` real**: se prefiere sobre datos de ejemplo distintos para no duplicar contenido ya portado en el spec 01 y mantener consistencia entre Home y Biblioteca.
