import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RaceViews } from "@/components/RaceViews";
import { ResultCard } from "@/components/ResultCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minhas corridas" };

export default async function MinhasCorridasPage({
  searchParams,
}: {
  searchParams: { aba?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const saved = await prisma.savedRace.findMany({
    where: { userId: user.id },
    include: { race: { include: { photos: true } } },
    orderBy: { race: { date: "asc" } },
  });
  const races = saved.map((s) => s.race);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = (r: (typeof races)[number]) =>
    new Date(r.endDate ?? r.date) < today;

  const upcoming = races.filter((r) => !isPast(r));
  // mais recentes primeiro
  const past = races.filter(isPast).sort((a, b) => b.date.getTime() - a.date.getTime());
  const pastWithResults = past.filter((r) => r.resultsUrl).length;

  const tab = searchParams.aba === "passadas" ? "passadas" : "proximas";

  const tabLink = (id: "proximas" | "passadas", label: string, count: number) => (
    <Link
      href={id === "proximas" ? "/minhas-corridas" : "/minhas-corridas?aba=passadas"}
      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
        tab === id
          ? "bg-ink-800 text-neutral-100"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {label} <span className="text-neutral-500">({count})</span>
    </Link>
  );

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

      {races.length > 0 && (
        <div className="flex w-fit items-center gap-1 rounded-xl border border-ink-800 bg-ink-900/60 p-1">
          {tabLink("proximas", "Próximas", upcoming.length)}
          {tabLink("passadas", "Já aconteceram", past.length)}
        </div>
      )}

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
      ) : tab === "proximas" ? (
        <RaceViews
          items={upcoming.map((race) => ({ race }))}
          loggedIn
          savedIds={races.map((r) => r.id)}
          emptyMessage="Nenhuma corrida futura salva. Que tal escolher a próxima?"
        />
      ) : past.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-sm text-neutral-500">
          Nenhuma das corridas salvas aconteceu ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            {past.length} corrida{past.length === 1 ? "" : "s"} · {pastWithResults} com
            resultado disponível
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {past.map((race) => (
              <ResultCard key={race.id} race={race} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
