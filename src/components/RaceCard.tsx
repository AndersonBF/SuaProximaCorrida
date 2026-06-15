import Link from "next/link";
import { CalendarDays, MapPin, Navigation, Clock } from "lucide-react";
import type { Race } from "@prisma/client";
import { formatDate, formatPriceShort } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { raceType, countdownLabel } from "@/lib/raceMeta";
import { SaveButton } from "./SaveButton";

export function RaceCard({
  race,
  saved = false,
  loggedIn = false,
  distanceKm,
}: {
  race: Race;
  saved?: boolean;
  loggedIn?: boolean;
  distanceKm?: number;
}) {
  const type = raceType(race.name, race.distances);
  const countdown = countdownLabel(race.date);
  return (
    <div className="group relative h-full">
      {/* botão salvar — fora do <Link> pra não disparar a navegação */}
      <div className="absolute right-3 top-3 z-30">
        <SaveButton raceId={race.id} initialSaved={saved} loggedIn={loggedIn} />
      </div>
      {/* halo accent ATRÁS do card, acende no hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-accent/30 to-amber-400/20 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <Link
        href={`/corrida/${race.slug}`}
        className="relative flex h-full flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900 transition duration-300 group-hover:-translate-y-1 group-hover:border-accent/40 active:scale-[0.99]"
      >
        {/* brilho interno suave no topo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(440px circle at 50% -10%, rgba(249,115,22,0.14), transparent 60%)",
          }}
        />
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-800">
        {race.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={race.imageUrl}
            alt={race.name}
            className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight text-ink-700">
              {race.distances[0] ?? "RUN"}
            </span>
          </div>
        )}
        {/* badges: tipo + destaque (canto superior esquerdo) */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <span
            className={`rounded-full border bg-ink-950/70 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur ${type.cls}`}
          >
            {type.label}
          </span>
          {race.featured && (
            <span className="rounded-full border border-accent/40 bg-ink-950/70 px-2.5 py-0.5 text-[11px] font-medium text-accent backdrop-blur">
              ★ Destaque
            </span>
          )}
        </div>

        {/* contagem regressiva (canto inferior esquerdo) */}
        {countdown && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-ink-950">
            <Clock size={11} />
            {countdown}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatDate(race.date)}
          </span>
          <span className="text-ink-700">·</span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} />
            {race.city}
          </span>
          {distanceKm !== undefined && (
            <>
              <span className="text-ink-700">·</span>
              <span className="flex items-center gap-1 text-accent">
                <Navigation size={12} />
                {formatDistance(distanceKm)}
              </span>
            </>
          )}
        </div>

        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-neutral-100 transition group-hover:text-white">
          {race.name}
        </h3>

        <div className="mt-auto flex items-center justify-between border-t border-ink-800 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {race.distances.slice(0, 3).map((d) => (
              <span
                key={d}
                className="rounded border border-ink-700 px-1.5 py-0.5 text-[11px] text-neutral-400"
              >
                {d}
              </span>
            ))}
          </div>
          <span className="whitespace-nowrap text-sm font-medium text-neutral-200">
            {formatPriceShort(race.priceFrom)}
          </span>
        </div>
      </div>
      </Link>
    </div>
  );
}
