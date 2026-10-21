import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { IGNORE_COOKIE } from "@/lib/tracking";
import { AutoRefresh } from "./AutoRefresh";
import { toggleIgnoreDevice } from "./actions";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** Data (YYYY-MM-DD) no fuso de Brasília. */
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

const deviceLabel: Record<string, string> = {
  mobile: "Celular",
  desktop: "Computador",
  tablet: "Tablet",
};

/** "agora", "há 5 min", "há 3 h", "há 2 dias". */
function ago(d: Date): string {
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  return `há ${days} dia${days === 1 ? "" : "s"}`;
}

const hhmm = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(d);

async function uniqueVisitors(since: Date): Promise<number> {
  const [row] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(DISTINCT "visitorId")::int AS n
    FROM "PageView" WHERE "createdAt" >= ${since}`;
  return row?.n ?? 0;
}

export default async function AdminAcessos() {
  requireAuth();

  const now = Date.now();
  const since30 = new Date(now - 31 * DAY_MS);
  const since7 = new Date(now - 7 * DAY_MS);
  const onlineSince = new Date(now - ONLINE_WINDOW_MS);

  const [
    daily, visitors7, visitors30, views7, views30, onlineRows, topPages, referrers, devices,
    recent, cities, newVisitors30, totalViews,
  ] =
    await Promise.all([
      prisma.$queryRaw<{ day: string; views: number; visitors: number }[]>`
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day,
               COUNT(*)::int AS views,
               COUNT(DISTINCT "visitorId")::int AS visitors
        FROM "PageView" WHERE "createdAt" >= ${since30}
        GROUP BY 1 ORDER BY 1`,
      uniqueVisitors(since7),
      uniqueVisitors(since30),
      prisma.pageView.count({ where: { createdAt: { gte: since7 } } }),
      prisma.pageView.count({ where: { createdAt: { gte: since30 } } }),
      prisma.pageView.findMany({
        where: { lastSeenAt: { gte: onlineSince } },
        orderBy: { lastSeenAt: "desc" },
        distinct: ["visitorId"],
        select: { visitorId: true, path: true },
      }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: { createdAt: { gte: since30 } },
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { createdAt: { gte: since30 }, referrer: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 8,
      }),
      prisma.pageView.groupBy({
        by: ["device"],
        where: { createdAt: { gte: since30 } },
        _count: { _all: true },
      }),
      prisma.pageView.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, path: true, device: true, referrer: true, isNew: true,
          city: true, region: true, createdAt: true,
        },
      }),
      prisma.pageView.groupBy({
        by: ["city", "region"],
        where: { createdAt: { gte: since30 }, city: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 8,
      }),
      prisma.pageView.count({ where: { createdAt: { gte: since30 }, isNew: true } }),
      prisma.pageView.count(),
    ]);

  const ignoring = !!cookies().get(IGNORE_COOKIE);
  const lastView = recent[0]?.createdAt;

  // série dos últimos 30 dias, preenchendo dias sem acesso com zero
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const key = dayKey(new Date(now - (29 - i) * DAY_MS));
    return { key, views: byDay.get(key)?.views ?? 0, visitors: byDay.get(key)?.visitors ?? 0 };
  });
  const today = series[series.length - 1];
  const maxVisitors = Math.max(1, ...series.map((d) => d.visitors));
  const deviceTotal = devices.reduce((s, d) => s + d._count._all, 0);

  // quantas pessoas online em cada página
  const onlineByPath = new Map<string, number>();
  for (const r of onlineRows) onlineByPath.set(r.path, (onlineByPath.get(r.path) ?? 0) + 1);

  const card = "rounded-xl border border-ink-800 bg-ink-900 p-4";
  const cardTitle = "text-[11px] uppercase tracking-wider text-neutral-500";

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh seconds={30} />

      {/* Saúde do contador: deixa claro se está recebendo dados */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-900 px-4 py-3 text-sm">
        <p className="flex items-center gap-2 text-neutral-300">
          <span
            className={`h-2 w-2 rounded-full ${
              lastView && Date.now() - lastView.getTime() < DAY_MS
                ? "bg-emerald-400"
                : "bg-amber-400"
            }`}
          />
          {lastView
            ? `Contador ativo · última visita ${ago(lastView)} · ${totalViews} páginas vistas no total`
            : "Nenhuma visita registrada ainda"}
        </p>
        <form action={toggleIgnoreDevice}>
          <button className="rounded-md border border-ink-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-accent/50 hover:text-white">
            {ignoring
              ? "✓ Este aparelho não é contado — contar de novo"
              : "Não contar as minhas visitas neste aparelho"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={`${card} border-emerald-500/30`}>
          <p className={cardTitle}>Online agora</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-semibold text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            {onlineRows.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500">últimos 5 minutos</p>
        </div>
        <Stat title="Hoje" visitors={today.visitors} views={today.views} />
        <Stat title="7 dias" visitors={visitors7} views={views7} />
        <Stat title="30 dias" visitors={visitors30} views={views30} />
      </div>

      <div className={card}>
        <p className={cardTitle}>Visitantes por dia (30 dias)</p>
        <div className="mt-4 flex h-40 items-end gap-1">
          {series.map((d) => (
            <div
              key={d.key}
              className="group relative flex h-full flex-1 flex-col justify-end"
              title={`${d.key.split("-").reverse().join("/")}: ${d.visitors} visitantes, ${d.views} páginas`}
            >
              <div
                className="rounded-t bg-accent/70 transition group-hover:bg-accent"
                style={{ height: `${(d.visitors / maxVisitors) * 100}%`, minHeight: d.visitors ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-neutral-600">
          <span>{series[0].key.split("-").reverse().slice(0, 2).join("/")}</span>
          <span>hoje</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <List
          title="Páginas mais vistas (30 dias)"
          rows={topPages.map((p) => ({ label: p.path, value: p._count._all }))}
        />
        <List
          title="De onde vêm (30 dias)"
          rows={referrers.map((r) => ({ label: r.referrer ?? "", value: r._count._all }))}
          empty="Só acessos diretos até agora."
        />
        <div className="flex flex-col gap-3">
          <List
            title="Dispositivos (30 dias)"
            rows={devices
              .sort((a, b) => b._count._all - a._count._all)
              .map((d) => ({
                label: deviceLabel[d.device] ?? d.device,
                value: `${Math.round((d._count._all / deviceTotal) * 100)}%`,
              }))}
          />
          <List
            title="Onde estão agora"
            rows={Array.from(onlineByPath).map(([label, value]) => ({ label, value }))}
            empty="Ninguém online no momento."
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <List
          title="Cidades (30 dias)"
          rows={cities.map((c) => ({
            label: `${c.city}${c.region ? `/${c.region}` : ""}`,
            value: c._count._all,
          }))}
          empty="Aparece no site publicado (o localhost não informa a cidade)."
        />
        <List
          title="Novos x recorrentes (30 dias)"
          rows={[
            { label: "Primeira visita", value: newVisitors30 },
            { label: "Já conheciam o site", value: Math.max(0, visitors30 - newVisitors30) },
          ]}
        />
        <div className={card}>
          <p className={cardTitle}>Como ler</p>
          <p className="mt-3 text-xs leading-relaxed text-neutral-500">
            <b className="text-neutral-300">Visitante</b> é um aparelho/navegador; uma
            pessoa que volta no mesmo dia conta uma vez. <b className="text-neutral-300">Página
            vista</b> é cada tela aberta. “Online agora” conta quem mandou sinal nos últimos
            5 minutos com a aba aberta.
          </p>
        </div>
      </div>

      <div className={card}>
        <p className={cardTitle}>Últimas visitas (ao vivo)</p>
        <ul className="mt-3 divide-y divide-ink-800 text-sm">
          {recent.length === 0 && (
            <li className="py-3 text-neutral-600">Sem visitas ainda.</li>
          )}
          {recent.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="min-w-0 truncate text-neutral-200">{v.path}</span>
              <span className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                <span>{hhmm(v.createdAt)}</span>
                <span>· {deviceLabel[v.device] ?? v.device}</span>
                {v.city && <span>· {v.city}{v.region ? `/${v.region}` : ""}</span>}
                <span>· {v.referrer ?? "direto"}</span>
                <span
                  className={`rounded-full border px-1.5 py-px text-[10px] ${
                    v.isNew
                      ? "border-emerald-500/30 text-emerald-400"
                      : "border-ink-700 text-neutral-500"
                  }`}
                >
                  {v.isNew ? "novo" : "voltou"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-neutral-600">
        Robôs, páginas /admin, as visitas de quem está logado no admin e dos aparelhos
        marcados acima não são contados. Atualiza sozinho a cada 30s.
      </p>
    </div>
  );
}

function Stat({ title, visitors, views }: { title: string; visitors: number; views: number }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{title}</p>
      <p className="mt-1 text-3xl font-semibold text-neutral-100">{visitors}</p>
      <p className="mt-1 text-xs text-neutral-500">
        visitantes · {views} página{views === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function List({
  title,
  rows,
  empty = "Sem dados ainda.",
}: {
  title: string;
  rows: { label: string; value: number | string }[];
  empty?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{title}</p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {rows.length === 0 && <li className="text-neutral-600">{empty}</li>}
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3">
            <span className="truncate text-neutral-300">{r.label}</span>
            <span className="shrink-0 font-medium text-neutral-100">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
