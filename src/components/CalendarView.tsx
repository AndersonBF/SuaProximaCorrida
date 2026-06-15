import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Race } from "@prisma/client";
import { RaceCard } from "./RaceCard";

export function CalendarView({
  items,
  loggedIn,
  savedSet,
}: {
  items: { race: Race; d?: number }[];
  loggedIn: boolean;
  savedSet: Set<string>;
}) {
  // agrupa por mês/ano preservando a ordem cronológica
  const groups: { key: string; label: string; items: typeof items }[] = [];
  const byKey = new Map<string, (typeof groups)[number]>();

  for (const it of items) {
    const d = new Date(it.race.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = byKey.get(key);
    if (!g) {
      const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
      g = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(it);
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
              {g.label}
            </h3>
            <span className="text-xs text-neutral-600">
              {g.items.length} corrida{g.items.length === 1 ? "" : "s"}
            </span>
            <div className="h-px flex-1 bg-ink-800" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(({ race, d }) => (
              <RaceCard
                key={race.id}
                race={race}
                loggedIn={loggedIn}
                saved={savedSet.has(race.id)}
                distanceKm={d}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
