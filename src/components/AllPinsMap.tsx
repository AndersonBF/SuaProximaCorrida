"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Race } from "@prisma/client";
import { formatDate, formatPriceShort } from "@/lib/format";

/** Distância curta para o marcador sem imagem (ex: "42K", "10K", "RUN"). */
function shortDist(distances: string[]): string {
  let max = 0;
  for (const d of distances) {
    const m = d.match(/(\d+(?:[.,]\d+)?)/);
    if (m) max = Math.max(max, parseFloat(m[1].replace(",", ".")));
  }
  return max > 0 ? `${Math.round(max)}K` : "RUN";
}

/** Marcador circular com o cartaz da prova (fallback: círculo com distância). */
function iconFor(r: Race): L.DivIcon {
  const SIZE = 46;
  const inner = r.imageUrl
    ? `<img src="${r.imageUrl}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f97316;color:#0a0a0b;font-weight:800;font-size:12px">${shortDist(r.distances)}</div>`;
  const html = `<div style="width:${SIZE}px;height:${SIZE}px;border-radius:9999px;overflow:hidden;border:2px solid #f97316;box-shadow:0 3px 8px rgba(0,0,0,.45);background:#121214">${inner}</div>`;
  return L.divIcon({
    html,
    className: "corra-pin", // evita o quadrado branco padrão do leaflet-div-icon
    iconSize: [SIZE, SIZE],
    iconAnchor: [SIZE / 2, SIZE / 2],
    popupAnchor: [0, -SIZE / 2],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 11);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
  }, [points, map]);
  return null;
}

export default function AllPinsMap({ races }: { races: Race[] }) {
  // espalha levemente pins na mesma cidade para não ficarem sobrepostos
  const seen = new Map<string, number>();
  const markers = races
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => {
      const key = `${r.latitude},${r.longitude}`;
      const i = seen.get(key) ?? 0;
      seen.set(key, i + 1);
      const radius = i === 0 ? 0 : 0.01 * Math.ceil(i / 6);
      return {
        r,
        lat: r.latitude! + Math.sin(i * 1.1) * radius,
        lng: r.longitude! + Math.cos(i * 1.1) * radius,
      };
    });

  const points = markers.map((m) => [m.lat, m.lng] as [number, number]);

  return (
    <MapContainer
      center={[-25.4284, -49.2733]}
      zoom={7}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      {markers.map(({ r, lat, lng }) => (
        <Marker key={r.id} position={[lat, lng]} icon={iconFor(r)}>
          <Popup>
            <a
              href={`/corrida/${r.slug}`}
              style={{ color: "#0a0a0b", textDecoration: "none", display: "block", minWidth: 160 }}
            >
              <strong style={{ fontSize: 13 }}>{r.name}</strong>
              <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>
                {formatDate(r.date)} · {r.city}
              </div>
              <div style={{ fontSize: 12, color: "#ea580c", fontWeight: 600, marginTop: 2 }}>
                {formatPriceShort(r.priceFrom)} · ver detalhes →
              </div>
            </a>
          </Popup>
        </Marker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  );
}
