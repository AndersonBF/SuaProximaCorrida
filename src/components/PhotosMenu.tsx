"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, ExternalLink } from "lucide-react";

export interface PhotoLink {
  id: string;
  provider: string;
  url: string;
  title?: string | null;
}

/**
 * Botão único "Encontrar minhas fotos" que abre a lista de plataformas onde há
 * álbum da corrida (em vez de um botão por plataforma).
 */
export function PhotosMenu({ photos }: { photos: PhotoLink[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (photos.length === 0) return null;

  const providers = new Set(photos.map((p) => p.provider)).size;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm transition ${
          open
            ? "border-accent/60 bg-accent/10 text-accent"
            : "border-ink-700 text-neutral-200 hover:border-accent/50 hover:text-white"
        }`}
      >
        <Camera size={14} />
        Encontrar minhas fotos
        <ChevronDown
          size={14}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-ink-700 bg-ink-900 p-2 shadow-2xl shadow-black/50">
          <p className="px-2 pb-1.5 pt-1 text-[11px] uppercase tracking-wider text-neutral-500">
            Disponível em {providers} plataforma{providers === 1 ? "" : "s"}
          </p>
          <ul className="flex flex-col">
            {photos.map((p) => (
              <li key={p.id}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-ink-800"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-100">
                      {p.provider}
                    </span>
                    {p.title && (
                      <span className="block truncate text-xs text-neutral-500">
                        {p.title}
                      </span>
                    )}
                  </span>
                  <ExternalLink size={14} className="shrink-0 text-neutral-500" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
