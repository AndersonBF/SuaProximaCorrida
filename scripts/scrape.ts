import "dotenv/config";
import { scrapers } from "../src/scrapers";
import { upsertScrapedRace } from "../src/lib/upsertRace";
import { prisma } from "../src/lib/prisma";
import { closeBrowser } from "../src/lib/headless";

/**
 * Runner de scraping. Uso:
 *   npm run scrape            -> usa NEXT_PUBLIC_DEFAULT_STATE
 *   npm run scrape -- SP      -> força a UF
 *
 * Agende com cron / Task Scheduler para rodar periodicamente.
 */
async function main() {
  const state =
    process.argv[2] || process.env.NEXT_PUBLIC_DEFAULT_STATE || undefined;

  console.log(
    `\n🏃 Coletando corridas${state ? ` (UF: ${state})` : ""} de ${
      scrapers.length
    } fonte(s)...\n`
  );

  let created = 0;
  let updated = 0;

  for (const scraper of scrapers) {
    try {
      const races = await scraper.run({ state });
      console.log(`  • ${scraper.name}: ${races.length} resultado(s)`);
      for (const race of races) {
        const result = await upsertScrapedRace(scraper.name, race);
        if (result === "created") created++;
        else updated++;
      }
    } catch (err) {
      console.error(`  ✗ ${scraper.name} falhou:`, (err as Error).message);
    }
  }

  console.log(`\n✅ Concluído: ${created} criada(s), ${updated} atualizada(s).\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await closeBrowser();
    await prisma.$disconnect();
  });
