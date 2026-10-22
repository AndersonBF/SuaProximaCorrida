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

/** Normaliza link de inscrição: sem protocolo/www/hash/barra final (a query
 *  é mantida: páginas como mostracorrida.asp?escolha=N dependem dela). */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/#.*$/, "")
    .replace(/\/+$/, "");
}

async function findByRegistrationUrl(url: string) {
  // Ticket Sports: "/e/NOME+DO+EVENTO-88560" — o id numérico final é estável
  // mesmo quando o nome no slug muda ou é codificado de outra forma.
  const tsId = url.match(/ticketsports\.com\.br\/e\/.*-(\d+)\/?(?:[?#].*)?$/i)?.[1];
  if (tsId) {
    return prisma.race.findFirst({
      where: {
        registrationUrl: { contains: "ticketsports.com.br/e/", mode: "insensitive" },
        AND: [{ registrationUrl: { endsWith: `-${tsId}` } }],
      },
    });
  }
  const norm = normalizeUrl(url);
  const candidates = await prisma.race.findMany({
    where: { registrationUrl: { contains: norm, mode: "insensitive" } },
    take: 20,
  });
  return candidates.find((c) => normalizeUrl(c.registrationUrl) === norm) ?? null;
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

  // Resultado de prova que já temos (mesma página de origem): só anexa o link.
  if (!existing && r.resultsUrl && r.sourceUrl) {
    // o corridasbr usa o mesmo id de evento no calendário e nos resultados
    const known = await prisma.race.findFirst({
      where: {
        OR: [
          { sourceUrl: r.sourceUrl },
          {
            externalId: r.externalId,
            sourceUrl: { contains: "corridasbr.com.br" },
          },
        ],
      },
    });
    if (known) {
      await prisma.race.update({
        where: { id: known.id },
        data: { resultsUrl: r.resultsUrl },
      });
      return "updated" as const;
    }
  }

  // Dedupe entre fontes: a mesma prova pode vir do corridasbr (que aponta para
  // a plataforma) e da própria plataforma. Compara pelo link de inscrição.
  if (!existing) {
    const dup = await findByRegistrationUrl(r.registrationUrl);
    if (dup) {
      await prisma.race.update({
        where: { id: dup.id },
        data: {
          imageUrl: dup.imageUrl ?? r.imageUrl ?? null,
          organizer: dup.organizer ?? r.organizer ?? null,
        },
      });
      return "updated" as const;
    }
  }

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
    lastVerifiedAt: new Date(),
    ...(r.resultsUrl ? { resultsUrl: r.resultsUrl } : {}),
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
