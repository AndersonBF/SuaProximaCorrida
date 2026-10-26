"use client";

import { useMemo, useState } from "react";
import { MapPin, Clock, MessageCircle, Instagram, Globe, CalendarDays } from "lucide-react";
import type { TreinoView } from "@/lib/treinos";
import { WEEKDAY_ABBR } from "@/lib/treinoMeta";

type Kind = "todos" | "SEMANAL" | "PONTUAL";

const DAY_INITIAL = ["D", "S", "T", "Q", "Q", "S", "S"];

const chip =
  "rounded-full border px-4 py-2 text-sm font-medium transition";
const chipOn = "border-neutral-100 bg-neutral-100 text-ink-950";
const chipOff = "border-ink-800 text-neutral-400 hover:border-ink-700 hover:text-neutral-100";

function formatTime(t: TreinoView): string | null {
  if (!t.startTime) return null;
  return t.endTime ? `${t.startTime} às ${t.endTime}` : t.startTime;
}

function pontualLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  return day.replace(".", "");
}

function contact(t: TreinoView) {
  if (t.whatsapp)
    return { href: `https://wa.me/${t.whatsapp}`, label: "Chamar no WhatsApp", Icon: MessageCircle };
  if (t.instagram) return { href: t.instagram, label: "Instagram", Icon: Instagram };
  const href = t.website ?? t.sourceUrl;
  if (href)
    return {
      href,
      label: t.source === "Sympla" ? "Ver no Sympla" : "Ver site",
      Icon: Globe,
    };
  return null;
}

function TreinoCard({ t, todayDow }: { t: TreinoView; todayDow: number }) {
  const time = formatTime(t);
  const c = contact(t);
  const today = t.kind === "SEMANAL" && t.weekdays.includes(todayDow);
  return (
    <article className="flex h-full flex-col gap-3 rounded-[20px] border border-ink-800 bg-ink-900 p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/50">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
        <span className="rounded-full bg-ink-800 px-2.5 py-1 text-neutral-300">
          {t.kind === "SEMANAL" ? "Toda semana" : "Treinão"}
        </span>
        {t.free && (
          <span className="rounded-full border border-emerald-500/40 px-2.5 py-1 text-emerald-300">
            Gratuito
          </span>
        )}
        {today && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-white">Hoje</span>
        )}
      </div>

      <div>
        <h3 className="text-[17px] font-medium leading-snug tracking-tight text-neutral-100">
          {t.location ?? t.organizer ?? t.name}
        </h3>
        {t.location && t.organizer && (
          <p className="mt-0.5 text-[13px] font-light text-neutral-500">{t.organizer}</p>
        )}
      </div>

      {t.kind === "SEMANAL" ? (
        <div className="flex gap-1.5" aria-label={t.weekdays.map((d) => WEEKDAY_ABBR[d]).join(", ")}>
          {DAY_INITIAL.map((l, d) => {
            const on = t.weekdays.includes(d);
            return (
              <span
                key={d}
                title={WEEKDAY_ABBR[d]}
                className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-medium ${
                  on ? "bg-accent text-white" : "bg-ink-800 text-neutral-600"
                }`}
              >
                {l}
              </span>
            );
          })}
        </div>
      ) : (
        t.date && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-100">
            <CalendarDays size={15} className="text-accent" />
            <span className="capitalize">{pontualLabel(t.date)}</span>
          </p>
        )
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-light text-neutral-400">
        {time && (
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {time}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <MapPin size={13} />
          {t.city}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="text-[13px] font-light text-neutral-500">
          {t.priceInfo ?? "Consulte valores"}
        </span>
        {c && (
          <a
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-[13px] font-medium text-ink-950 transition hover:-translate-y-0.5"
          >
            <c.Icon size={14} />
            {c.label}
          </a>
        )}
      </div>
    </article>
  );
}

export function TreinosExplorer({ treinos }: { treinos: TreinoView[] }) {
  const todayDow = useMemo(() => new Date().getDay(), []);
  const [city, setCity] = useState("");
  const [day, setDay] = useState<number | null>(null); // null = qualquer dia
  const [kind, setKind] = useState<Kind>("todos");
  const [onlyFree, setOnlyFree] = useState(false);

  const cities = useMemo(
    () => [...new Set(treinos.map((t) => t.city))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [treinos]
  );

  const list = useMemo(() => {
    return treinos
      .filter((t) => !city || t.city === city)
      .filter((t) => kind === "todos" || t.kind === kind)
      .filter((t) => !onlyFree || t.free)
      .filter((t) => {
        if (day === null) return true;
        if (t.kind === "SEMANAL") return t.weekdays.includes(day);
        return t.date ? new Date(t.date).getDay() === day : false;
      })
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "PONTUAL" ? -1 : 1; // treinões com data primeiro
        if (a.kind === "PONTUAL") return (a.date ?? "").localeCompare(b.date ?? "");
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      });
  }, [treinos, city, day, kind, onlyFree]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDay(todayDow)}
          className={`${chip} ${day === todayDow ? chipOn : chipOff}`}
        >
          Hoje
        </button>
        {WEEKDAY_ABBR.map((label, d) => (
          <button
            key={label}
            onClick={() => setDay(day === d ? null : d)}
            className={`${chip} ${day === d && day !== todayDow ? chipOn : chipOff}`}
          >
            {label}
          </button>
        ))}
        {day !== null && (
          <button onClick={() => setDay(null)} className="px-2 text-sm text-neutral-500 hover:text-neutral-100">
            limpar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <select className="field field-pill" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Todas as cidades</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="field field-pill"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          <option value="todos">Semanais e treinões</option>
          <option value="SEMANAL">Só treinos semanais</option>
          <option value="PONTUAL">Só treinões com data</option>
        </select>
        <label className="field field-pill flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={onlyFree}
            onChange={(e) => setOnlyFree(e.target.checked)}
            className="h-4 w-4 accent-orange-600"
          />
          <span>Só gratuitos</span>
        </label>
      </div>

      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {list.length} treino{list.length === 1 ? "" : "s"}
      </p>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-sm text-neutral-500">
          Nenhum treino encontrado com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <TreinoCard key={t.id} t={t} todayDow={todayDow} />
          ))}
        </div>
      )}
    </section>
  );
}
