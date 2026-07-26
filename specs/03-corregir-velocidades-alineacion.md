# Spec 03 — Corregir velocidades para alineación con la grilla

> **Estado:** Implementado
> **Dependencias:** Spec 02 (`reducir-velocidad-personajes.md`)
> **Fecha:** 2026-07-26
> **Objetivo:** Reemplazar las velocidades decimales del Spec 02 por fracciones que se alineen con las celdas del laberinto para eliminar el atravesamiento de paredes, la pérdida de dots y el bloqueo de fantasmas.

## Alcance

### Dentro del alcance

- Corregir `PACMAN_SPEED`, `GHOST_SPEED_BASE`, `GHOST_SPEED_ELORY1` y `GHOST_SPEED_ELORY2` en `src/js/game.js`.
- Elegir valores fraccionarios que alineen al personaje con una celda entera en ≤ 20 frames.
- Preservar las proporciones: Pac-Man más rápido que los fantasmas, y Blinky Elroy más rápido que su velocidad base.
- Actualizar los comentarios de las constantes para reflejar la razón de la fracción.

### Fuera del alcance (otros specs)

- Cambiar la lógica de movimiento (`aligned`, `movePacman`, `moveGhost`, `decideGhost`).
- Modificar la geometría del laberinto, el túnel o las posiciones de inicio.
- Agregar un sistema de configuración externa para las velocidades.
- Crear un HUD de debug de velocidad o FPS.

## Modelo de datos

No se introducen estructuras nuevas. Solo se **reemplazan 4 constantes literales** en `src/js/game.js`:

```js
const PACMAN_SPEED       = 1 / 13; // ~0.077 celda/frame
const GHOST_SPEED_BASE   = 1 / 16; // 0.0625 celda/frame
const GHOST_SPEED_ELORY1 = 1 / 15; // ~0.067 celda/frame
const GHOST_SPEED_ELORY2 = 1 / 14; // ~0.071 celda/frame
```

El resto del modelo (`game.state`, `game.score`, `game.lives`, `game.dotsRemaining`, `game.grid`, `game.pacman`, `game.ghosts`, `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`, `GHOST_COLORS`) permanece sin cambios.

## Plan de implementación

1. **Editar las constantes de velocidad en `src/js/game.js`.**
   - Reemplazar los valores decimales por fracciones con denominadores que dividan celdas enteras.
   - Ajustar los comentarios para indicar el valor aproximado y la frecuencia de alineación.

2. **Verificar alineación con script.
   Confirmar que cada velocidad alcanza una posición entera en menos de 20 frames y que el orden de velocidades se conserva.

3. **Verificar sintaxis.
   Ejecutar `node --check` sobre `src/js/game.js`, `src/js/maze.js`, `src/js/render.js` y `src/js/main.js`.

4. **Verificación visual en navegador.
   Cargar `src/index.html` y confirmar:
   - Los fantasmas se mueven continuamente sin quedarse fijos.
   - Pac-Man come los dots al pasar sobre ellos.
   - Pac-Man no atraviesa paredes.
   - El juego sigue jugable de principio a fin sin errores en consola.

## Criterios de aceptación

- [ ] `src/js/game.js` usa `PACMAN_SPEED = 1 / 13`.
- [ ] `src/js/game.js` usa `GHOST_SPEED_BASE = 1 / 16`.
- [ ] `src/js/game.js` usa `GHOST_SPEED_ELORY1 = 1 / 15`.
- [ ] `src/js/game.js` usa `GHOST_SPEED_ELORY2 = 1 / 14`.
- [ ] Cada velocidad se alinea con una celda entera en ≤ 20 frames.
- [ ] Se conserva el orden: `PACMAN_SPEED > GHOST_SPEED_ELORY2 > GHOST_SPEED_ELORY1 > GHOST_SPEED_BASE`.
- [ ] No se modifica `movePacman`, `moveGhost`, `decideGhost`, `aligned`, `MAZE`, túnel ni posiciones de inicio.
- [ ] `node --check` pasa para todos los archivos JS.
- [ ] Al cargar `src/index.html`, fantasmas no se traban, Pac-Man come dots y respeta paredes.

## Decisiones tomadas y descartadas

### Tomadas

- **Usar fracciones con denominadores pequeños** en lugar de los decimales del Spec 02. Es la forma más simple de mantener la intención del Spec 02 (velocidades reducidas) sin romper la lógica de alineación a celda entera.
- **Alineación frecuente** (≤ 16 frames) para que `movePacman` y `moveGhost` reaccionen a paredes, dots y cruces en cada celda.
- **Preservar la proporción arcade** aunque los valores exactos difieran ligeramente de los decimales ×0.6 del Spec 02.

### Descartadas

- **Modificar `aligned` o la lógica de movimiento** para soportar velocidades decimales arbitrarias. Requiere reescribir la detección de cruces y colisiones; la solución de fracciones es más pequeña y menos riesgosa.
- **Volver a las velocidades originales del Spec 01** (0.125, 0.1, 0.105, 0.11). El objetivo de reducir la velocidad sigue válido; solo cambia la representación numérica.
- **Aumentar la tolerancia de `aligned`** (por ejemplo, de `1e-3` a `0.05`). Es un parche frágil que podría causar que los personajes se alineen a celdas equivocadas o reboten de forma inestable.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Las nuevas velocidades se sientan ligeramente distintas a las del Spec 02. | Los valores están dentro del 10 % de los decimales originales y se ajustarán por observación visual; el cambio se documenta explícitamente. |
| Futuros cambios de velocidad vuelvan a elegir decimales no alineables. | El comentario de cada constante indica que debe ser fracción de celda entera; las revisiones futuras deben verificar la alineación. |

## Lo que **no** entra en este spec

- Reescribir `movePacman` o `moveGhost`.
- Agregar nuevos modos de velocidad (power-ups, slow-motion, etc.).
- Cambiar la geometría del laberinto.
- Agregar tests automatizados (el proyecto no tiene framework de tests en este momento).

Cada uno de esos, si se requiere, merece su propio spec.
