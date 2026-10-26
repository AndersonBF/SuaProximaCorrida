import type { TreinoScraper } from "./types";
import { assessoriaSitesScraper } from "./assessoriaSites";
import { symplaTreinosScraper } from "./sympla";
import { instagramScraper } from "./instagram";

/** Registro de scrapers de treinos ativos. */
export const treinoScrapers: TreinoScraper[] = [
  assessoriaSitesScraper,
  instagramScraper,
  symplaTreinosScraper,
];
