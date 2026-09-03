# 04 · Integración de Supabase

- **Estado:** Implementado
- **Depende de:** (ninguno)
- **Fecha:** 2026-09-03
- **Objetivo:** Instalar y configurar el cliente de Supabase (`@supabase/ssr`) en la app Next.js, dejando listos los helpers de cliente y servidor con las credenciales del proyecto, sin conectar todavía ninguna pantalla, tabla ni lógica de autenticación real.

## Alcance

**Incluye:**

- Instalar la dependencia `@supabase/ssr` (y `@supabase/supabase-js` si es requerida como dependencia directa).
- Crear `.env.local` (no versionado) con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, usando las credenciales del proyecto Supabase ya conectado vía MCP (`project_ref=qcrfxyeuwtikttfdaxph`).
- Crear `.env.example` (versionado) con las mismas claves vacías, como referencia para levantar el proyecto.
- Crear `lib/supabase/client.ts`: helper `createClient()` con `createBrowserClient` de `@supabase/ssr`, para usar desde componentes `"use client"`.
- Crear `lib/supabase/server.ts`: helper `createClient()` con `createServerClient` de `@supabase/ssr`, para usar desde Server Components / Route Handlers, con el manejo de cookies vigente en Next.js 16 (revisar `node_modules/next/dist/docs/` para la API actual de `cookies()`, que puede ser asíncrona en esta versión).
- Verificar que la app sigue arrancando y compilando sin errores tras el cambio.

**No incluye:**

- Autenticación real (login/registro reemplazando el mock de `/auth` y `lib/session.ts`): queda para un spec futuro.
- Cualquier tabla, esquema o migración en la base de datos Supabase (el proyecto queda sin tablas al terminar este spec).
- Cualquier query, insert o suscripción real desde una pantalla existente (Biblioteca, Detalle, Reproductor, Salón de la Fama, Auth): ninguna pantalla cambia de comportamiento ni de UI en este spec.
- Reemplazar `lib/scores.ts` o `lib/session.ts` (persistencia en `localStorage`): no se tocan en este spec.
- Middleware de refresco de sesión (`middleware.ts`): no aplica todavía porque no hay autenticación real que mantener viva.

## Modelo de datos

No se introduce ninguna tabla ni estructura persistente nueva en Supabase. El proyecto queda vacío (sin tablas) al finalizar este spec; solo se agregan helpers de cliente en el código de la app.

## Plan de implementación

1. **Dependencia.** Instalar `@supabase/ssr` (`npm install @supabase/ssr`) verificando en `package.json` que queda como dependencia directa. La app sigue arrancando igual que antes.
2. **Variables de entorno.** Crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL=https://qcrfxyeuwtikttfdaxph.supabase.co` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la anon key obtenida vía MCP (`mcp__supabase__get_publishable_keys`). Crear `.env.example` con las mismas claves sin valores.
3. **Cliente de navegador.** Crear `lib/supabase/client.ts` exportando una función `createClient()` que use `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)` de `@supabase/ssr`.
4. **Cliente de servidor.** Crear `lib/supabase/server.ts` exportando una función `createClient()` (async si `cookies()` lo requiere en Next.js 16) que use `createServerClient` de `@supabase/ssr`, leyendo/escribiendo cookies vía la API de `next/headers` vigente en esta versión.
5. **Verificación.** Arrancar `npm run dev` y confirmar que ninguna pantalla existente cambió; correr `npm run build` y confirmar que compila sin errores de TypeScript ni de lint. No se invoca ningún método de los clientes creados desde ninguna pantalla todavía.

Cada paso deja la app arrancable con `npm run dev` y sin errores de TypeScript/build.

## Criterios de aceptación

- [x] `npm run build` completa sin errores de TypeScript ni de lint.
- [x] `package.json` incluye `@supabase/ssr` como dependencia.
- [x] Existen `lib/supabase/client.ts` y `lib/supabase/server.ts`, cada uno exportando una función `createClient()` que instancia el cliente de Supabase correspondiente sin lanzar errores.
- [x] Existe `.env.example` versionado con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` vacíos; `.env.local` (con los valores reales) no aparece en `git status` como archivo para commitear.
- [x] Ninguna pantalla existente (`/`, `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon-de-la-fama`, `/acerca-de`) cambia de comportamiento visual ni funcional.
- [x] No hay ninguna tabla creada en el proyecto Supabase ni ninguna query/insert real ejecutada desde la app.

## Decisiones tomadas y descartadas

- **`@supabase/ssr` (cliente browser + server) en vez de un único cliente con `@supabase/supabase-js`**: es el patrón oficial recomendado por Supabase para Next.js App Router y deja la base lista para auth real con SSR/cookies en un spec futuro, sin tener que migrar el setup después.
- **Credenciales obtenidas vía MCP en vez de pedírselas al usuario**: el proyecto Supabase ya está conectado vía `.mcp.json` (`project_ref=qcrfxyeuwtikttfdaxph`); usar `get_project_url` / `get_publishable_keys` evita un paso manual y errores de copiado.
- **Sin tablas ni auth real en este spec**: instrucción explícita del usuario ("Solo quiero integrar Supabase con NextJs por el momento"); crear un esquema de datos o reemplazar el login mock aquí sería inventar alcance no pedido. Quedan como specs futuros dependientes de este.
- **Sin middleware de refresco de sesión**: no aplica todavía porque no hay autenticación real cuya sesión mantener viva; se añadirá junto con el spec de auth real.
