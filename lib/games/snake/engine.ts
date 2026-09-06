// Motor propio del juego Snake (sin referencia de game.js — solo se porta
// fruits.png + sprites.ts, ver spec 09). Grid 20x20, celda 24px, canvas
// 480x480. El ciclo de vida (listeners, requestAnimationFrame) queda
// controlado por pause/resume/restart/destroy, igual que asteroides/tetris/
// arkanoid. El loop usa un acumulador de tiempo sobre requestAnimationFrame
// para avanzar la serpiente cada `tickInterval` ms (velocidad por nivel).

import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";
import { FRUITS, drawFruit, loadFruitSheet } from "./sprites";

const GRID = 20;
const CELL = 24;

const INITIAL_TICK = 150;
const MIN_TICK = 60;
const TICK_STEP = 12;
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;

const FRUIT_NAMES = Object.keys(FRUITS);

interface Skin {
  boardBg: string;
  gridLine: string;
  snakeHead: string;
  snakeBody: string;
  /** Highlight sutil al tope de cada segmento (retro). */
  segmentHighlight?: string;
  /** Glow neon: shadowBlur + shadowColor en cabeza/cuerpo/fruta. */
  glow?: boolean;
  glowColor?: string;
  /** Contorno brillante adicional (neon). */
  segmentStroke?: string;
  cornerRadius: number;
}

const SKINS: Record<string, Skin> = {
  classic: {
    boardBg: "#1a1a25",
    gridLine: "#22222e",
    snakeHead: "#a3e635",
    snakeBody: "#39ff14",
    cornerRadius: 6,
  },
  retro: {
    boardBg: "#221f3d",
    gridLine: "#3a3566",
    snakeHead: "#ffd23f",
    snakeBody: "#f4845f",
    segmentHighlight: "rgba(255, 255, 255, 0.35)",
    cornerRadius: 2,
  },
  neon: {
    boardBg: "#000000",
    gridLine: "#1a0033",
    snakeHead: "#00f0ff",
    snakeBody: "#ff00e6",
    glow: true,
    glowColor: "#00f0ff",
    segmentStroke: "#ffffff",
    cornerRadius: 4,
  },
};

interface Vec {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
  fruit: string;
}

type Status = "playing" | "gameover";

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
  skinKey?: string,
): GameEngineHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  let currentSkin: Skin = SKINS[skinKey ?? "classic"] ?? SKINS.classic;

  let snake: Vec[];
  let direction: Vec;
  let nextDirection: Vec;
  let food: Food;
  let score: number;
  let level: number;
  let fruitsEaten: number;
  let tickInterval: number;
  let status: Status;

  let lastScore = -1;
  let lastLevel = -1;
  let gameOverReported = false;

  function reportState() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScoreChange(score);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevelChange(level);
    }
    if (status === "gameover" && !gameOverReported) {
      gameOverReported = true;
      callbacks.onGameOver(score);
    }
  }

  function randomFruitExcept(exclude?: string): string {
    if (FRUIT_NAMES.length <= 1) return FRUIT_NAMES[0];
    let name: string;
    do {
      name = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
    } while (name === exclude);
    return name;
  }

  function spawnFood(): Food {
    const empty: Vec[] = [];
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        if (!snake.some((s) => s.x === x && s.y === y)) {
          empty.push({ x, y });
        }
      }
    }
    const cell = empty[Math.floor(Math.random() * empty.length)];
    return {
      x: cell.x,
      y: cell.y,
      fruit: randomFruitExcept(food?.fruit),
    };
  }

  function initGame() {
    const startY = Math.floor(GRID / 2);
    snake = [
      { x: 8, y: startY },
      { x: 7, y: startY },
      { x: 6, y: startY },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    level = 1;
    fruitsEaten = 0;
    tickInterval = INITIAL_TICK;
    status = "playing";
    gameOverReported = false;
    food = spawnFood();
  }

  function drawRoundedCell(x: number, y: number, color: string) {
    const pad = 2;
    const px = x * CELL + pad;
    const py = y * CELL + pad;
    const size = CELL - pad * 2;
    const r = currentSkin.cornerRadius;

    if (currentSkin.glow) {
      ctx!.save();
      ctx!.shadowBlur = 12;
      ctx!.shadowColor = currentSkin.glowColor ?? color;
    }

    ctx!.fillStyle = color;
    ctx!.beginPath();
    ctx!.roundRect(px, py, size, size, r);
    ctx!.fill();

    if (currentSkin.glow) {
      ctx!.restore();
      if (currentSkin.segmentStroke) {
        ctx!.strokeStyle = currentSkin.segmentStroke;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.roundRect(px, py, size, size, r);
        ctx!.stroke();
      }
    }

    if (currentSkin.segmentHighlight) {
      ctx!.fillStyle = currentSkin.segmentHighlight;
      ctx!.fillRect(px, py, size, 4);
    }
  }

  function drawGrid() {
    ctx!.strokeStyle = currentSkin.gridLine;
    ctx!.lineWidth = 0.5;
    for (let c = 1; c < GRID; c++) {
      ctx!.beginPath();
      ctx!.moveTo(c * CELL, 0);
      ctx!.lineTo(c * CELL, GRID * CELL);
      ctx!.stroke();
    }
    for (let r = 1; r < GRID; r++) {
      ctx!.beginPath();
      ctx!.moveTo(0, r * CELL);
      ctx!.lineTo(GRID * CELL, r * CELL);
      ctx!.stroke();
    }
  }

  function draw() {
    ctx!.fillStyle = currentSkin.boardBg;
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    if (currentSkin.glow) {
      ctx!.save();
      ctx!.shadowBlur = 10;
      ctx!.shadowColor = "#ffffff";
      drawFruit(ctx!, food.fruit, food.x * CELL, food.y * CELL, CELL, CELL);
      ctx!.restore();
    } else {
      drawFruit(ctx!, food.fruit, food.x * CELL, food.y * CELL, CELL, CELL);
    }

    snake.forEach((segment, i) => {
      drawRoundedCell(
        segment.x,
        segment.y,
        i === 0 ? currentSkin.snakeHead : currentSkin.snakeBody,
      );
    });
  }

  function tick() {
    if (nextDirection.x !== -direction.x || nextDirection.y !== -direction.y) {
      direction = nextDirection;
    }

    const head = snake[0];
    const newHead: Vec = { x: head.x + direction.x, y: head.y + direction.y };

    if (
      newHead.x < 0 ||
      newHead.x >= GRID ||
      newHead.y < 0 ||
      newHead.y >= GRID ||
      snake.some((s) => s.x === newHead.x && s.y === newHead.y)
    ) {
      status = "gameover";
      return;
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
      score += POINTS_PER_FRUIT;
      fruitsEaten += 1;
      if (fruitsEaten % FRUITS_PER_LEVEL === 0) {
        level += 1;
        tickInterval = Math.max(MIN_TICK, tickInterval - TICK_STEP);
      }
      food = spawnFood();
    } else {
      snake.pop();
    }
  }

  function setDirection(x: number, y: number) {
    if (status !== "playing") return;
    nextDirection = { x, y };
  }

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        e.preventDefault();
        setDirection(0, -1);
        break;
      case "ArrowDown":
      case "KeyS":
        e.preventDefault();
        setDirection(0, 1);
        break;
      case "ArrowLeft":
      case "KeyA":
        e.preventDefault();
        setDirection(-1, 0);
        break;
      case "ArrowRight":
      case "KeyD":
        e.preventDefault();
        setDirection(1, 0);
        break;
      default:
        return;
    }
  };
  window.addEventListener("keydown", onKeyDown);

  let paused = false;
  let rafId = 0;
  let lastTime: number | null = null;
  let tickAccum = 0;
  let running = true;

  function loop(ts: number) {
    if (!running) return;
    if (!paused && status === "playing") {
      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;
      tickAccum += dt;
      if (tickAccum >= tickInterval) {
        tickAccum = 0;
        tick();
      }
      draw();
      reportState();
    } else {
      lastTime = ts;
    }
    rafId = requestAnimationFrame(loop);
  }

  initGame();

  loadFruitSheet(() => {
    if (!running) return;
    draw();
    reportState();
    callbacks.onLivesChange(1);
    rafId = requestAnimationFrame(loop);
  });

  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    restart() {
      initGame();
      paused = false;
      lastTime = null;
      tickAccum = 0;
      draw();
      reportState();
    },
    setSkin(nextSkinKey: string) {
      currentSkin = SKINS[nextSkinKey] ?? SKINS.classic;
      if (running) draw();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
