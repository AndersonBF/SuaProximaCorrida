import { prisma } from "./prisma";
import { slugify } from "./format";
import type { ScrapedRace } from "@/scrapers/types";

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "corrida";
  let slug = base;
  let i = 1;
  while (await prisma.race.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

/**
 * Insere ou atualiza uma corrida vinda de um scraper, deduplicando por
 * (source, externalId). Mantém o slug existente quando atualiza.
 */
export async function upsertScrapedRace(defaultSource: string, r: ScrapedRace) {
  const source = r.source ?? defaultSource;
  const existing = await prisma.race.findUnique({
    where: { source_externalId: { source, externalId: r.externalId } },
  });

  const data = {
    name: r.name,
    description: r.description ?? null,
    imageUrl: r.imageUrl ?? null,
    date: r.date,
    endDate: r.endDate ?? null,
    state: r.state,
    city: r.city,
    location: r.location ?? null,
    distances: r.distances ?? [],
    priceFrom: r.priceFrom ?? null,
    priceTo: r.priceTo ?? null,
    organizer: r.organizer ?? null,
    registrationUrl: r.registrationUrl,
    source,
    sourceUrl: r.sourceUrl ?? null,
    externalId: r.externalId,
  };

  if (existing) {
    await prisma.race.update({ where: { id: existing.id }, data });
    return "updated" as const;
  }

  await prisma.race.create({
    data: { ...data, slug: await uniqueSlug(r.name) },
  });
  return "created" as const;
}
