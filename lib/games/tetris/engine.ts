// Puerto a TypeScript de references/started-games/03-tetris-commands/game.js
// Misma física/constantes que el original (board, piezas, wall kicks, scoring,
// dropInterval). El motor solo dibuja el tablero (grid, piezas fijas, ghost
// piece y pieza actual) dentro de un único <canvas> — sin HUD ni overlay de
// game over/pausa dibujados en canvas, esos viven en React (GamePlayer.tsx).
// El ciclo de vida (listeners, requestAnimationFrame) queda controlado por
// pause/resume/restart/destroy en vez de ejecutarse una sola vez al cargar.

import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const W = COLS * BLOCK;
const H = ROWS * BLOCK;

const BG = "#1a1a25";
const GRID_LINE = "#22222e";

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngineHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  let board: number[][];
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let gameOver: boolean;
  let dropAccum: number;
  let dropInterval: number;

  let lastScore = -1;
  let lastLines = -1;
  let lastLevel = -1;
  let lastPaused = false;
  let gameOverReported = false;

  function reportState() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScoreChange(score);
    }
    if (lines !== lastLines) {
      lastLines = lines;
      callbacks.onLivesChange(lines);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevelChange(level);
    }
    if (gameOver && !gameOverReported) {
      gameOverReported = true;
      callbacks.onGameOver(score);
    }
  }

  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 8) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: number[][]): number[][] {
    const rows = shape.length,
      cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      gameOver = true;
    }
  }

  function drawBlock(x: number, y: number, colorIndex: number, alpha?: number) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex]!;
    ctx!.globalAlpha = alpha ?? 1;
    ctx!.fillStyle = color;
    ctx!.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    ctx!.fillStyle = "rgba(255,255,255,0.12)";
    ctx!.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 4);
    ctx!.globalAlpha = 1;
  }

  function drawGrid() {
    ctx!.strokeStyle = GRID_LINE;
    ctx!.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx!.beginPath();
      ctx!.moveTo(c * BLOCK, 0);
      ctx!.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx!.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx!.beginPath();
      ctx!.moveTo(0, r * BLOCK);
      ctx!.lineTo(COLS * BLOCK, r * BLOCK);
      ctx!.stroke();
    }
  }

  function draw() {
    ctx!.fillStyle = BG;
    ctx!.fillRect(0, 0, W, H);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c]);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(current.x + c, gy + r, current.shape[r][c], 0.2);

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(current.x + c, current.y + r, current.shape[r][c]);
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    dropInterval = 1000;
    dropAccum = 0;
    gameOverReported = false;
    next = randomPiece();
    spawn();
  }

  function setPaused(next: boolean) {
    if (paused === next || gameOver) return;
    paused = next;
    if (paused !== lastPaused) {
      lastPaused = paused;
      callbacks.onPauseChange?.(paused);
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyP") {
      setPaused(!paused);
      return;
    }
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        e.preventDefault();
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        e.preventDefault();
        tryRotate();
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
      default:
        return;
    }
  };
  window.addEventListener("keydown", onKeyDown);

  let paused = false;
  let rafId = 0;
  let lastTime: number | null = null;
  let running = true;

  function loop(ts: number) {
    if (!running) return;
    if (!paused && !gameOver) {
      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
      draw();
      reportState();
    } else {
      lastTime = ts;
    }
    rafId = requestAnimationFrame(loop);
  }

  initGame();
  draw();
  reportState();
  rafId = requestAnimationFrame(loop);

  return {
    pause() {
      setPaused(true);
    },
    resume() {
      setPaused(false);
    },
    restart() {
      initGame();
      paused = false;
      lastTime = null;
      draw();
      reportState();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
