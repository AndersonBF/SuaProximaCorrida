import { Prisma, RaceStatus } from "@prisma/client";
import { Search, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { dedupeRaces } from "@/lib/races";
import { ResultCard } from "@/components/ResultCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resultados das corridas" };

const defaultState = process.env.NEXT_PUBLIC_DEFAULT_STATE || undefined;
const LIMIT = 150;

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: { q?: string; cidade?: string; ano?: string };
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = searchParams.q?.trim() || "";
  const cidade = searchParams.cidade?.trim() || "";
  const ano = Number(searchParams.ano) || undefined;

  const base: Prisma.RaceWhereInput = {
    status: RaceStatus.PUBLISHED,
    date: { lt: today },
    resultsUrl: { not: null },
    ...(defaultState ? { state: defaultState } : {}),
  };

  const where: Prisma.RaceWhereInput = {
    ...base,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(cidade ? { city: cidade } : {}),
    ...(ano
      ? { date: { gte: new Date(ano, 0, 1), lt: new Date(ano + 1, 0, 1) } }
      : {}),
  };

  const [rows, facets] = await Promise.all([
    prisma.race.findMany({
      where,
      orderBy: { date: "desc" },
      take: LIMIT,
      include: { photos: true },
    }),
    prisma.race.findMany({ where: base, select: { city: true, date: true } }),
  ]);

  const races = dedupeRaces(rows);
  const cities = Array.from(new Set(facets.map((f) => f.city))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const years = Array.from(
    new Set(facets.map((f) => new Date(f.date).getFullYear()))
  ).sort((a, b) => b - a);

  return (
    <div className="container-page flex flex-col gap-7">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-neutral-50">
          <Trophy size={22} className="text-accent" /> Resultados
        </h1>
        <p className="text-sm text-neutral-500">
          Corridas já realizadas, com link para os resultados oficiais.
        </p>
      </div>

      <form className="grid grid-cols-1 gap-2.5 sm:grid-cols-4" method="get">
        <div className="relative sm:col-span-2">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            name="q"
            defaultValue={q}
            className="field pl-9"
            placeholder="Buscar corrida ou cidade"
          />
        </div>
        <select name="cidade" defaultValue={cidade} className="field">
          <option value="">Todas as cidades</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="ano" defaultValue={ano ?? ""} className="field">
            <option value="">Todos os anos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-accent px-4 text-sm font-medium text-ink-950 transition hover:bg-accent-soft">
            Filtrar
          </button>
        </div>
      </form>

      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {races.length} corrida{races.length === 1 ? "" : "s"}
        {rows.length >= LIMIT ? ` (mostrando as ${LIMIT} mais recentes)` : ""}
      </p>

      {races.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-sm text-neutral-500">
          Nenhum resultado encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {races.map((race) => (
            <ResultCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </div>
  );
}
