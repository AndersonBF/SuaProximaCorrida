"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

/**
 * Alterna o "salvar" de uma corrida para o usuário logado.
 * Retorna { saved } com o novo estado, ou null se não estiver logado.
 */
export async function toggleSave(
  raceId: string
): Promise<{ saved: boolean } | null> {
  const userId = getUserId();
  if (!userId) return null;

  const existing = await prisma.savedRace.findUnique({
    where: { userId_raceId: { userId, raceId } },
  });

  if (existing) {
    await prisma.savedRace.delete({ where: { id: existing.id } });
    revalidatePath("/minhas-corridas");
    return { saved: false };
  }

  await prisma.savedRace.create({ data: { userId, raceId } });
  revalidatePath("/minhas-corridas");
  return { saved: true };
}
