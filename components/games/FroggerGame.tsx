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

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Game loop se conecta en un paso posterior del plan.
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
