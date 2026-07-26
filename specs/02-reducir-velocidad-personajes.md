# Spec 02 — Reducir velocidad de personajes

- **Estado:** Aprobado
- **Dependencias:** Spec 01 (`01-fantasmas-personalidad.md`) — ajusta las
  constantes de velocidad introducidas ahí.
- **Fecha:** 2026-07-26
- **Objetivo (una oración):** Reducir proporcionalmente la velocidad de
  Pac-Man y los 4 fantasmas (incluido el Cruise Elroy de Blinky) para que
  el movimiento sea cómodo y controlable a ojo del jugador.

## Alcance

### Dentro del alcance
- Reducir proporcionalmente la velocidad de Pac-Man (`PACMAN_SPEED`).
- Reducir proporcionalmente las velocidades de los 4 fantasmas:
  - `GHOST_SPEED_BASE` (Pinky, Inky, Clyde; y Blinky fuera de Elroy).
  - `GHOST_SPEED_ELORY1` (Blinky cuando `dotsRemaining < 30`).
  - `GHOST_SPEED_ELORY2` (Blinky cuando `dotsRemaining < 10`).
- Factor global único aplicado a las 4 constantes, conservando la
  proporcionalidad del arcade (Blinky Elroy sigue siendo más rápido que
  Blinky base, que sigue igual de rápido que los otros 3).
- Verificación a ojo: el movimiento se ve cómodo y controlable al jugar.

### Fuera del alcance (otros specs)
- Modificar la geometría del laberinto, el túnel o las posiciones de inicio.
- Cambiar la lógica de decisión de los fantasmas (`decideGhost`, `applyElroy`).
- Modificar el comportamiento de Pac-Man (turn-on-a-dime, input buffering,
  control por teclado táctil, etc.).
- Introducir pausa, slow-motion o power-ups que alteran velocidad en runtime.
- Métrica objetiva de velocidad (FPS display, HUD debug) — fuera del spec;
  la verificación es subjetiva del jugador.

### Decisiones cerradas (no reabrir)
- **Factor global único**, no valores por actor con tuning fino individual.
- **Reducción proporcional** (todo escalado por el mismo factor) para
  preservar la intención del arcade (Elroy > base, fantasmas = base entre sí).
- **Factor inicial = 0.6** (valores efectivos: `PACMAN_SPEED = 0.075`,
  `GHOST_SPEED_BASE = 0.06`, `ELORY1 = 0.063`, `ELORY2 = 0.066`).
  Ajustable empíricamente tras la verificación visual del Spec 01, sin
  abrir un nuevo spec.
- **Verificación subjetiva (a ojo)** como criterio principal; respaldo
  numérico (constantes efectivamente reducidas respecto al spec 01) como
  check estático.

## Modelo de datos

No se introducen estructuras nuevas en memoria ni persistencia. Solo se
**reescalan 4 constantes existentes** en `src/js/game.js`:

| Constante             | Valor spec 01 | Valor spec 02 (×0.6) |
|-----------------------|---------------|----------------------|
| `PACMAN_SPEED`        | 0.125         | 0.075                |
| `GHOST_SPEED_BASE`    | 0.1           | 0.06                 |
| `GHOST_SPEED_ELORY1`  | 0.105         | 0.063                |
| `GHOST_SPEED_ELORY2`  | 0.11          | 0.066                |

Sin cambios en `game.state`, `game.score`, `game.lives`, `game.dotsRemaining`,
`game.grid`, `game.ghosts`, `MAZE`, `TUNNEL_ROW`, `PACMAN_START`,
`GHOST_STARTS`, `GHOST_COLORS`.

## Plan de implementación

Cada paso deja el sistema funcional y ejecutable.

1. **Editar las 4 constantes en `src/js/game.js`.**
   Reemplazar los valores actuales por los de la tabla del Modelo de datos,
   aplicando factor ×0.6. Sin tocar ninguna otra línea del archivo.

2. **Verificación manual en navegador.**
   Cargar `src/index.html`:
   - Pac-Man se mueve visiblemente más lento y es controlable.
   - Los 4 fantasmas se mueven más lento, conservando sus personalidades.
   - Blinky sigue acelerando al final (Cruise Elroy) pero por debajo de la
     velocidad anterior.
   - El juego sigue jugable de principio a fin sin errores en consola.

3. **Re-ejecutar** si hace falta ajustar el factor (0.55 más lento, 0.7
   menos lento) tras la verificación empírica. No requiere spec nuevo; son
   los valores definidos en la sección de Decisiones.

## Criterios de aceptación

Checklist booleano (no aspiracional). El spec se considera cumplido solo si
todos son `true`.

- [ ] `PACMAN_SPEED == 0.075` (0.125 × 0.6).
- [ ] `GHOST_SPEED_BASE == 0.06` (0.1 × 0.6).
- [ ] `GHOST_SPEED_ELORY1 == 0.063` (0.105 × 0.6).
- [ ] `GHOST_SPEED_ELORY2 == 0.066` (0.11 × 0.6).
- [ ] Proporción preservada: `ELORY2 > ELORY1 > BASE` (0.066 > 0.063 > 0.06).
- [ ] No se modifica `decideGhost`, `applyElroy`, `resetPositions`, `MAZE`,
      túnel, ni el comportamiento de Pac-Man más allá de su constante de
      velocidad.
- [ ] Al cargar `src/index.html`, el movimiento se ve cómodo y controlable a ojo.
- [ ] El juego sigue jugable de principio a fin: Pac-Man come dots, puede
      ganar y puede perder, sin errores en consola.

## Decisiones tomadas y descartadas

### Tomadas
- **Factor global único ×0.6** aplicado a las 4 constantes. Punto de partida
  empírico cómodo; si tras probar resulta demasiado lento, se sube a ×0.7 sin
  abrir spec nuevo (paso 3 del plan).
- **Reducción proporcional** (mismo factor para todo) para conservar la
  intención del arcade: Blinky Elroy > Blinky base = Pinky = Inky = Clyde.
- **Verificación subjetiva (a ojo)** como criterio principal de aceptación,
  con respaldo numérico (constantes reducidas respecto al spec 01) para
  check estático automático.

### Descartadas (con justificación)
- **Tuning fino por actor** (valores independientes para cada fantasma):
  complejidad sin beneficio claro; el ajuste global ya reduce todo. Si tras
  probar hace falta tuning fino, merece su propio spec.
- **HUD debug con FPS/velocidad** para verificación objetiva: útil en
  desarrollo pero fuera del scope del juego. Falsa sensación de precisión
  frente a la sensación de jugabilidad real.
- **Changes a `decideGhost`/`applyElroy`**: la lógica ya está bien; el
  problema es solo la magnitud de la velocidad, no el comportamiento.
- **Pause / slow-motion / power-ups de velocidad**: eje de gameplay completo
  que justifica specs separados.

## Riesgos identificados

1. **Factor ×0.6 puede resultar demasiado lento.** Los valores efectivos
   (Pac-Man a 4.5 celdas/seg, fantasmas a 3.6 celdas/seg) pueden sentirse
   pesados. **Mitigación:** el paso 3 del plan permite ajustar el factor
   (0.55 más lento, 0.7 menos lento) sin abrir un nuevo spec.

2. **Redondeo de valores decimales.** `0.105 × 0.6 = 0.063` y
   `0.11 × 0.6 = 0.066` son exactos. `0.1 × 0.6 = 0.06` también es exacto.
   Sin riesgo de drift numérico entre constantes: `ELORY2 (0.066) > ELORY1
   (0.063) > BASE (0.06)` se preserva.

3. **Verificación subjetiva no reproducible.** "Cómodo y controlable" depende
   del jugador. **Mitigación:** reportar en el commit final qué jogador
   validó y con qué factor; dejar el checkpoint numérico como respaldo
   objetivo mínimo.