import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AssessoriaCard } from "@/components/AssessoriaCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assessorias e grupos de corrida" };

const defaultState = process.env.NEXT_PUBLIC_DEFAULT_STATE || undefined;

export default async function AssessoriasPage({
  searchParams,
}: {
  searchParams: { q?: string; cidade?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const cidade = searchParams.cidade?.trim() || "";

  const base = {
    status: "APPROVED" as const,
    ...(defaultState ? { state: defaultState } : {}),
  };

  const [rows, facets] = await Promise.all([
    prisma.assessoria.findMany({
      where: {
        ...base,
        ...(cidade ? { city: { equals: cidade, mode: "insensitive" as const } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.assessoria.findMany({ where: base, select: { city: true } }),
  ]);

  const cities = Array.from(new Set(facets.map((f) => f.city))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return (
    <div className="container-page flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-neutral-50">
            <Users size={22} className="text-accent" /> Assessorias e grupos
          </h1>
          <p className="text-sm text-neutral-500">
            Quer treinar com gente? Encontre assessorias e grupos de corrida da
            sua cidade.
          </p>
        </div>
        <Link
          href="/assessorias/cadastrar"
          className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3.5 py-2 text-sm font-medium text-neutral-200 transition hover:border-accent/50 hover:text-white"
        >
          <Plus size={15} /> Cadastrar minha assessoria
        </Link>
      </div>

      <form className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" method="get">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            name="q"
            defaultValue={q}
            className="field pl-9"
            placeholder="Buscar por nome"
          />
        </div>
        <select name="cidade" defaultValue={cidade} className="field">
          <option value="">Todas as cidades</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-soft">
          Filtrar
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-700 p-12 text-center">
          <p className="text-sm text-neutral-400">
            {facets.length === 0
              ? "Ainda não há assessorias cadastradas. Seja a primeira!"
              : "Nenhuma assessoria encontrada com esses filtros."}
          </p>
          <Link
            href="/assessorias/cadastrar"
            className="text-sm font-medium text-accent transition hover:text-accent-soft"
          >
            Cadastrar minha assessoria →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <AssessoriaCard key={a.id} assessoria={a} />
          ))}
        </div>
      )}
    </div>
  );
}
