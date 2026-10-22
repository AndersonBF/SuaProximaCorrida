"use server";

import { prisma } from "@/lib/prisma";

export type ReportState = { error?: string; ok?: string } | undefined;

const MAX_OPEN_PER_RACE = 20;

/** Aviso de erro nos dados da corrida; fica no painel admin até ser resolvido. */
export async function reportRaceError(
  raceId: string,
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  // campo-isca: bots preenchem, pessoas não veem
  if (String(formData.get("website_url_check") ?? "").trim() !== "") {
    return { ok: "Obrigado! Vamos conferir." };
  }

  const message = String(formData.get("message") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  if (message.length < 5) return { error: "Descreva o que está errado." };
  if (message.length > 1000) return { error: "Mensagem muito longa." };

  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: { id: true },
  });
  if (!race) return { error: "Corrida não encontrada." };

  const open = await prisma.raceReport.count({
    where: { raceId, resolved: false },
  });
  if (open >= MAX_OPEN_PER_RACE) {
    return { ok: "Obrigado! Já recebemos avisos sobre esta corrida." };
  }

  await prisma.raceReport.create({
    data: { raceId, message, contact: contact.slice(0, 200) || null },
  });
  return { ok: "Obrigado! Vamos conferir os dados." };
}
