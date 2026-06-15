import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/format";

const prisma = new PrismaClient();

/**
 * Corridas REAIS do Paraná, coletadas de calendários e plataformas públicas
 * em 06/06/2026. Cada `registrationUrl` aponta para a página oficial do evento
 * (Ticket Sports / plataforma do organizador), verificada na coleta.
 *
 * Preço só é preenchido quando foi confirmado na fonte; caso contrário fica
 * null ("Sob consulta") — nada é inventado.
 */
type Seed = {
  name: string;
  description: string;
  date: Date;
  city: string;
  location: string;
  distances: string[];
  priceFrom?: number | null;
  priceTo?: number | null;
  organizer?: string;
  source: string;
  registrationUrl: string;
  featured?: boolean;
};

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d, 7, 0, 0, 0);

const races: Seed[] = [
  {
    name: "Meia Maratona Internacional de Curitiba 2026",
    description:
      "Uma das principais provas da capital, com largada na Pedreira Paulo Leminski. Percursos de 7km e 21km com cronometragem por chip.",
    date: D(2026, 6, 7),
    city: "Curitiba",
    location: "Pedreira Paulo Leminski — R. João Gava, 970, Abranches",
    distances: ["7km", "21km"],
    organizer: "Thomé & Santos",
    source: "Ticket Sports",
    registrationUrl:
      "https://www.ticketsports.com.br/e/meia-maratona-internacional-de-curitiba-2026-85782",
    featured: true,
  },
  {
    name: "15K de Santa - Inverno 2026",
    description:
      "Tradicional prova de Santa Felicidade, com largada e chegada em frente ao Restaurante Madalosso. Distâncias de 5,5km e 15km. Atletas acima de 60 anos têm 50% de desconto.",
    date: D(2026, 7, 5),
    city: "Curitiba",
    location: "Restaurante Madalosso — Av. Manoel Ribas, 5852, Santa Felicidade",
    distances: ["5,5km", "15km"],
    organizer: "GL Promo",
    source: "Ticket Sports",
    registrationUrl:
      "https://www.ticketsports.com.br/e/15k-de-santa-inverno-2026-86630",
  },
  {
    name: "Maratona de Londrina 2026",
    description:
      "15ª edição da maior prova do norte do Paraná, com largada no Catuaí Shopping Londrina. Percursos de 5km, 10km, 21km e maratona completa (42km).",
    date: D(2026, 7, 5),
    city: "Londrina",
    location: "Catuaí Shopping Londrina",
    distances: ["5km", "10km", "21km", "42km"],
    organizer: "Capa Eventos",
    source: "Ticket Sports",
    registrationUrl:
      "https://www.ticketsports.com.br/e/maratona-de-londrina-2026-74380",
    featured: true,
  },
  {
    name: "LIVE! Run XP - Maringá 2026",
    description:
      "Etapa de Maringá do circuito LIVE! Run XP, no Catuaí Shopping. Distâncias de 5km, 10km e percurso kids, com a LIVE! Arena na chegada.",
    date: D(2026, 7, 5),
    city: "Maringá",
    location: "Catuaí Shopping Maringá — Av. Colombo, 9161",
    distances: ["5km", "10km", "Kids"],
    organizer: "LIVE! Experience",
    source: "LIVE! Run XP",
    registrationUrl: "https://www.liverun.com.br/etapa/live-run-maringa-2026",
  },
  {
    name: "Ultramaratona dos Perdidos 2026",
    description:
      "Corrida de montanha pioneira no Brasil, na montanha mais fria do Paraná. Largada e chegada no Parque Araçá. Percursos de 8km, 14km, 27km e 53km. Atestado médico obrigatório.",
    date: D(2026, 7, 18),
    city: "Tijucas do Sul",
    location: "Parque Araçá — Serra do Araçatuba",
    distances: ["8km", "14km", "27km", "53km"],
    priceFrom: 494,
    priceTo: 874,
    organizer: "LM Pro Evento",
    source: "Ticket Sports",
    registrationUrl:
      "https://www.ticketsports.com.br/e/ultramaratona-dos-perdidos-2026-73618",
  },
  {
    name: "XIV Corrida da Rone",
    description:
      "Prova de cunho social organizada pela RONE/PMPR, com largada no Comando-Geral da Polícia Militar do Paraná. Percurso de 7km. Excedente financeiro é revertido a ações sociais.",
    date: D(2026, 7, 19),
    city: "Curitiba",
    location: "Comando-Geral da PMPR — Av. Getúlio Vargas",
    distances: ["7km"],
    organizer: "Assessocor",
    source: "Ticket Sports",
    registrationUrl: "https://www.ticketsports.com.br/e/xiv-corrida-da-rone-85955",
  },
  {
    name: "Maratona do Litoral 2026",
    description:
      "A maratona mais plana do Brasil, com percurso quase todo à beira-mar em Matinhos (só 10m de variação de altimetria). Prova em dois dias com 5km, 10km, 21km, 42km e o Desafio do Guará.",
    date: D(2026, 7, 25),
    city: "Matinhos",
    location: "Praça Dante Luiz Junior",
    distances: ["5km", "10km", "21km", "42km"],
    organizer: "Sports360",
    source: "Ticket Sports",
    registrationUrl: "https://www.ticketsports.com.br/e/maratona-do-litoral-74246",
    featured: true,
  },
  {
    name: "The Hero Fitness Run",
    description:
      "Corrida com desafios funcionais: percurso com intervalos de 1km e estações de exercícios. Categorias individual e duplas (masculina, feminina e mista).",
    date: D(2026, 7, 25),
    city: "Curitiba",
    location: "R. João Gava, 970, Abranches",
    distances: ["4km", "8km"],
    source: "Gopanda",
    registrationUrl: "https://www.gopanda.com.br/tickets/theherofitnessrun",
  },
  {
    name: "Meia Maratona de Pinhais",
    description:
      "Prova com percurso inédito e turístico, largada no Parque das Águas. Distâncias de 6km, 10km e 21km.",
    date: D(2026, 8, 16),
    city: "Pinhais",
    location: "Parque das Águas",
    distances: ["6km", "10km", "21km"],
    source: "Ticket Sports",
    registrationUrl: "https://www.ticketsports.com.br/e/meia-maratona-de-pinhais-85834",
  },
];

async function main() {
  await prisma.race.deleteMany({});

  for (const r of races) {
    const { featured, ...rest } = r;
    await prisma.race.create({
      data: {
        ...rest,
        slug: slugify(r.name),
        state: "PR",
        priceFrom: r.priceFrom ?? null,
        priceTo: r.priceTo ?? null,
        organizer: r.organizer ?? null,
        sourceUrl: r.registrationUrl,
        featured: featured ?? false,
        status: "PUBLISHED",
      },
    });
  }
  console.log(`✅ Seed concluído: ${races.length} corridas REAIS do Paraná.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
