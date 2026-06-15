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

  const races = await prisma.race.findMany({ orderBy: { date: "asc" } });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
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

      <div className="overflow-hidden rounded-xl border border-ink-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-800 bg-ink-900 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Corrida</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Fonte</th>
              <th className="px-4 py-3 font-medium">Cliques</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {races.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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
                <td className="px-4 py-3 text-neutral-400">
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
