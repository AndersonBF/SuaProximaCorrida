import { getJson, type PhotoProvider } from "./match";

/**
 * Banlek (banlek.com). O site usa GraphQL com "persisted query": a consulta
 * `GetAlbumBySearchQuery` é chamada por GET com o hash abaixo. Se o Banlek
 * publicar uma versão nova do site o hash pode mudar — nesse caso a busca
 * devolve vazio (sem quebrar) e basta atualizar o hash (DevTools > Network ao
 * pesquisar em banlek.com/buscar).
 * Álbum: https://banlek.com/album/<slug>
 */
const HASH = "e975570ae8ad6aa3fb9b29e2340bedff463f139ea3b7806c07184e88e96f0553";

interface Album {
  slug: string;
  titulo: string;
  data_inicio?: string | null; // "2026-10-10 08:30:00" (horário local)
  endereco_completo?: { cidade?: string | null; estado?: string | null } | null;
}

export const banlek: PhotoProvider = {
  name: "Banlek",
  async search(term) {
    const qs = new URLSearchParams({
      operationName: "GetAlbumBySearchQuery",
      variables: JSON.stringify({
        keyword: term,
        nav: { page: 1, itemsPerPage: 32 },
      }),
      extensions: JSON.stringify({
        persistedQuery: { version: 1, sha256Hash: HASH },
      }),
    });
    const data = await getJson<{ data?: { albuns?: { items?: Album[] } } }>(
      `https://graphql.banlek.com/graphql?${qs.toString()}`
    );
    return (data?.data?.albuns?.items ?? []).map((a) => {
      const m = a.data_inicio?.match(/(\d{4})-(\d{2})-(\d{2})/);
      const start = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : undefined;
      return {
        title: a.titulo,
        url: `https://banlek.com/album/${a.slug}`,
        start,
        end: start,
        city: a.endereco_completo?.cidade ?? undefined,
        state: a.endereco_completo?.estado ?? undefined,
      };
    });
  },
};

export const banlekSearchUrl = (name: string) =>
  `https://banlek.com/buscar?palavra_chave=${encodeURIComponent(name)}`;
