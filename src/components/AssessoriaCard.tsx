import { Clock, Globe, Instagram, MapPin, MessageCircle } from "lucide-react";
import type { Assessoria } from "@prisma/client";

/** Cartão de uma assessoria/grupo de corrida. */
export function AssessoriaCard({
  assessoria,
  compact = false,
}: {
  assessoria: Assessoria;
  compact?: boolean;
}) {
  const a = assessoria;
  const linkCls =
    "inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-neutral-300 transition hover:border-accent/50 hover:text-white";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-800 bg-ink-900 p-4">
      <div className="flex items-start gap-3">
        {a.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.logoUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg border border-ink-700 object-cover"
          />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent/15 text-sm font-semibold text-accent">
            {a.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-neutral-100">
            {a.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
            <MapPin size={12} />
            {a.city}/{a.state}
          </p>
        </div>
      </div>

      {!compact && a.description && (
        <p className="line-clamp-3 text-sm leading-relaxed text-neutral-400">
          {a.description}
        </p>
      )}
      {a.trainingInfo && (
        <p className="flex items-start gap-1.5 text-xs text-neutral-400">
          <Clock size={13} className="mt-0.5 shrink-0 text-accent" />
          <span className="line-clamp-2">{a.trainingInfo}</span>
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        {a.instagram && (
          <a href={a.instagram} target="_blank" rel="noopener noreferrer nofollow" className={linkCls}>
            <Instagram size={13} /> Instagram
          </a>
        )}
        {a.whatsapp && (
          <a
            href={`https://wa.me/${a.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={linkCls}
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        )}
        {a.website && (
          <a href={a.website} target="_blank" rel="noopener noreferrer nofollow" className={linkCls}>
            <Globe size={13} /> Site
          </a>
        )}
      </div>
    </div>
  );
}
