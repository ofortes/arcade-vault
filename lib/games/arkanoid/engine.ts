// Puerto a TypeScript de references/started-games/04-arkanoid/script.js
// Misma física/constantes que el original (paddle, ball, bricks, niveles,
// ángulos de rebote de paleta). El motor dibuja vía el spritesheet portado
// (./spritesheet.ts), incluida la animación de explosión al romper un
// ladrillo, y conserva drawHud/drawOverlay dentro del canvas igual que el
// original. El ciclo de vida (listeners, requestAnimationFrame) queda
// controlado por pause/resume/restart/destroy en vez de ejecutarse una sola
// vez al cargar. onGameOver solo se dispara cuando status llega a 'lose'
// (perder las 3 vidas) — completar los 3 niveles ('win') reinicia la
// partida automáticamente sin pasar por el modal de fin de partida.

import type {
  GameEngineCallbacks,
  GameEngineHandle,
} from "@/lib/games/registry";
import {
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  drawFrame,
  drawSprite,
  loadSpritesheet,
} from "./spritesheet";

type Status =
  "start" | "playing" | "life-lost" | "level-complete" | "win" | "lose";

interface LevelConfig {
  rows: number;
  layout: number[][] | null;
  ballSpeedMultiplier: number;
}

const LEVELS: LevelConfig[] = [
  {
    rows: 8,
    layout: null,
    ballSpeedMultiplier: 1,
  },
  {
    rows: 9,
    layout: [
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

type BrickColorKey =
  "hotpink" | "red" | "magenta" | "yellow" | "green" | "cyan";

const BRICK_COLORS_BY_ROW: BrickColorKey[] = [
  "hotpink",
  "red",
  "magenta",
  "yellow",
  "green",
  "cyan",
];

// --- Skins -----------------------------------------------------------
// "classic" reutiliza el spritesheet original (arte NES portado). Los
// skins "retro" y "neon" dibujan los ladrillos/paddle/ball como vectores
// (fillRect/strokeRect) para poder aplicarles paleta e efectos propios sin
// depender del atlas de sprites.
interface Skin {
  key: string;
  mode: "sprite" | "vector";
  boardBg: string | null;
  hudColor: string;
  paddleColor: string;
  ballColor: string;
  brickPalette: Record<BrickColorKey, string>;
  brickHighlight: boolean;
  glow: boolean;
  strokeOutline: boolean;
}

const SKINS: Record<string, Skin> = {
  // Paleta arcade original (arte NES vía spritesheet ya existente).
  classic: {
    key: "classic",
    mode: "sprite",
    boardBg: null,
    hudColor: "white",
    paddleColor: "white",
    ballColor: "white",
    brickPalette: {
      hotpink: "hotpink",
      red: "red",
      magenta: "magenta",
      yellow: "yellow",
      green: "green",
      cyan: "cyan",
    },
    brickHighlight: false,
    glow: false,
    strokeOutline: false,
  },
  // CRT: colores saturados/pastel, sin brillo, highlight sutil al tope.
  retro: {
    key: "retro",
    mode: "vector",
    boardBg: "#1a1a2e",
    hudColor: "#f5f0e6",
    paddleColor: "#f5f0e6",
    ballColor: "#f5f0e6",
    brickPalette: {
      hotpink: "#e0668c",
      red: "#d4574a",
      magenta: "#b569c9",
      yellow: "#e0c15c",
      green: "#5cad6b",
      cyan: "#5ca8c9",
    },
    brickHighlight: true,
    glow: false,
    strokeOutline: false,
  },
  // Eléctrico: shadowBlur + contornos brillantes, fondo negro puro.
  neon: {
    key: "neon",
    mode: "vector",
    boardBg: "#000000",
    hudColor: "#00fff2",
    paddleColor: "#2bf5ff",
    ballColor: "#ffffff",
    brickPalette: {
      hotpink: "#ff2bd6",
      red: "#ff2b4d",
      magenta: "#c92bff",
      yellow: "#faff2b",
      green: "#2bff6a",
      cyan: "#2bf5ff",
    },
    brickHighlight: false,
    glow: true,
    strokeOutline: true,
  },
};

const BRICK_COLS = 8;
const BRICK_POINTS = 10;
const INITIAL_LIVES = 3;

const BRICK_W = 48;
const BRICK_H = 20;
const BRICK_GAP = 4;
const BRICK_OFFSET_Y = 40;

const PADDLE_W = 80;
const PADDLE_H = 14;

const BALL_R = 8;
const PADDLE_SPEED = 7;
const BALL_SPEED = 5;
const PADDLE_BOUNCE_ANGLES = [-60, -30, 0, 30, 60];

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BrickColorKey;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  startTime: number;
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
  skinKey?: string,
): GameEngineHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  // El motor trabaja siempre en coordenadas lógicas (448x600, el tamaño con
  // el que se monta el canvas). El backing store físico se escala por DPR
  // para nitidez en pantallas de alta densidad; ctx.scale compensa esa
  // escala una sola vez para que el resto del código no tenga que saber de
  // DPR.
  const LOGICAL_WIDTH = canvas.width;
  const LOGICAL_HEIGHT = canvas.height;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = LOGICAL_WIDTH * dpr;
  canvas.height = LOGICAL_HEIGHT * dpr;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;

  let currentSkin: Skin = SKINS[skinKey ?? "classic"] ?? SKINS.classic;

  const PADDLE_Y = LOGICAL_HEIGHT - 40;
  const BRICK_OFFSET_X =
    (LOGICAL_WIDTH - (BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP)) / 2;

  const ballBounceSound =
    typeof Audio !== "undefined"
      ? new Audio("/sounds/arkanoid/ball-bounce.mp3")
      : null;
  const breakSound =
    typeof Audio !== "undefined"
      ? new Audio("/sounds/arkanoid/break-sound.mp3")
      : null;

  function playSound(audio: HTMLAudioElement | null) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  const state = {
    status: "start" as Status,
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    paddle: {
      x: (LOGICAL_WIDTH - PADDLE_W) / 2,
      y: PADDLE_Y,
      w: PADDLE_W,
      h: PADDLE_H,
    },
    ball: {
      x: LOGICAL_WIDTH / 2,
      y: PADDLE_Y - BALL_R,
      vx: 0,
      vy: 0,
      r: BALL_R,
    },
    bricks: [] as Brick[],
    explosions: [] as Explosion[],
  };

  let lastScore = -1;
  let lastLives = -1;
  let lastLevel = -1;
  let gameOverReported = false;

  function reportState() {
    if (state.score !== lastScore) {
      lastScore = state.score;
      callbacks.onScoreChange(state.score);
    }
    if (state.lives !== lastLives) {
      lastLives = state.lives;
      callbacks.onLivesChange(state.lives);
    }
    if (state.level !== lastLevel) {
      lastLevel = state.level;
      callbacks.onLevelChange(state.level);
    }
    if (state.status === "lose" && !gameOverReported) {
      gameOverReported = true;
      callbacks.onGameOver(state.score);
    }
  }

  function createBricks(): Brick[] {
    const levelConfig = LEVELS[state.level - 1];
    const bricks: Brick[] = [];
    for (let row = 0; row < levelConfig.rows; row++) {
      const color = BRICK_COLORS_BY_ROW[row % BRICK_COLORS_BY_ROW.length];
      for (let col = 0; col < BRICK_COLS; col++) {
        if (levelConfig.layout && levelConfig.layout[row][col] === 0) continue;
        bricks.push({
          x: BRICK_OFFSET_X + col * (BRICK_W + BRICK_GAP),
          y: BRICK_OFFSET_Y + row * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          color,
          alive: true,
        });
      }
    }
    return bricks;
  }

  function drawOverlay(title: string, subtitle?: string) {
    ctx!.save();
    ctx!.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx!.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx!.fillStyle = "white";
    ctx!.textAlign = "center";

    ctx!.font = "bold 32px sans-serif";
    ctx!.fillText(title, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 10);

    if (subtitle) {
      ctx!.font = "16px sans-serif";
      ctx!.fillText(subtitle, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 24);
    }
    ctx!.restore();
  }

  function drawHud() {
    ctx!.save();
    ctx!.fillStyle = currentSkin.hudColor;
    ctx!.font = "16px sans-serif";
    ctx!.textAlign = "left";
    ctx!.fillText(`Score: ${state.score}`, 10, 20);

    ctx!.textAlign = "center";
    ctx!.fillText(`Nivel: ${state.level}`, LOGICAL_WIDTH / 2, 20);
    ctx!.restore();

    const lifeIconR = 8;
    const lifeIconGap = 6;
    let lifeIconX = LOGICAL_WIDTH - 10 - lifeIconR;
    const lifeIconY = 20 - lifeIconR;
    for (let i = 0; i < state.lives; i++) {
      if (currentSkin.mode === "sprite") {
        drawSprite(
          ctx!,
          "ball",
          lifeIconX - lifeIconR,
          lifeIconY,
          lifeIconR * 2,
          lifeIconR * 2,
        );
      } else {
        // Mismo criterio que en drawBrick: save()/restore() solo cuando el
        // skin tiene glow, para no pagar el costo por cada uno de hasta 3
        // iconos de vida por frame.
        const glow = currentSkin.glow;
        if (glow) {
          ctx!.save();
          ctx!.shadowBlur = 8;
          ctx!.shadowColor = currentSkin.ballColor;
        }
        ctx!.fillStyle = currentSkin.ballColor;
        ctx!.beginPath();
        ctx!.arc(
          lifeIconX - lifeIconR,
          lifeIconY + lifeIconR,
          lifeIconR,
          0,
          Math.PI * 2,
        );
        ctx!.fill();
        if (glow) ctx!.restore();
      }
      lifeIconX -= lifeIconR * 2 + lifeIconGap;
    }
  }

  function drawBrick(brick: Brick) {
    if (currentSkin.mode === "sprite") {
      drawSprite(
        ctx!,
        `block_${brick.color}`,
        brick.x,
        brick.y,
        brick.w,
        brick.h,
      );
      return;
    }

    const color = currentSkin.brickPalette[brick.color];
    const glow = currentSkin.glow;
    // ctx.save()/ctx.restore() se llaman solo cuando el skin tiene glow
    // (única condición que necesita aislar shadowBlur/shadowColor); el resto
    // de propiedades (fillStyle, strokeStyle, lineWidth) se sobreescriben en
    // cada llamada, así que no hace falta empujar/restaurar la pila de
    // contexto por cada uno de hasta 80 ladrillos por frame. Mismo patrón
    // que drawEntity en components/games/FroggerGame.tsx.
    if (glow) {
      ctx!.save();
      ctx!.shadowBlur = 12;
      ctx!.shadowColor = color;
    }
    ctx!.fillStyle = color;
    ctx!.fillRect(brick.x, brick.y, brick.w, brick.h);

    if (currentSkin.strokeOutline) {
      if (glow) ctx!.shadowBlur = 0;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 2;
      ctx!.strokeRect(brick.x + 1, brick.y + 1, brick.w - 2, brick.h - 2);
    }

    if (currentSkin.brickHighlight) {
      if (glow) ctx!.shadowBlur = 0;
      ctx!.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx!.fillRect(brick.x, brick.y, brick.w, 4);
    }
    if (glow) ctx!.restore();
  }

  function drawPaddle() {
    if (currentSkin.mode === "sprite") {
      drawSprite(
        ctx!,
        "paddle",
        state.paddle.x,
        state.paddle.y,
        state.paddle.w,
        state.paddle.h,
      );
      return;
    }
    ctx!.save();
    if (currentSkin.glow) {
      ctx!.shadowBlur = 10;
      ctx!.shadowColor = currentSkin.paddleColor;
    }
    ctx!.fillStyle = currentSkin.paddleColor;
    ctx!.fillRect(
      state.paddle.x,
      state.paddle.y,
      state.paddle.w,
      state.paddle.h,
    );
    if (currentSkin.strokeOutline) {
      ctx!.shadowBlur = 0;
      ctx!.strokeStyle = currentSkin.paddleColor;
      ctx!.lineWidth = 2;
      ctx!.strokeRect(
        state.paddle.x + 1,
        state.paddle.y + 1,
        state.paddle.w - 2,
        state.paddle.h - 2,
      );
    }
    ctx!.restore();
  }

  function drawBall() {
    if (currentSkin.mode === "sprite") {
      drawSprite(
        ctx!,
        "ball",
        state.ball.x - state.ball.r,
        state.ball.y - state.ball.r,
        state.ball.r * 2,
        state.ball.r * 2,
      );
      return;
    }
    ctx!.save();
    if (currentSkin.glow) {
      ctx!.shadowBlur = 10;
      ctx!.shadowColor = currentSkin.ballColor;
    }
    ctx!.fillStyle = currentSkin.ballColor;
    ctx!.beginPath();
    ctx!.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx!.fill();
    ctx!.restore();
  }

  function drawExplosions(timestamp: number) {
    const frameDuration = EXPLOSION_DURATION / 4;
    for (const explosion of state.explosions) {
      const frameIndex = Math.min(
        3,
        Math.floor((timestamp - explosion.startTime) / frameDuration),
      );
      const frame = EXPLOSION_FRAMES[explosion.color][frameIndex];
      drawFrame(
        ctx!,
        frame,
        explosion.x,
        explosion.y,
        explosion.w,
        explosion.h,
      );
    }
  }

  const DEV_FPS_OVERLAY = process.env.NODE_ENV === "development";
  let fpsInstant = 0;
  let fpsAvg = 0;
  let fpsMin = Infinity;
  let fpsFrameCount = 0;
  let fpsElapsedMs = 0;
  let fpsLastTime: number | null = null;

  function drawFpsOverlay() {
    const w = 160;
    const h = 18;
    const x = LOGICAL_WIDTH - w;
    const y = LOGICAL_HEIGHT - h;
    ctx!.save();
    ctx!.fillStyle = "rgba(0,0,0,0.6)";
    ctx!.fillRect(x, y, w, h);
    ctx!.font = "11px monospace";
    ctx!.textAlign = "right";
    ctx!.textBaseline = "middle";
    ctx!.fillStyle = "#00ff6a";
    const min = fpsMin === Infinity ? 0 : fpsMin;
    ctx!.fillText(
      `FPS ${fpsInstant.toFixed(0)} avg ${fpsAvg.toFixed(0)} min ${min.toFixed(0)}`,
      x + w - 6,
      y + h / 2 + 1,
    );
    ctx!.restore();
  }

  function draw(timestamp: number) {
    ctx!.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    if (currentSkin.boardBg) {
      ctx!.fillStyle = currentSkin.boardBg;
      ctx!.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }

    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      drawBrick(brick);
    }

    drawExplosions(timestamp);

    drawPaddle();
    drawBall();

    drawHud();

    if (state.status === "start") {
      drawOverlay("Arkanoid", "Pulsa espacio o haz clic para jugar");
    } else if (state.status === "life-lost") {
      drawOverlay("Vida perdida", "Pulsa espacio o haz clic para continuar");
    } else if (state.status === "level-complete") {
      drawOverlay(
        `Nivel ${state.level} completado`,
        "Pulsa espacio o haz clic para continuar",
      );
    } else if (state.status === "win") {
      drawOverlay("Victoria!", "Pulsa espacio o haz clic para volver a jugar");
    } else if (state.status === "lose") {
      drawOverlay("Game Over", "Pulsa espacio o haz clic para volver a jugar");
    }

    if (DEV_FPS_OVERLAY) drawFpsOverlay();
  }

  function launchBall() {
    const speed = BALL_SPEED * LEVELS[state.level - 1].ballSpeedMultiplier;
    state.ball.x = LOGICAL_WIDTH / 2;
    state.ball.y = PADDLE_Y - BALL_R;
    state.ball.vx = speed * 0.6;
    state.ball.vy = -speed;
  }

  function startGame() {
    if (state.status !== "start") return;
    state.status = "playing";
    launchBall();
  }

  function resetBallAndPaddle() {
    state.paddle.x = (LOGICAL_WIDTH - state.paddle.w) / 2;
    state.ball.x = LOGICAL_WIDTH / 2;
    state.ball.y = PADDLE_Y - BALL_R;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.explosions = [];
  }

  function resumeAfterLifeLost() {
    if (state.status !== "life-lost") return;
    state.status = "playing";
    launchBall();
  }

  function advanceLevel() {
    if (state.status !== "level-complete") return;
    state.level += 1;
    state.bricks = createBricks();
    resetBallAndPaddle();
    state.status = "playing";
    launchBall();
  }

  function resetGame() {
    state.score = 0;
    state.lives = INITIAL_LIVES;
    state.level = 1;
    state.bricks = createBricks();
    resetBallAndPaddle();
    state.status = "start";
    gameOverReported = false;
  }

  function handleInput() {
    if (paused) return;
    if (state.status === "start") startGame();
    else if (state.status === "life-lost") resumeAfterLifeLost();
    else if (state.status === "level-complete") advanceLevel();
    else if (state.status === "win" || state.status === "lose") resetGame();
  }

  const keys = { left: false, right: false };
  let mouseX: number | null = null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      handleInput();
    }
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  };

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (LOGICAL_WIDTH / rect.width);
  };

  const onClick = () => {
    handleInput();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("click", onClick);

  function clampPaddleX(x: number): number {
    return Math.max(0, Math.min(LOGICAL_WIDTH - state.paddle.w, x));
  }

  function updatePaddle() {
    if (mouseX !== null) {
      state.paddle.x = clampPaddleX(mouseX - state.paddle.w / 2);
    }
    if (keys.left) state.paddle.x = clampPaddleX(state.paddle.x - PADDLE_SPEED);
    if (keys.right)
      state.paddle.x = clampPaddleX(state.paddle.x + PADDLE_SPEED);
  }

  function checkPaddleCollision() {
    const ball = state.ball;
    const paddle = state.paddle;

    if (ball.vy <= 0) return;
    const ballBottom = ball.y + ball.r;
    const paddleTop = paddle.y;
    if (ballBottom < paddleTop || ball.y > paddle.y + paddle.h) return;
    if (ball.x + ball.r < paddle.x || ball.x - ball.r > paddle.x + paddle.w)
      return;

    const hitRatio = Math.max(0, Math.min(1, (ball.x - paddle.x) / paddle.w));
    const stripeIndex = Math.min(
      PADDLE_BOUNCE_ANGLES.length - 1,
      Math.floor(hitRatio * PADDLE_BOUNCE_ANGLES.length),
    );
    const angleRad = PADDLE_BOUNCE_ANGLES[stripeIndex] * (Math.PI / 180);
    const speed = BALL_SPEED * LEVELS[state.level - 1].ballSpeedMultiplier;

    ball.vx = speed * Math.sin(angleRad);
    ball.vy = -speed * Math.cos(angleRad);
    ball.y = paddleTop - ball.r;
    playSound(ballBounceSound);
  }

  function checkBrickCollision(timestamp: number) {
    const ball = state.ball;

    for (const brick of state.bricks) {
      if (!brick.alive) continue;

      const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
      const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;

      if (dx * dx + dy * dy > ball.r * ball.r) continue;

      brick.alive = false;
      ball.vy *= -1;
      state.score += BRICK_POINTS;
      playSound(breakSound);
      state.explosions.push({
        x: brick.x,
        y: brick.y,
        w: brick.w,
        h: brick.h,
        color: brick.color,
        startTime: timestamp,
      });
      break;
    }

    if (state.bricks.every((b) => !b.alive)) {
      state.status = state.level < LEVELS.length ? "level-complete" : "win";
    }
  }

  function checkFloorCollision() {
    const ball = state.ball;
    if (ball.y - ball.r < LOGICAL_HEIGHT) return;

    state.lives -= 1;
    if (state.lives > 0) {
      state.status = "life-lost";
      resetBallAndPaddle();
    } else {
      state.status = "lose";
    }
  }

  function updateBall(timestamp: number) {
    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx *= -1;
      playSound(ballBounceSound);
    } else if (ball.x + ball.r > LOGICAL_WIDTH) {
      ball.x = LOGICAL_WIDTH - ball.r;
      ball.vx *= -1;
      playSound(ballBounceSound);
    }

    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy *= -1;
      playSound(ballBounceSound);
    }

    checkPaddleCollision();
    checkBrickCollision(timestamp);
    checkFloorCollision();
  }

  function updateExplosions(timestamp: number) {
    state.explosions = state.explosions.filter(
      (explosion) => timestamp - explosion.startTime < EXPLOSION_DURATION,
    );
  }

  function update(timestamp: number) {
    if (paused) return;
    updatePaddle();
    if (state.status === "playing") {
      updateBall(timestamp);
    }
    updateExplosions(timestamp);
  }

  state.bricks = createBricks();

  let paused = false;
  let rafId = 0;
  let running = true;

  function loop(timestamp: number) {
    if (!running) return;
    if (DEV_FPS_OVERLAY) {
      const dt = fpsLastTime === null ? 0 : timestamp - fpsLastTime;
      fpsLastTime = timestamp;
      if (dt > 0 && dt < 250) {
        fpsInstant = 1000 / dt;
        fpsFrameCount += 1;
        fpsElapsedMs += dt;
        fpsAvg = (fpsFrameCount / fpsElapsedMs) * 1000;
        if (fpsInstant < fpsMin) fpsMin = fpsInstant;
      }
    }
    update(timestamp);
    draw(timestamp);
    reportState();
    rafId = requestAnimationFrame(loop);
  }

  loadSpritesheet(() => {
    if (!running) return;
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
      resetGame();
      mouseX = null;
      keys.left = false;
      keys.right = false;
      paused = false;
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
    },
    setSkin(nextSkinKey: string) {
      currentSkin = SKINS[nextSkinKey] ?? SKINS.classic;
    },
  };
}
