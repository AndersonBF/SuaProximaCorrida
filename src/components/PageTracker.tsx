"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_MS = 30_000;

function send(body: object): Promise<Response> {
  return fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

/**
 * Registra cada página visitada em /api/track e, enquanto a aba estiver
 * visível, manda um heartbeat para contar a pessoa como "online agora".
 * Não renderiza nada.
 */
export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    let viewId: string | null = null;
    let cancelled = false;

    send({ path: pathname, referrer: document.referrer })
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.id) viewId = data.id;
      })
      .catch(() => {});

    const timer = setInterval(() => {
      if (viewId && document.visibilityState === "visible") {
        send({ id: viewId }).catch(() => {});
      }
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
