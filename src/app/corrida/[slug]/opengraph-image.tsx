import { ImageResponse } from "next/og";
import { getRaceBySlug } from "@/lib/races";
import { formatDate, formatPriceShort } from "@/lib/format";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Sua Próxima Corrida";

export const alt = "Corrida";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function RaceOpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const race = await getRaceBySlug(params.slug);
  const name = race?.name ?? siteName;
  const name2 = name.length > 70 ? `${name.slice(0, 67)}...` : name;

  const facts = race
    ? [
        formatDate(race.date),
        `${race.city}/${race.state}`,
        ...(race.distances.length ? [race.distances.slice(0, 4).join(" · ")] : []),
        ...(race.priceFrom != null ? [`a partir de ${formatPriceShort(race.priceFrom)}`] : []),
      ]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0a0a0b",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: "#f97316", fontWeight: 700 }}>
          {siteName}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.08 }}>
            {name2}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 36 }}>
            {facts.map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  fontSize: 34,
                  color: "#d4d4d4",
                  border: "2px solid #3f3f46",
                  borderRadius: 999,
                  padding: "8px 24px",
                  marginRight: 16,
                  marginBottom: 12,
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
