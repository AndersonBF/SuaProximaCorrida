import { getJson, type PhotoProvider } from "./match";

/**
 * Foco Radical (focoradical.com.br). API do próprio site:
 *   /next-api/home/competitions?CompetitionSearch[search_events]=<texto>
 * Evento: https://www.focoradical.com.br/evento/<path>
 */
interface Competition {
  name: string;
  path: string;
  date: string; // "2026-10-14"
  place?: string | null;
  state?: { abbreviation?: string | null } | null;
}

export const focoRadical: PhotoProvider = {
  name: "Foco Radical",
  async search(term) {
    const data = await getJson<{ items?: Competition[] }>(
      `https://www.focoradical.com.br/next-api/home/competitions?CompetitionSearch%5Bsearch_events%5D=${encodeURIComponent(
        term
      )}`
    );
    return (data?.items ?? []).map((c) => {
      const m = c.date?.match(/(\d{4})-(\d{2})-(\d{2})/);
      const start = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : undefined;
      return {
        title: c.name,
        url: `https://www.focoradical.com.br/evento/${c.path}`,
        start,
        end: start,
        city: c.place ?? undefined,
        state: c.state?.abbreviation ?? undefined,
      };
    });
  },
};
