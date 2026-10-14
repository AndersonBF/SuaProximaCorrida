"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

/**
 * Alterna o "salvar" de uma corrida para o usuário logado.
 * Retorna { saved, count } com o novo estado e o total de pessoas que salvaram,
 * ou null se não estiver logado.
 */
export async function toggleSave(
  raceId: string
): Promise<{ saved: boolean; count: number } | null> {
  const userId = getUserId();
  if (!userId) return null;

  const existing = await prisma.savedRace.findUnique({
    where: { userId_raceId: { userId, raceId } },
  });

  const [, race] = await prisma.$transaction(
    existing
      ? [
          prisma.savedRace.delete({ where: { id: existing.id } }),
          prisma.race.update({
            where: { id: raceId },
            data: { savesCount: { decrement: 1 } },
            select: { savesCount: true },
          }),
        ]
      : [
          prisma.savedRace.create({ data: { userId, raceId } }),
          prisma.race.update({
            where: { id: raceId },
            data: { savesCount: { increment: 1 } },
            select: { savesCount: true },
          }),
        ]
  );

  revalidatePath("/minhas-corridas");
  return { saved: !existing, count: Math.max(0, race.savesCount) };
}
