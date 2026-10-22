import { ImageResponse } from "next/og";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Sua Próxima Corrida";

export const alt = `${siteName} — Encontre corridas de rua perto de você`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0a0a0b",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 40, color: "#f97316", fontWeight: 700 }}>
          Corridas de rua
        </div>
        <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1.05 }}>
          {siteName}
        </div>
        <div style={{ fontSize: 40, marginTop: 32, color: "#a3a3a3" }}>
          Encontre provas perto de você em um só lugar
        </div>
      </div>
    ),
    size
  );
}
