"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signup } from "../conta/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Criando..." : "Criar conta"}
    </button>
  );
}

export default function CadastroPage() {
  const [state, formAction] = useFormState(signup, undefined);

  return (
    <div className="container-page flex justify-center py-6">
      <div className="w-full max-w-sm rounded-2xl border border-ink-800 bg-ink-900 p-8">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-50">
          Criar conta
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Crie sua conta para acompanhar as corridas.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
            Nome
            <input name="name" required className="field" placeholder="Seu nome" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
            E-mail
            <input type="email" name="email" required className="field" placeholder="voce@email.com" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
            Senha
            <input type="password" name="password" required minLength={6} className="field" placeholder="mínimo 6 caracteres" />
          </label>
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-accent hover:text-accent-soft">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
