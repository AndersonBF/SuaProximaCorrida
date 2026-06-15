/**
 * Cada site de corrida vira um "scraper" que implementa esta interface.
 * O runner (scripts/scrape.ts) chama .run() de cada um e faz upsert no banco
 * deduplicando por (source, externalId).
 */
export interface ScrapedRace {
  /** Identificador da corrida no site de origem (para dedupe). Ex: o ID da URL. */
  externalId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  date: Date;
  endDate?: Date;
  state: string; // UF
  city: string;
  location?: string;
  distances?: string[];
  priceFrom?: number;
  priceTo?: number;
  organizer?: string;
  /** Link de inscrição no site oficial. */
  registrationUrl: string;
  /** Página de onde o dado foi extraído. */
  sourceUrl?: string;
  /**
   * Plataforma/origem a exibir (ex: "Ticket Sports"). Se omitido, o runner usa
   * o nome do scraper. O dedupe no banco é por (source, externalId).
   */
  source?: string;
}

export interface Scraper {
  /** Nome legível e usado como campo `source` no banco. Ex: "Sympla". */
  name: string;
  /**
   * Coleta as corridas de uma região. Recebe a UF alvo para focar a busca.
   * Deve devolver apenas dados já normalizados.
   */
  run(opts: { state?: string }): Promise<ScrapedRace[]>;
}
