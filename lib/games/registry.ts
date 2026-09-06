import { createAsteroidsGame } from "./asteroides/engine";
import { createTetrisGame } from "./tetris/engine";
import { createArkanoidGame } from "./arkanoid/engine";
import { createSnakeGame } from "./snake/engine";

export interface GameEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onPauseChange?: (paused: boolean) => void;
}

export interface GameEngineHandle {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void;
  setSkin?: (skinKey: string) => void;
}

export interface GameEngineEntry {
  create: (
    canvas: HTMLCanvasElement,
    callbacks: GameEngineCallbacks,
    skinKey?: string,
  ) => GameEngineHandle;
  width: number;
  height: number;
  skins?: string[];
}

export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
  tetris: { create: createTetrisGame, width: 300, height: 600 },
  arkanoid: {
    create: createArkanoidGame,
    width: 448,
    height: 600,
    skins: ["classic", "retro", "neon"],
  },
  snake: {
    create: createSnakeGame,
    width: 480,
    height: 480,
    skins: ["classic", "retro", "neon"],
  },
};

export function getGameEngine(id: string): GameEngineEntry | undefined {
  return gameEngines[id];
}
