import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RaceViews } from "@/components/RaceViews";

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

      <RaceViews
        items={races.map((race) => ({ race }))}
        loggedIn
        savedIds={races.map((r) => r.id)}
        emptyMessage="Você ainda não salvou nenhuma corrida."
      />

      {races.length === 0 && (
        <Link
          href="/"
          className="text-center text-sm font-medium text-accent transition hover:text-accent-soft"
        >
          Explorar corridas →
        </Link>
      )}
    </div>
  );
}
