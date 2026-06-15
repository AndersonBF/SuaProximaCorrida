import type { Scraper, ScrapedRace } from "./types";

/**
 * Exemplo de scraper para o Sympla.
 *
 * IMPORTANTE — leia antes de ativar em produção:
 * - Verifique sempre os Termos de Uso / robots.txt do site antes de coletar.
 * - Sites mudam de estrutura: este endpoint e os campos abaixo podem precisar
 *   de ajuste. Para descobrir o endpoint correto, abra o site, vá em
 *   DevTools > Network e veja qual requisição JSON alimenta a busca de eventos.
 * - Este scraper é defensivo: qualquer erro retorna [] em vez de derrubar o runner.
 *
 * A ideia: buscar eventos da categoria "corrida/corridas" filtrando por estado,
 * e mapear cada resultado para o formato ScrapedRace.
 */

const SEARCH_ENDPOINT = "https://www.sympla.com.br/api/v1/search";

interface SymplaEvent {
  id?: number | string;
  name?: string;
  detail?: string;
  start_date?: string;
  end_date?: string;
  images?: { original?: string; default?: string };
  location?: { city?: string; state?: string; address?: string; name?: string };
  url?: string;
}

function toScraped(ev: SymplaEvent): ScrapedRace | null {
  if (!ev.id || !ev.name || !ev.start_date || !ev.location?.city) return null;

  return {
    externalId: String(ev.id),
    name: ev.name.trim(),
    description: ev.detail?.replace(/<[^>]+>/g, "").trim() || undefined,
    imageUrl: ev.images?.original || ev.images?.default,
    date: new Date(ev.start_date),
    endDate: ev.end_date ? new Date(ev.end_date) : undefined,
    state: (ev.location.state || "").toUpperCase().slice(0, 2),
    city: ev.location.city,
    location: ev.location.name || ev.location.address,
    registrationUrl:
      ev.url || `https://www.sympla.com.br/evento?id=${ev.id}`,
    sourceUrl: ev.url,
  };
}

export const symplaScraper: Scraper = {
  name: "Sympla",

  async run({ state }): Promise<ScrapedRace[]> {
    try {
      const params = new URLSearchParams({
        only: "id,name,detail,start_date,end_date,images,location,url",
        published: "true",
        sort: "date",
        s: "corrida", // termo de busca
      });
      if (state) params.set("state", state.toUpperCase());

      const res = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
        headers: {
          accept: "application/json",
          "user-agent":
            "Mozilla/5.0 (compatible; CorraMelhorBot/0.1; +agregador-de-corridas)",
        },
      });

      if (!res.ok) {
        console.warn(`[sympla] resposta ${res.status} — ajuste o endpoint.`);
        return [];
      }

      const json: any = await res.json();
      const events: SymplaEvent[] = json?.data ?? json?.events ?? [];

      return events
        .map(toScraped)
        .filter((r): r is ScrapedRace => r !== null)
        // garante que é uma corrida (heurística simples pelo nome)
        .filter((r) => /corrid|run|maratona|km|trail/i.test(r.name));
    } catch (err) {
      console.warn("[sympla] falha ao coletar:", (err as Error).message);
      return [];
    }
  },
};
