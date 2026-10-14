import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { setAssessoriaStatus, deleteAssessoria } from "./actions";

export const dynamic = "force-dynamic";

const statusLabel = {
  PENDING: "Aguardando",
  APPROVED: "Publicada",
  REJECTED: "Rejeitada",
} as const;

const statusClass = {
  PENDING: "border-amber-500/30 text-amber-400",
  APPROVED: "border-emerald-500/30 text-emerald-400",
  REJECTED: "border-ink-700 text-neutral-500",
} as const;

export default async function AdminAssessorias() {
  requireAuth();

  const rows = await prisma.assessoria.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const pending = rows.filter((r) => r.status === "PENDING").length;

  const btn =
    "rounded-md border border-ink-700 px-2.5 py-1 text-xs text-neutral-300 transition hover:border-accent/50 hover:text-white";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {rows.length} assessoria{rows.length === 1 ? "" : "s"}
          {pending > 0 && (
            <span className="ml-2 text-amber-400">· {pending} aguardando análise</span>
          )}
        </p>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/admin" className="text-neutral-500 hover:text-neutral-200">
            ← corridas
          </Link>
          <Link
            href="/assessorias/cadastrar"
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
          >
            Nova assessoria
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-800 bg-ink-900 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Assessoria</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                  Nenhuma assessoria cadastrada.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-100">{a.name}</div>
                  {a.description && (
                    <div className="mt-0.5 line-clamp-2 max-w-xs text-xs text-neutral-500">
                      {a.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {a.city}/{a.state}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400">
                  <div className="flex flex-col gap-0.5">
                    {a.instagram && (
                      <a href={a.instagram} target="_blank" rel="noreferrer" className="hover:text-white">
                        {a.instagram.replace("https://www.instagram.com/", "@")}
                      </a>
                    )}
                    {a.whatsapp && <span>+{a.whatsapp}</span>}
                    {a.website && (
                      <a href={a.website} target="_blank" rel="noreferrer" className="hover:text-white">
                        {a.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {a.contactEmail && (
                      <span className="text-neutral-600">✉ {a.contactEmail}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] ${statusClass[a.status]}`}
                  >
                    {statusLabel[a.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {a.status !== "APPROVED" && (
                      <form action={setAssessoriaStatus}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="APPROVED" />
                        <button className={btn}>Aprovar</button>
                      </form>
                    )}
                    {a.status !== "REJECTED" && (
                      <form action={setAssessoriaStatus}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="REJECTED" />
                        <button className={btn}>Rejeitar</button>
                      </form>
                    )}
                    <form action={deleteAssessoria}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className={`${btn} hover:!border-red-500/50 hover:!text-red-400`}>
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
