import { matches, searchTerms, type PhotoProvider, type RaceLike } from "./match";
import { fotop, fotopSearchUrl } from "./fotop";
import { fotto, fottoSearchUrl } from "./fotto";
import { banlek, banlekSearchUrl } from "./banlek";
import { focoRadical } from "./focoradical";
import { clickRun } from "./clickrun";

/**
 * Plataformas de fotos de corrida. Para adicionar uma nova, crie um
 * `PhotoProvider` (veja fotto.ts) e inclua aqui.
 *
 * Fora por ora: TopFotos (sem eventos no PR e sem padrão de link do álbum
 * confirmado).
 */
export const providers: PhotoProvider[] = [fotop, fotto, banlek, focoRadical, clickRun];

export interface FoundAlbum {
  provider: string;
  url: string;
  title: string;
}

async function searchProvider(
  provider: PhotoProvider,
  race: RaceLike
): Promise<FoundAlbum[]> {
  const found = new Map<string, FoundAlbum>();
  for (const term of searchTerms(race.name)) {
    try {
      const events = await provider.search(term);
      for (const ev of events) {
        if (matches(race, ev)) {
          found.set(ev.url, { provider: provider.name, url: ev.url, title: ev.title });
        }
      }
    } catch {
      // um provedor com problema não derruba os outros
    }
    if (found.size > 0) break; // achou: não precisa tentar o termo seguinte
  }
  return Array.from(found.values());
}

/** Procura álbuns da corrida em todas as plataformas (em paralelo). */
export async function findAlbums(race: RaceLike): Promise<FoundAlbum[]> {
  const results = await Promise.all(providers.map((p) => searchProvider(p, race)));
  return results.flat();
}

/** Links de busca (por nome) nas plataformas que têm página de busca conhecida. */
export function searchLinks(name: string): { provider: string; url: string }[] {
  return [
    { provider: "Fotop", url: fotopSearchUrl(name) },
    { provider: "Fotto", url: fottoSearchUrl(name) },
    { provider: "Banlek", url: banlekSearchUrl(name) },
  ];
}
