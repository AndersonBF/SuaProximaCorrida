import { Prisma, RaceStatus } from "@prisma/client";
import { prisma } from "./prisma";

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
  priceFrom: number | null;
  imageUrl: string | null;
  distances: string[];
};

const RACE_STOPWORDS = /\b(corrida|corridas|run|race|prova|etapa)\b/g;

function fingerprint(r: DedupeRace): string {
  const n = r.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(RACE_STOPWORDS, "")
    .replace(/[^a-z0-9]/g, "");
  return `${n}|${new Date(r.date).toISOString().slice(0, 10)}`;
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
  const best = new Map<string, T>();
  for (const r of races) {
    const k = fingerprint(r);
    const cur = best.get(k);
    if (!cur || score(r) > score(cur)) best.set(k, r);
  }
  return races.filter((r) => best.get(fingerprint(r)) === r);
}

export async function getRaceBySlug(slug: string) {
  return prisma.race.findUnique({
    where: { slug },
    include: { photos: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getRaceById(id: string) {
  return prisma.race.findUnique({ where: { id } });
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
