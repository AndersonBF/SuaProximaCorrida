import { Explorer } from "@/components/Explorer";
import { listRaces, getFilterOptions } from "@/lib/races";
import { getCurrentUser, getSavedRaceIds } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

const defaultState = process.env.NEXT_PUBLIC_DEFAULT_STATE || undefined;

export default async function HomePage() {
  const [races, options, user, savedIds] = await Promise.all([
    listRaces({ state: defaultState }),
    getFilterOptions(defaultState),
    getCurrentUser(),
    getSavedRaceIds(),
  ]);

  return (
    <div className="container-page flex flex-col gap-10">
      <section className="relative flex flex-col items-center gap-4 pt-6 text-center sm:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-90px] h-72 w-[120%] max-w-3xl -translate-x-1/2 blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(249,115,22,0.18), rgba(249,115,22,0.03) 45%, transparent 70%)",
          }}
        />
        <h1 className="relative max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl">
          Todas as corridas do Paraná.
          <br />
          <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">
            Em um só lugar.
          </span>
        </h1>
        <p className="relative max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base">
          Filtre por cidade e distância, ou encontre as corridas mais próximas
          de você. Inscreva-se direto no site oficial.
        </p>
      </section>

      <Explorer
        races={races}
        loggedIn={!!user}
        savedIds={Array.from(savedIds)}
        cities={options.cities}
        distances={options.distances}
      />
    </div>
  );
}
