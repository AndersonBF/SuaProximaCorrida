import "dotenv/config";
import { treinoScrapers } from "../src/scrapers/treinos";
import { upsertScrapedTreino } from "../src/lib/upsertTreino";
import { formatWeekdays } from "../src/scrapers/treinos/schedule";
import { prisma } from "../src/lib/prisma";
import { closeBrowser } from "../src/lib/headless";

/**
 * Runner de scraping de TREINOS (não são corridas). Uso:
 *   npm run scrape:treinos             -> grava no banco (UF = NEXT_PUBLIC_DEFAULT_STATE)
 *   npm run scrape:treinos -- --dry    -> só imprime o que encontrou, sem gravar
 *   npm run scrape:treinos -- SP       -> força a UF
 */
async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const state =
    args.find((a) => /^[A-Za-z]{2}$/.test(a))?.toUpperCase() ||
    process.env.NEXT_PUBLIC_DEFAULT_STATE ||
    undefined;

  console.log(
    `\n👟 Coletando treinos${state ? ` (UF: ${state})` : ""}${dry ? " [dry-run]" : ""}...\n`
  );

  let created = 0;
  let updated = 0;
  const seen = new Set<string>();
  const startedAt = new Date();

  for (const scraper of treinoScrapers) {
    console.log(`  • ${scraper.name}`);
    try {
      const all = await scraper.run({ state });
      // o mesmo treino pode aparecer no site e no Instagram: fica o da 1ª fonte
      const treinos = all.filter((t) => {
        if (t.kind !== "SEMANAL") return true;
        const key = `${(t.organizer ?? "").toLowerCase()}|${(t.weekdays ?? []).join(",")}|${t.startTime}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      console.log(`    total: ${treinos.length}${all.length > treinos.length ? ` (${all.length - treinos.length} repetido(s) de outra fonte)` : ""}`);
      for (const t of treinos) {
        if (dry) {
          const quando =
            t.kind === "PONTUAL"
              ? `${t.date?.toISOString().slice(0, 16)}`
              : `${formatWeekdays(t.weekdays ?? [])} ${t.startTime}${t.endTime ? `–${t.endTime}` : ""}`;
          console.log(`      - [${t.kind}] ${t.name} | ${t.city} | ${quando} | ${t.scheduleText ?? ""}`);
          continue;
        }
        const r = await upsertScrapedTreino(scraper.name, t);
        if (r === "created") created++;
        else updated++;
      }
      // semanais que a fonte não mostra mais (horário mudou/saiu do site): arquiva
      if (!dry && treinos.length > 0) {
        const gone = await prisma.treino.updateMany({
          where: {
            source: scraper.name,
            kind: "SEMANAL",
            status: "PUBLISHED",
            lastVerifiedAt: { lt: startedAt },
            ...(state ? { state } : {}),
          },
          data: { status: "ARCHIVED" },
        });
        if (gone.count) console.log(`    ${gone.count} treino(s) antigo(s) arquivado(s)`);
      }
    } catch (err) {
      console.error(`    ✗ falhou:`, (err as Error).message);
    }
  }

  if (!dry) console.log(`\n✅ Concluído: ${created} criado(s), ${updated} atualizado(s).\n`);
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
