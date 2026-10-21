import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatDate, formatPriceShort } from "@/lib/format";
import { deleteRace } from "./actions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PUBLISHED: "Publicada",
  DRAFT: "Rascunho",
  ARCHIVED: "Arquivada",
};

const statusClass: Record<string, string> = {
  PUBLISHED: "border-emerald-500/30 text-emerald-400",
  DRAFT: "border-amber-500/30 text-amber-400",
  ARCHIVED: "border-ink-700 text-neutral-500",
};

export default async function AdminHome() {
  requireAuth();

  const [rows, viewCounts] = await Promise.all([
    prisma.race.findMany({ orderBy: { date: "asc" } }),
    prisma.pageView.groupBy({
      by: ["path"],
      where: { path: { startsWith: "/corrida/" } },
      _count: { _all: true },
    }),
  ]);

  // acessos = visitas à página da corrida; mais acessadas primeiro (desempate: cliques)
  const viewsBySlug = new Map(
    viewCounts.map((v) => [v.path.slice("/corrida/".length), v._count._all])
  );
  const races = rows
    .map((race) => ({ ...race, views: viewsBySlug.get(race.slug) ?? 0 }))
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {races.length} corrida{races.length === 1 ? "" : "s"} cadastrada
          {races.length === 1 ? "" : "s"}
        </p>
        <Link
          href="/admin/corridas/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
        >
          <Plus size={16} /> Nova corrida
        </Link>
      </div>

      {/* Celular: um cartão por corrida */}
      <ul className="flex flex-col gap-3 md:hidden">
        {races.length === 0 && (
          <li className="rounded-xl border border-ink-800 px-4 py-10 text-center text-sm text-neutral-600">
            Nenhuma corrida ainda. Toque em “Nova corrida”.
          </li>
        )}
        {races.map((race) => (
          <li
            key={race.id}
            className="rounded-xl border border-ink-800 bg-ink-900 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium leading-snug text-neutral-100">
                {race.name}
              </p>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass[race.status]}`}
              >
                {statusLabel[race.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {formatDate(race.date)} · {race.city}/{race.state}
            </p>
            <p className="mt-0.5 text-xs text-neutral-600">
              {race.source}
              {race.priceFrom != null && ` · ${formatPriceShort(race.priceFrom)}`}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-ink-950 py-2">
                <p className="text-lg font-semibold text-neutral-100">
                  {race.views}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Acessos
                </p>
              </div>
              <div className="rounded-lg bg-ink-950 py-2">
                <p className="text-lg font-semibold text-neutral-100">
                  {race.clicks}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Cliques
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3">
              <Link
                href={`/admin/corridas/${race.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-accent/50 hover:text-white"
              >
                <Pencil size={14} /> Editar
              </Link>
              <form action={deleteRace}>
                <input type="hidden" name="id" value={race.id} />
                <button className="px-3 py-2 text-sm text-red-400 transition hover:text-red-300">
                  Excluir
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet/computador: tabela */}
      <div className="hidden overflow-hidden rounded-xl border border-ink-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-800 bg-ink-900 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Corrida</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Fonte</th>
              <th className="px-4 py-3 font-medium">Acessos</th>
              <th className="px-4 py-3 font-medium">Cliques</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {races.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-neutral-600"
                >
                  Nenhuma corrida ainda. Clique em “Nova corrida”.
                </td>
              </tr>
            )}
            {races.map((race) => (
              <tr key={race.id} className="bg-ink-950 hover:bg-ink-900">
                <td className="px-4 py-3 font-medium text-neutral-100">
                  {race.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-400">
                  {formatDate(race.date)}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {race.city}/{race.state}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {formatPriceShort(race.priceFrom)}
                </td>
                <td className="px-4 py-3 text-neutral-400">{race.source}</td>
                <td className="px-4 py-3 font-medium text-neutral-200">
                  {race.views}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-200">
                  {race.clicks}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass[race.status]}`}
                  >
                    {statusLabel[race.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/admin/corridas/${race.id}`}
                      className="inline-flex items-center gap-1 text-neutral-400 transition hover:text-neutral-100"
                    >
                      <Pencil size={14} /> Editar
                    </Link>
                    <form action={deleteRace}>
                      <input type="hidden" name="id" value={race.id} />
                      <button className="text-red-400 transition hover:text-red-300">
                        Excluir
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
