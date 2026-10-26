"use client";

import Link from "next/link";
import { Bookmark, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleSave } from "@/app/conta/favorites";

interface Props {
  raceId: string;
  initialSaved: boolean;
  loggedIn: boolean;
  variant?: "icon" | "full";
  /** total de pessoas que salvaram (mostrado na variante "full") */
  initialCount?: number;
}

export function SaveButton({ raceId, initialSaved, loggedIn, variant = "icon", initialCount }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  // Não logado: vira link para entrar (sem quebrar navegação do card)
  if (!loggedIn) {
    if (variant === "full") {
      return (
        <Link
          href="/entrar"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-accent/50 hover:text-white"
        >
          <Bookmark size={16} /> Entrar para salvar
        </Link>
      );
    }
    return (
      <Link
        href="/entrar"
        title="Entre para salvar"
        className="grid h-8 w-8 place-items-center rounded-full border border-ink-700 bg-ink-950/70 text-neutral-300 backdrop-blur transition hover:border-accent/50 hover:text-neutral-50"
      >
        <Bookmark size={15} />
      </Link>
    );
  }

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const r = await toggleSave(raceId);
      if (r) {
        setSaved(r.saved);
        setCount(r.count);
      }
    });
  }

  if (variant === "full") {
    return (
      <button
        onClick={handle}
        disabled={pending}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
          saved
            ? "border-accent/50 bg-accent/10 text-accent"
            : "border-ink-700 text-neutral-300 hover:border-accent/50 hover:text-white"
        }`}
      >
        {saved ? <Check size={16} /> : <Bookmark size={16} />}
        {saved ? "Salva — vou participar" : "Salvar corrida"}
        {count !== undefined && count > 0 && (
          <span className="text-xs text-neutral-500">· {count}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      title={saved ? "Remover dos salvos" : "Salvar corrida"}
      aria-pressed={saved}
      className={`grid h-8 w-8 place-items-center rounded-full border backdrop-blur transition disabled:opacity-60 ${
        saved
          ? "border-accent/50 bg-accent/20 text-accent"
          : "border-ink-700 bg-ink-950/70 text-neutral-300 hover:border-accent/50 hover:text-neutral-50"
      }`}
    >
      <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
