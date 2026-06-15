import { RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dedupeRaces } from "@/lib/races";
import { getCurrentUser, getSavedRaceIds } from "@/lib/currentUser";
import { NearbyList } from "@/components/NearbyList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Corridas perto de mim" };

export default async function PertoPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [races, user, savedIds] = await Promise.all([
    prisma.race.findMany({
      where: {
        status: RaceStatus.PUBLISHED,
        date: { gte: today },
        latitude: { not: null },
      },
      orderBy: { date: "asc" },
    }),
    getCurrentUser(),
    getSavedRaceIds(),
  ]);

  return (
    <div className="container-page flex flex-col gap-7">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Perto de mim
        </h1>
        <p className="text-sm text-neutral-500">
          Corridas do Paraná ordenadas pela distância até você.
        </p>
      </div>

      <NearbyList
        races={dedupeRaces(races)}
        loggedIn={!!user}
        savedIds={Array.from(savedIds)}
      />
    </div>
  );
}
