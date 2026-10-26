import Link from "next/link";
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
    // -my-10 anula o py-10 do <main> para o hero encostar no header e a faixa clara no rodapé
    <div className="-my-10">
      <section className="hero-bg relative isolate overflow-hidden">
        <div className="container-page flex flex-col items-center px-4 pb-24 pt-16 text-center sm:pb-28 sm:pt-24">
          <h1 className="max-w-[14ch] text-balance text-5xl font-medium leading-[1.02] tracking-[-0.04em] text-neutral-50 sm:text-7xl lg:text-8xl">
            Encontre sua próxima corrida.
          </h1>
          <p className="mt-6 max-w-[46ch] text-base font-light leading-relaxed text-neutral-300 sm:text-lg">
            Todas as corridas do Paraná em um só lugar. Filtre por cidade e
            distância, ou encontre as mais próximas de você e se inscreva
            direto no site oficial.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#corridas"
              className="rounded-full bg-white px-8 py-4 text-base font-medium text-[#16161a] transition hover:-translate-y-0.5"
            >
              Ver corridas
            </a>
            <Link
              href="/perto"
              className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-base font-medium text-neutral-50 backdrop-blur transition hover:bg-white/15"
            >
              Perto de mim
            </Link>
          </div>
        </div>
      </section>

      {/* faixa grafite que sobe sobre o hero */}
      <section
        id="corridas"
        className="graphite relative -mt-10 scroll-mt-20 rounded-t-[36px] pb-20 pt-10"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h2 className="mb-6 text-2xl font-medium tracking-tight text-neutral-100 sm:text-3xl">
            Próximas corridas
          </h2>
          <Explorer
            races={races}
            loggedIn={!!user}
            savedIds={Array.from(savedIds)}
            cities={options.cities}
            distances={options.distances}
          />
        </div>
      </section>
    </div>
  );
}
