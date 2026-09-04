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

const BRICK_COLORS_BY_ROW = [
  "hotpink",
  "red",
  "magenta",
  "yellow",
  "green",
  "cyan",
];
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
  color: string;
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
): GameEngineHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  const PADDLE_Y = canvas.height - 40;
  const BRICK_OFFSET_X =
    (canvas.width - (BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP)) / 2;

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
      x: (canvas.width - PADDLE_W) / 2,
      y: PADDLE_Y,
      w: PADDLE_W,
      h: PADDLE_H,
    },
    ball: {
      x: canvas.width / 2,
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
    ctx!.fillRect(0, 0, canvas.width, canvas.height);

    ctx!.fillStyle = "white";
    ctx!.textAlign = "center";

    ctx!.font = "bold 32px sans-serif";
    ctx!.fillText(title, canvas.width / 2, canvas.height / 2 - 10);

    if (subtitle) {
      ctx!.font = "16px sans-serif";
      ctx!.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 24);
    }
    ctx!.restore();
  }

  function drawHud() {
    ctx!.save();
    ctx!.fillStyle = "white";
    ctx!.font = "16px sans-serif";
    ctx!.textAlign = "left";
    ctx!.fillText(`Score: ${state.score}`, 10, 20);

    ctx!.textAlign = "center";
    ctx!.fillText(`Nivel: ${state.level}`, canvas.width / 2, 20);
    ctx!.restore();

    const lifeIconR = 8;
    const lifeIconGap = 6;
    let lifeIconX = canvas.width - 10 - lifeIconR;
    const lifeIconY = 20 - lifeIconR;
    for (let i = 0; i < state.lives; i++) {
      drawSprite(
        ctx!,
        "ball",
        lifeIconX - lifeIconR,
        lifeIconY,
        lifeIconR * 2,
        lifeIconR * 2,
      );
      lifeIconX -= lifeIconR * 2 + lifeIconGap;
    }
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

  function draw(timestamp: number) {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      drawSprite(
        ctx!,
        `block_${brick.color}`,
        brick.x,
        brick.y,
        brick.w,
        brick.h,
      );
    }

    drawExplosions(timestamp);

    drawSprite(
      ctx!,
      "paddle",
      state.paddle.x,
      state.paddle.y,
      state.paddle.w,
      state.paddle.h,
    );
    drawSprite(
      ctx!,
      "ball",
      state.ball.x - state.ball.r,
      state.ball.y - state.ball.r,
      state.ball.r * 2,
      state.ball.r * 2,
    );

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
  }

  function launchBall() {
    const speed = BALL_SPEED * LEVELS[state.level - 1].ballSpeedMultiplier;
    state.ball.x = canvas.width / 2;
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
    state.paddle.x = (canvas.width - state.paddle.w) / 2;
    state.ball.x = canvas.width / 2;
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
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  };

  const onClick = () => {
    handleInput();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("click", onClick);

  function clampPaddleX(x: number): number {
    return Math.max(0, Math.min(canvas.width - state.paddle.w, x));
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
    if (ball.y - ball.r < canvas.height) return;

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
    } else if (ball.x + ball.r > canvas.width) {
      ball.x = canvas.width - ball.r;
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
  };
}
