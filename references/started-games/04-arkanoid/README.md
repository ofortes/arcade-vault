# Juego de Arkanoid

## Objetivo

El objetivo del juego es destruir todos los ladrillos que aparecen en la parte superior de la pantalla, sin dejar que la pelota caiga fuera del área de juego. El jugador controla una paleta en la parte inferior para rebotar la pelota y evitar perder vidas.

## Mecánica principal

Arkanoid es un juego de arcade clásico en el que:

- La pelota se mueve constantemente por la pantalla.
- El jugador controla una paleta horizontal.
- La pelota rebota en la paleta, las paredes y los ladrillos.
- Cuando la pelota golpea un ladrillo, este desaparece y el jugador gana puntos.
- Si la pelota cae por debajo de la paleta, se pierde una vida.
- Cuando todos los ladrillos desaparecen, el jugador gana la partida.

## Elementos del juego

- Paleta: se mueve de izquierda a derecha y sirve para devolver la pelota.
- Pelota: rebota contra superficies y destruye ladrillos.
- Ladrillos: bloques que se eliminan con cada impacto.
- Puntuación: aumenta cada vez que se rompe un ladrillo.
- Vidas: el jugador cuenta con varias oportunidades antes de perder.
- Estado del juego: inicio, juego activo, victoria y derrota.

## Controles

- Mouse: mover la paleta con el cursor.
- Teclado: flechas izquierda/derecha o A/D para mover la paleta.
- Espacio o clic: iniciar la partida.

## Lógica básica del desarrollo

Para crear este juego con HTML, CSS y JavaScript se suele usar:

- HTML: para estructurar la interfaz del juego.
- CSS: para diseñar el tablero, la paleta, la pelota y los ladrillos.
- JavaScript: para controlar la lógica del juego, las colisiones y la animación.

## Estructura recomendada

Se recomienda organizar el proyecto así:

- index.html
- style.css
- script.js

## Funcionalidades mínimas

Un prototipo básico debe incluir:

- Una paleta controlable.
- Una pelota en movimiento.
- Ladrillos distribuidos en filas y columnas.
- Colisiones con paredes, paleta y ladrillos.
- Sistema de puntuación.
- Sistema de vidas.
- Reinicio de la partida al perder.

## Cómo funciona la física del juego

- La pelota tiene posición y velocidad.
- Al chocar con los bordes, invierte la dirección.
- Al tocar la paleta, cambia el ángulo según el punto de contacto.
- Al tocar un ladrillo, se destruye y la pelota invierte su dirección.
- El juego se actualiza repetidamente con una animación.

## Mejoras opcionales

Se pueden añadir ideas como:

- Power-ups: pelota más rápida, paleta más larga, vidas extra.
- Niveles con diferentes patrones de ladrillos.
- Sonidos para rebote, destrucción y pérdida de vida.
- Pantalla de inicio y fin.
- Marcador y ranking.

## Resumen corto

Arkanoid es un juego clásico de arcade donde el jugador mueve una paleta para devolver una pelota y destruir ladrillos. El objetivo principal es romper todos los bloques sin dejar que la pelota caiga al suelo. Es un proyecto ideal para practicar lógica, animación y detección de colisiones con HTML, CSS y JavaScript.

> Si quieres, puedo ahora mismo dejarte el código completo de la versión playable en HTML, CSS y JavaScript para que puedas copiarlo directamente.
