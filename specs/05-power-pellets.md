# Spec 05 — Power pellets y modo asustado

> **Estado:** Implementado
> **Dependencias:** Spec 01 (`fantasmas-personalidad.md`), Spec 04 (`liberacion-fantasmas-jaula.md`)
> **Fecha:** 2026-07-26
> **Objetivo:** Agregar los 4 power pellets en las esquinas del laberinto y el modo asustado de los fantasmas al comerlos, con reverso inmediato, navegación random, comido por puntos escalados, y respawn en la jaula.

## Alcance

### Dentro del alcance

- Agregar un nuevo tile `4` (power pellet) en `src/js/maze.js`, con caracter `'o'` en `MAZE_STR`.
- Colocar los 4 power pellets en las esquinas reales del laberinto: `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)` (celdas transitables más externas, en el borde playable).
- Comer un power pellet suma `50` puntos y activa el modo asustado (`frightened`) en todos los fantasmas en estado `chase` o `leaving_pen`.
- Reverso inmediato de dirección de todos los fantasmas al activar el modo asustado.
- Navegación random en cada intersección durante `frightened` (sin invertir sentido, salvo callejón).
- Parpadeo visual azul → blanco en los últimos `120` frames del modo asustado.
- Estado `eaten`: al comer un fantasma asustado, suma puntos escalados (`200 → 400 → 800 → 1600`), el fantasma se mueve a la jaula, y reusa `in_pen`/`leaving_pen` del Spec 04 para salir de nuevo.
- Contador de combo `frightenedCombo` reiniciado a `0` al activar un nuevo power pellet.
- Duración del modo asustado: `360` frames (~6 s a 60 FPS). Comer otro power pellet durante `frightened` reinicia el timer al máximo.
- Terminar el modo asustado inmediatamente al perder una vida.
- `resetPositions` reinicia `frightenedTimer` y `frightenedCombo`.
- Render de power pellet más grande que un dot común (en `src/js/render.js`).
- Render de fantasma asustado: azul fijo, parpadeo a blanco los últimos `120` frames.

### Fuera del alcance (otros specs)

- Modo scatter global con timers.
- Animación de ojos del fantasma `eaten` moviéndose a la jaula (el estado `eaten` desplaza al fantasma sin render especial de ojos).
- Niveles con duración decreciente del modo asustado (acá queda fija en 360 frames para nivel 1).
- Bonus fruit / frutas.
- Tests automatizados (el proyecto no tiene framework).

## Modelo de datos

No se introducen estructuras globales nuevas. Se amplían los objetos de fantasma en `game.ghosts` y se agregan contadores en el objeto de partida. También se agrega un nuevo tile en `src/js/maze.js`.

### Tile nuevo en `src/js/maze.js`

```js
// parseTile agrega: 'o' => 4 (power pellet)
function parseTile( ch ) {
  if ( ch === '#' ) return 1;
  if ( ch === '.' ) return 2;
  if ( ch === '-' ) return 3;
  if ( ch === 'o' ) return 4; // nuevo: power pellet
  return 0;
}
```

Las 4 celdas `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)` cambian de `'.'` a `'o'` en `MAZE_STR` (filas 1 y 29, las más externas transitables).

### Fantasma ampliado en `src/js/game.js`

```js
{
  x: <number>,
  y: <number>,
  dir: 'left'|'right'|'up'|'down',
  speed: <number>,
  name: 'blanca'|'pinky'|'inky'|'clyde',
  state: 'in_pen'|'leaving_pen'|'chase'|'frightened'|'eaten', // +2 nuevos
}
```

### Estado de partida ampliado en `src/js/game.js`

```js
{
  state: 'start'|'playing'|'won'|'lost',
  score: 0,
  lives: 3,
  dotsRemaining: <number>,
  grid,
  pacman: {...},
  ghosts: [...],
  penRelease: {...},          // del Spec 04, sin cambios
  frightened: {                // nuevo
    timer: 0,                 // frames restantes de frightened (0 => inactivo)
    combo: 0                  // cuántos fantasmas comidos en esta ventana
  }
}
```

### Constantes nuevas en `src/js/game.js`

```js
const FRIGHTENED_DURATION = 360;   // ~6 s a 60 FPS
const FRIGHTENED_FLASH   = 120;    // últimos 2 s (parpadeo)
const POWER_PELLET_SCORE = 50;
const FRIGHTENED_SCORES  = [200, 400, 800, 1600];
```

### Render en `src/js/render.js`

No nuevas estructuras. Solo se agrega lógica:

- `drawDots` dibuja tile `4` con radio mayor (~6 px) en color `DOT_COLOR`.
- `drawGhost` recibe el color del fantasma y, si `g.state === 'frightened'`:
  - Si `game.frightened.timer <= FRIGHTENED_FLASH`, alterna entre azul (`#2121ff`) y blanco según `frame % 12 < 6`.
  - Si `g.state === 'eaten'`, dibuja solo el par de ojos (cuerpo transparente).
- `draw` pasa `game` (no solo `frame`) a `drawGhost` para que acceda a `game.frightened.timer`.

## Plan de implementación

Cada paso deja el sistema funcional y ejecutable.

1. **Agregar el tile `4` en `src/js/maze.js`.**
   - Ampliar `parseTile` para mapear `'o'` a `4`.
   - Reemplazar `'.'` por `'o'` en las 4 celdas `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)` de `MAZE_STR` (filas 1 y 29, las más externas).
   - Verificación manual: cargar `src/index.html`; los 4 puntos grandes aparecen en las esquinas; el juego sigue corriendo.

2. **Contar power pellets en `dotsRemaining` y sumar al comerlos.**
   - `createGame` ya cuenta todo valor `2`; agregar `4` al conteo de `dotsRemaining`.
   - En `movePacman`, al pisar `4`, setear la celda a `0`, sumar `POWER_PELLET_SCORE` (50) y decrementar `dotsRemaining`.
   - Verificación manual: comer un power pellet suma 50 al score y el pellet desaparece; al limpiar todos los pellets la partida no termina antes de tiempo.

3. **Introducir el modo `frightened` en `src/js/game.js`.**
   - Agregar constantes `FRIGHTENED_DURATION`, `FRIGHTENED_FLASH`, `POWER_PELLET_SCORE`, `FRIGHTENED_SCORES`.
   - Agregar `game.frightened = { timer: 0, combo: 0 }` en `createGame`.
   - Al comer un power pellet, llamar a `startFrightened(game)`: setea `timer = FRIGHTENED_DURATION`, `combo = 0`, y por cada fantasma en estado `chase` o `leaving_pen`:
     - invertir dirección (`g.dir = OPPOSITE[g.dir]`),
     - pasar a estado `'frightened'`.
   - No tocar fantasmas en `in_pen` ni en `eaten`.
   - Verificación manual: comer un power pellet y ver que todos los fantasmas libres invierten dirección.

4. **Decidir movimiento de fantasmas en `frightened`.**
   - En `moveGhost`, si `g.state === 'frightened'`:
     - Al alinear celda, elegir dirección al azar entre `canMove` válidas que no sean `OPPOSITE[g.dir]` (salvo callejón, donde permite 180).
     - Usar `g.speed = GHOST_SPEED_BASE` (más lento que chase, como en el arcade).
   - Avanzar normally con `d.x * g.speed` y `wrapTunnel`.
   - Verificación manual: los fantasmas se mueven erráticos y más lentos tras comer el power pellet.

5. **Decrementar timer de `frightened` y terminar la ventana.**
   - En `update`, decrementar `game.frightened.timer` cada frame si `> 0`.
   - Al llegar a `0`, todos los fantasmas en `'frightened'` vuelven a `'chase'` y `combo` se resetea.
   - Verificación manual: tras ~6 s, los fantasmas vuelven a su color y comportamiento.

6. **Implementar comido de fantasma asustado (estado `eaten`).**
   - En `update`, al detectar colisión Pac-Man/ghost: si `g.state === 'frightened'`:
     - sumar `FRIGHTENED_SCORES[ combo ]` (o `1600` si `combo >= 3`),
     - incrementar `combo`,
     - setear `g.state = 'eaten'`.
   - No perder vida en este caso.
   - Verificación manual: comer dos fantasmas seguidos y ver que el score sube 200 y luego 400.

7. **Implementar movimiento del estado `eaten` hacia la jaula.**
   - En `moveGhost`, si `g.state === 'eaten'`:
     - Mover al fantasma (a velocidad `EATEN_SPEED = 1/8` celda/frame) hacia su celda de inicio en la pen, eligiendo en cada intersección la dirección de menor distancia Manhattan al target.
     - Al alinear en la posición de inicio de la pen (`GHOST_STARTS[i].x`, `GHOST_STARTS[i].y`), pasar `g.state = 'leaving_pen'` y restaurar `g.speed = GHOST_SPEED_BASE`.
   - `wrapTunnel` sigue aplicando.
   - Verificación manual: al comer un fantasma, sus ojos se desplazan a la jaula y luego vuelve a salir.

8. **Restringir `eaten` a inmune y no comerlo dos veces.**
   - En colisión, si `g.state === 'eaten'`, ignorar (no suma puntos, no pierde vida).
   - El contador `combo` se reinicia a `0` al activar un nuevo power pellet (ya en paso 3).
   - Verificación manual: un fantasma comido no vuelve a sumar puntos hasta el próximo power pellet.

9. **Reactivación del power pellet.**
   - Si se come un power pellet mientras `frightened.timer > 0`, `startFrightened` resete `timer = FRIGHTENED_DURATION`, `combo = 0` y aplica reverso a los fantasmas en `chase`/`leaving_pen`.
   - Verificación manual: comer dos power pellets seguidos y ver que el timer se reextiende.

10. **Reset al perder una vida en `resetPositions`.**
    - Setear `game.frightened.timer = 0` y `game.frightened.combo = 0`.
    - Si el modo asustado estaba activo, al perder la vida termina inmediatamente: pasar todos los `'frightened'` a `'chase'` antes de resetear posiciones.
    - Verificación manual: comer un power pellet, dejar que un fantasma libre toque a Pac-Man; los otros fantasmas vuelven a chase tras la muerte.

11. **Render en `src/js/render.js`.**
    - `drawDots`: si `grid[y][x] === 4`, dibujar círculo de radio `~6` px con `DOT_COLOR`.
    - `drawGhost`:
      - Si `g.state === 'frightened'`:
        - Si `game.frightened.timer <= FRIGHTENED_FLASH`, alternar color entre `'#2121ff'` (azul) y `'#ffffff'` (blanco) según `frame % 12 < 6`.
        - Else usar `'#2121ff'`.
        - No dibujar ojos mirando a `dir`; dibujar ojos genéricos (puntos blancos fijos).
      - Si `g.state === 'eaten'`: solo ojos (sin cuerpo), moviéndose según `dir`.
    - `draw` pasa `game` a `drawGhost` además de `frame`, para acceder a `game.frightened.timer`.
    - Verificación manual: ver el azul, el parpadeo en los últimos 2 s, y los ojos del fantasma comido.

12. **`node --check` sobre los 4 archivos JS.**
    - Confirmar sintaxis: `node --check src/js/maze.js`, `src/js/game.js`, `src/js/render.js`, `src/js/main.js`.

13. **Verificación final manual en navegador.**
    - Cargar `src/index.html`.
    - Confirmar: 4 power pellets visibles en las esquinas.
    - Comer uno: los fantasmas se vuelven azules y reversan.
    - Comer dos fantasmas seguidos: score sube 200 y 400.
    - Comido un fantasma: sus ojos regresan a la jaula y vuelve a salir.
    - Esperar ~6 s sin comer otro: el modo termina y vuelven a chase.
    - Comer un power pellet estando dentro de la ventana: el timer se reextiende.
    - Perder una vida durante frightened: el modo se corta y todos vuelven a chase.
    - El juego sigue jugable de principio a fin sin errores en consola.

## Criterios de aceptación

- [ ] `src/js/maze.js` mapea `'o'` a `4` en `parseTile`.
- [ ] Las celdas `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)` de `MAZE_STR` contienen `'o'` (esquinas reales del laberinto).
- [ ] `createGame` cuenta los tiles `4` en `dotsRemaining`.
- [ ] `movePacman` come el tile `4`, lo setea a `0`, suma `50` puntos y decrementa `dotsRemaining`.
- [ ] `game.frightened = { timer, combo }` existe en `createGame`.
- [ ] Comer un power pellet setea `frightened.timer = FRIGHTENED_DURATION` y `combo = 0`.
- [ ] Al activarse frightened, todos los fantasmas en `chase` o `leaving_pen` invierten dirección y pasan a `'frightened'`.
- [ ] Los fantasmas en `in_pen` o `eaten` no son afectados por la activación de frightened.
- [ ] Los fantasmas en `'frightened'` eligen dirección random en cada intersección (sin invertir sentido, salvo callejón).
- [ ] Los fantasmas en `'frightened'` se mueven a `GHOST_SPEED_BASE`.
- [ ] `update` decrementa `frightened.timer` cada frame.
- [ ] Al llegar `timer` a `0`, todos los `'frightened'` vuelven a `'chase'`.
- [ ] Al colisionar con un fantasma en `'frightened'`, Pac-Man suma `FRIGHTENED_SCORES[combo]` (o `1600` si `combo >= 3`), incrementa `combo`, y el fantasma pasa a `'eaten'`. No pierde vida.
- [ ] Al colisionar con un fantasma en `'eaten'`, no suma puntos ni pierde vida.
- [ ] El estado `'eaten'` mueve al fantasma hacia su celda de inicio en la pen y al llegar pasa a `'leaving_pen'` con `GHOST_SPEED_BASE`.
- [ ] Comer un power pellet durante `frightened` reextiende `timer` a `FRIGHTENED_DURATION` y reinicia `combo` a `0`.
- [ ] `resetPositions` setea `frightened.timer = 0`, `frightened.combo = 0`, y pasa cualquier `'frightened'` a `'chase'` antes de resetear.
- [ ] `drawDots` dibuja los tiles `4` con radio mayor (~6 px) y color `DOT_COLOR`.
- [ ] `drawGhost` dibuja azul (`#2121ff`) los fantasmas en `'frightened'`.
- [ ] En los últimos `FRIGHTENED_FLASH` frames del timer, `drawGhost` alterna entre azul y blanco.
- [ ] `drawGhost` dibuja solo ojos (sin cuerpo) los fantasmas en `'eaten'`.
- [ ] `node --check` pasa para `maze.js`, `game.js`, `render.js` y `main.js`.
- [ ] Cargar `src/index.html` no lanza errores en consola.
- [ ] El juego es jugable de principio a fin sin errores.

## Decisiones tomadas y descartadas

### Tomadas

- **Nuevo tile `4` con caracter `'o'`** en `maze.js`. Permite que `createGame` herede los 4 power pellets en `dotsRemaining` sin lógica extra, manteniendo `MAZE_STR` legible.
- **Posiciones en las esquinas reales del laberinto** `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)` (celdas transitables más externas, en el borde playable). El usuario puso explícitamente los power pellets "en cada esquina del mapa"; se cambió de las posiciones canónicas del arcade `(1,3)` / `(26,3)` / `(1,23)` / `(26,23)` a las esquinas reales tras feedback del usuario tras la primera implementación.
- **Puntaje arcade canónico**: power pellet = 50, fantasmas comidos escalan `200 → 400 → 800 → 1600`. Refleja el comportamiento clásico y la recompensa por combo.
- **Modo frightened independiente del modo scatter.** Cada uno vive en su spec; evita acoplar dos dominios (Spec 04 ya difería scatter).
- **Duración fija `360` frames (~6 s) para nivel 1.** Sin curva decreciente por nivel (fuera de scope).
- **Reverso global inmediato al activar frightened.** Es la señal visual y mecánica icónica del arcade; los fantasmas en `chase`/`leaving_pen` invierten, los `in_pen`/`eaten` no se tocan.
- **Navegación random en intersecciones** (sin 180 salvo callejón). Comportamiento errático característico del modo asustado; reusa la lista de `canMove` válidas ya filtradas por `OPPOSITE`.
- **Velocidad de frightened = `GHOST_SPEED_BASE`.** Más lento que chase, fiel al arcade.
- **Estado `eaten` mientras los ojos vuelven a la pen, reusa `leaving_pen`/`in_pen` del Spec 04 para salir de nuevo.** Evita duplicar lógica de salida de jaula.
- **`EATEN_SPEED = 1/8` (mayor que chase).** Los ojos se mueven rápido como en el arcade.
- **Combo reiniciado a `0` al activar un nuevo power pellet.** Evita sumas infladas y respeta "una vez por power pellet".
- **Reextender el timer al comer otro power pellet durante frightened.** Recompensa el encadenamiento y reusa `startFrightened`.
- **Reset inmediato al perder una vida: frightened timer a `0` y fantasmas vuelven a `chase`.** Evita estados raros al rearmar posiciones.
- **Parpadeo azul/blanco en los últimos `120` frames** (~2 s). Aviso visual estándar antes de que termine la ventana.
- **Snap a celda al ser comido** (`g.x = Math.round(g.x)`, `g.y = Math.round(g.y)` al pasar a `'eaten'`). Necesario porque `EATEN_SPEED = 1/8` y el offset heredado de `frightened` (`1/16`) son incompatibles: sin snap, el fantasma jamás alinea y sale volando del mapa. Detectado en smoke test durante la implementación.

### Descartadas

- **Colocar power pellets sin modo asustado.** Sin frightened, el power pellet no tiene propósito de juego real.
- **Navegación por huida a esquina scatter.** Hace el comportamiento predecible; lo arcade es random.
- **Respawn directo `(13,11)` para el fantasma eaten sin pasar por la pen.** Menos fiel al arcade; reusar `in_pen`/`leaving_pen` conserva coherencia con el Spec 04.
- **Coordinar frightened con el timer global de scatter.** Mezcla dos dominios y enlargnece el spec; scatter queda para otro spec.
- **Animación de ojos con render especial (sprite propio) para `eaten`.** Se dibuja solo el par de ojos sin cuerpo, sin sprite adicional.
- **Curva decreciente de duración por nivel.** Nivel 1 fijo; futuros niveles van en otro spec.
- **Bonus fruit / frutas.** Función no relacionada con power pellets; otro spec si se quiere.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Reverso global deja a un fantasma sin salida válida por estar alineado justo en un callejón | `decideGhost` ya contempla callejón permitiendo 180; el reverso solo invierte `dir`, no fuerza avance si `canMove` falla. |
| Fantasma `eaten` elige un camino que se atora en paredes | Elige menor distancia Manhattan en cada intersección, igual que en `chase`; verificación visual obligatoria al final. |
| Comido un fantasma increíblemente cerca de la pen, `eaten` termina instantáneamente | Funciona: pasa a `leaving_pen` y sale por la puerta. Cubierto por el paso 7. |
| Reset al perder vida durante frightened no reactive liberación de la jaula | `resetPositions` respeta `penRelease` del Spec 04; los contadores se mantienen; los estados regresan a `in_pen`/`leaving_pen` según el índice. |
| Render del fantasma asustado parpadeante consume demasiados frames | Se alterna cada 12 frames (2 alternancias por segundo), costo despreciable. |
| El contador `dotsRemaining` cambia al contar los 4 power pellets | Verificación manual al final confirma que el juego termina al limpiar todo el mapa. |

## Lo que **no** entra en este spec

- Modo scatter global con timers.
- Animación completa de ojos para el estado `eaten` (se dibuja solo el par de ojos, sin sprite animado).
- Curva decreciente de duración de frightened por nivel.
- Bonus fruit / frutas.
- Niveles múltiples con aumento de dificultad.
- Tests automatizados (el proyecto no tiene framework).

Cada uno de esos, si se requiere, va en su propio spec.