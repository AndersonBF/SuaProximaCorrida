import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RaceCard } from "@/components/RaceCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minhas corridas" };

export default async function MinhasCorridasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const saved = await prisma.savedRace.findMany({
    where: { userId: user.id },
    include: { race: true },
    orderBy: { race: { date: "asc" } },
  });
  const races = saved.map((s) => s.race);

  return (
    <div className="container-page flex flex-col gap-7">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Minhas corridas
        </h1>
        <p className="text-sm text-neutral-500">
          As corridas que você salvou para participar.
        </p>
      </div>

      {races.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-700 p-14 text-center">
          <Bookmark className="text-neutral-600" />
          <p className="text-sm text-neutral-400">
            Você ainda não salvou nenhuma corrida.
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-accent transition hover:text-accent-soft"
          >
            Explorar corridas →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {races.map((race) => (
            <RaceCard key={race.id} race={race} loggedIn saved />
          ))}
        </div>
      )}
    </div>
  );
}
