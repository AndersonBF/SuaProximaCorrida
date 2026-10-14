"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Race } from "@prisma/client";
import { RaceCard } from "./RaceCard";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

/** Calendário de datas (grade mensal). Clique em um dia para ver as corridas. */
export function MonthGrid({
  items,
  loggedIn,
  savedSet,
}: {
  items: { race: Race; d?: number }[];
  loggedIn: boolean;
  savedSet: Set<string>;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, { race: Race; d?: number }[]>();
    for (const it of items) {
      const k = dayKey(new Date(it.race.date));
      const arr = map.get(k);
      if (arr) arr.push(it);
      else map.set(k, [it]);
    }
    return map;
  }, [items]);

  // abre no mês da próxima corrida (ou no mês atual)
  const [month, setMonth] = useState(() => {
    const first = [...items]
      .map((i) => new Date(i.race.date).getTime())
      .sort((a, b) => a - b)[0];
    return startOfMonth(first ? new Date(first) : new Date());
  });
  const [selected, setSelected] = useState<string | null>(null);

  const days = eachDayOfInterval({
    start: startOfWeek(month),
    end: endOfWeek(endOfMonth(month)),
  });

  const monthCount = useMemo(
    () =>
      items.filter((i) => isSameMonth(new Date(i.race.date), month)).length,
    [items, month]
  );

  const selectedItems = selected ? byDay.get(selected) ?? [] : [];
  const title = format(month, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold capitalize text-neutral-100">
            {title}
          </h3>
          <span className="text-xs text-neutral-600">
            {monthCount} corrida{monthCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setMonth((m) => addMonths(m, -1));
              setSelected(null);
            }}
            aria-label="Mês anterior"
            className="rounded-lg border border-ink-800 p-2 text-neutral-400 transition hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              setMonth(startOfMonth(new Date()));
              setSelected(null);
            }}
            className="rounded-lg border border-ink-800 px-3 py-2 text-xs text-neutral-400 transition hover:text-white"
          >
            Hoje
          </button>
          <button
            onClick={() => {
              setMonth((m) => addMonths(m, 1));
              setSelected(null);
            }}
            aria-label="Próximo mês"
            className="rounded-lg border border-ink-800 p-2 text-neutral-400 transition hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-800">
        <div className="grid grid-cols-7 border-b border-ink-800 bg-ink-900/60">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const k = dayKey(day);
            const dayItems = byDay.get(k) ?? [];
            const inMonth = isSameMonth(day, month);
            const isSel = selected === k;
            const has = dayItems.length > 0;
            return (
              <button
                key={k}
                disabled={!has}
                onClick={() => setSelected(isSel ? null : k)}
                className={`flex min-h-[64px] flex-col items-start gap-1 border-b border-r border-ink-800 p-1.5 text-left transition sm:min-h-[96px] sm:p-2 ${
                  inMonth ? "" : "bg-ink-950/40 opacity-40"
                } ${isSel ? "bg-ink-800" : has ? "hover:bg-ink-900" : ""} ${
                  has ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`text-xs ${
                    isToday(day)
                      ? "rounded-full bg-accent px-1.5 font-semibold text-ink-950"
                      : "text-neutral-400"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {has && (
                  <>
                    {/* mobile: só a contagem */}
                    <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-semibold text-accent sm:hidden">
                      {dayItems.length}
                    </span>
                    {/* desktop: nomes */}
                    <div className="hidden w-full flex-col gap-1 sm:flex">
                      {dayItems.slice(0, 2).map(({ race }) => (
                        <span
                          key={race.id}
                          className="truncate rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent"
                          title={race.name}
                        >
                          {race.name}
                        </span>
                      ))}
                      {dayItems.length > 2 && (
                        <span className="px-1 text-[11px] text-neutral-500">
                          +{dayItems.length - 2} mais
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-neutral-200">
            {format(new Date(`${selected}T12:00:00`), "EEEE, d 'de' MMMM", {
              locale: ptBR,
            })}
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedItems.map(({ race, d }) => (
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
      ) : (
        <p className="text-xs text-neutral-600">
          Clique em um dia com corrida para ver os detalhes.
        </p>
      )}
    </div>
  );
}
