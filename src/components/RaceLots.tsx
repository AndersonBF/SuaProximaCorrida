import type { RaceLot } from "@prisma/client";
import { groupLots } from "@/lib/raceDetails";
import { formatDate, formatPrice } from "@/lib/format";

const tone: Record<string, string> = {
  past: "text-neutral-600",
  current: "text-neutral-100",
  next: "text-neutral-300",
};

/** Tabela de lotes por distância; destaca o lote vigente e a data em que ele vira. */
export function RaceLots({ lots }: { lots: RaceLot[] }) {
  const groups = groupLots(lots);
  if (groups.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {groups.map((g) => (
        <div
          key={g.distance}
          className="rounded-xl border border-ink-800 bg-ink-950 p-4"
        >
          <p className="mb-3 text-sm font-semibold text-neutral-100">
            {g.distance || "Todas as distâncias"}
          </p>
          <ul className="flex flex-col gap-2.5">
            {g.lots.map(({ lot, status }) => {
              const strike = status === "past" ? "line-through" : "";
              return (
                <li
                  key={lot.id}
                  className={`flex items-center justify-between gap-3 text-sm ${tone[status]}`}
                >
                  <span className="flex flex-col">
                    <span className={strike}>
                      {lot.name}
                      {status === "current" && (
                        <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                          Vigente
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {lot.endsAt
                        ? `${status === "past" ? "Encerrou em" : "Até"} ${formatDate(`${lot.endsAt.toISOString().slice(0, 10)}T12:00:00`)}`
                        : "Até acabar as vagas"}
                    </span>
                  </span>
                  <span className={`font-medium ${strike}`}>
                    {formatPrice(lot.price)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
