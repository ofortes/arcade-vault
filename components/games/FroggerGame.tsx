"use client";

import { useEffect, useRef } from "react";

interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skinKey?: string;
}

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

type Direction = "up" | "down" | "left" | "right";

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildRoadLane(
  row: number,
  dir: 1 | -1,
  baseSpeed: number,
  level: number,
): Lane {
  const entities: Entity[] = [];
  let col = randInt(0, 3);
  while (col < COLS + 4) {
    const type: Entity["type"] = Math.random() < 0.35 ? "truck" : "car";
    const width = type === "truck" ? randInt(2, 3) : randInt(1, 2);
    entities.push({ col, width, type });
    col += width + randInt(2, 4);
  }
  return { row, speed: baseSpeed * Math.pow(1.15, level - 1), dir, entities };
}

function buildRiverLane(
  row: number,
  dir: 1 | -1,
  baseSpeed: number,
  level: number,
): Lane {
  const entities: Entity[] = [];
  let col = randInt(0, 3);
  while (col < COLS + 4) {
    const isTurtleGroup = Math.random() < 0.4;
    const type: Entity["type"] = isTurtleGroup ? "turtle" : "log";
    const width = isTurtleGroup ? randInt(2, 3) : randInt(2, 4);
    entities.push({ col, width, type, submerged: false });
    col += width + randInt(2, 4);
  }
  return { row, speed: baseSpeed * Math.pow(1.15, level - 1), dir, entities };
}

function buildLanes(level: number): Lane[] {
  const lanes: Lane[] = [];

  for (let row = ROW_ROAD_TOP; row <= ROW_ROAD_BOT; row++) {
    const dir: 1 | -1 = row % 2 === 0 ? -1 : 1;
    const baseSpeed = 1.5 + Math.random() * 2.5; // 1.5 - 4 px/frame
    lanes.push(buildRoadLane(row, dir, baseSpeed, level));
  }

  for (let row = ROW_RIVER_TOP; row <= ROW_RIVER_BOT; row++) {
    const dir: 1 | -1 = row % 2 === 0 ? 1 : -1;
    const baseSpeed = 1 + Math.random() * 2; // 1 - 3 px/frame
    lanes.push(buildRiverLane(row, dir, baseSpeed, level));
  }

  return lanes;
}

const GOAL_START_COLS = [1, 4, 7, 10, 13];
const GOAL_WIDTH = 2;
const JUMP_MS = 120;
const ROUND_TIME_BASE = 15000;
const ROUND_TIME_MIN = 5000;
const ROUND_TIME_STEP = 1000;
const TURTLE_VISIBLE_MS = 3000;
const TURTLE_HIDDEN_MS = 1500;
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_HIDDEN_MS;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

// --- Skins -------------------------------------------------------------
// FroggerGame no expone un handle imperativo (no hay createXGame()/
// GameEngineHandle como en lib/games/<juego>/engine.ts): el juego vive
// entero dentro de un useEffect por componente. El cambio de skin llega
// como prop y se sincroniza a skinKeyRef (mismo patrón que pausedRef) para
// que el loop de dibujo, que corre en el closure del efecto, siempre lea
// la paleta activa sin necesitar remontar el canvas.
interface Skin {
  key: string;
  laneBg: {
    goals: string;
    river: string;
    safeMid: string;
    road: string;
    start: string;
  };
  car: string;
  truck: string;
  wheel: string;
  log: string;
  logLine: string;
  turtle: string;
  frogBody: string;
  frogEyeWhite: string;
  frogEyePupil: string;
  goalBg: string;
  goalBorder: string;
  goalOccupied: string;
  hudText: string;
  timerGood: string;
  timerWarn: string;
  timerBad: string;
  entityHighlight: boolean;
  glow: boolean;
}

const SKINS: Record<string, Skin> = {
  // Paleta arcade original del juego (colores ya usados antes de skins).
  classic: {
    key: "classic",
    laneBg: {
      goals: "#0b3d0b",
      river: "#08243a",
      safeMid: "#123318",
      road: "#0a0a0a",
      start: "#123318",
    },
    car: "#e11d48",
    truck: "#6b7280",
    wheel: "#111827",
    log: "#7c4a1e",
    logLine: "#5a3413",
    turtle: "#22c55e",
    frogBody: "#39ff14",
    frogEyeWhite: "#ffffff",
    frogEyePupil: "#111827",
    goalBg: "#14532d",
    goalBorder: "#eab308",
    goalOccupied: "#4ade80",
    hudText: "#ffffff",
    timerGood: "#22c55e",
    timerWarn: "#eab308",
    timerBad: "#ef4444",
    entityHighlight: false,
    glow: false,
  },
  // CRT: colores saturados/pastel sin brillo, con línea de luz sutil al
  // tope de vehículos/troncos/tortugas.
  retro: {
    key: "retro",
    laneBg: {
      goals: "#2d5940",
      river: "#1f3a52",
      safeMid: "#355c3f",
      road: "#2b2b2b",
      start: "#355c3f",
    },
    car: "#d4574a",
    truck: "#9a8f7a",
    wheel: "#2b2b2b",
    log: "#a97a4a",
    logLine: "#7a5530",
    turtle: "#5cad6b",
    frogBody: "#8fce6a",
    frogEyeWhite: "#f5f0e6",
    frogEyePupil: "#2b2b2b",
    goalBg: "#254a33",
    goalBorder: "#e0c15c",
    goalOccupied: "#8fce6a",
    hudText: "#f5f0e6",
    timerGood: "#5cad6b",
    timerWarn: "#e0c15c",
    timerBad: "#d4574a",
    entityHighlight: true,
    glow: false,
  },
  // Eléctrico: fondo casi negro por zona, shadowBlur + contornos brillantes.
  neon: {
    key: "neon",
    laneBg: {
      goals: "#001208",
      river: "#00050f",
      safeMid: "#00060a",
      road: "#050505",
      start: "#00060a",
    },
    car: "#ff2b4d",
    truck: "#c92bff",
    wheel: "#000000",
    log: "#ffae42",
    logLine: "#7a4a00",
    turtle: "#2bff6a",
    frogBody: "#39ff14",
    frogEyeWhite: "#ffffff",
    frogEyePupil: "#000000",
    goalBg: "#001a08",
    goalBorder: "#2bf5ff",
    goalOccupied: "#2bff6a",
    hudText: "#00fff2",
    timerGood: "#2bff6a",
    timerWarn: "#faff2b",
    timerBad: "#ff2b4d",
    entityHighlight: false,
    glow: true,
  },
};

interface Goal {
  col: number;
  occupied: boolean;
}

interface Support {
  lane: Lane;
  entity: Entity;
}

function roundTimeForLevel(level: number) {
  return Math.max(
    ROUND_TIME_MIN,
    ROUND_TIME_BASE - (level - 1) * ROUND_TIME_STEP,
  );
}

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  skinKey = "classic",
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const skinKeyRef = useRef(skinKey);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    skinKeyRef.current = skinKey;
  }, [skinKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lanes = buildLanes(1);
    const turtlePhase = new WeakMap<Entity, number>();
    const assignTurtlePhases = () => {
      lanes.forEach((lane) =>
        lane.entities.forEach((entity) => {
          if (entity.type === "turtle") {
            turtlePhase.set(entity, Math.random() * TURTLE_CYCLE_MS);
          }
        }),
      );
    };
    assignTurtlePhases();

    const goals: Goal[] = GOAL_START_COLS.map((col) => ({
      col,
      occupied: false,
    }));

    const frog: Frog = {
      col: Math.floor(COLS / 2),
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: Math.floor(COLS / 2),
      targetRow: ROW_START,
    };

    let score = 0;
    let lives = 3;
    let level = 1;
    let status: "playing" | "gameover" = "playing";
    let minRowReached = ROW_START;
    let goalsFilled = 0;
    let roundTimer = roundTimeForLevel(level);
    let pendingDir: Direction | null = null;
    let submersionClock = 0;

    let lastScore = -1;
    let lastLives = -1;
    let lastLevel = -1;
    let gameOverReported = false;

    function reportState() {
      if (score !== lastScore) {
        lastScore = score;
        onScoreChange(score);
      }
      if (lives !== lastLives) {
        lastLives = lives;
        onLivesChange(lives);
      }
      if (level !== lastLevel) {
        lastLevel = level;
        onLevelChange(level);
      }
      if (status === "gameover" && !gameOverReported) {
        gameOverReported = true;
        onGameOver(score);
      }
    }

    function resetRoundTimer() {
      roundTimer = roundTimeForLevel(level);
    }

    function respawnFrog() {
      frog.col = Math.floor(COLS / 2);
      frog.row = ROW_START;
      frog.targetCol = frog.col;
      frog.targetRow = frog.row;
      frog.animating = false;
      frog.animT = 0;
      minRowReached = ROW_START;
      pendingDir = null;
      resetRoundTimer();
    }

    function killFrog() {
      lives -= 1;
      if (lives <= 0) {
        lives = 0;
        status = "gameover";
      }
      respawnFrog();
    }

    function completeRound() {
      level += 1;
      lanes = buildLanes(level);
      assignTurtlePhases();
      goals.forEach((g) => (g.occupied = false));
      goalsFilled = 0;
      respawnFrog();
    }

    function awardProgress() {
      if (frog.row < minRowReached) {
        score += (minRowReached - frog.row) * 10;
        minRowReached = frog.row;
      }
    }

    function checkRoadCollision(): boolean {
      return lanes.some((lane) => {
        if (lane.row !== frog.row) return false;
        return lane.entities.some(
          (e) => frog.col >= e.col && frog.col < e.col + e.width,
        );
      });
    }

    function getSupport(): Support | null {
      for (const lane of lanes) {
        if (lane.row !== frog.row) continue;
        for (const entity of lane.entities) {
          if (frog.col >= entity.col && frog.col < entity.col + entity.width) {
            if (entity.type === "turtle" && entity.submerged) return null;
            return { lane, entity };
          }
        }
      }
      return null;
    }

    function checkGoal() {
      const goal = goals.find(
        (g) => frog.col >= g.col && frog.col < g.col + GOAL_WIDTH,
      );
      if (!goal || goal.occupied) {
        killFrog();
        return;
      }
      goal.occupied = true;
      goalsFilled += 1;
      const timeBonus = Math.round(roundTimer / 1000) * 10;
      score += 50 + timeBonus;
      awardProgress();
      if (goalsFilled >= goals.length) {
        score += 200;
        completeRound();
      } else {
        respawnFrog();
      }
    }

    function resolveLanding() {
      const row = frog.row;
      if (row === ROW_GOALS) {
        checkGoal();
        return;
      }
      if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) {
        if (checkRoadCollision()) {
          killFrog();
          return;
        }
      } else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) {
        if (!getSupport()) {
          killFrog();
          return;
        }
      }
      awardProgress();
    }

    function startJumpFromDirection(dir: Direction) {
      let targetCol = frog.col;
      let targetRow = frog.row;
      if (dir === "up") targetRow -= 1;
      if (dir === "down") targetRow += 1;
      if (dir === "left") targetCol -= 1;
      if (dir === "right") targetCol += 1;
      if (targetCol < 0 || targetCol >= COLS) return;
      if (targetRow < ROW_GOALS || targetRow > ROW_START) return;
      frog.targetCol = targetCol;
      frog.targetRow = targetRow;
      frog.animating = true;
      frog.animT = 0;
    }

    function updateLanes(dt: number) {
      lanes.forEach((lane) => {
        lane.entities.forEach((entity) => {
          entity.col += (lane.speed * lane.dir * dt) / 16 / CELL;
          if (lane.dir === 1 && entity.col > COLS) {
            entity.col = -entity.width;
          } else if (lane.dir === -1 && entity.col + entity.width < 0) {
            entity.col = COLS;
          }
          if (entity.type === "turtle") {
            const phase =
              (submersionClock + (turtlePhase.get(entity) ?? 0)) %
              TURTLE_CYCLE_MS;
            entity.submerged = phase >= TURTLE_VISIBLE_MS;
          }
        });
      });
    }

    function updateFrog(dt: number) {
      if (frog.animating) {
        frog.animT += dt;
        if (frog.animT >= JUMP_MS) {
          frog.col = frog.targetCol;
          frog.row = frog.targetRow;
          frog.animating = false;
          frog.animT = 0;
          resolveLanding();
        }
        return;
      }

      if (status !== "playing") return;

      if (pendingDir) {
        const dir = pendingDir;
        pendingDir = null;
        startJumpFromDirection(dir);
        if (frog.animating) return;
      }

      if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
        const support = getSupport();
        if (!support) {
          killFrog();
          return;
        }
        frog.col += (support.lane.speed * support.lane.dir * dt) / 16 / CELL;
        if (frog.col < 0 || frog.col >= COLS) {
          killFrog();
        }
      }
    }

    function updateTimer(dt: number) {
      if (status !== "playing") return;
      roundTimer -= dt;
      if (roundTimer <= 0) {
        roundTimer = 0;
        killFrog();
      }
    }

    function update(dt: number) {
      if (pausedRef.current) return;
      if (status !== "playing") return;
      submersionClock += dt;
      updateLanes(dt);
      updateFrog(dt);
      updateTimer(dt);
    }

    function activeSkin(): Skin {
      return SKINS[skinKeyRef.current] ?? SKINS.classic;
    }

    function laneBg(row: number, skin: Skin) {
      if (row === ROW_GOALS) return skin.laneBg.goals;
      if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT)
        return skin.laneBg.river;
      if (row === ROW_SAFE_MID) return skin.laneBg.safeMid;
      if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) return skin.laneBg.road;
      return skin.laneBg.start; // ROW_START
    }

    function drawEntity(entity: Entity, row: number, skin: Skin) {
      const x = entity.col * CELL;
      const y = row * CELL;
      const w = entity.width * CELL;
      const h = CELL;
      ctx!.save();
      if (skin.glow) {
        ctx!.shadowBlur = 10;
        ctx!.shadowColor =
          entity.type === "car" || entity.type === "truck"
            ? entity.type === "truck"
              ? skin.truck
              : skin.car
            : entity.type === "log"
              ? skin.log
              : skin.turtle;
      }
      if (entity.type === "car" || entity.type === "truck") {
        ctx!.fillStyle = entity.type === "truck" ? skin.truck : skin.car;
        ctx!.fillRect(x + 3, y + 8, w - 6, h - 16);
        if (skin.entityHighlight) {
          ctx!.fillStyle = "rgba(255, 255, 255, 0.35)";
          ctx!.fillRect(x + 3, y + 8, w - 6, 4);
        }
        ctx!.shadowBlur = 0;
        ctx!.fillStyle = skin.wheel;
        ctx!.beginPath();
        ctx!.arc(x + 10, y + h - 8, 5, 0, Math.PI * 2);
        ctx!.arc(x + w - 10, y + h - 8, 5, 0, Math.PI * 2);
        ctx!.fill();
      } else if (entity.type === "log") {
        ctx!.fillStyle = skin.log;
        ctx!.fillRect(x + 2, y + 8, w - 4, h - 16);
        if (skin.entityHighlight) {
          ctx!.fillStyle = "rgba(255, 255, 255, 0.35)";
          ctx!.fillRect(x + 2, y + 8, w - 4, 4);
        }
        ctx!.shadowBlur = 0;
        ctx!.strokeStyle = skin.logLine;
        ctx!.lineWidth = 1;
        for (let i = 1; i < entity.width; i++) {
          ctx!.beginPath();
          ctx!.moveTo(x + i * CELL, y + 8);
          ctx!.lineTo(x + i * CELL, y + h - 8);
          ctx!.stroke();
        }
      } else {
        // turtle
        ctx!.globalAlpha = entity.submerged ? 0.3 : 1;
        ctx!.fillStyle = skin.turtle;
        for (let i = 0; i < entity.width; i++) {
          ctx!.beginPath();
          ctx!.arc(
            x + i * CELL + CELL / 2,
            y + h / 2,
            CELL / 2 - 6,
            0,
            Math.PI * 2,
          );
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }
      ctx!.restore();
    }

    function drawGoals(skin: Skin) {
      goals.forEach((goal) => {
        const x = goal.col * CELL;
        const y = ROW_GOALS * CELL;
        const w = GOAL_WIDTH * CELL;
        ctx!.save();
        if (skin.glow) {
          ctx!.shadowBlur = 10;
          ctx!.shadowColor = skin.goalBorder;
        }
        ctx!.fillStyle = skin.goalBg;
        ctx!.fillRect(x + 2, y + 2, w - 4, CELL - 4);
        ctx!.strokeStyle = skin.goalBorder;
        ctx!.lineWidth = 2;
        ctx!.strokeRect(x + 2, y + 2, w - 4, CELL - 4);
        if (goal.occupied) {
          ctx!.shadowBlur = skin.glow ? 10 : 0;
          ctx!.shadowColor = skin.goalOccupied;
          ctx!.fillStyle = skin.goalOccupied;
          ctx!.beginPath();
          ctx!.ellipse(x + w / 2, y + CELL / 2, 12, 10, 0, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      });
    }

    function drawFrog(skin: Skin) {
      if (status !== "playing" && lives === 0) return;
      const t = frog.animating ? frog.animT / JUMP_MS : 1;
      const drawCol = frog.animating
        ? frog.col + (frog.targetCol - frog.col) * t
        : frog.col;
      const drawRow = frog.animating
        ? frog.row + (frog.targetRow - frog.row) * t
        : frog.row;
      const cx = drawCol * CELL + CELL / 2;
      const cy = drawRow * CELL + CELL / 2;
      const hop = frog.animating ? Math.sin(Math.PI * t) * 8 : 0;

      ctx!.save();
      if (skin.glow) {
        ctx!.shadowBlur = 12;
        ctx!.shadowColor = skin.frogBody;
      }
      ctx!.fillStyle = skin.frogBody;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy - hop, 14, 12, 0, 0, Math.PI * 2);
      ctx!.fill();

      if (frog.animating) {
        ctx!.strokeStyle = skin.frogBody;
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.moveTo(cx - 10, cy - hop + 6);
        ctx!.lineTo(cx - 18, cy - hop + 14);
        ctx!.moveTo(cx + 10, cy - hop + 6);
        ctx!.lineTo(cx + 18, cy - hop + 14);
        ctx!.stroke();
      }

      ctx!.shadowBlur = 0;
      ctx!.fillStyle = skin.frogEyeWhite;
      ctx!.beginPath();
      ctx!.arc(cx - 5, cy - hop - 4, 3, 0, Math.PI * 2);
      ctx!.arc(cx + 5, cy - hop - 4, 3, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = skin.frogEyePupil;
      ctx!.beginPath();
      ctx!.arc(cx - 5, cy - hop - 4, 1.4, 0, Math.PI * 2);
      ctx!.arc(cx + 5, cy - hop - 4, 1.4, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    function drawHud(skin: Skin) {
      ctx!.fillStyle = "rgba(0,0,0,0.45)";
      ctx!.fillRect(0, 0, CANVAS_W, 6);
      const pct = Math.max(0, roundTimer / roundTimeForLevel(level));
      ctx!.fillStyle =
        pct > 0.5
          ? skin.timerGood
          : pct > 0.25
            ? skin.timerWarn
            : skin.timerBad;
      ctx!.fillRect(0, 0, CANVAS_W * pct, 4);

      ctx!.font = "16px monospace";
      ctx!.textBaseline = "top";
      ctx!.fillStyle = skin.hudText;
      ctx!.textAlign = "left";
      ctx!.fillText(String(score), 8, 10);

      ctx!.textAlign = "center";
      ctx!.fillText(`NIVEL ${level}`, CANVAS_W / 2, 10);

      ctx!.textAlign = "right";
      ctx!.save();
      if (skin.glow) {
        ctx!.shadowBlur = 8;
        ctx!.shadowColor = skin.frogBody;
      }
      for (let i = 0; i < lives; i++) {
        ctx!.beginPath();
        ctx!.fillStyle = skin.frogBody;
        ctx!.arc(CANVAS_W - 12 - i * 18, 18, 6, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
      ctx!.textAlign = "left";
    }

    const DEV_FPS_OVERLAY = process.env.NODE_ENV === "development";
    let fpsInstant = 0;
    let fpsAvg = 0;
    let fpsMin = Infinity;
    let fpsFrameCount = 0;
    let fpsElapsedMs = 0;

    function drawFpsOverlay() {
      const w = 160;
      const h = 18;
      const x = CANVAS_W - w;
      const y = CANVAS_H - h;
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

    function draw() {
      const skin = activeSkin();
      for (let row = 0; row < ROWS; row++) {
        ctx!.fillStyle = laneBg(row, skin);
        ctx!.fillRect(0, row * CELL, CANVAS_W, CELL);
      }
      drawGoals(skin);
      lanes.forEach((lane) => {
        lane.entities.forEach((entity) => drawEntity(entity, lane.row, skin));
      });
      drawFrog(skin);
      drawHud(skin);
      if (DEV_FPS_OVERLAY) drawFpsOverlay();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_DIRECTIONS[e.code];
      if (!dir) return;
      e.preventDefault();
      pendingDir = dir;
    };
    window.addEventListener("keydown", onKeyDown);

    let rafId = 0;
    let lastTime: number | null = null;
    let running = true;

    function loop(ts: number) {
      if (!running) return;
      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;
      if (DEV_FPS_OVERLAY && dt > 0 && dt < 250) {
        fpsInstant = 1000 / dt;
        fpsFrameCount += 1;
        fpsElapsedMs += dt;
        fpsAvg = (fpsFrameCount / fpsElapsedMs) * 1000;
        if (fpsInstant < fpsMin) fpsMin = fpsInstant;
      }
      update(Math.min(dt, 100));
      draw();
      reportState();
      rafId = requestAnimationFrame(loop);
    }

    draw();
    rafId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
