# 03 · Pantalla Acerca de (About)

- **Estado:** Aprovado
- **Depende de:** SPEC 02
- **Fecha:** 2026-09-03
- **Objetivo:** Portar la pantalla visual "About" de `references/templates/home-about/about.jsx` como nueva ruta `/acerca-de`, con formulario de contacto mock, y añadir "Acerca de" al navbar al final del menú.

## Alcance

**Incluye:**

- Nueva pantalla en `/acerca-de`: hero de misión (kicker, título, párrafo de misión, fila de 3 highlights con iconos), divisor animado de píxeles, y sección de contacto (intro + formulario) tal como en `about.jsx`.
- Formulario de contacto (`NOMBRE`, `CORREO ELECTRÓNICO`, `MENSAJE`): validación de campos no vacíos con animación de "shake" si falla, y al enviar muestra una terminal simulada de éxito (`.terminal-success`) con el nombre del usuario, igual que el template. Es 100% mock: no llama a ningún backend ni servicio de envío real.
- `components/Nav.tsx`: nuevo link "Acerca de" → `/acerca-de`, al final del menú (después de "Salón de la Fama"), tanto en el nav de escritorio como en el panel móvil. Estado activo cuando `pathname === "/acerca-de"`.
- Estilos: portar el bloque `/* ===== ABOUT PAGE ===== */` de `references/templates/home-about/styles.css` (clases `.about`, `.about-hero`, `.highlight-row`, `.about-divider`, `.about-contact`, `.contact-grid`, `.contact-form`, `.terminal-success`, etc.) a `app/globals.css`.
- Animación "reveal on scroll" del divisor y de la sección de contacto, reutilizando el hook `useReveal` ya existente en `app/page.tsx` (se extrae o se replica igual que en Home).

**No incluye:**

- Cualquier integración real de envío de correo, backend, o servicio de contacto.
- Cambios en `lib/games.ts`, `lib/scores.ts` o `lib/session.ts`.
- Cambios visuales o de contenido en Home, Biblioteca, Detalle, Reproductor, Auth o Salón de la Fama, más allá de añadir el link en `Nav.tsx`.

## Modelo de datos

No se introduce ningún dato o estructura persistente nueva. El estado del formulario (`form`, `sent`, `shake`) es estado local de React dentro del componente de la página, igual que en `about.jsx`; no se guarda ni se envía a ningún sitio.

## Plan de implementación

1. **Estilos de Acerca de.** Añadir a `app/globals.css` el bloque `ABOUT PAGE` portado literal de `references/templates/home-about/styles.css`, sin tocar el resto de reglas existentes.
2. **Componente de página.** Crear `app/acerca-de/page.tsx` (cliente, `"use client"`) portando `about.jsx`: hero de misión con highlights (`HighlightIcon` para HEART/BROWSER/PLANT), divisor de píxeles, sección de contacto con formulario controlado y terminal de éxito simulada. Usa el hook `useReveal` para las animaciones de scroll.
3. **Navbar.** Actualizar `components/Nav.tsx`: añadir el link "Acerca de" → `/acerca-de` al final del menú de escritorio y del panel móvil; añadir el caso `"acerca"` a `isActive`.
4. **Verificación visual.** Arrancar `npm run dev`, navegar a `/acerca-de` desde el navbar, confirmar que el hero, highlights, divisor y formulario se ven y animan igual que el template; probar el formulario con campos vacíos (shake) y con campos completos (terminal de éxito).

Cada paso deja la app arrancable con `npm run dev` y sin errores de TypeScript/build.

## Criterios de aceptación

- [ ] `npm run build` completa sin errores de TypeScript ni de lint.
- [ ] `/acerca-de` muestra el hero de misión, la fila de 3 highlights, el divisor de píxeles y la sección de contacto, con el mismo diseño visual que `references/templates/home-about/about.jsx`.
- [ ] El navbar muestra "Acerca de" al final del menú, en escritorio y en el panel móvil, y resalta como activo en `/acerca-de`.
- [ ] Enviar el formulario con algún campo vacío dispara la animación de "shake" y no muestra la terminal de éxito.
- [ ] Enviar el formulario con los tres campos completos reemplaza el formulario por la terminal simulada (`.terminal-success`) mostrando el nombre ingresado en mayúsculas; el botón "ENVIAR OTRO MENSAJE" vuelve a mostrar el formulario vacío.
- [ ] El formulario no realiza ninguna llamada de red (no hay `fetch`/backend involucrado).
- [ ] El divisor y la sección de contacto hacen su animación de aparición al hacer scroll (clase `.reveal` + `.in`).

## Decisiones tomadas y descartadas

- **Ruta `/acerca-de` en vez de `/about`**: consistente con la convención en español ya usada por `/biblioteca` y `/salon-de-la-fama`; se descarta `/about` por romper esa convención pese a coincidir con el nombre del archivo de referencia.
- **Formulario 100% mock, sin backend**: coherente con la decisión ya tomada en el spec 01 de mantener el proyecto visual-only; conectar el formulario a un servicio real de envío de correo sería inventar alcance no pedido.
- **Link "Acerca de" al final del navbar**: sigue el orden de `references/templates/home-about/nav.jsx` (Inicio, Biblioteca, Salón de la Fama, Acerca de).
