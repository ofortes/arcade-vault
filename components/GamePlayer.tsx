"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import { getUser, saveScore } from "@/lib/session";
import {
  createAsteroidsGame,
  type AsteroidsGameHandle,
} from "@/lib/games/asteroides/engine";

const DEMO_SCORE = 48200;
const DEMO_LIVES = 3;
const DEMO_LEVEL = 3;
const DEMO_FINAL_SCORE = 128450;

export default function GamePlayer({ game }: { game: Game }) {
  const isAsteroides = game.id === "asteroides";

  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);

  const [score, setScore] = useState(isAsteroides ? 0 : DEMO_SCORE);
  const [lives, setLives] = useState(isAsteroides ? 3 : DEMO_LIVES);
  const [level, setLevel] = useState(isAsteroides ? 1 : DEMO_LEVEL);
  const [finalScore, setFinalScore] = useState(
    isAsteroides ? 0 : DEMO_FINAL_SCORE,
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<AsteroidsGameHandle | null>(null);

  useEffect(() => {
    const user = getUser();
    if (user) setName(user.name);
  }, []);

  useEffect(() => {
    if (!isAsteroides || !canvasRef.current) return;
    const handle = createAsteroidsGame(canvasRef.current, {
      onScoreChange: setScore,
      onLivesChange: setLives,
      onLevelChange: setLevel,
      onGameOver: (final) => {
        setFinalScore(final);
        setOver(true);
      },
    });
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [isAsteroides]);

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (next) handleRef.current?.pause();
      else handleRef.current?.resume();
      return next;
    });
  };

  const endGame = () => setOver(true);

  const restart = () => {
    setPaused(false);
    setOver(false);
    setSaved(false);
    handleRef.current?.restart();
  };

  return (
    <main className="av-main av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          {!isAsteroides && (
            <button className="btn magenta" onClick={endGame}>
              SIMULAR FIN DE PARTIDA
            </button>
          )}
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroides ? (
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score: finalScore, name });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
