import { Prisma, RaceStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { keyTokens } from "./photos/match";
import { raceType } from "./raceMeta";

export interface RaceFilters {
  q?: string;
  state?: string;
  city?: string;
  distance?: string;
  maxPrice?: number;
  month?: string; // "yyyy-MM"
  includeUnpublished?: boolean;
}

export function buildWhere(filters: RaceFilters): Prisma.RaceWhereInput {
  const where: Prisma.RaceWhereInput = {};

  if (!filters.includeUnpublished) {
    where.status = RaceStatus.PUBLISHED;
  }

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      { organizer: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.state) where.state = filters.state.toUpperCase();
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.distance) where.distances = { has: filters.distance };
  if (filters.maxPrice !== undefined)
    where.priceFrom = { lte: filters.maxPrice };

  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number);
    if (y && m) {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where.date = { gte: start, lt: end };
    }
  }

  return where;
}

/** Lista corridas a partir de hoje (ou todas, se includeUnpublished). */
export async function listRaces(filters: RaceFilters = {}) {
  const where = buildWhere(filters);

  // Por padrão, só corridas futuras na home pública
  if (!filters.includeUnpublished && !filters.month) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.date = { gte: today };
  }

  const rows = await prisma.race.findMany({
    where,
    orderBy: [{ featured: "desc" }, { date: "asc" }],
  });
  return dedupeRaces(rows);
}

type DedupeRace = {
  name: string;
  date: Date;
  city: string;
  priceFrom: number | null;
  imageUrl: string | null;
  distances: string[];
};

const compact = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Dia da prova no fuso de Brasília (YYYY-MM-DD). */
const brDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const raceDay = (d: Date) => brDay.format(new Date(d));

/** Palavras do nome que identificam a prova (sem genéricas, ordinais, romanos e ano). */
function nameTokens(name: string): string[] {
  return keyTokens(name).filter((t) => !/^[ivx]+$/.test(t) && !/^\d+$/.test(t));
}

/**
 * Fração das palavras de `x` (fora o nome da cidade) que aparecem em `y` —
 * direto ou como sigla em `y` (ex: "GMA" = Guarda Municipal de Araucária).
 */
function coverage(x: string[], y: string[], cityTokens: Set<string>): number {
  const relevant = x.filter((t) => !cityTokens.has(t));
  if (relevant.length === 0) return 0;
  const ySet = new Set(y);
  const initials = x.map((t) => t[0]).join("");
  const byAcronym = new Set<number>();
  for (const a of y) {
    if (a.length < 2 || a.length > 5 || x.includes(a)) continue;
    const at = initials.indexOf(a);
    if (at !== -1) for (let i = at; i < at + a.length; i++) byAcronym.add(i);
  }
  const covered = x.filter(
    (t, i) => !cityTokens.has(t) && (ySet.has(t) || byAcronym.has(i))
  ).length;
  return covered / relevant.length;
}

/** Mesma prova vinda de fontes diferentes: mesmo dia, mesma cidade e nome parecido. */
export function isSameRace(a: DedupeRace, b: DedupeRace): boolean {
  if (raceDay(a.date) !== raceDay(b.date)) return false;
  if (compact(a.city) !== compact(b.city)) return false;
  const cityTokens = new Set(keyTokens(a.city));
  const ta = nameTokens(a.name);
  const tb = nameTokens(b.name);
  const ja = ta.filter((t) => !cityTokens.has(t)).join("");
  const jb = tb.filter((t) => !cityTokens.has(t)).join("");
  if (ja && ja === jb) return true; // "ITA RUNNING" x "Itarunning"
  return Math.max(coverage(ta, tb, cityTokens), coverage(tb, ta, cityTokens)) >= 0.6;
}

/**
 * Remove corridas duplicadas (mesma prova vinda de fontes diferentes), mantendo
 * a mais completa (com preço > imagem > distâncias). Preserva a ordem original.
 */
export function dedupeRaces<T extends DedupeRace>(races: T[]): T[] {
  const score = (r: T) =>
    (r.priceFrom != null ? 2 : 0) +
    (r.imageUrl ? 1 : 0) +
    (r.distances.length > 0 ? 1 : 0);
  // agrupa por dia + cidade e, dentro do grupo, junta as que são a mesma prova
  const groups = new Map<string, T[][]>();
  const keep = new Set<T>();
  for (const r of races) {
    const k = `${raceDay(r.date)}|${compact(r.city)}`;
    const clusters = groups.get(k) ?? [];
    const cluster = clusters.find((c) => c.some((o) => isSameRace(o, r)));
    if (cluster) cluster.push(r);
    else clusters.push([r]);
    groups.set(k, clusters);
  }
  for (const clusters of Array.from(groups.values())) {
    for (const c of clusters) {
      keep.add(c.reduce((best, r) => (score(r) > score(best) ? r : best)));
    }
  }
  return races.filter((r) => keep.has(r));
}

export async function getRaceBySlug(slug: string) {
  return prisma.race.findUnique({
    where: { slug },
    include: {
      photos: { orderBy: { createdAt: "asc" } },
      lots: true,
    },
  });
}

export async function getRaceById(id: string) {
  return prisma.race.findUnique({ where: { id }, include: { lots: true } });
}

/** Valores únicos para popular os filtros (cidades, distâncias, estados). */
export async function getFilterOptions(state?: string) {
  const races = await prisma.race.findMany({
    where: {
      status: RaceStatus.PUBLISHED,
      ...(state ? { state: state.toUpperCase() } : {}),
    },
    select: { city: true, state: true, distances: true },
  });

  const cities = new Set<string>();
  const states = new Set<string>();
  const distances = new Set<string>();
  for (const r of races) {
    cities.add(r.city);
    states.add(r.state);
    r.distances.forEach((d) => distances.add(d));
  }

  return {
    cities: Array.from(cities).sort(),
    states: Array.from(states).sort(),
    distances: Array.from(distances).sort(),
  };
}

/**
 * Corridas para segurar o visitante na página: outras da mesma cidade e
 * parecidas (mesmo estado, mesmo tipo/distância). Só futuras e publicadas.
 */
export async function getRelatedRaces(
  race: { id: string; name: string; city: string; state: string; distances: string[] },
  limit = 3
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = dedupeRaces(
    await prisma.race.findMany({
      where: {
        status: RaceStatus.PUBLISHED,
        id: { not: race.id },
        state: race.state,
        date: { gte: today },
      },
      orderBy: { date: "asc" },
      take: 120,
    })
  );

  const sameCity = rows
    .filter((r) => compact(r.city) === compact(race.city))
    .slice(0, limit);
  const used = new Set(sameCity.map((r) => r.id));

  const type = raceType(race.name, race.distances).label;
  const similar = rows
    .filter((r) => !used.has(r.id))
    .map((r) => ({
      r,
      score:
        (raceType(r.name, r.distances).label === type ? 2 : 0) +
        (r.distances.some((d) => race.distances.includes(d)) ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.date.getTime() - b.r.date.getTime())
    .slice(0, limit)
    .map((x) => x.r);

  return { sameCity, similar };
}
