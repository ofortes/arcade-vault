"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, setUser as persistUser, type SessionUser } from "@/lib/session";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const isActive = (section: "inicio" | "biblioteca" | "salon" | "acerca" | "auth") => {
    if (section === "inicio") return pathname === "/";
    if (section === "biblioteca") return pathname === "/biblioteca" || pathname.startsWith("/juegos/");
    if (section === "salon") return pathname === "/salon-de-la-fama";
    if (section === "acerca") return pathname === "/acerca-de";
    return pathname === "/auth";
  };

  const handleSignOut = () => {
    persistUser(null);
    setUser(null);
    setOpen(false);
    router.push("/");
  };

  const closeMenu = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={closeMenu}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isActive("inicio") ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon-de-la-fama" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={isActive("acerca") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={closeMenu}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isActive("inicio") ? "active" : ""} onClick={closeMenu}>
          Inicio
        </Link>
        <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""} onClick={closeMenu}>
          Biblioteca
        </Link>
        <Link href="/salon-de-la-fama" className={isActive("salon") ? "active" : ""} onClick={closeMenu}>
          Salón de la Fama
        </Link>
        <Link href="/acerca-de" className={isActive("acerca") ? "active" : ""} onClick={closeMenu}>
          Acerca de
        </Link>
        <Link href="/auth" className={isActive("auth") ? "active" : ""} onClick={closeMenu}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
