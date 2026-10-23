import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AdminUsuarios() {
  requireAuth();

  const rows = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { saved: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-500">
        {rows.length} usuário{rows.length === 1 ? "" : "s"} cadastrado
        {rows.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-xl border border-ink-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-800 bg-ink-900 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Cadastro</th>
              <th className="px-4 py-3 text-right font-medium">Corridas salvas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-neutral-500">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-neutral-100">{u.name || "—"}</td>
                <td className="px-4 py-3 text-neutral-300">{u.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                  {fmt.format(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-300">{u._count.saved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
