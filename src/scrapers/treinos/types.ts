/**
 * Treinos coletivos (NÃO são corridas/provas). Cada fonte vira um scraper que
 * devolve `ScrapedTreino`; o runner (scripts/scrape-treinos.ts) faz o upsert
 * deduplicando por (source, externalId).
 */
export interface ScrapedTreino {
  /** Estável entre execuções (para dedupe). Ex: "equipiazza.com.br|barigui|2,4|0630". */
  externalId: string;
  name: string;
  kind: "SEMANAL" | "PONTUAL";
  description?: string;
  imageUrl?: string;

  /** 0 = domingo ... 6 = sábado (treino semanal). */
  weekdays?: number[];
  /** "06:30" */
  startTime?: string;
  endTime?: string;
  /** Treino pontual (treinão com data). */
  date?: Date;
  /** Trecho original da página, para conferência no admin. */
  scheduleText?: string;

  state: string;
  city: string;
  location?: string;

  organizer?: string;
  free?: boolean;
  priceInfo?: string;
  instagram?: string;
  whatsapp?: string;
  website?: string;

  sourceUrl?: string;
  /** Plataforma de origem exibida (ex: "Sympla"). Padrão: nome do scraper. */
  source?: string;
}

export interface TreinoScraper {
  name: string;
  run(opts: { state?: string }): Promise<ScrapedTreino[]>;
}
