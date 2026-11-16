"use client";

import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";

const RaceMap = dynamic(() => import("./RaceMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink-900 text-sm text-neutral-500">
      Carregando mapa...
    </div>
  ),
});

export function RaceMapSection({
  lat,
  lng,
  place,
  exact,
}: {
  lat: number;
  lng: number;
  /** texto para o Google Maps (local + cidade) */
  place: string;
  /** true quando há um endereço/local de largada informado */
  exact: boolean;
}) {
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">Localização</h2>
          <p className="text-sm text-neutral-500">
            {exact
              ? place
              : "Posição aproximada (centro da cidade). Confirme o local da largada no site oficial."}
          </p>
        </div>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-accent/40 px-3.5 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
        >
          <Navigation size={14} /> Como chegar
        </a>
      </div>
      <div className="relative z-0 h-64 overflow-hidden rounded-xl border border-ink-800 sm:h-80">
        <RaceMap lat={lat} lng={lng} zoom={exact ? 14 : 12} />
      </div>
    </section>
  );
}
