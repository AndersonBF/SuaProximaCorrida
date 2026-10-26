import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Navigation, Clock, Users } from "lucide-react";
import type { Race } from "@prisma/client";
import { formatPriceShort } from "@/lib/format";
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
  const date = new Date(race.date);
  const day = format(date, "dd");
  const month = format(date, "MMM", { locale: ptBR }).replace(".", "");
  return (
    <div className="group relative h-full">
      {/* botão salvar — fora do <Link> pra não disparar a navegação */}
      <div className="absolute right-2.5 top-2.5 z-30">
        <SaveButton raceId={race.id} initialSaved={saved} loggedIn={loggedIn} />
      </div>
      <Link
        href={`/corrida/${race.slug}`}
        className="relative flex h-full flex-col overflow-hidden rounded-[20px] border border-ink-800 bg-ink-900 transition duration-300 group-hover:-translate-y-1 group-hover:border-accent/50 group-hover:shadow-[0_18px_30px_-20px_rgba(0,0,0,0.6)] active:scale-[0.99]"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink-800">
          {race.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={race.imageUrl}
              alt={race.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-900 via-accent to-amber-400">
              <span className="text-3xl font-medium tracking-tight text-white/80">
                {race.distances[0] ?? "RUN"}
              </span>
            </div>
          )}

          {/* data em destaque (canto inferior esquerdo) */}
          <div className="absolute bottom-2.5 left-2.5 rounded-[10px] bg-white px-2.5 py-1 text-center leading-none text-[#17171a]">
            <b className="block text-base font-semibold tabular-nums">{day}</b>
            <span className="text-[9px] font-medium uppercase tracking-[0.1em]">
              {month}
            </span>
          </div>

          {/* badges: tipo + destaque (canto superior esquerdo) */}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            <span
              className={`rounded-full border bg-black/55 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur ${type.cls}`}
            >
              {type.label}
            </span>
            {race.featured && (
              <span className="rounded-full border border-amber-300/50 bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 backdrop-blur">
                ★ Destaque
              </span>
            )}
          </div>

          {/* contagem regressiva (canto inferior direito) */}
          {countdown && (
            <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              <Clock size={11} />
              {countdown}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <h3 className="line-clamp-2 text-[17px] font-medium leading-snug tracking-tight text-neutral-100">
            {race.name}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-light text-neutral-500">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} />
              {race.city}
            </span>
            {race.savesCount > 0 && (
              <span
                className="flex items-center gap-1"
                title={`${race.savesCount} pessoa${race.savesCount === 1 ? "" : "s"} salvaram`}
              >
                <Users size={12} />
                {race.savesCount}
              </span>
            )}
            {distanceKm !== undefined && (
              <span className="flex items-center gap-1 text-accent">
                <Navigation size={12} />
                {formatDistance(distanceKm)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {race.distances.slice(0, 3).map((d) => (
              <span
                key={d}
                className="rounded-full bg-ink-800 px-2.5 py-1 text-[11px] font-medium text-neutral-300"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <div className="leading-tight">
              <span className="block text-[11px] font-light text-neutral-500">
                a partir de
              </span>
              <span className="whitespace-nowrap text-base font-medium tabular-nums text-neutral-100">
                {formatPriceShort(race.priceFrom)}
              </span>
            </div>
            <span className="rounded-full bg-neutral-100 px-4 py-2 text-[13px] font-medium text-ink-950 transition group-hover:-translate-y-0.5">
              Ver corrida
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
