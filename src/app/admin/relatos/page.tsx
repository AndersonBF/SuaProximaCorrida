import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { setReportResolved, deleteReport } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminRelatos() {
  requireAuth();
  const rows = await prisma.raceReport.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    include: { race: { select: { id: true, name: true, slug: true } } },
    take: 200,
  });
  const open = rows.filter((r) => !r.resolved).length;

  const btn =
    "rounded-md border border-ink-700 px-2.5 py-1 text-xs text-neutral-300 transition hover:border-accent/50 hover:text-white";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-500">
        Avisos de erro enviados pelos visitantes
        {open > 0 && (
          <span className="ml-2 text-amber-400">· {open} em aberto</span>
        )}
      </p>
      {rows.length === 0 && (
        <p className="rounded-xl border border-ink-800 px-4 py-10 text-center text-sm text-neutral-600">
          Nenhum aviso até agora.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`rounded-xl border border-ink-800 bg-ink-900 p-4 ${r.resolved ? "opacity-50" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link
                href={`/admin/corridas/${r.race.id}`}
                className="font-medium text-neutral-100 hover:text-accent"
              >
                {r.race.name}
              </Link>
              <span className="text-xs text-neutral-500">
                {formatDate(r.createdAt)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-neutral-300">
              {r.message}
            </p>
            {r.contact && (
              <p className="mt-1 text-xs text-neutral-500">
                Contato: {r.contact}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={setReportResolved}>
                <input type="hidden" name="id" value={r.id} />
                <input
                  type="hidden"
                  name="resolved"
                  value={r.resolved ? "0" : "1"}
                />
                <button className={btn}>
                  {r.resolved ? "Reabrir" : "Marcar como resolvido"}
                </button>
              </form>
              <Link href={`/corrida/${r.race.slug}`} className={btn}>
                Ver página
              </Link>
              <form action={deleteReport}>
                <input type="hidden" name="id" value={r.id} />
                <button className={btn}>Excluir</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
