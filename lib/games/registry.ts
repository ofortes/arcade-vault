import { createAsteroidsGame } from "./asteroides/engine";

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
}

export interface GameEngineEntry {
  create: (
    canvas: HTMLCanvasElement,
    callbacks: GameEngineCallbacks,
  ) => GameEngineHandle;
  width: number;
  height: number;
}

export const gameEngines: Record<string, GameEngineEntry> = {
  asteroides: { create: createAsteroidsGame, width: 800, height: 600 },
};

export function getGameEngine(id: string): GameEngineEntry | undefined {
  return gameEngines[id];
}
