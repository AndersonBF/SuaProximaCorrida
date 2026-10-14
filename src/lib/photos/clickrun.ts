import {
  getJson,
  keyTokens,
  parseBr,
  type PhotoEvent,
  type PhotoProvider,
} from "./match";

/**
 * ClickRun (clickrun.com.br / clicrun.com). O site publica a lista de eventos
 * por uma API pública; como é pequena (algumas centenas, hoje só RS), baixamos
 * a lista uma vez por execução e filtramos localmente por nome.
 * Evento: o próprio `event_url` da API.
 */
const API =
  "https://clicrun.com/api/apps/6967967ceefa699ac27d1a61/entities/Event?sort=-date&limit=5000";

interface ClickRunEvent {
  name: string;
  event_url?: string | null;
  date?: string | null; // "14/10/2026"
  location?: string | null; // "Porto Alegre / RS"
  status?: string | null;
}

let cache: Promise<PhotoEvent[]> | null = null;

function load(): Promise<PhotoEvent[]> {
  if (!cache) {
    cache = getJson<ClickRunEvent[]>(API).then((rows) =>
      (rows ?? [])
        .filter((e) => e.event_url && e.name)
        .map((e) => {
          const [city, uf] = (e.location ?? "").split("/").map((s) => s.trim());
          const start = parseBr(e.date);
          return {
            title: e.name.trim(),
            url: e.event_url as string,
            start,
            end: start,
            city,
            state: uf?.length === 2 ? uf : undefined,
          };
        })
    );
  }
  return cache;
}

export const clickRun: PhotoProvider = {
  name: "ClickRun",
  async search(term) {
    const want = keyTokens(term);
    if (want.length === 0) return [];
    const all = await load();
    return all.filter((e) => {
      const have = new Set(keyTokens(e.title));
      return want.some((t) => have.has(t));
    });
  },
};
