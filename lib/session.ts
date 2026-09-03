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
