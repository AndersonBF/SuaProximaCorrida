"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changePassword, updateProfile } from "@/app/conta/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

function Message({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) return <p className="text-sm text-red-400">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-emerald-400">{state.ok}</p>;
  return null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useFormState(updateProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
        Nome
        <input name="name" defaultValue={name} required className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
        E-mail
        <input value={email} disabled className="field opacity-60" readOnly />
      </label>
      <Message state={state} />
      <Submit label="Salvar nome" />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useFormState(changePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
        Senha atual
        <input
          type="password"
          name="current"
          required
          autoComplete="current-password"
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
        Nova senha
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-300">
        Confirmar nova senha
        <input
          type="password"
          name="confirm"
          required
          minLength={6}
          autoComplete="new-password"
          className="field"
        />
      </label>
      <Message state={state} />
      <Submit label="Alterar senha" />
    </form>
  );
}
