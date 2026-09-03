# SPEC 03 — Niveles con dificultad progresiva

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-09-01
> **Objective:** Añadir una secuencia de 3 niveles fijos que se juegan en orden, cada uno más difícil que el anterior (pelota más rápida, más filas de ladrillos, huecos en el grid), sin tocar la forma individual de los bloques.

---

## Scope

**In:**

- Configuración `LEVELS`: array fijo de 3 niveles, cada uno con su propio número de filas, patrón de huecos en el grid y multiplicador de velocidad de la pelota.
- `state.level` (1-indexado) se añade al estado global; empieza en 1 con cada partida nueva.
- Al destruir todos los ladrillos vivos de un nivel que no es el último, el juego pasa a un nuevo estado `'level-complete'`: overlay de texto ("Nivel N completado"), pelota y paleta se reposicionan al centro, el juego se pausa hasta que el jugador pulse espacio o haga clic. Vidas y puntaje **no** se reinician.
- Al pulsar espacio/clic en `'level-complete'`, se incrementa `state.level`, se reconstruye `state.bricks` con la configuración del nuevo nivel, y el juego vuelve a `'playing'`.
- Al destruir todos los ladrillos del último nivel (nivel 3), se dispara el estado `'win'` ya existente (SPEC 01), sin cambios en su comportamiento.
- El overlay de juego (durante `'playing'`) agrega el nivel actual junto a puntaje y vidas: `Nivel: N`.
- Reiniciar la partida completa (desde `'win'` o `'lose'`, pulsando espacio/clic) vuelve siempre a `state.level = 1` con la configuración del nivel 1.
- El patrón de huecos de cada nivel se define como una matriz de 0/1 por fila/columna (celdas sin ladrillo quedan vacías desde el arranque del nivel, no se generan y luego se destruyen).
- El número de filas crece con el nivel (nivel 1: 8 filas; nivel 2: 9 filas; nivel 3: 10 filas), manteniendo 8 columnas fijas.
- La velocidad de la pelota se escala por `ballSpeedMultiplier` del nivel actual al inicializarla (al empezar el nivel y tras cada `resetBallAndPaddle`).

**Out of scope (para specs futuras):**

- Formas de bloque individuales distintas al rectángulo estándar (bloques de doble ancho/alto, bloques multi-golpe) — spec aparte que puede depender de este.
- Más de 3 niveles o niveles generados proceduralmente.
- Persistencia del nivel alcanzado entre sesiones (localStorage/ranking).
- Cambiar el orden/mezcla de colores por fila (se mantiene `BRICK_COLORS_BY_ROW` de SPEC 01, tomando las primeras N filas según el nivel).
- Power-ups.

---

## Data model

```js
// Nuevas entradas en el estado global (SPEC 01 ya define score, lives, paddle, ball, bricks)
state.level = 1; // 1-indexado, uno de LEVELS.length

// Configuración fija de niveles
const LEVELS = [
  {
    rows: 8,
    layout: null, // null = grid completo, todas las celdas con ladrillo
    ballSpeedMultiplier: 1,
  },
  {
    rows: 9,
    layout: [
      // 9 filas x 8 columnas, 1 = ladrillo, 0 = hueco
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    ballSpeedMultiplier: 1.15,
  },
  {
    rows: 10,
    layout: [
      // 10 filas x 8 columnas
      [1, 1, 1, 0, 0, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
    ],
    ballSpeedMultiplier: 1.3,
  },
];
```

Convenciones:

- `state.level` es el índice humano (1, 2, 3), correspondiente a `LEVELS[state.level - 1]`.
- `layout: null` significa "todas las celdas tienen ladrillo" (equivalente al grid uniforme de SPEC 01); si `layout` es una matriz, sus dimensiones son siempre `rows x 8` y cada `0` significa que esa celda no genera un `brick` en `state.bricks` (no se crea `alive: false`, directamente no existe la entrada).
- El color de cada fila sigue usando `BRICK_COLORS_BY_ROW` (6 colores) de forma cíclica vía `row % BRICK_COLORS_BY_ROW.length`, ya que `LEVELS[i].rows` puede superar la cantidad de colores definidos.
- `ballSpeedMultiplier` se aplica sobre la velocidad base definida en SPEC 01 (`vx`, `vy`) al inicializar la pelota (arranque de nivel, `resetBallAndPaddle`) y también en cada rebote contra la paleta (`checkPaddleCollision`), para que la velocidad del nivel se mantenga durante todo el juego y no solo en el lanzamiento inicial.
- Nuevo valor de `state.status`: `'level-complete'` (se suma a `'start' | 'playing' | 'life-lost' | 'win' | 'lose'` de SPEC 01).

---

## Implementation plan

1. Declarar la constante `LEVELS` con los 3 niveles definidos arriba y añadir `state.level = 1` al estado global. Prueba manual: el juego arranca en nivel 1 con 8 filas completas.
2. Modificar la función que construye `state.bricks` para que reciba la configuración de `LEVELS[state.level - 1]` (filas, layout, colores) en vez de las constantes fijas `BRICK_ROWS`/`BRICK_COLS` de SPEC 01, generando solo las celdas donde `layout` tiene `1` (o todas si `layout` es `null`). Prueba manual: recargar la página muestra el grid del nivel 1 (8 filas completas).
3. Aplicar `ballSpeedMultiplier` del nivel actual a `vx`/`vy` en la inicialización de la pelota (arranque de nivel y `resetBallAndPaddle`) y en cada rebote contra la paleta (`checkPaddleCollision`). Prueba manual: sin cambiar de nivel, la velocidad se siente igual que antes (multiplicador 1 en nivel 1).
4. Detectar "todos los ladrillos del nivel destruidos" y, si `state.level < LEVELS.length`, pasar a `state.status = 'level-complete'` en vez de `'win'`; si es el último nivel, mantener el comportamiento actual (`'win'`). Prueba manual: forzar romper todos los ladrillos del nivel 1 (jugando o editando `state.bricks` temporalmente) y ver que aparece el nuevo estado en vez del overlay de victoria.
5. Dibujar el overlay de `'level-complete'` ("Nivel N completado — pulsa espacio o haz clic") y manejar el input (espacio/clic) para incrementar `state.level`, reconstruir `state.bricks` con la nueva configuración, reposicionar pelota/paleta con el nuevo `ballSpeedMultiplier`, y volver a `'playing'`, sin tocar `state.score` ni `state.lives`. Prueba manual: completar el nivel 1 muestra el overlay, y al pulsar espacio arranca el nivel 2 con 9 filas y huecos visibles, conservando puntaje y vidas.
6. Agregar `Nivel: N` al overlay de puntaje/vidas visible durante `'playing'`. Prueba manual: el número de nivel se ve en pantalla y sube al avanzar de nivel.
7. Asegurar que el reinicio completo de partida (desde `'win'` o `'lose'`) resetea `state.level = 1` junto con `score`/`lives`/`bricks`. Prueba manual: llegar al overlay de victoria final (tras el nivel 3) o de derrota, reiniciar, y confirmar que se vuelve al nivel 1 con 8 filas completas.

---

## Acceptance criteria

- [ ] El juego arranca siempre en nivel 1 con 8 filas de ladrillos completas (sin huecos).
- [ ] El overlay durante `'playing'` muestra `Nivel: N` junto a puntaje y vidas.
- [ ] Al destruir todos los ladrillos del nivel 1, aparece un overlay "Nivel completado" (no el de victoria), el juego se pausa, y pulsar espacio/clic arranca el nivel 2.
- [ ] El nivel 2 tiene 9 filas con huecos en el grid según su `layout`, y la pelota se mueve visiblemente más rápido que en el nivel 1.
- [ ] El nivel 3 tiene 10 filas con huecos en el grid según su `layout`, y la pelota se mueve más rápido que en el nivel 2.
- [ ] Al pasar de un nivel a otro, `state.score` y `state.lives` conservan su valor (no se reinician).
- [ ] Al destruir todos los ladrillos del nivel 3, aparece el overlay de victoria final existente de SPEC 01 (no el de "Nivel completado").
- [ ] Perder todas las vidas en cualquier nivel muestra el overlay de derrota existente de SPEC 01.
- [ ] Reiniciar la partida completa (desde victoria final o derrota) vuelve siempre a nivel 1 con puntaje 0 y vidas al valor inicial.
- [ ] No hay errores en consola relacionados a `LEVELS`, `state.level` o la construcción del grid con huecos.

---

## Decisions

- **Sí:** 3 niveles fijos definidos en un array de configuración (`LEVELS`), en vez de generación procedural. Es lo más simple de balancear y verificar, y el array se puede extender después sin rediseñar la estructura.
- **Sí:** el patrón de huecos se define como matriz de 0/1 por nivel, fijada a mano. Da control total sobre la dificultad visual de cada nivel sin necesitar un generador de patrones.
- **Sí:** el número de filas crece con el nivel (8 → 9 → 10) además de los huecos, para reforzar la sensación de progresión.
- **Sí:** transición de nivel con overlay + pausa esperando input (espacio/clic), igual que el patrón ya usado en `'life-lost'` de SPEC 01, en vez de un timer automático. Mantiene consistencia de UX con el resto del juego.
- **Sí:** puntaje y vidas se conservan entre niveles; solo se reinician en un reinicio completo de partida. Es el comportamiento esperado de "niveles" dentro de una misma partida.
- **No:** cambiar el orden o mezcla de colores por fila. Se reutiliza `BRICK_COLORS_BY_ROW` de SPEC 01 tal cual, tomando solo las primeras N filas según el nivel.
- **No:** formas de bloque individuales distintas (doble ancho, multi-golpe, etc.). Es una feature independiente que se define en su propio spec, que puede depender de este.
- **No:** persistencia del nivel alcanzado entre sesiones. Fuera de alcance, igual que la persistencia de puntaje en SPEC 01.

---

## What is **not** in this spec

- Formas de bloque individuales distintas al rectángulo estándar (bloques de doble ancho/alto, bloques multi-golpe con sprite `gray`) — va en un spec aparte.
- Más de 3 niveles o generación procedural de niveles.
- Persistencia del nivel/progreso entre sesiones.
- Power-ups.

Cada uno de estos, si se implementa, va en su propio spec.
