import type { Scraper } from "./types";
import { corridasbrScraper } from "./corridasbr";
import { corridasbrResultadosScraper } from "./corridasbrResultados";
import { foureventosScraper } from "./foureventos";
import { ticketSportsScraper } from "./ticketsports";

/**
 * Registro de scrapers ativos. Adicione novos sites aqui.
 * O `sympla.ts` continua no projeto como exemplo de outra abordagem, mas não
 * está ativo por padrão.
 */
export const scrapers: Scraper[] = [
  corridasbrScraper,
  corridasbrResultadosScraper,
  foureventosScraper,
  ticketSportsScraper,
  // symplaScraper,
];
