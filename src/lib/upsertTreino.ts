import { prisma } from "./prisma";
import { slugify } from "./format";
import type { ScrapedTreino } from "@/scrapers/treinos/types";

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "treino";
  let slug = base;
  let i = 1;
  while (await prisma.treino.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

/** Insere ou atualiza um treino vindo de scraping, deduplicando por (source, externalId). */
export async function upsertScrapedTreino(defaultSource: string, t: ScrapedTreino) {
  const source = t.source ?? defaultSource;
  const existing = await prisma.treino.findUnique({
    where: { source_externalId: { source, externalId: t.externalId } },
  });

  const data = {
    name: t.name,
    kind: t.kind,
    description: t.description ?? null,
    imageUrl: t.imageUrl ?? null,
    weekdays: t.weekdays ?? [],
    startTime: t.startTime ?? null,
    endTime: t.endTime ?? null,
    date: t.date ?? null,
    scheduleText: t.scheduleText ?? null,
    state: t.state,
    city: t.city,
    location: t.location ?? null,
    organizer: t.organizer ?? null,
    free: t.free ?? false,
    priceInfo: t.priceInfo ?? null,
    instagram: t.instagram ?? null,
    whatsapp: t.whatsapp ?? null,
    website: t.website ?? null,
    sourceUrl: t.sourceUrl ?? null,
    source,
    externalId: t.externalId,
    lastVerifiedAt: new Date(),
  };

  if (existing) {
    await prisma.treino.update({ where: { id: existing.id }, data });
    return "updated" as const;
  }
  await prisma.treino.create({ data: { ...data, slug: await uniqueSlug(t.name) } });
  return "created" as const;
}
