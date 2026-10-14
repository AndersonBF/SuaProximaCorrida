"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { List, Map as MapIcon, CalendarDays, CalendarRange } from "lucide-react";
import type { Race } from "@prisma/client";
import { RaceCard } from "./RaceCard";
import { CalendarView } from "./CalendarView";
import { MonthGrid } from "./MonthGrid";

const AllPinsMap = dynamic(() => import("./AllPinsMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink-900 text-sm text-neutral-500">
      Carregando mapa...
    </div>
  ),
});

type View = "lista" | "mapa" | "calendario" | "mes";

const OPTIONS: [View, string, typeof List][] = [
  ["lista", "Lista", List],
  ["calendario", "Calendário", CalendarDays],
  ["mes", "Por mês", CalendarRange],
  ["mapa", "Mapa", MapIcon],
];

/**
 * Seletor de visualização + conteúdo (lista, calendário de datas, agrupado por
 * mês e mapa). Usado na home e em "Minhas corridas".
 */
export function RaceViews({
  items,
  loggedIn,
  savedIds,
  summary,
  emptyMessage = "Nenhuma corrida encontrada.",
}: {
  items: { race: Race; d?: number }[];
  loggedIn: boolean;
  savedIds: string[];
  summary?: string;
  emptyMessage?: string;
}) {
  const [view, setView] = useState<View>("lista");
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const count = `${items.length} corrida${items.length === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          {count}
          {summary ? ` · ${summary}` : ""}
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-900/60 p-1">
          {OPTIONS.map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={label}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition ${
                view === v
                  ? "bg-ink-800 text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {view === "calendario" ? (
        <MonthGrid items={items} loggedIn={loggedIn} savedSet={savedSet} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-sm text-neutral-500">
          {emptyMessage}
        </div>
      ) : view === "mapa" ? (
        <div className="h-[520px] overflow-hidden rounded-2xl border border-ink-800">
          <AllPinsMap races={items.map((x) => x.race)} />
        </div>
      ) : view === "mes" ? (
        <CalendarView items={items} loggedIn={loggedIn} savedSet={savedSet} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ race, d }) => (
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
    </div>
  );
}
