import { brDateFromIso, getJson, type PhotoProvider } from "./match";

/**
 * Fotto (fotto.com.br, da Alboom). API pública de galerias:
 *   https://api.fotto.com.br/api/galleries?term=<texto>&per_page=24
 * O Zero62 e outras marcas brancas usam a mesma API, então já estão cobertos.
 * Álbum: https://www.fotto.com.br/<slug>/e/<id>
 */
interface Gallery {
  id: number;
  title: string;
  slug: string;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  city?: string | null;
  state?: string | null;
}

export const fotto: PhotoProvider = {
  name: "Fotto",
  async search(term) {
    const data = await getJson<{ galleries?: Gallery[] }>(
      `https://api.fotto.com.br/api/galleries?term=${encodeURIComponent(
        term
      )}&order_dir=DESC&per_page=24`
    );
    return (data?.galleries ?? []).map((g) => ({
      title: g.title,
      url: `https://www.fotto.com.br/${g.slug}/e/${g.id}`,
      start: brDateFromIso(g.eventStartDate),
      end: brDateFromIso(g.eventEndDate ?? g.eventStartDate),
      city: g.city ?? undefined,
      state: g.state ?? undefined,
    }));
  },
};

export const fottoSearchUrl = (name: string) =>
  `https://www.fotto.com.br/encontrar-fotos?term=${encodeURIComponent(name)}`;
