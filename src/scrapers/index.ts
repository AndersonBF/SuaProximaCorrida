import type { Scraper } from "./types";
import { corridasbrScraper } from "./corridasbr";
import { foureventosScraper } from "./foureventos";

/**
 * Registro de scrapers ativos. Adicione novos sites aqui.
 * O `sympla.ts` continua no projeto como exemplo de outra abordagem, mas não
 * está ativo por padrão.
 */
export const scrapers: Scraper[] = [
  corridasbrScraper,
  foureventosScraper,
  // symplaScraper,
];
