import type { Metadata } from "next";
import { TreinosExplorer } from "@/components/TreinosExplorer";
import { listTreinos } from "@/lib/treinos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Treinos de corrida",
  description:
    "Treinos coletivos de assessorias e grupos de corrida: dias, horários e locais. Não são provas, são encontros para correr junto e se preparar.",
};

const defaultState = process.env.NEXT_PUBLIC_DEFAULT_STATE || undefined;

export default async function TreinosPage() {
  const treinos = await listTreinos(defaultState);

  return (
    <div className="-my-10">
      <section className="hero-bg relative isolate overflow-hidden">
        <div className="container-page flex flex-col items-center px-4 pb-20 pt-14 text-center sm:pb-24 sm:pt-20">
          <h1 className="max-w-[16ch] text-balance text-4xl font-medium leading-[1.04] tracking-[-0.04em] text-neutral-50 sm:text-6xl lg:text-7xl">
            Treinos de corrida perto de você.
          </h1>
          <p className="mt-5 max-w-[52ch] text-base font-light leading-relaxed text-neutral-300 sm:text-lg">
            Treino não é prova. Aqui estão os encontros de assessorias e grupos
            para correr junto: dias, horários e onde acontecem.
          </p>
        </div>
      </section>

      <section className="graphite relative -mt-10 rounded-t-[36px] pb-20 pt-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          {treinos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-sm text-neutral-500">
              Ainda não há treinos cadastrados.
            </div>
          ) : (
            <TreinosExplorer treinos={treinos} />
          )}
          <p className="mt-10 text-xs font-light leading-relaxed text-neutral-500">
            Horários coletados automaticamente dos sites das assessorias e de
            plataformas de eventos, e podem mudar. Confirme com o grupo antes de
            ir.
          </p>
        </div>
      </section>
    </div>
  );
}
