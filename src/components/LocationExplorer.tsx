"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search, Navigation, MapPin, Loader2 } from "lucide-react";
import type { Race } from "@prisma/client";
import { RaceCard } from "./RaceCard";
import { distanceKm } from "@/lib/geo";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink-900 text-sm text-neutral-500">
      Carregando mapa...
    </div>
  ),
});

// Centro aproximado do Paraná (Curitiba) como ponto inicial do mapa
const PR_CENTER = { lat: -25.4284, lng: -49.2733 };

const RADII = [
  { label: "Qualquer distância", value: 0 },
  { label: "Até 25 km", value: 25 },
  { label: "Até 50 km", value: 50 },
  { label: "Até 100 km", value: 100 },
  { label: "Até 200 km", value: 200 },
];

export function LocationExplorer({
  races,
  loggedIn,
  savedIds,
}: {
  races: Race[];
  loggedIn: boolean;
  savedIds: string[];
}) {
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const [center, setCenter] = useState(PR_CENTER);
  const [active, setActive] = useState(false); // ordenar por distância?
  const [radius, setRadius] = useState(0);
  const [query, setQuery] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  function setPoint(lat: number, lng: number) {
    setCenter({ lat, lng });
    setActive(true);
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoMsg("Seu navegador não suporta geolocalização.");
      return;
    }
    setLocating(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setGeoMsg("Não consegui acessar sua localização. Permita o acesso ou digite a cidade.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function searchCity(e: React.FormEvent) {
    e.preventDefault();
    const q = cityInput.trim();
    if (!q) return;
    setLocating(true);
    setGeoMsg(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q + ", Paraná, Brasil"
      )}&format=json&limit=1`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      const data: Array<{ lat: string; lon: string }> = await res.json();
      if (data.length) {
        setPoint(parseFloat(data[0].lat), parseFloat(data[0].lon));
      } else {
        setGeoMsg("Cidade não encontrada. Tente outro nome.");
      }
    } catch {
      setGeoMsg("Não consegui buscar essa cidade agora.");
    } finally {
      setLocating(false);
    }
  }

  const results = useMemo(() => {
    let base = races;
    if (query.trim()) {
      const q = query.toLowerCase();
      base = base.filter((r) => `${r.name} ${r.city}`.toLowerCase().includes(q));
    }
    if (active) {
      return base
        .filter((r) => r.latitude != null && r.longitude != null)
        .map((r) => ({ race: r, d: distanceKm(center.lat, center.lng, r.latitude!, r.longitude!) }))
        .filter((x) => radius === 0 || x.d <= radius)
        .sort((a, b) => a.d - b.d);
    }
    return base.map((race) => ({ race, d: undefined as number | undefined }));
  }, [races, query, active, center, radius]);

  const inputClass = "field";

  return (
    <section className="flex flex-col gap-5">
      {/* Painel de localização — destaque central */}
      <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-2">
          {/* Controles */}
          <div className="flex flex-col justify-center gap-3">
            <h2 className="text-lg font-semibold text-neutral-100">
              Corridas perto de você
            </h2>
            <p className="text-sm text-neutral-500">
              Digite sua cidade, use sua localização ou arraste o ponto no mapa.
            </p>

            <form onSubmit={searchCity} className="flex gap-2">
              <div className="relative flex-1">
                <MapPin
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="Sua cidade (ex: Cascavel)"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
              >
                Buscar
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-accent/50 hover:text-white disabled:opacity-60"
              >
                {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                Usar minha localização
              </button>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="field max-w-[180px]"
              >
                {RADII.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {geoMsg && <p className="text-sm text-amber-400">{geoMsg}</p>}
          </div>

          {/* Mapa */}
          <div className="h-[260px] overflow-hidden rounded-xl border border-ink-800 sm:h-[300px]">
            <LocationMap lat={center.lat} lng={center.lng} onChange={setPoint} />
          </div>
        </div>
      </div>

      {/* Busca por texto + contagem */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Filtrar por nome..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          {results.length} corrida{results.length === 1 ? "" : "s"}
          {active ? " · por distância" : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-sm text-neutral-500">
          Nenhuma corrida encontrada{active ? " nesse raio" : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ race, d }) => (
            <RaceCard
              key={race.id}
              race={race}
              loggedIn={loggedIn}
              saved={savedSet.has(race.id)}
              distanceKm={d}
            />
          ))}
        </div>
      )}
    </section>
  );
}
