import type { Scraper, ScrapedRace } from "./types";

/**
 * Scraper do foureventos.com (agenda em /resultados). Cada card traz nome,
 * data, local (cidade/UF) e imagem; o link aponta para a página do evento no
 * próprio foureventos. A página mistura provas futuras e passadas — filtramos
 * pela UF alvo; as passadas entram com `resultsUrl` (a própria página do evento
 * no foureventos traz os resultados).
 */
const HOST = "https://foureventos.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, "março": 3, abril: 4, maio: 5,
  junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10,
  novembro: 11, dezembro: 12,
};

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ccedil;/g, "ç")
    .replace(/&atilde;/g, "ã").replace(/&otilde;/g, "õ").replace(/&acirc;/g, "â")
    .replace(/&ecirc;/g, "ê").replace(/&ocirc;/g, "ô")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseDatePt(raw: string): Date | null {
  const m = raw.match(/(\d{1,2})\s+de\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return new Date(Number(m[3]), month - 1, Number(m[1]), 7, 0, 0, 0);
}

export const foureventosScraper: Scraper = {
  name: "Four Eventos",

  async run({ state }): Promise<ScrapedRace[]> {
    const uf = (state || "PR").toUpperCase();
    let html: string;
    try {
      const res = await fetch(`${HOST}/resultados`, {
        headers: { "user-agent": UA, accept: "text/html" },
      });
      if (!res.ok) {
        console.warn(`[foureventos] HTTP ${res.status}`);
        return [];
      }
      html = await res.text();
    } catch (err) {
      console.warn("[foureventos] falha:", (err as Error).message);
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const chunks = html.split('<a href="/resultados/').slice(1);
    const out: ScrapedRace[] = [];
    const seen = new Set<string>();

    for (const chunk of chunks) {
      const slug = chunk.match(/^([^"]+)"/)?.[1];
      if (!slug || seen.has(slug)) continue;

      const block = chunk.slice(0, chunk.indexOf("</a>"));
      const name = block.match(/<h3>([^<]+)<\/h3>/)?.[1];
      const dateRaw = block.match(/fa-calendar[^>]*><\/i>\s*([^<]+)<\/h4>/)?.[1];
      const locRaw = block.match(/fa-map-marker[^>]*><\/i>\s*([^<]+)<\/h4>/)?.[1];
      const imgRaw = block.match(/<img[^>]+src="([^"]+)"/)?.[1];
      if (!name || !dateRaw || !locRaw) continue;

      const date = parseDatePt(decode(dateRaw));
      if (!date) continue;
      const isPast = date < today; // provas passadas viram "resultados"

      // "Local: [VENUE - ]CIDADE/UF"
      const loc = decode(locRaw).replace(/^local:\s*/i, "");
      const ufm = loc.match(/\/([A-Z]{2})\s*$/);
      if (!ufm) continue;
      const evUf = ufm[1].toUpperCase();
      if (evUf !== uf) continue;

      const beforeUf = loc.replace(/\/[A-Z]{2}\s*$/, "").trim(); // "VENUE - CIDADE" ou "CIDADE"
      const parts = beforeUf.split(/\s+-\s+/);
      const city = parts[parts.length - 1].trim();
      const venue = parts.length > 1 ? parts.slice(0, -1).join(" - ").trim() : undefined;

      seen.add(slug);
      const url = `${HOST}/resultados/${slug}`;
      out.push({
        externalId: slug,
        name: decode(name),
        date,
        state: evUf,
        city,
        location: venue,
        distances: [],
        imageUrl: imgRaw ? (imgRaw.startsWith("http") ? imgRaw : HOST + imgRaw) : undefined,
        registrationUrl: url,
        resultsUrl: isPast ? url : undefined,
        sourceUrl: url,
        source: "Four Eventos",
      });
    }

    console.log(`  [foureventos] ${out.length} corrida(s) em ${uf}`);
    return out;
  },
};
