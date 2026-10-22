"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Flag } from "lucide-react";
import { reportRaceError } from "@/app/corrida/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar aviso"}
    </button>
  );
}

export function ReportError({ raceId }: { raceId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(
    reportRaceError.bind(null, raceId),
    undefined
  );

  if (state?.ok) {
    return <p className="text-xs text-emerald-400">{state.ok}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition hover:text-neutral-300"
      >
        <Flag size={12} /> Reportar erro
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-ink-800 bg-ink-950 p-4"
    >
      <p className="text-sm font-medium text-neutral-200">
        O que está errado nesta corrida?
      </p>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      <textarea
        name="message"
        required
        rows={3}
        maxLength={1000}
        className="field font-normal"
        placeholder="Ex: a data mudou para 15/11, o preço do 10km é outro..."
      />
      <input
        name="contact"
        maxLength={200}
        className="field font-normal"
        placeholder="E-mail ou WhatsApp (opcional)"
      />
      <input
        name="website_url_check"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
      <div className="flex items-center gap-3">
        <Submit />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-neutral-500 transition hover:text-neutral-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
