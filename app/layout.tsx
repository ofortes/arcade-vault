import type { Metadata } from "next";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
import "./globals.css";

// Fuentes self-hosted (subset latin, descargadas de Google Fonts).
// Se sirven desde `app/fonts/` en vez de `next/font/google` para que el build
// no dependa de alcanzar fonts.googleapis.com — detrás de proxy corporativo
// esa descarga falla y Next cae a una fuente de fallback.
const pressStart2P = localFont({
  src: "./fonts/PressStart2P-Regular.woff2",
  variable: "--font-press-start-2p",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["system-ui", "monospace"],
});

const jetBrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  style: "normal",
  display: "swap",
  fallback: ["ui-monospace", "Courier New", "monospace"],
});

const courierPrime = localFont({
  src: "./fonts/CourierPrime-Regular.woff2",
  variable: "--font-courier-prime",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Courier New", "monospace"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Juega en línea y compite por el puntaje más alto",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart2P.variable} ${jetBrainsMono.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="h-full m-0">
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <Nav />
          {children}
          <footer
            style={{
              borderTop: "1px solid var(--line)",
              padding: "20px 32px",
              textAlign: "center",
              color: "var(--ink-faint)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
            }}
          >
            © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
          </footer>
        </div>
      </body>
    </html>
  );
}
