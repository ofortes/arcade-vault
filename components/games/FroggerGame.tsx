"use client";

import { useEffect, useRef } from "react";

interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
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
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

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
          entity.col += (lane.speed * lane.dir * dt) / 16;
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
        frog.col += (support.lane.speed * support.lane.dir * dt) / 16;
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

    function laneBg(row: number) {
      if (row === ROW_GOALS) return "#0b3d0b";
      if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return "#08243a";
      if (row === ROW_SAFE_MID) return "#123318";
      if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) return "#0a0a0a";
      return "#123318"; // ROW_START
    }

    function drawEntity(entity: Entity, row: number) {
      const x = entity.col * CELL;
      const y = row * CELL;
      const w = entity.width * CELL;
      const h = CELL;
      if (entity.type === "car" || entity.type === "truck") {
        ctx!.fillStyle = entity.type === "truck" ? "#6b7280" : "#e11d48";
        ctx!.fillRect(x + 3, y + 8, w - 6, h - 16);
        ctx!.fillStyle = "#111827";
        ctx!.beginPath();
        ctx!.arc(x + 10, y + h - 8, 5, 0, Math.PI * 2);
        ctx!.arc(x + w - 10, y + h - 8, 5, 0, Math.PI * 2);
        ctx!.fill();
      } else if (entity.type === "log") {
        ctx!.fillStyle = "#7c4a1e";
        ctx!.fillRect(x + 2, y + 8, w - 4, h - 16);
        ctx!.strokeStyle = "#5a3413";
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
        ctx!.fillStyle = "#22c55e";
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
    }

    function drawGoals() {
      goals.forEach((goal) => {
        const x = goal.col * CELL;
        const y = ROW_GOALS * CELL;
        const w = GOAL_WIDTH * CELL;
        ctx!.fillStyle = "#14532d";
        ctx!.fillRect(x + 2, y + 2, w - 4, CELL - 4);
        ctx!.strokeStyle = "#eab308";
        ctx!.lineWidth = 2;
        ctx!.strokeRect(x + 2, y + 2, w - 4, CELL - 4);
        if (goal.occupied) {
          ctx!.fillStyle = "#4ade80";
          ctx!.beginPath();
          ctx!.ellipse(x + w / 2, y + CELL / 2, 12, 10, 0, 0, Math.PI * 2);
          ctx!.fill();
        }
      });
    }

    function drawFrog() {
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

      ctx!.fillStyle = "#39ff14";
      ctx!.beginPath();
      ctx!.ellipse(cx, cy - hop, 14, 12, 0, 0, Math.PI * 2);
      ctx!.fill();

      if (frog.animating) {
        ctx!.strokeStyle = "#39ff14";
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.moveTo(cx - 10, cy - hop + 6);
        ctx!.lineTo(cx - 18, cy - hop + 14);
        ctx!.moveTo(cx + 10, cy - hop + 6);
        ctx!.lineTo(cx + 18, cy - hop + 14);
        ctx!.stroke();
      }

      ctx!.fillStyle = "#ffffff";
      ctx!.beginPath();
      ctx!.arc(cx - 5, cy - hop - 4, 3, 0, Math.PI * 2);
      ctx!.arc(cx + 5, cy - hop - 4, 3, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = "#111827";
      ctx!.beginPath();
      ctx!.arc(cx - 5, cy - hop - 4, 1.4, 0, Math.PI * 2);
      ctx!.arc(cx + 5, cy - hop - 4, 1.4, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawHud() {
      ctx!.fillStyle = "rgba(0,0,0,0.45)";
      ctx!.fillRect(0, 0, CANVAS_W, 6);
      const pct = Math.max(0, roundTimer / roundTimeForLevel(level));
      ctx!.fillStyle =
        pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#eab308" : "#ef4444";
      ctx!.fillRect(0, 0, CANVAS_W * pct, 4);

      ctx!.font = "16px monospace";
      ctx!.textBaseline = "top";
      ctx!.fillStyle = "#ffffff";
      ctx!.textAlign = "left";
      ctx!.fillText(String(score), 8, 10);

      ctx!.textAlign = "center";
      ctx!.fillText(`NIVEL ${level}`, CANVAS_W / 2, 10);

      ctx!.textAlign = "right";
      for (let i = 0; i < lives; i++) {
        ctx!.beginPath();
        ctx!.fillStyle = "#39ff14";
        ctx!.arc(CANVAS_W - 12 - i * 18, 18, 6, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.textAlign = "left";
    }

    function draw() {
      for (let row = 0; row < ROWS; row++) {
        ctx!.fillStyle = laneBg(row);
        ctx!.fillRect(0, row * CELL, CANVAS_W, CELL);
      }
      drawGoals();
      lanes.forEach((lane) => {
        lane.entities.forEach((entity) => drawEntity(entity, lane.row));
      });
      drawFrog();
      drawHud();
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
