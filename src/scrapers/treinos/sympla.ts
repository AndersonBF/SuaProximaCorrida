import type { ScrapedTreino, TreinoScraper } from "./types";

/**
 * Treinos e "treinões" pontuais (com data) anunciados no Sympla.
 *
 * A busca do Sympla é renderizada no navegador, então usamos o Playwright
 * (mesmo recurso do headless.ts). Cada página de busca traz eventos do país
 * todo; filtramos pela UF e por palavras de treino de corrida, descartando
 * cursos, palestras e outras modalidades.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const CITIES: Record<string, string[]> = {
  PR: [
    "curitiba-pr",
    "londrina-pr",
    "maringa-pr",
    "ponta-grossa-pr",
    "cascavel-pr",
    "foz-do-iguacu-pr",
    "sao-jose-dos-pinhais-pr",
    "guarapuava-pr",
  ],
};

const QUERIES = ["treino corrida", "treinão", "treino coletivo", "treino gratuito"];

const MONTHS: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

const IS_TREINO = /\btrein(?:o|os|ão|ao|ões|oes|inho)\b/i;
const IS_RUN = /corrid|\brun|runner|pace|trote|\brua\b|\d\s?km|pedestre|corredor/i;
const NOT_TREINO =
  /curso|palestra|workshop|webinar|periodiza|cl[ií]nica|forma[cç][aã]o|certifica|ciclis|\bbike|pedal|funcional|crossfit|muscula|pilates|yoga|nata[cç]|triathlon|nutri|ebook|mentoria|congresso|semin[aá]rio/i;

export function isTreinoName(name: string): boolean {
  if (!IS_TREINO.test(name) || NOT_TREINO.test(name)) return false;
  return IS_RUN.test(name) || /trein(?:ão|ao|ões|oes)/i.test(name);
}

/** "Domingo, 15 de Nov às 07:00" -> Date (próxima ocorrência, horário de Brasília). */
export function parseSymplaDate(text: string, now = new Date()): Date | null {
  const m = text.match(/(\d{1,2})\s+de\s+([A-Za-zçÇ]{3})[a-zç]*\.?(?:\s+de\s+(\d{4}))?.*?(?:às|as)\s+(\d{1,2}):(\d{2})/i);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")];
  if (month === undefined) return null;
  const day = parseInt(m[1], 10);
  let year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
  const mk = (y: number) => new Date(Date.UTC(y, month, day, parseInt(m[4], 10) + 3, parseInt(m[5], 10)));
  let d = mk(year);
  if (!m[3] && d.getTime() < now.getTime() - 30 * 86400000) d = mk(year + 1);
  return d;
}

export const symplaTreinosScraper: TreinoScraper = {
  name: "Sympla",

  async run({ state }): Promise<ScrapedTreino[]> {
    const uf = (state || "PR").toUpperCase();
    const cities = CITIES[uf];
    if (!cities) {
      console.log(`    Sympla: sem lista de cidades para ${uf}, pulando.`);
      return [];
    }

    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const found = new Map<string, ScrapedTreino>();
    try {
      const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1000 } });
      for (const city of cities) {
        for (const q of QUERIES) {
          const page = await ctx.newPage();
          try {
            const url = `https://www.sympla.com.br/eventos/${city}?s=${encodeURIComponent(q)}`;
            await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
            await page.waitForTimeout(1500);
            const cards = await page.evaluate(() =>
              [...document.querySelectorAll<HTMLAnchorElement>("a[href*='/evento/']")].map((a) => ({
                href: a.href.split("?")[0],
                lines: a.innerText.split("\n").map((s) => s.trim()).filter(Boolean),
                img: a.querySelector("img")?.src ?? "",
              }))
            );
            for (const c of cards) {
              const id = c.href.match(/\/evento\/[^/]+\/(\d+)/)?.[1];
              if (!id || found.has(id)) continue;
              const name = c.lines[0];
              const place = c.lines.find((l) => /,\s*[A-Z]{2}$/.test(l));
              const when = c.lines.find((l) => /\d{1,2}\s+de\s+\w+/i.test(l));
              if (!name || !place || !when || !isTreinoName(name)) continue;
              const [cityName, cityUf] = place.split(/,\s*/);
              if (cityUf !== uf) continue;
              const date = parseSymplaDate(when);
              if (!date) continue;
              found.set(id, {
                externalId: id,
                name,
                kind: "PONTUAL",
                date,
                startTime: `${String((date.getUTCHours() + 21) % 24).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`,
                state: cityUf,
                city: cityName,
                imageUrl: c.img.startsWith("http") ? c.img : undefined,
                website: c.href,
                sourceUrl: c.href,
                scheduleText: when,
              });
            }
          } catch (err) {
            console.warn(`    Sympla ${city} "${q}": ${(err as Error).message}`);
          } finally {
            await page.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
    return [...found.values()];
  },
};
