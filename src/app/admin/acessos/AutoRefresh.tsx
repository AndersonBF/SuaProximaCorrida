"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarrega os dados do servidor periodicamente (mantém o "online agora" vivo). */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
