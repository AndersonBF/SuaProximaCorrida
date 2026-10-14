"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Navigation,
  MapPin,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import type { Race } from "@prisma/client";
import { RaceViews } from "./RaceViews";
import { distanceKm } from "@/lib/geo";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink-900 text-sm text-neutral-500">
      Carregando mapa...
    </div>
  ),
});

const PR_CENTER = { lat: -25.4284, lng: -49.2733 };
const RADII = [0, 25, 50, 100, 200];

type Mode = "filtros" | "perto";

export function Explorer({
  races,
  loggedIn,
  savedIds,
  cities,
  distances,
}: {
  races: Race[];
  loggedIn: boolean;
  savedIds: string[];
  cities: string[];
  distances: string[];
}) {
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const [mode, setMode] = useState<Mode>("filtros");

  // modo filtros
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [dist, setDist] = useState("");

  // modo perto
  const [center, setCenter] = useState(PR_CENTER);
  const [active, setActive] = useState(false);
  const [radius, setRadius] = useState(0);
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
        setGeoMsg("Não consegui acessar sua localização. Digite a cidade.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function searchCity(e: React.FormEvent) {
    e.preventDefault();
    const query = cityInput.trim();
    if (!query) return;
    setLocating(true);
    setGeoMsg(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query + ", Paraná, Brasil"
      )}&format=json&limit=1`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      const data: Array<{ lat: string; lon: string }> = await res.json();
      if (data.length) setPoint(parseFloat(data[0].lat), parseFloat(data[0].lon));
      else setGeoMsg("Cidade não encontrada.");
    } catch {
      setGeoMsg("Não consegui buscar agora.");
    } finally {
      setLocating(false);
    }
  }

  const results = useMemo(() => {
    if (mode === "perto") {
      if (!active) return races.map((race) => ({ race, d: undefined as number | undefined }));
      return races
        .filter((r) => r.latitude != null && r.longitude != null)
        .map((r) => ({ race: r, d: distanceKm(center.lat, center.lng, r.latitude!, r.longitude!) }))
        .filter((x) => radius === 0 || x.d <= radius)
        .sort((a, b) => a.d - b.d);
    }
    let base = races;
    if (q.trim()) {
      const s = q.toLowerCase();
      base = base.filter((r) => `${r.name} ${r.city}`.toLowerCase().includes(s));
    }
    if (city) base = base.filter((r) => r.city === city);
    if (dist) base = base.filter((r) => r.distances.includes(dist));
    return base.map((race) => ({ race, d: undefined as number | undefined }));
  }, [mode, races, active, center, radius, q, city, dist]);

  const tab = (m: Mode, label: string, Icon: typeof Search) => (
    <button
      onClick={() => setMode(m)}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
        mode === m
          ? "bg-ink-800 text-neutral-100"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <section className="flex flex-col gap-5">
      {/* Abas */}
      <div className="flex items-center gap-1 rounded-xl border border-ink-800 bg-ink-900/60 p-1 w-fit">
        {tab("filtros", "Filtros", SlidersHorizontal)}
        {tab("perto", "Perto de mim", Navigation)}
      </div>

      {/* Painel do modo ativo */}
      {mode === "filtros" ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              className="field pl-9"
              placeholder="Buscar corrida ou cidade"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="field" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Todas as cidades</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="field" value={dist} onChange={(e) => setDist(e.target.value)}>
            <option value="">Qualquer distância</option>
            {distances.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="flex flex-col justify-center gap-3">
            <form onSubmit={searchCity} className="flex gap-2">
              <div className="relative flex-1">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  className="field pl-9"
                  placeholder="Sua cidade (ex: Cascavel)"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                />
              </div>
              <button className="rounded-lg bg-accent px-4 text-sm font-medium text-ink-950 transition hover:bg-accent-soft">
                Ir
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-accent/50 hover:text-white disabled:opacity-60"
              >
                {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                Minha localização
              </button>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="field max-w-[170px]"
              >
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? "Qualquer distância" : `Até ${r} km`}
                  </option>
                ))}
              </select>
            </div>
            {geoMsg && <p className="text-sm text-amber-400">{geoMsg}</p>}
            <p className="text-xs text-neutral-600">
              Dica: arraste o ponto no mapa para escolher o local.
            </p>
          </div>
          <div className="h-[240px] overflow-hidden rounded-xl border border-ink-800 sm:h-[260px]">
            <LocationMap lat={center.lat} lng={center.lng} onChange={setPoint} />
          </div>
        </div>
      )}

      <RaceViews
        items={results}
        loggedIn={loggedIn}
        savedIds={savedIds}
        summary={mode === "perto" && active ? "por distância" : undefined}
      />    </section>
  );
}
