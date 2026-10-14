"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { resetPassword } from "@/app/conta/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar nova senha"}
    </button>
  );
}

export default function RedefinirSenhaPage({
  params,
}: {
  params: { token: string };
}) {
  const [state, formAction] = useFormState(resetPassword, undefined);

  return (
    <div className="container-page flex justify-center py-6">
      <div className="w-full max-w-sm rounded-2xl border border-ink-800 bg-ink-900 p-8">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-50">
          Nova senha
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Escolha uma nova senha para a sua conta.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="token" value={params.token} />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
            Nova senha
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="field"
              placeholder="mínimo 6 caracteres"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
            Confirmar senha
            <input
              type="password"
              name="confirm"
              required
              minLength={6}
              autoComplete="new-password"
              className="field"
            />
          </label>
          {state?.error && (
            <p className="text-sm text-red-400">
              {state.error}{" "}
              <Link href="/esqueci-senha" className="underline">
                Pedir novo link
              </Link>
            </p>
          )}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
