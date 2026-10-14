import {
  UA,
  decodeHtml,
  parseBr,
  type PhotoEvent,
  type PhotoProvider,
} from "./match";

/**
 * Fotop (fotop.com.br). A busca é um GET em `/?nome_evento=<texto>` e devolve
 * cartões com título, cidade, data e link do álbum (`/eventos/<slug>/e/<id>`).
 * A busca é por trecho do título, então símbolos ("Track & Field") quebram
 * frases longas — por isso o runner também tenta palavras isoladas.
 */
const HOST = "https://www.fotop.com.br";

export function parseFotopCards(html: string): PhotoEvent[] {
  const out: PhotoEvent[] = [];
  const chunks = html.split(/class="a-card-evento-home[a-z-]*"/).slice(1);
  for (const raw of chunks) {
    const chunk = raw.replace(/\s+/g, " ");
    const href = chunk.match(/href="(\/eventos\/[^"]+\/e\/\d+)"/)?.[1];
    const title = chunk.match(/class="card-titulo-evento" title="([^"]*)"/)?.[1];
    if (!href || !title) continue;
    const city = chunk.match(/class="nome-cidade-card">([^<]*)</)?.[1] ?? "";
    const stateM = chunk.match(/class="nome-cidade-card">[^<]*<\/span>,\s*([A-Z]{2})/);
    const dateTxt =
      chunk.match(/class="card-data-evento">\s*<i[^>]*><\/i>\s*([^<]+)</)?.[1] ?? "";
    const dates = dateTxt.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) ?? [];
    out.push({
      title: decodeHtml(title),
      city: decodeHtml(city),
      state: stateM?.[1],
      url: `${HOST}${href}`,
      start: parseBr(dates[0]),
      end: parseBr(dates[1] ?? dates[0]),
    });
  }
  return out;
}

export const fotop: PhotoProvider = {
  name: "Fotop",
  async search(term) {
    try {
      const res = await fetch(`${HOST}/?nome_evento=${encodeURIComponent(term)}`, {
        headers: { "user-agent": UA, accept: "text/html" },
      });
      if (!res.ok) return [];
      return parseFotopCards(await res.text());
    } catch {
      return [];
    }
  },
};

export const fotopSearchUrl = (name: string) =>
  `${HOST}/?nome_evento=${encodeURIComponent(name)}`;
