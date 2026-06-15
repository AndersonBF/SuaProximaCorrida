"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import { login } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-ink-800 bg-ink-900 p-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-ink-700 text-accent">
          <Lock size={20} />
        </span>
        <h2 className="text-base font-semibold text-neutral-100">
          Acesso restrito
        </h2>
        <p className="text-sm text-neutral-500">
          Informe a senha de administrador para gerenciar as corridas.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input
          type="password"
          name="password"
          placeholder="Senha"
          autoFocus
          className="field"
        />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <SubmitButton />
      </form>
    </div>
  );
}
