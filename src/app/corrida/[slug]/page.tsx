import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ruler,
  Tag,
  User,
  ExternalLink,
  Trophy,
  Camera,
  Share2,
  Mountain,
  Footprints,
  Gauge,
  Package,
  Route,
  RefreshCw,
} from "lucide-react";
import { getRaceBySlug, getRelatedRaces } from "@/lib/races";
import { SURFACES, LEVELS } from "@/lib/raceDetails";
import { RaceLots } from "@/components/RaceLots";
import { RaceCard } from "@/components/RaceCard";
import { ReportError } from "@/components/ReportError";
import { getCurrentUser, getSavedRaceIds } from "@/lib/currentUser";
import { SaveButton } from "@/components/SaveButton";
import { AssessoriaCard } from "@/components/AssessoriaCard";
import { searchLinks } from "@/lib/photos";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateLong, formatPriceRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const race = await getRaceBySlug(params.slug);
  if (!race) return { title: "Corrida não encontrada" };
  return {
    title: race.name,
    description:
      race.description ?? `${race.name} em ${race.city} - ${race.state}.`,
  };
}

export default async function RaceDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const race = await getRaceBySlug(params.slug);
  if (!race) notFound();

  const [user, savedIds] = await Promise.all([
    getCurrentUser(),
    getSavedRaceIds(),
  ]);
  const related = await getRelatedRaces(race);
  const assessorias = await prisma.assessoria.findMany({
    where: {
      status: "APPROVED",
      state: race.state,
      city: { equals: race.city, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: 6,
  });


  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = new Date(race.endDate ?? race.date) < today;

  const info = [
    { icon: CalendarDays, label: "Data", value: formatDateLong(race.date) },
    {
      icon: MapPin,
      label: "Local",
      value: race.location
        ? `${race.location} — ${race.city}/${race.state}`
        : `${race.city}/${race.state}`,
    },
    {
      icon: Ruler,
      label: "Distâncias",
      value: race.distances.length ? race.distances.join(" · ") : "—",
    },
    {
      icon: Tag,
      label: "Inscrição",
      value: formatPriceRange(race.priceFrom, race.priceTo),
    },
    ...(race.surface && SURFACES[race.surface]
      ? [{ icon: Footprints, label: "Piso", value: SURFACES[race.surface] }]
      : []),
    ...(race.level && LEVELS[race.level]
      ? [{ icon: Gauge, label: "Nível", value: LEVELS[race.level] }]
      : []),
    ...(race.elevationGain != null
      ? [
          {
            icon: Mountain,
            label: "Altimetria",
            value: `${race.elevationGain} m de ganho de elevação`,
          },
        ]
      : []),
    ...(race.organizer
      ? [{ icon: User, label: "Organização", value: race.organizer }]
      : []),
  ];

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const shareText = `${race.name} — ${formatDate(race.date)} em ${race.city}/${race.state}. ${siteUrl}/corrida/${race.slug}`;
  const verifiedAt = race.lastVerifiedAt ?? race.createdAt;

  return (
    <div className="container-page flex flex-col gap-7">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> Voltar
      </Link>

      <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
        <div className="relative aspect-[21/8] w-full bg-ink-800">
          {race.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={race.imageUrl}
              alt={race.name}
              className="h-full w-full object-cover opacity-90"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-4xl font-semibold tracking-tight text-ink-700">
                {race.distances[0] ?? "RUN"}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-3 lg:p-8">
          <div className="lg:col-span-2">
            <span className="text-xs uppercase tracking-wider text-neutral-500">
              {race.source}
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
              {race.name}
            </h1>
            {race.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-neutral-400">
                {race.description}
              </p>
            )}
          </div>

          <aside className="flex flex-col gap-5 rounded-xl border border-ink-800 bg-ink-950 p-5">
            <dl className="flex flex-col gap-4">
              {info.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon size={16} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-neutral-500">
                      {label}
                    </dt>
                    <dd className="text-sm font-medium text-neutral-200">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>

            {isPast ? (
              race.resultsUrl ? (
                <a
                  href={race.resultsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
                >
                  <Trophy size={15} /> Ver resultados <ExternalLink size={15} />
                </a>
              ) : (
                <p className="rounded-lg border border-ink-800 px-4 py-2.5 text-center text-sm text-neutral-500">
                  Corrida realizada · resultados ainda não disponíveis
                </p>
              )
            ) : (
              <a
                href={`/ir/${race.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
              >
                Inscrever-se no site oficial <ExternalLink size={15} />
              </a>
            )}
            {isPast && (
              <div className="flex flex-col gap-2">
                {race.photos.length > 0 ? (
                  <>
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500">
                      <Camera size={13} className="text-accent" /> Encontre suas fotos
                    </p>
                    {race.photos.map((p) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center justify-between gap-2 rounded-lg border border-accent/40 px-3.5 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
                      >
                        <span className="truncate">{p.provider}</span>
                        <ExternalLink size={14} className="shrink-0" />
                      </a>
                    ))}
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500">
                      <Camera size={13} /> Procurar fotos
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {searchLinks(race.name).map((l) => (
                        <a
                          key={l.provider}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="rounded-md border border-ink-700 px-2.5 py-1 text-xs text-neutral-400 transition hover:border-accent/50 hover:text-white"
                        >
                          {l.provider}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <SaveButton
              raceId={race.id}
              initialSaved={savedIds.has(race.id)}
              loggedIn={!!user}
              variant="full"
              initialCount={race.savesCount}
            />
            {race.savesCount > 0 && (
              <p className="text-center text-xs text-neutral-500">
                {race.savesCount} pessoa{race.savesCount === 1 ? "" : "s"}{" "}
                {race.savesCount === 1 ? "salvou" : "salvaram"} esta corrida
              </p>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-accent/50 hover:text-white"
            >
              <Share2 size={15} /> Compartilhar no WhatsApp
            </a>
            {race.sourceUrl && (
              <a
                href={race.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs text-neutral-600 transition hover:text-neutral-400"
              >
                Ver página de origem
              </a>
            )}
          </aside>
        </div>
      </div>

      {race.lots.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              Lotes e preços
            </h2>
            <p className="text-sm text-neutral-500">
              Os valores podem mudar; confirme no site oficial antes de se
              inscrever.
            </p>
          </div>
          <RaceLots lots={race.lots} />
        </section>
      )}

      {(race.kitInfo || race.routeUrl) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {race.kitInfo && (
            <div className="rounded-xl border border-ink-800 bg-ink-900 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-neutral-100">
                <Package size={16} className="text-accent" /> Kit e retirada
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-400">
                {race.kitInfo}
              </p>
            </div>
          )}
          {race.routeUrl && (
            <div className="rounded-xl border border-ink-800 bg-ink-900 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-neutral-100">
                <Route size={16} className="text-accent" /> Percurso
              </h2>
              <p className="mb-3 text-sm text-neutral-400">
                Veja o mapa e o traçado da prova
                {race.elevationGain != null
                  ? ` (${race.elevationGain} m de ganho de elevação)`
                  : ""}
                .
              </p>
              <a
                href={race.routeUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-lg border border-accent/40 px-3.5 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
              >
                Abrir percurso <ExternalLink size={14} />
              </a>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3 border-t border-ink-800 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <RefreshCw size={12} /> Última atualização em{" "}
          {formatDate(verifiedAt)}
        </p>
        <ReportError raceId={race.id} />
      </div>

      {related.sameCity.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-100">
            Mais corridas em {race.city}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.sameCity.map((r) => (
              <RaceCard
                key={r.id}
                race={r}
                saved={savedIds.has(r.id)}
                loggedIn={!!user}
              />
            ))}
          </div>
        </section>
      )}

      {related.similar.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-100">
            Corridas parecidas
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.similar.map((r) => (
              <RaceCard
                key={r.id}
                race={r}
                saved={savedIds.has(r.id)}
                loggedIn={!!user}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              Treine em {race.city}
            </h2>
            <p className="text-sm text-neutral-500">
              Assessorias e grupos de corrida da cidade.
            </p>
          </div>
          <Link
            href={`/assessorias?cidade=${encodeURIComponent(race.city)}`}
            className="text-sm text-accent transition hover:text-accent-soft"
          >
            Ver todas →
          </Link>
        </div>
        {assessorias.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assessorias.map((a) => (
              <AssessoriaCard key={a.id} assessoria={a} compact />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-ink-700 p-6 text-center text-sm text-neutral-500">
            Ainda não temos assessorias cadastradas em {race.city}.{" "}
            <Link href="/assessorias/cadastrar" className="text-accent">
              Cadastre a sua
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
