// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 1 / 13; // ~0.077 celda/frame; alinea cada 13 frames

// Velocidades de fantasmas. Base: Pinky, Inky, Clyde siempre.
// Blinky muta su speed en runtime segun dots restantes (Cruise Elroy).
// Valores fraccionarios para alinearse con la grilla y evitar atravesar paredes.
const GHOST_SPEED_BASE   = 1 / 16; // 0.0625 celda/frame; alinea cada 16 frames
const GHOST_SPEED_ELORY1 = 1 / 15; // ~0.067 celda/frame; alinea cada 15 frames
const GHOST_SPEED_ELORY2 = 1 / 14; // ~0.071 celda/frame; alinea cada 14 frames
const ELORY1_THRESHOLD   = 30;
const ELORY2_THRESHOLD   = 10;
const CLYDE_RADIUS       = 8;     // distancia Manhattan
const PINKY_LOOKAHEAD    = 4;
const INKY_LOOKAHEAD     = 2;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED_BASE,
      name: g.name,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Cruise Elroy: muta la speed de Blinky segun dots restantes.
function applyElroy( g, dotsRemaining ) {
  if ( dotsRemaining < ELORY2_THRESHOLD ) g.speed = GHOST_SPEED_ELORY2;
  else if ( dotsRemaining < ELORY1_THRESHOLD ) g.speed = GHOST_SPEED_ELORY1;
  else g.speed = GHOST_SPEED_BASE;
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;
  const idx = game.ghosts.indexOf( g );
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const pd = DIRS[ p.dir ] || DIRS.left;

  // Target segun personalidad.
  let tx, ty;
  switch ( g.name ) {
    case 'blanca': // Blinky: celda de Pac-Man + Cruise Elroy.
      applyElroy( g, game.dotsRemaining );
      tx = px;
      ty = py;
      break;
    case 'pinky': // 4 celdas adelante de Pac-Man en su direccion.
      tx = px + PINKY_LOOKAHEAD * pd.x;
      ty = py + PINKY_LOOKAHEAD * pd.y;
      break;
    case 'inky': { // reflejo de Blinky respecto al pivot Pac-Man + 2 celdas.
      const pivotX = px + INKY_LOOKAHEAD * pd.x;
      const pivotY = py + INKY_LOOKAHEAD * pd.y;
      const blinky = game.ghosts[ 0 ]; // indice 0 = Blinky (contractual)
      const bx = Math.round( blinky.x );
      const by = Math.round( blinky.y );
      tx = pivotX + ( pivotX - bx );
      ty = pivotY + ( pivotY - by );
      break;
    }
    case 'clyde': { // persigue si Manhattan > 8, si no regresa a su esquina.
      const dist = Math.abs( g.x - px ) + Math.abs( g.y - py );
      const scatter = GHOST_STARTS[ idx ].scatter;
      if ( dist > CLYDE_RADIUS ) {
        tx = px;
        ty = py;
      } else {
        tx = scatter.x;
        ty = scatter.y;
      }
      break;
    }
    default:
      tx = px;
      ty = py;
  }

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Elegir la direccion que produzca la menor distancia Manhattan del
  // siguiente paso al target (sin invertir sentido; callejon permite 180).
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - tx ) + Math.abs( ny - ty );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.speed = GHOST_SPEED_BASE; // Blinky puede haber acelerado (Cruise Elroy)
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
