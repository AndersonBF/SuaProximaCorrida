"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { submitAssessoria } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar cadastro"}
    </button>
  );
}

const label = "flex flex-col gap-1.5 text-sm font-medium text-neutral-300";

export default function CadastrarAssessoriaPage() {
  const [state, formAction] = useFormState(submitAssessoria, undefined);

  return (
    <div className="container-page flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Cadastrar assessoria ou grupo
        </h1>
        <p className="text-sm text-neutral-500">
          O cadastro é gratuito e passa por uma análise antes de aparecer no
          site.
        </p>
      </div>

      {state?.ok ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-6">
          <p className="text-sm text-neutral-100">{state.ok}</p>
          <Link href="/assessorias" className="text-sm font-medium text-accent">
            Ver assessorias →
          </Link>
        </div>
      ) : (
        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-2xl border border-ink-800 bg-ink-900 p-6"
        >
          <label className={label}>
            Nome da assessoria / grupo *
            <input name="name" required maxLength={80} className="field" />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className={`${label} col-span-2`}>
              Cidade *
              <input name="city" required maxLength={60} className="field" />
            </label>
            <label className={label}>
              UF *
              <input
                name="state"
                required
                maxLength={2}
                defaultValue="PR"
                className="field uppercase"
              />
            </label>
          </div>

          <label className={label}>
            Sobre
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              className="field"
              placeholder="Fale um pouco do grupo: público, estilo de treino..."
            />
          </label>

          <label className={label}>
            Dias, horários e locais de treino
            <input
              name="trainingInfo"
              maxLength={300}
              className="field"
              placeholder="Ex: seg/qua/sex 6h, Parque Barigui"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={label}>
              Instagram
              <input name="instagram" className="field" placeholder="@seugrupo" />
            </label>
            <label className={label}>
              WhatsApp
              <input name="whatsapp" className="field" placeholder="(41) 99999-9999" />
            </label>
            <label className={label}>
              Site
              <input name="website" className="field" placeholder="seusite.com.br" />
            </label>
          </div>
          <p className="-mt-2 text-xs text-neutral-600">
            Informe ao menos um contato. Eles aparecem publicamente.
          </p>

          <label className={label}>
            Seu e-mail (não é exibido)
            <input
              type="email"
              name="contactEmail"
              className="field"
              placeholder="para falarmos com você sobre o cadastro"
            />
          </label>

          {/* campo-isca anti-bot: deve ficar vazio */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Não preencha
              <input name="website_url_check" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <SubmitButton />
        </form>
      )}
    </div>
  );
}
