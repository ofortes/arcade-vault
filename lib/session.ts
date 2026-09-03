export interface SessionUser {
  name: string;
}

export function getUser(): SessionUser | null {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

export function setUser(u: SessionUser | null): void {
  if (u) {
    localStorage.setItem("av_user", JSON.stringify(u));
  } else {
    localStorage.removeItem("av_user");
  }
}

export interface SavedScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}

export function saveScore(entry: Omit<SavedScoreEntry, "at">): void {
  try {
    const all: SavedScoreEntry[] = JSON.parse(
      localStorage.getItem("av_scores") || "[]",
    );
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem("av_scores", JSON.stringify(all));
  } catch {
    // localStorage unavailable — ignore
  }
}
