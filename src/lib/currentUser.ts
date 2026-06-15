import { prisma } from "./prisma";
import { getUserId } from "./auth";

export type SessionUser = { id: string; email: string; name: string | null };

/** Devolve o usuário logado (ou null). Use em server components/actions. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const id = getUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
}

/** Conjunto de ids de corridas salvas pelo usuário logado (vazio se deslogado). */
export async function getSavedRaceIds(): Promise<Set<string>> {
  const id = getUserId();
  if (!id) return new Set();
  const rows = await prisma.savedRace.findMany({
    where: { userId: id },
    select: { raceId: true },
  });
  return new Set(rows.map((r) => r.raceId));
}
