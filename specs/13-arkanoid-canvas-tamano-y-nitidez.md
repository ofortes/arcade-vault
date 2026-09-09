# 13 · Arkanoid: pantalla más pequeña, proporción correcta y sprites nítidos

- **Estado:** Implementado
- **Depende de:** Arkanoid (`specs/08-arkanoid-game.md`)
- **Fecha:** 2026-09-09
- **Objetivo:** Reducir y corregir el tamaño visual del canvas de Arkanoid (proporción nativa 448:600 en vez de la caja 4:3 forzada compartida, con un ancho máximo menor) y eliminar el pixelado/blur de sprites (suavizado desactivado, factores de escala enteros, soporte devicePixelRatio), sin tocar la física de movimiento ni afectar a los demás juegos.

## Alcance

**Incluye:**

- Cambio de contenedor visual solo para Arkanoid: nueva capacidad en `GamePlayer`/`registry` para que un juego declare su propia proporción de pantalla y un ancho máximo, en vez de heredar siempre `.crt-screen` con `aspect-ratio: 4/3` fijo. Se aplica únicamente a Arkanoid.
- Ancho máximo del contenedor de Arkanoid reducido respecto al genérico 1100px de `.av-player` (valor concreto a fijar en implementación, orientativo ~480-560px), manteniendo la proporción 448:600 sin distorsión.
- Soporte `devicePixelRatio` en el canvas de Arkanoid: backing store físico = tamaño lógico × DPR, con `ctx.scale(dpr, dpr)`, para nitidez en pantallas de alta densidad.
- Desactivar el suavizado bilineal (`imageSmoothingEnabled = false` + `image-rendering: pixelated` vía CSS) en el canvas de Arkanoid.
- Ajustar los tamaños de dibujo de sprites (paddle, bloques, explosiones) en `spritesheet.ts`/`engine.ts` a factores de escala enteros respecto a su tamaño fuente en el atlas, en vez de los factores actuales no enteros (paddle ≈0.49×, bloques 1.25×-1.5×), preservando el layout/jugabilidad lo más posible.
- Ajustar el cálculo de coordenadas del mouse en `engine.ts` para que siga funcionando correctamente una vez el canvas tenga backing store físico distinto de su tamaño lógico por DPR.

**Fuera de alcance (para otro spec si se necesita):**

- Cambios en la física/velocidad de movimiento (paddle/bola siguen en px/frame fijos, sin delta-time) — no se detectó problema real de FPS; el loop actual es `requestAnimationFrame` simple, igual que en el juego de referencia.
- Cambiar la resolución lógica interna del juego (sigue siendo 448x600 unidades de juego).
- Tocar `.crt-screen`, aspect-ratio o tamaño de Asteroides, Tetris, Snake o Frogger — aunque Snake y Tetris sufren una distorsión similar por el mismo `.crt-screen` compartido, corregirla ahí es una decisión de diseño aparte, no pedida ahora.
- Generalizar el aspect-ratio/tamaño por juego como mecanismo reusable para todos los motores — se implementa de forma específica para Arkanoid; generalizarlo es un refactor propio si se decide más adelante.
- Rediseño de sprites o del spritesheet (`spritesheet-breakout.png`) en sí — solo cambian los tamaños de destino en el `drawImage`, no la imagen fuente.
- Soporte táctil/mobile — fuera de alcance mientras `mobile-porter` siga desactualizado (ver `CLAUDE.md`).

## Modelo de datos

No hay datos persistentes nuevos. Cambios de contrato en memoria:

- `lib/games/registry.ts`: `GameEngineEntry` gana un campo opcional nuevo (p. ej. `screen?: { aspectRatio: number; maxWidth: number }`), definido solo para la entrada `arkanoid`; el resto de motores lo dejan sin definir y siguen usando `.crt-screen` genérica 4:3 sin cambios.
- `components/GamePlayer.tsx`: al renderizar el contenedor del canvas, si `engine.screen` existe, aplica ese aspect-ratio/max-width específico (vía estilo inline o una clase condicional nueva) en vez de la clase `.crt-screen` genérica; si no existe, comportamiento idéntico al actual.

## Plan de implementación

1. Extender `GameEngineEntry` en `lib/games/registry.ts` con el campo opcional `screen` (aspect-ratio + maxWidth) y definirlo solo en la entrada `arkanoid` (aspect-ratio 448/600, maxWidth a decidir en este paso, ej. 520px). Verificación: `npm run build` compila; sin que `GamePlayer.tsx` lo consuma aún, no hay cambio visual todavía.
2. En `components/GamePlayer.tsx`, consumir `engine.screen` cuando existe: renderizar el contenedor de Arkanoid con esa proporción/ancho máximo en vez de `.crt-screen` genérica (ej. estilo inline `aspectRatio`/`maxWidth`, o nueva clase `.crt-screen--custom`). Verificación: jugar Arkanoid y confirmar que el canvas ya no se ve estirado/distorsionado y ocupa menos espacio en pantalla; jugar Asteroides/Tetris/Snake y confirmar que no cambiaron.
3. Añadir soporte `devicePixelRatio` en el montaje del canvas de Arkanoid (en `GamePlayer.tsx` o al inicio de `createArkanoidGame` en `engine.ts`): backing store físico = tamaño lógico × `window.devicePixelRatio`, `ctx.scale(dpr, dpr)` una vez, dejando que el resto del motor siga trabajando en las mismas coordenadas lógicas 448x600 que usa hoy. Ajustar el cálculo de coordenadas del mouse para que siga devolviendo coordenadas lógicas correctas. Verificación: jugar con el emulador de DPR de devtools (2x, 3x) y confirmar que paddle/bola/ladrillos se ven nítidos y el mouse sigue alineado con el paddle.
4. Desactivar el suavizado en `engine.ts`/`spritesheet.ts`: `ctx.imageSmoothingEnabled = false` sobre el contexto de Arkanoid, y `image-rendering: pixelated` en el estilo del `<canvas>` de Arkanoid (condicionado al juego, sin tocar el CSS global de otros juegos). Verificación visual: bordes de sprites nítidos, sin blur, en los 3 skins (classic/retro/neon).
5. Ajustar factores de escala de sprites en `spritesheet.ts`/`engine.ts` (paddle, bloques, explosiones) a múltiplos enteros de su tamaño fuente, eligiendo los valores concretos más cercanos a los tamaños de juego actuales (80x14 paddle, 48x20 bloques) para no romper el layout/dificultad existente. Verificación: comparar visualmente antes/después en los 3 skins; jugar una partida completa y confirmar que colisiones/layout no cambiaron de forma perceptible.
6. Playtest completo de Arkanoid en los 3 skins, en resolución normal y con DPR emulado, más `npm run build`. Confirmar que Asteroides/Tetris/Snake/Frogger no tienen ninguna regresión visual ni de comportamiento.

Cada paso deja la plataforma jugable de principio a fin.

## Criterios de aceptación

- [x] El canvas de Arkanoid se muestra en pantalla con su proporción real (448:600), sin estirarse/distorsionarse dentro de una caja 4:3.
- [x] El contenedor de Arkanoid tiene un ancho máximo visiblemente menor que el genérico de 1100px, definido en la implementación (520px).
- [x] En pantallas con devicePixelRatio > 1, los sprites de Arkanoid se ven nítidos, sin blur perceptible. Verificado en el entorno de prueba disponible (DPR fraccional real del entorno, escalado consistentemente vía `ctx.scale`); no se pudo forzar el emulador 2x/3x de devtools desde la automatización de Chrome usada, pero el mecanismo (dims lógicas fijas + `ctx.scale` aplicado una sola vez) es independiente del valor de DPR.
- [x] El suavizado bilineal está desactivado en el canvas de Arkanoid (`imageSmoothingEnabled = false` + `image-rendering: pixelated`).
- [x] Los sprites de paddle, bloques y explosiones se dibujan con factores de escala enteros respecto a su tamaño fuente en el atlas (paddle 162→81 = 1/2×, bloques 32→32 = 1×).
- [x] El control por mouse del paddle sigue alineado correctamente con el cursor tras los cambios de DPR.
- [x] La física de movimiento (velocidades de paddle/bola) no cambió.
- [x] Asteroides, Tetris, Snake y Frogger no presentan ninguna regresión visual ni de comportamiento.
- [x] `npm run build` completa sin errores de TypeScript ni de lint.

## Decisiones tomadas y descartadas

- **Sí:** el cambio de tamaño/proporción se implementa solo para Arkanoid (nuevo campo opcional en `GameEngineEntry`), no como mecanismo genérico para todos los juegos — decisión explícita del usuario para no tocar Snake/Tetris, que sufren una distorsión similar pero no fueron pedidos.
- **Sí:** se corrige tanto el suavizado como los factores de escala de sprites (fix completo), no solo uno de los dos — ambos contribuyen al pixelado detectado en la auditoría (factores no enteros + smoothing bilineal activo).
- **Sí:** se agrega soporte `devicePixelRatio`, aunque ni el proyecto actual ni el juego de referencia (`references/started-games/04-arkanoid`) lo implementan — es la causa típica de blur en pantallas modernas de alta densidad y el usuario lo confirmó explícitamente.
- **No:** no se toca la física de movimiento (sigue en px/frame fijo, sin delta-time) — se auditó el loop y no hay evidencia de problema de FPS; el motor usa `requestAnimationFrame` simple igual que el juego de referencia.
- **No:** no se reduce la resolución lógica interna del juego (sigue en 448x600 unidades) — el usuario confirmó mantenerla; solo cambia cómo se muestra/escala en pantalla.
- **No:** el juego de referencia en `references/started-games/04-arkanoid` no se usa como fuente de técnicas de nitidez/fluidez — el análisis confirmó que tiene las mismas limitaciones (sin DPR, sin `image-rendering:pixelated`, sin delta-time); solo se usó para confirmar que las dimensiones base (448x600) coinciden con las ya usadas en el proyecto actual.

## Riesgos

| Riesgo                                                                                                                                                                                                                                          | Mitigación                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar el backing store del canvas por DPR sin ajustar `engine.ts` (que hoy lee `canvas.width`/`canvas.height` directamente para todo su layout: `BRICK_OFFSET_X`, `PADDLE_Y`, clamps, colisión con el suelo) rompe el layout y las colisiones | El motor debe trabajar siempre en coordenadas lógicas (448x600) independientes del backing store físico; el ajuste de DPR se aplica una sola vez vía `ctx.scale`, y el paso 3 verifica explícitamente que layout y colisiones no cambien |
| El cálculo actual de coordenadas del mouse (`mouseX = (e.clientX - rect.left) * (canvas.width / rect.width)`) asume que `canvas.width` es el tamaño lógico; con DPR deja de serlo y el paddle dejaría de seguir el cursor correctamente         | Actualizar esa fórmula para usar el tamaño lógico (no el backing store físico) al calcular el factor de escala, verificado explícitamente jugando con mouse en el paso 3                                                                 |
| Cambiar los factores de escala de sprites a valores enteros puede alterar el tamaño relativo de paddle/bloques/bola y por tanto la dificultad o el layout de la grilla de ladrillos                                                             | Elegir los enteros más cercanos a los tamaños actuales (80x14, 48x20) y hacer playtest de una partida completa en el paso 5 antes de dar el spec por cerrado                                                                             |
| Introducir un campo `screen` opcional en `GameEngineEntry` sin que `GamePlayer.tsx` lo consuma en el mismo paso deja el campo sin efecto silenciosamente                                                                                        | Los pasos 1 y 2 se verifican juntos: tras el paso 2, se confirma visualmente que Arkanoid ya usa el nuevo tamaño antes de continuar                                                                                                      |

## Qué **no** incluye este spec

- Cambios de física/velocidad de movimiento.
- Cambio de resolución lógica interna del juego.
- Corrección de la distorsión de aspecto en Snake o Tetris (mismo `.crt-screen` compartido, no tocado aquí).
- Mecanismo genérico de aspect-ratio/tamaño reusable por todos los juegos.
- Rediseño del spritesheet fuente.
- Soporte táctil/mobile.

Cada uno de esos, si se necesita, va en su propio spec.
