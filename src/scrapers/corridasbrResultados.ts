import type { Scraper, ScrapedRace } from "./types";

/**
 * Resultados de corridas já realizadas, a partir do corridasbr.com.br.
 *
 * O site publica, por estado e mês, uma tabela (`Res_<ano>.asp?escolha=<mês>`)
 * com data, cidade, nome e um link `mostraresultado.asp?escolha=<id>`. A página
 * do evento traz o link real dos resultados no site do cronometrista
 * ("Resultados desta Corrida").
 *
 * Varre os últimos 12 meses. O `externalId` é o mesmo id do calendário, então o
 * runner anexa o link a corridas que já temos em vez de duplicar.
 */
const HOST = "https://www.corridasbr.com.br";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const MONTHS_BACK = 12;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchLatin1(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return Buffer.from(await res.arrayBuffer()).toString("latin1");
}

const NAMED: Record<string, string> = {
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  acirc: "â", ecirc: "ê", ocirc: "ô", atilde: "ã", otilde: "õ",
  agrave: "à", ccedil: "ç", Ccedil: "Ç", amp: "&", quot: '"', nbsp: " ",
};

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED[name] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

interface Row {
  id: string;
  ddmm: string;
  city: string;
  name: string;
  year: number;
}

function parseMonth(html: string, year: number): Row[] {
  const out: Row[] = [];
  for (const chunk of html.split(/<tr\b/i)) {
    const id = chunk.match(/mostraresultado\.asp\?escolha=(\d+)/i)?.[1];
    if (!id) continue;
    const cells = Array.from(chunk.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(
      (m) => decode(m[1].replace(/<[^>]+>/g, " "))
    );
    const ddmm = cells[0]?.match(/(\d{1,2})\.(\d{1,2})/);
    if (!ddmm || !cells[1] || !cells[2]) continue;
    out.push({ id, ddmm: `${ddmm[1]}.${ddmm[2]}`, city: cells[1], name: cells[2], year });
  }
  return out;
}

function field(html: string, label: string): string | undefined {
  const m = html.match(
    new RegExp(label + "\\s*</span></td>\\s*<td[^>]*>\\s*(?:<span[^>]*>)?([^<]+)", "i")
  );
  return m ? decode(m[1]) : undefined;
}

function parseDistances(raw?: string): string[] {
  if (!raw) return [];
  const unit = raw.match(/([a-zA-Z]+)\s*$/)?.[1] ?? "km";
  return raw
    .replace(/[a-zA-Z]+\s*$/, "")
    .split("/")
    .map((n) => n.trim())
    .filter((n) => /\d/.test(n))
    .map((n) => `${n}${unit}`);
}

export const corridasbrResultadosScraper: Scraper = {
  name: "corridasbr (resultados)",

  async run({ state }): Promise<ScrapedRace[]> {
    const uf = (state || "PR").toUpperCase();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // (ano, mês) dos últimos MONTHS_BACK meses, incluindo o atual
    const periods: { year: number; month: number }[] = [];
    for (let i = 0; i < MONTHS_BACK; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const rows: Row[] = [];
    for (const { year, month } of periods) {
      try {
        const html = await fetchLatin1(
          `${HOST}/${uf}/Res_${year}.asp?escolha=${month}`
        );
        rows.push(...parseMonth(html, year));
      } catch {
        // mês/ano sem página: ignora
      }
    }

    const seen = new Set<string>();
    const unique = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    console.log(`  [corridasbr/resultados] ${unique.length} provas com resultado em ${uf}`);

    const out: ScrapedRace[] = [];
    const BATCH = 5;
    for (let i = 0; i < unique.length; i += BATCH) {
      const batch = unique.slice(i, i + BATCH);
      const settled = await Promise.all(
        batch.map(async (r): Promise<ScrapedRace | null> => {
          const url = `${HOST}/${uf}/mostraresultado.asp?escolha=${r.id}`;
          try {
            const html = await fetchLatin1(url);
            const link = html.match(
              /<a[^>]+href=['"](https?:\/\/[^'"]+)['"][^>]*>(?:\s*<[^>]+>)*\s*Resultados desta Corrida/i
            )?.[1];
            if (!link) return null;

            const [d, m] = r.ddmm.split(".").map(Number);
            const full = field(html, "Data:")?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            const date = full
              ? new Date(Number(full[3]), Number(full[2]) - 1, Number(full[1]), 7)
              : new Date(r.year, m - 1, d, 7);
            if (date >= now) return null; // ainda não aconteceu

            const distances = parseDistances(field(html, "ncia\\(s\\):"));
            return {
              externalId: r.id,
              name: r.name,
              date,
              state: uf,
              city: r.city,
              distances,
              organizer: field(html, "Organizador:"),
              registrationUrl: link,
              resultsUrl: link,
              sourceUrl: url,
              source: "corridasbr",
            };
          } catch {
            return null;
          }
        })
      );
      for (const s of settled) if (s) out.push(s);
      await delay(300);
    }

    console.log(`  [corridasbr/resultados] ${out.length} com link de resultados`);
    return out;
  },
};
