import { RaceStatus } from "@prisma/client";
import { prisma } from "./prisma";

/** Treino pronto para a tela (datas viram texto para cruzar o limite servidor/cliente). */
export interface TreinoView {
  id: string;
  name: string;
  kind: "SEMANAL" | "PONTUAL";
  weekdays: number[];
  startTime: string | null;
  endTime: string | null;
  date: string | null; // ISO
  state: string;
  city: string;
  location: string | null;
  organizer: string | null;
  free: boolean;
  priceInfo: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  imageUrl: string | null;
  source: string;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
}

/** Treinos publicados: semanais sempre; pontuais só a partir de hoje. */
export async function listTreinos(state?: string): Promise<TreinoView[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await prisma.treino.findMany({
    where: {
      status: RaceStatus.PUBLISHED,
      ...(state ? { state: state.toUpperCase() } : {}),
      OR: [{ kind: "SEMANAL" }, { kind: "PONTUAL", date: { gte: today } }],
    },
    orderBy: [{ city: "asc" }, { startTime: "asc" }],
  });

  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
    weekdays: t.weekdays,
    startTime: t.startTime,
    endTime: t.endTime,
    date: t.date ? t.date.toISOString() : null,
    state: t.state,
    city: t.city,
    location: t.location,
    organizer: t.organizer,
    free: t.free,
    priceInfo: t.priceInfo,
    instagram: t.instagram,
    whatsapp: t.whatsapp,
    website: t.website,
    imageUrl: t.imageUrl,
    source: t.source,
    sourceUrl: t.sourceUrl,
    lastVerifiedAt: t.lastVerifiedAt ? t.lastVerifiedAt.toISOString() : null,
  }));
}
