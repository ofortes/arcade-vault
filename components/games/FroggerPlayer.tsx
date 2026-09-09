"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Game } from "@/lib/games";
import { getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

const FroggerGame = dynamic(() => import("./FroggerGame"), { ssr: false });

const AVAILABLE_SKINS = ["classic", "retro", "neon"];

export default function FroggerPlayer({ game }: { game: Game }) {
  const [paused, setPaused] = useState(false);
  const [skinKey, setSkinKey] = useState(AVAILABLE_SKINS[0]);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const user = getUser();
    if (user) setName(user.name);
  }, []);

  const togglePause = () => setPaused((p) => !p);

  const restart = () => {
    setPaused(false);
    setOver(false);
    setSaved(false);
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameKey((k) => k + 1);
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
          {AVAILABLE_SKINS.length > 1 && (
            <div style={{ display: "flex", gap: 6 }}>
              {AVAILABLE_SKINS.map((s) => (
                <button
                  key={s}
                  className={`btn ${skinKey === s ? "yellow" : "ghost"}`}
                  onClick={() => setSkinKey(s)}
                  style={{ textTransform: "uppercase" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <FroggerGame
            key={gameKey}
            paused={paused}
            skinKey={skinKey}
            onScoreChange={setScore}
            onLivesChange={setLives}
            onLevelChange={setLevel}
            onGameOver={(final) => {
              setFinalScore(final);
              setOver(true);
            }}
          />
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
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    const supabase = createClient();
                    await supabase
                      .from("scores")
                      .insert({ game_id: game.id, name, score: finalScore });
                    setSaving(false);
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
