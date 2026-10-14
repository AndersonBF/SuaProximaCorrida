import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { findAlbums, providers } from "../src/lib/photos";

/**
 * Busca álbuns de fotos (Fotop, Fotto, Banlek, Foco Radical, ClickRun) das
 * corridas que já aconteceram.
 *
 * - Corridas ainda não verificadas: busca uma vez.
 * - Corridas dos últimos 60 dias: repete a cada 2 dias, pois os fotógrafos
 *   costumam subir as fotos alguns dias depois da prova.
 *
 * Uso: npm run photos   (CORRA_PHOTOS_LIMIT limita a quantidade, para testes)
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DAY = 864e5;

async function main() {
  const now = new Date();
  const limit = Number(process.env.CORRA_PHOTOS_LIMIT) || undefined;

  // Migração: o campo antigo `photosUrl` (só Fotop) vira um RacePhoto.
  const legacy = await prisma.race.findMany({
    where: { photosUrl: { not: null } },
    select: { id: true, photosUrl: true },
  });
  for (const r of legacy) {
    await prisma.racePhoto.upsert({
      where: { raceId_url: { raceId: r.id, url: r.photosUrl! } },
      create: { raceId: r.id, url: r.photosUrl!, provider: "Fotop" },
      update: {},
    });
    await prisma.race.update({ where: { id: r.id }, data: { photosUrl: null } });
  }

  const races = await prisma.race.findMany({
    where: {
      date: { lt: now },
      OR: [
        { photosCheckedAt: null },
        {
          date: { gte: new Date(now.getTime() - 60 * DAY) },
          photosCheckedAt: { lt: new Date(now.getTime() - 2 * DAY) },
        },
      ],
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  console.log(
    `\n📸 Buscando fotos de ${races.length} corrida(s) em ${providers
      .map((p) => p.name)
      .join(", ")}...\n`
  );
  let withAlbum = 0;
  let links = 0;

  for (const race of races) {
    try {
      const albums = await findAlbums(race);
      for (const a of albums) {
        await prisma.racePhoto.upsert({
          where: { raceId_url: { raceId: race.id, url: a.url } },
          create: { raceId: race.id, url: a.url, provider: a.provider, title: a.title },
          update: { title: a.title },
        });
      }
      await prisma.race.update({
        where: { id: race.id },
        data: { photosCheckedAt: new Date() },
      });
      if (albums.length) {
        withAlbum++;
        links += albums.length;
        console.log(
          `  ✓ ${race.name} → ${albums.map((a) => a.provider).join(", ")}`
        );
      }
    } catch (e) {
      console.log(`  ✗ ${race.name}: ${(e as Error).message}`);
    }
    await sleep(250);
  }

  console.log(
    `\n✅ ${withAlbum}/${races.length} corrida(s) com álbum (${links} link(s)).\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
