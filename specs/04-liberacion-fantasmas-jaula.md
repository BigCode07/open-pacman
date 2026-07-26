# Spec 04 — Liberación secuencial de fantasmas desde la jaula

> **Estado:** Implementado
> **Dependencias:** Spec 01 (`fantasmas-personalidad.md`), Spec 03 (`corregir-velocidades-alineacion.md`)
> **Fecha:** 2026-07-26
> **Objetivo:** Implementar el comportamiento arcade de inicio de fantasmas: Blinky fuera de la jaula y Pinky, Inky y Clyde dentro, liberándose secuencialmente por timer y dots comidos.

## Alcance

### Dentro del alcance

- Restaurar posiciones de inicio arcade en `src/js/maze.js`: Blinky arriba de la puerta, Pinky/Inky/Clyde dentro de la pen.
- Agregar estados por fantasma: `in_pen`, `leaving_pen`, `chase`.
- Implementar movimiento de salida de la pen (subir por la puerta y posicionarse arriba).
- Liberación secuencial:
  - Pinky sale inmediatamente al iniciar.
  - Inky sale tras 30 dots comidos (o fallback por timer).
  - Clyde sale tras 60 dots comidos (o fallback por timer).
- Resetear el contador de liberación al perder una vida.
- Actualizar `createGame` y `resetPositions` para inicializar estados y contadores.

### Fuera del alcance (otros specs)

- Modo scatter global con timers.
- Power-pellets o fantasmas asustados.
- Animación de ojos al respawn.
- Cambiar personalidades o velocidades de persecución.

## Modelo de datos

No se introducen estructuras globales nuevas. Solo se amplían los objetos de fantasma en `game.ghosts` y se agregan contadores en el objeto de partida.

Cada fantasma pasa a tener:

```js
{
  x: <number>,
  y: <number>,
  dir: 'left'|'right'|'up'|'down',
  speed: <number>,
  name: 'blanca'|'pinky'|'inky'|'clyde',
  state: 'in_pen'|'leaving_pen'|'chase',  // nuevo
}
```

Estado de partida añadido:

```js
{
  state: 'start'|'playing'|'won'|'lost',
  score: 0,
  lives: 3,
  dotsRemaining: <number>,
  grid: [...],
  pacman: {...},
  ghosts: [...],
  penRelease: {    // nuevo
    pinky: true,   // libre al inicio
    inky: false,
    clyde: false,
    timer: 0,      // frames desde el último dot comido
    globalTimer: 0 // frames totales de partida
  }
}
```

Contadores de dots para liberación (nivel 1, valores arcade canónicos):

| Fantasma | Condición de salida |
|----------|---------------------|
| Pinky    | inmediatamente      |
| Inky     | 30 dots comidos     |
| Clyde    | 60 dots comidos     |

Fallback por timer: si no se come ningún dot en ~4 segundos (240 frames a 60 FPS), se libera el próximo fantasma en cola.

## Plan de implementación

Cada paso deja el sistema funcional y ejecutable.

1. **Actualizar posiciones de inicio en `src/js/maze.js`.**
   - Blinky: `(13, 11)` arriba de la puerta.
   - Pinky: `(13, 14)` centro de la pen.
   - Inky: `(11, 14)` izquierda de la pen.
   - Clyde: `(15, 14)` derecha de la pen.

2. **Ampliar el modelo de fantasma en `src/js/game.js`.**
   - Agregar `state: 'in_pen'` al crear cada fantasma en `createGame`.
   - Pinky inicia en `'leaving_pen'` (sale inmediatamente); Inky y Clyde en `'in_pen'`.
   - Agregar `game.penRelease` con contadores de dots y timers.

3. **Implementar salida de la jaula.**
   - Crear función `leavePen(game, g)` que mueva al fantasma hacia el centro de la puerta y luego hacia arriba hasta salir.
   - Al cruzar la puerta, cambiar `g.state` a `'chase'`.

4. **Integrar estados en `moveGhost`.**
   - Si `g.state === 'in_pen'`, verificar condiciones de liberación (dots/timer).
   - Si `g.state === 'leaving_pen'`, llamar a `leavePen`.
   - Si `g.state === 'chase'`, ejecutar `decideGhost` como ahora.

5. **Actualizar `resetPositions`.**
   - Restaurar posiciones iniciales.
   - Resetear estados y contadores de liberación (`penRelease`).

6. **Contar dots y timer.**
   - En `movePacman` o `update`, incrementar `penRelease.dotsEaten` cuando Pac-Man come un dot.
   - Incrementar `penRelease.timer` cada frame; resetearlo al comer un dot.
   - Usar `penRelease.globalTimer` como fallback si `timer` supera el límite.

7. **Verificación manual.**
   - Cargar `src/index.html`.
   - Confirmar que Pinky sale inmediatamente, Inky tras 30 dots, Clyde tras 60 dots.
   - Confirmar que al perder una vida se resetean y vuelven a salir.
   - Confirmar que el juego sigue jugable de principio a fin.

## Criterios de aceptación

- [ ] `src/js/maze.js` define `GHOST_STARTS` con Blinky en `(13,11)` y Pinky/Inky/Clyde en `(13,14)`, `(11,14)`, `(15,14)`.
- [ ] `createGame` en `src/js/game.js` inicializa cada fantasma con `state`.
- [ ] Pinky inicia en estado `'leaving_pen'` y los demás en `'in_pen'`.
- [ ] `game.penRelease` existe con contadores de dots y timers.
- [ ] Pinky sale de la jaula inmediatamente al iniciar la partida.
- [ ] Inky sale después de que Pac-Man coma 30 dots.
- [ ] Clyde sale después de que Pac-Man coma 60 dots.
- [ ] Si Pac-Man no come dots, el fallback por timer libera al próximo fantasma en cola.
- [ ] Al perder una vida, `resetPositions` vuelve a colocar fantasmas en inicio y resetea liberación.
- [ ] Los fantasmas no se quedan atrapados en la jaula al salir.
- [ ] El juego sigue siendo jugable de principio a fin sin errores en consola.

## Decisiones tomadas y descartadas

### Tomadas

- **Posiciones arcade fieles** para el inicio: Blinky afuera, los demás adentro.
- **Liberación secuencial por dots + timer fallback**, como en el arcade original.
- **Estados por fantasma** (`in_pen`, `leaving_pen`, `chase`) para encapsular el comportamiento.
- **Valores arcade nivel 1:** Pinky inmediato, Inky a 30 dots, Clyde a 60 dots.

### Descartadas

- **Liberación inmediata** (como en el Spec 01): se eligió la fidelidad arcade.
- **Liberación solo por timer:** se prefirió dots como condición principal, timer como respaldo.
- **Modificar `decideGhost` para incluir la salida:** se separó en una función propia `leavePen` para no mezclar persecución con navegación de la jaula.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Fantasmas se atoren al salir por la puerta | `leavePen` usa un camino explícito hacia la puerta y luego arriba; se prueba visualmente antes de commitear. |
| Reset tras perder vida no reactive liberación | `resetPositions` debe resetear `penRelease` y estados; incluido en los criterios de aceptación. |
| Cambio de posiciones iniciales rompe `resetPositions` | `resetPositions` ya lee de `GHOST_STARTS`, así que hereda automáticamente. |

## Lo que **no** entra en este spec

- Modo scatter global con timers.
- Power-pellets ni fantasmas asustados.
- Animaciones de ojos al respawn.
- Cambios de personalidades o velocidades.
- Tests automatizados (el proyecto aún no tiene framework).

Cada uno de esos, si se requiere, va en su propio spec.
