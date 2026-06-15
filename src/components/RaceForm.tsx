"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { Race } from "@prisma/client";
import type { ActionState } from "@/app/admin/actions";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function toDateInput(d?: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Salvando..." : editing ? "Salvar alterações" : "Criar corrida"}
    </button>
  );
}

const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-neutral-300";
const inputClass = "field font-normal";

export function RaceForm({
  action,
  race,
}: {
  action: Action;
  race?: Race;
}) {
  const [state, formAction] = useFormState(action, undefined);
  const editing = !!race;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 rounded-xl border border-ink-800 bg-ink-900 p-5 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Nome da corrida *
          <input
            name="name"
            required
            defaultValue={race?.name}
            className={inputClass}
            placeholder="Ex: Corrida da Cidade 2026"
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          Descrição
          <textarea
            name="description"
            rows={4}
            defaultValue={race?.description ?? ""}
            className={inputClass}
            placeholder="Percurso, kit, retirada, observações..."
          />
        </label>

        <label className={labelClass}>
          Data *
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInput(race?.date)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Data final (opcional)
          <input
            type="date"
            name="endDate"
            defaultValue={toDateInput(race?.endDate)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Cidade *
          <input
            name="city"
            required
            defaultValue={race?.city}
            className={inputClass}
            placeholder="São Paulo"
          />
        </label>

        <label className={labelClass}>
          Estado (UF) *
          <input
            name="state"
            required
            maxLength={2}
            defaultValue={race?.state}
            className={`${inputClass} uppercase`}
            placeholder="SP"
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          Local de largada / endereço
          <input
            name="location"
            defaultValue={race?.location ?? ""}
            className={inputClass}
            placeholder="Parque Ibirapuera"
          />
        </label>

        <label className={labelClass}>
          Distâncias (separadas por vírgula)
          <input
            name="distances"
            defaultValue={race?.distances.join(", ")}
            className={inputClass}
            placeholder="5km, 10km, 21km"
          />
        </label>

        <label className={labelClass}>
          Organização
          <input
            name="organizer"
            defaultValue={race?.organizer ?? ""}
            className={inputClass}
            placeholder="Nome do organizador"
          />
        </label>

        <label className={labelClass}>
          Preço a partir de (R$)
          <input
            name="priceFrom"
            inputMode="decimal"
            defaultValue={race?.priceFrom ?? ""}
            className={inputClass}
            placeholder="89.90 (0 = gratuito, vazio = sob consulta)"
          />
        </label>

        <label className={labelClass}>
          Preço máximo (R$)
          <input
            name="priceTo"
            inputMode="decimal"
            defaultValue={race?.priceTo ?? ""}
            className={inputClass}
            placeholder="129.90"
          />
        </label>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-xl border border-ink-800 bg-ink-900 p-5 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Link de inscrição (site oficial) *
          <input
            type="url"
            name="registrationUrl"
            required
            defaultValue={race?.registrationUrl}
            className={inputClass}
            placeholder="https://www.ticketsports.com.br/e/..."
          />
        </label>

        <label className={labelClass}>
          Fonte
          <input
            name="source"
            defaultValue={race?.source ?? "Manual"}
            className={inputClass}
            placeholder="Ticket Sports, Sympla, Manual..."
          />
        </label>

        <label className={labelClass}>
          URL da imagem (opcional)
          <input
            type="url"
            name="imageUrl"
            defaultValue={race?.imageUrl ?? ""}
            className={inputClass}
            placeholder="https://..."
          />
        </label>

        <label className={labelClass}>
          Status
          <select
            name="status"
            defaultValue={race?.status ?? "PUBLISHED"}
            className={inputClass}
          >
            <option value="PUBLISHED">Publicada</option>
            <option value="DRAFT">Rascunho</option>
            <option value="ARCHIVED">Arquivada</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={race?.featured}
            className="h-4 w-4 rounded border-ink-700 bg-ink-900 text-accent focus:ring-accent"
          />
          Destacar na home
        </label>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton editing={editing} />
        <Link
          href="/admin"
          className="rounded-lg border border-ink-700 px-5 py-2.5 text-sm font-medium text-neutral-400 transition hover:text-neutral-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
