# Spec 01 — Fantasmas con personalidad

- **Estado:** Aprobado
- **Dependencias:** Ninguna (primer spec; parte del MVP existente en `src/js/`).
- **Fecha:** 2026-07-26
- **Objetivo (una oración):** Reemplazar los 2 fantasmas actuales por 4 con las personalidades clásicas del arcade (Blinky, Pinky, Inky, Clyde), con liberación inmediata de la pen y modo chase puro, incluyendo la aceleración Cruise Elroy de Blinky.

## Alcance

### Dentro del alcance
- Reemplazar los 2 fantasmas actuales por 4 con personalidades clásicas del arcade:
  - **Blinky** (índice 0): persecución directa a la celda de Pac-Man + aceleración Cruise Elroy por dots restantes.
  - **Pinky**: apunta 4 celdas adelante de Pac-Man según su dirección actual.
  - **Inky**: objetivo calculado como reflejo del vector entre Blinky y el punto 2 celdas adelante de Pac-Man.
  - **Clyde**: persigue si distancia Manhattan > 8, si no regresa a su esquina inferior izquierda.
- Posiciones de inicio arcade fieles a `maze.js` (Blinky `(13,11)`, Pinky `(13,14)`, Inky `(11,14)`, Clyde `(15,14)`).
- Liberación inmediata de la pen al iniciar la partida (sin timer ni encierro).
- Modo **chase puro** (sin scatter).
- Definición y uso de las 4 esquinas (scatter targets) internas de cada fantasma como fallback de Clyde.
- Ajustar `decideGhost` en `src/js/game.js` para despachar el target según `name`.
- Ajustar `GHOST_STARTS` en `src/js/maze.js` y `GHOST_COLORS` en `src/js/render.js` para los 4 fantasmas.
- Velocidades Cruise Elroy: fase 1 `0.105`, fase 2 `0.11`, base `0.1`.

### Fuera del alcance (otros specs)
- Modo **scatter** con timers.
- **Power-pellets** y modo **asustado** (fantasmas azules comestibles).
- **Timer de liberación** secuencial de la pen (este spec usa liberación inmediata).
- Vueltas de ojos al respawn tras ser comidos (depende del modo asustado).
- Personajes/animaciones extra, sonidos, UI nueva.

### Decisiones cerradas (no reabrir)
- 4 personalidades clásicas del arcade.
- Cruise Elroy por dots restantes (con aceleración incluida por fidelidad).
- Posiciones de inicio fieles al arcade.
- Liberación inmediata (sin timer); el timer queda para spec futuro.
- Inky usa a Blinky (índice 0) como referencia fija.

## Modelo de datos

No se introducen estructuras nuevas en memoria ni persistencia (el juego sigue sin guardar entre sesiones). Solo se **amplían y renombran** las existentes.

### `GHOST_STARTS` (en `src/js/maze.js`)

Reemplazo del array actual (2 entradas) por 4 entradas, cada una con `name` (id) y `scatter` (esquina asignada):

| Índice | name    | x  | y  | scatter (x,y) | scatterRole            |
|--------|---------|----|----|---------------|------------------------|
| 0      | blanca  | 13 | 11 | (25, 0)       | esquina sup. derecha   |
| 1      | pinky   | 13 | 14 | (2, 0)        | esquina sup. izquierda |
| 2      | inky    | 11 | 14 | (27, 30)      | esquina inf. derecha   |
| 3      | clyde   | 15 | 14 | (0, 30)       | esquina inf. izquierda |

> Nota: se elimina el campo `kind` (reemplazado por `name`). `scatter` solo lo usa Clyde en su regla de "acercarse → regresar" en este spec; los demás no lo consumen, pero queda definido para el spec futuro de scatter.

### Estructura interna de cada fantasma en `createGame` (en `src/js/game.js`)

Cada entrada de `game.ghosts` pasa a ser:

```js
{
  x: <number>,        // posición actual (celda continua)
  y: <number>,
  dir: 'left'|'right'|'up'|'down',
  speed: 0.1,         // base; Blinky muta su speed en runtime (Cruise Elroy)
  name: 'blanca'|'pinky'|'inky'|'clyde',
}
```

- Se elimina `kind` (reemplazado por `name`).
- El campo `scatter` no se replica en el estado en runtime; se accede contra `GHOST_STARTS[i].scatter` por índice.

### Constantes nuevas (en `src/js/game.js`)

```js
const GHOST_SPEED_BASE   = 0.1;       // Pinky, Inky, Clyde siempre
const GHOST_SPEED_ELROY1 = 0.105;     // Blinky cuando dots restantes < 30
const GHOST_SPEED_ELROY2 = 0.11;      // Blinky cuando dots restantes < 10
const ELROY1_THRESHOLD   = 30;
const ELROY2_THRESHOLD   = 10;
const CLYDE_RADIUS       = 8;         // distancia Manhattan
const PINKY_LOOKAHEAD    = 4;
const INKY_LOOKAHEAD     = 2;
```

### Sin cambios en la estructura global

- `game.state`, `game.score`, `game.lives`, `game.dotsRemaining`, `game.grid` — sin cambios.
- `MAZE`, `TUNNEL_ROW`, `PACMAN_START` — sin cambios.
- `GHOST_COLORS` (en `render.js`) se reordena a los colores arcade canónicos: Blinky `#ff0000`, Pinky `#ffb8ff`, Inky `#00ffff`, Clyde `#ffb852` (reordenar el array actual para que coincida con el orden de `GHOST_STARTS`).

## Plan de implementación

Cada paso deja el sistema funcional y ejecutable.

1. **Actualizar `GHOST_STARTS` en `src/js/maze.js`.**
   Reemplazar las 2 entradas por 4, con campos `name`, `x`, `y`, `scatter` según la tabla de la sección anterior. Eliminar `kind`. Exportar por `window.GHOST_STARTS` como ya hace.

2. **Ampliar `createGame` en `src/js/game.js`.**
   Mapear `GHOST_STARTS` a `game.ghosts` con los campos `{ x, y, dir:'up', speed, name }`. Eliminar `kind`. Inicializar `speed` con `GHOST_SPEED_BASE`.

3. **Agregar constantes nuevas en `src/js/game.js`.**
   Definir `GHOST_SPEED_BASE`, `GHOST_SPEED_ELROY1/2`, `ELROY1/2_THRESHOLD`, `CLYDE_RADIUS`, `PINKY_LOOKAHEAD`, `INKY_LOOKAHEAD` al inicio del archivo (junto a `PACMAN_SPEED`/`GHOST_SPEED` existentes; eliminar `GHOST_SPEED` reemplazado por `GHOST_SPEED_BASE`).

4. **Reescribir `decideGhost` en `src/js/game.js`.**
   Despachar por `g.name`:
   - **blanca**: target = posición redondeada de Pac-Man. Llamar a `applyElroy(g, game.dotsRemaining)` para mutar `g.speed`.
   - **pinky**: target = posición de Pac-Man + `PINKY_LOOKAHEAD * DIRS[p.dir]`.
   - **inky**: pivot = posición Pac-Man + `INKY_LOOKAHEAD * DIRS[p.dir]`; target = pivot + (pivot − posición de Blinky). Acceder a Blinky vía `game.ghosts[0]`.
   - **clyde**: dist = Manhattan a Pac-Man; si dist > `CLYDE_RADIUS` target = Pac-Man, si no target = `GHOST_STARTS[i].scatter` de su propia entrada.
   Luego elegir la dirección de `choices` que produzca la menor distancia Manhattan del siguiente paso al target (reutiliza la lógica actual de "best" sin invertir sentido; si no hay opciones permitir 180 como ahora). Conservar el callejón de 180°.

5. **Ajustar `resetPositions` en `src/js/game.js`.**
   Tras reseteo, restaurar `g.speed = GHOST_SPEED_BASE` para todos (Blinky puede haber acelerado y debe volver a base al perder una vida).

6. **Reordenar `GHOST_COLORS` en `src/js/render.js`.**
   Reordenar el array a `[ '#ff0000', '#ffb8ff', '#00ffff', '#ffb852' ]` para que coincida con el orden nuevo de `GHOST_STARTS`. Sin cambios en `drawGhost`.

7. **Verificación manual.**
   Cargar `src/index.html` en navegador:
   - Los 4 fantasmas aparecen en sus posiciones de inicio arcade, con sus colores canónicos.
   - Blinky persigue directo y acelera visible cuando quedan < 30 y < 10 dots.
   - Pinky tiende a interceptar por delante.
   - Inky hace movimientos de flanqueo.
   - Clyde se mantiene alejado de Pac-Man y se va a su esquina si se le acerca.
   - El juego sigue siendo jugable, come dots, pierde vidas y gana/pierde la partida.

8. **Re-ejecutar** si hace falta ajustar thresholds/velocidades tras la verificación empírica (no requiere spec nuevo, son los valores definidos en la sección anterior).

## Criterios de aceptación

Checklist booleano (no aspiracional). El spec se considera cumplido solo si todos son `true`.

- [ ] `src/js/maze.js` define `GHOST_STARTS` con 4 entradas en el orden Blinky, Pinky, Inky, Clyde; cada una con `name`, `x`, `y`, `scatter`. El campo `kind` ya no existe.
- [ ] Las posiciones de inicio son exactamente: Blinky `(13,11)`, Pinky `(13,14)`, Inky `(11,14)`, Clyde `(15,14)`.
- [ ] `createGame` en `src/js/game.js` genera `game.ghosts` con 4 objetos, cada uno con `{ x, y, dir:'up', speed, name }` y sin `kind`.
- [ ] `GHOST_SPEED` está eliminado y reemplazado por las constantes `GHOST_SPEED_BASE`, `GHOST_SPEED_ELROY1`, `GHOST_SPEED_ELROY2`, `ELROY1_THRESHOLD`, `ELROY2_THRESHOLD`, `CLYDE_RADIUS`, `PINKY_LOOKAHEAD`, `INKY_LOOKAHEAD`.
- [ ] `decideGhost` despacha por `g.name` y produce el target correcto para cada fantasma:
  - Blinky → celda de Pac-Man.
  - Pinky → Pac-Man + 4 celdas en `p.dir`.
  - Inky → reflejo de Blinky respecto al pivot Pac-Man + 2 celdas en `p.dir`, usando `game.ghosts[0]`.
  - Clyde → Pac-Man si Manhattan > 8, si no su `scatter` de `GHOST_STARTS[3]`.
- [ ] Blinky muta su `speed` a `0.105` cuando `dotsRemaining < 30` y a `0.11` cuando `dotsRemaining < 10`; los otros 3 siempre usan `0.1`.
- [ ] `resetPositions` restaura `g.speed = GHOST_SPEED_BASE` para los 4 tras perder una vida.
- [ ] `GHOST_COLORS` en `src/js/render.js` está en el orden `[ rojo, rosa, cyan, naranja ]` y se asigna por índice al array nuevo de fantasmas.
- [ ] Al cargar `src/index.html`, los 4 fantasmas aparecen en sus posiciones arcade con sus colores canónicos.
- [ ] El juego sigue siendo jugable de principio a fin: Pac-Man come dots, puede ganar (todos los dots) y puede perder (3 vidas), sin errores en consola.
- [ ] No se modifica la geometría del laberinto (`MAZE`), ni la lógica de túnel, ni el comportamiento de Pac-Man.
- [ ] No se introducen power-pellets, modo asustado, scatter ni timer de liberación (verificados por su ausencia en el diff).

## Decisiones tomadas y descartadas

### Tomadas
- **4 personalidades clásicas del arcade** en vez de comportamientos custom más simples. Fidelidad al original y diferenciación clara entre fantasmas.
- **Cruise Elroy incluido** (aceleración de Blinky por dots restantes). Por fidelidad al arcade.
- **Posiciones de inicio arcade fieles** (Blinky arriba-centro, los otros 3 escalonados dentro de la pen). Geometría ya soportada por `maze.js`.
- **Liberación inmediata de la pen** en este spec. Simplifica el alcance; el timer/encierro secuencial queda para un spec futuro.
- **Modo chase puro, sin scatter**. Mantener el spec enfocado; scatter merece su propio spec (incluye timers y reseteos).
- **Inky usa a Blinky (índice 0) como referencia fija** en el array `game.ghosts`. El índice 0 es contractual: Blinky siempre es `GHOST_STARTS[0]` y `game.ghosts[0]`.
- **Clyde usa su `scatter` personal como fallback** cuando está cerca de Pac-Man. Reutiliza la esquina ya definida en `GHOST_STARTS` para no duplicar datos.
- **Reemplazo de `kind` por `name`** con valores `'blanca'`/`'pinky'`/`'inky'`/`'clyde'`. Más legible y extensible que `kind:'hunter'`/`'random'`.
- **Umbral de Clyde = 8 celdas Manhattan** (valor del arcade).
- **Reordenar `GHOST_COLORS`** para que coincida con el orden nuevo de `GHOST_STARTS` en vez de introducir un mapa `name → color`.

### Descartadas (con justificación)
- **Scatter mode con timers**: complejidad significativa (timers, tabla de fases, reseteos). Queda fuera para mantener el spec enfocado en personalidades.
- **Power-pellets / modo asustado / comer fantasmas**: otro eje de gameplay completo. Justifica su propio spec.
- **Timer de liberación secuencial de la pen**: el MVP actual ya libera inmediatamente; mantener ese comportamiento reduce riesgos y aisla la complejidad de este spec.
- **Vueltas de ojos al respawn tras ser comidos**: depende del modo asustado que aquí no se implementa.
- **Offset de media celda para Inky/Clyde** (como en algunos adaptaciones del arcade): complica matemática sin valor claro para este spec; se usan coordenadas de celda enteras.
- **Mantener `kind` además de `name`**: duplicación innecesaria; se elimina `kind` de raíz.
- **Thresholds configurables por configuración externa**: no hay sistema de configuración en el proyecto; se keepan constantes hardcodeadas.
- **Modo de depuración para ver targets**: útil durante el desarrollo, pero queda fuera del spec. Se puede validar manualmente observando el movimiento.

## Riesgos identificados

1. **Inky depende del índice 0 (Blinky).** Si en el futuro se reordena `GHOST_STARTS` o `game.ghosts`, la lógica de Inky se rompe silenciosamente. **Mitigación:** dejarlo documentado en el código (índice 0 = Blinky es contractual) y como criterio de aceptación.

2. **Cruise Elroy puede hacer a Blinky injusto sin power-pellets.** Al no haber modo asustado ni power-pellets en este spec, la aceleración de Blinky baja el margen de reacción del jugador. **Mitigación:** los thresholds (30 y 10 dots) dejan la fase 2 para el tramo final; si en la verificación empírica resulta muy difícil, ajustar los valores (paso 8 del plan) sin abrir nuevo spec.

3. **Targets fuera del laberinto.** Pinky apunta 4 celdas adelante de Pac-Man; en bordes/túnel ese target puede quedar fuera del grid o en (−1, y). **Mitigación:** la selección de dirección solo usa distancia Manhattan al target, no requiere que el target sea transitable; el `canMove` existente ya filtra movimientos inválidos. Mismo comportamiento que el arcade original.

4. **Clyde "regresa a su esquina" sin modo scatter.** Semánticamente raro: Clyde persigue o va a su `scatter` sin que exista el modo scatter global. **Mitigación:** es solo el target de su heurística de alejamiento, no un cambio de modo. Documentado en el plan. Aceptable para este spec.

5. **`resetPositions` no reinicia `speed` de Blinky.** Si se olvida este paso, Blinky mantiene la aceleración Elroy tras perder una vida. **Mitigación:** es un criterio de aceptación explícito y un paso del plan (paso 5).

6. **Eliminación de `kind` puede romper otra lectura.** Si hay referencias a `g.kind` fuera de `decideGhost`/`maze.js`, el cambio falla. **Mitigación:** búsqueda previa con `grep` antes de editar; el MVP actual solo usa `kind` en `decideGhost` (verificado en `src/js/game.js:113-141`). Sin riesgo real, pero listado por completitud.