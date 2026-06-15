"use client";

import { useEffect, useState } from "react";
import { Navigation, Loader2 } from "lucide-react";
import type { Race } from "@prisma/client";
import { RaceCard } from "./RaceCard";
import { distanceKm } from "@/lib/geo";

type Status = "prompt" | "loading" | "ready" | "denied" | "unsupported";

export function NearbyList({
  races,
  loggedIn,
  savedIds,
}: {
  races: Race[];
  loggedIn: boolean;
  savedIds: string[];
}) {
  const [status, setStatus] = useState<Status>("prompt");
  const [ordered, setOrdered] = useState<{ race: Race; d: number }[]>([]);
  const savedSet = new Set(savedIds);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const list = races
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => ({
            race: r,
            d: distanceKm(latitude, longitude, r.latitude!, r.longitude!),
          }))
          .sort((a, b) => a.d - b.d);
        setOrdered(list);
        setStatus("ready");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-ink-800 p-12 text-sm text-neutral-400">
        <Loader2 size={16} className="animate-spin text-accent" />
        Localizando você...
      </div>
    );
  }

  if (status === "denied" || status === "unsupported") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-700 p-12 text-center">
        <Navigation className="text-neutral-600" />
        <p className="max-w-sm text-sm text-neutral-400">
          {status === "unsupported"
            ? "Seu navegador não suporta geolocalização."
            : "Não consegui acessar sua localização. Permita o acesso no navegador para ver as corridas mais próximas."}
        </p>
        <button
          onClick={locate}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (status === "ready" && ordered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-sm text-neutral-500">
        Nenhuma corrida com localização disponível ainda.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map(({ race, d }) => (
        <RaceCard
          key={race.id}
          race={race}
          loggedIn={loggedIn}
          saved={savedSet.has(race.id)}
          distanceKm={d}
        />
      ))}
    </div>
  );
}
