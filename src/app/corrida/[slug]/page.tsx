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
} from "lucide-react";
import { getRaceBySlug } from "@/lib/races";
import { getCurrentUser, getSavedRaceIds } from "@/lib/currentUser";
import { SaveButton } from "@/components/SaveButton";
import { formatDateLong, formatPriceRange } from "@/lib/format";

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
    ...(race.organizer
      ? [{ icon: User, label: "Organização", value: race.organizer }]
      : []),
  ];

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

            <a
              href={`/ir/${race.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft"
            >
              Inscrever-se no site oficial <ExternalLink size={15} />
            </a>
            <SaveButton
              raceId={race.id}
              initialSaved={savedIds.has(race.id)}
              loggedIn={!!user}
              variant="full"
            />
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
    </div>
  );
}
