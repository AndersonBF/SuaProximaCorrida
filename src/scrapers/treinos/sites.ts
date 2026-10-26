/**
 * Assessorias e grupos de corrida cujo site publica dias/horários de treino.
 * Para incluir um grupo novo, basta adicionar uma linha aqui e rodar
 * `npm run scrape:treinos`. Assessorias aprovadas no diretório do próprio site
 * (tabela Assessoria, campo `website`) também são lidas automaticamente.
 */
export interface TreinoSite {
  name: string;
  url: string;
  city: string;
  state: string;
  /** Treino gratuito e aberto à comunidade (ex: projeto de extensão). */
  free?: boolean;
  /** Páginas extras (relativas ao site) quando os horários ficam fora da home. */
  paths?: string[];
}

export const TREINO_SITES: TreinoSite[] = [
  { name: "Equipiazza", url: "https://www.equipiazza.com.br/", city: "Curitiba", state: "PR" },
  { name: "Run Time Assessoria", url: "https://runtimeassessoria.com.br/", city: "Curitiba", state: "PR" },
  { name: "V8 Assessoria", url: "https://v8assessoria.com.br/", city: "Curitiba", state: "PR" },
  { name: "Trainer Assessoria", url: "https://trainerassessoria.com.br/", city: "Curitiba", state: "PR" },
  { name: "4Run Assessoria", url: "https://4runassessoria.com.br/", city: "Curitiba", state: "PR" },
  { name: "Believe & Run", url: "https://believeandrun.com.br/turmas-e-horarios/", city: "Londrina", state: "PR" },
  { name: "Studio Carpe Diem", url: "https://studiocarpediem.com.br/grupo-de-corrida/", city: "Londrina", state: "PR" },
  { name: "Acorremar", url: "http://acorremar.com.br/", city: "Maringá", state: "PR" },
  { name: "CR Runners", url: "https://crrunnersbrasil.com.br/", city: "Curitiba", state: "PR" },
  {
    name: "Movimenta UFPR",
    url: "https://ced.ufpr.br/projetos/movimenta/",
    city: "Curitiba",
    state: "PR",
    free: true,
  },
];
