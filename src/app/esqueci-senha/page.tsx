"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordReset } from "../conta/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar link de redefinição"}
    </button>
  );
}

export default function EsqueciSenhaPage() {
  const [state, formAction] = useFormState(requestPasswordReset, undefined);

  return (
    <div className="container-page flex justify-center py-6">
      <div className="w-full max-w-sm rounded-2xl border border-ink-800 bg-ink-900 p-8">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-50">
          Esqueci minha senha
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>

        {state?.ok ? (
          <div className="mt-6 flex flex-col gap-3">
            <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-neutral-200">
              {state.ok}
            </p>
            {state.previewUrl && (
              <a
                href={state.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent underline"
              >
                (modo desenvolvimento) abrir o e-mail enviado
              </a>
            )}
          </div>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
              E-mail
              <input
                type="email"
                name="email"
                required
                className="field"
                placeholder="voce@email.com"
              />
            </label>
            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
            <SubmitButton />
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link href="/entrar" className="font-medium text-accent hover:text-accent-soft">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
