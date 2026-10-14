import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Trophy } from "lucide-react";
import type { Race, RacePhoto } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { PhotosMenu } from "./PhotosMenu";

/** Cartão de uma corrida já realizada, com link para os resultados. */
export function ResultCard({
  race,
}: {
  race: Race & { photos?: RacePhoto[] };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-800 bg-ink-900 p-4 transition hover:border-accent/40">
      <div className="flex flex-col gap-1.5">
        <Link
          href={`/corrida/${race.slug}`}
          className="line-clamp-2 text-[15px] font-medium leading-snug text-neutral-100 transition hover:text-white"
        >
          {race.name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatDate(race.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} />
            {race.city}
          </span>
          {race.distances.slice(0, 3).map((d) => (
            <span
              key={d}
              className="rounded border border-ink-700 px-1.5 py-0.5 text-[11px] text-neutral-400"
            >
              {d}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {race.resultsUrl ? (
          <a
            href={race.resultsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
          >
            <Trophy size={14} /> Ver resultados <ExternalLink size={13} />
          </a>
        ) : (
          <span className="rounded-lg border border-ink-800 px-3 py-1.5 text-sm text-neutral-500">
            Resultados ainda não disponíveis
          </span>
        )}
        <PhotosMenu photos={race.photos ?? []} />
        <Link
          href={`/corrida/${race.slug}`}
          className="rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-accent/50 hover:text-white"
        >
          Detalhes
        </Link>
      </div>
    </div>
  );
}
