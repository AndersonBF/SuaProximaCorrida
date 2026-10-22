import type { RaceLot } from "@prisma/client";

export const SURFACES: Record<string, string> = {
  ASFALTO: "Asfalto",
  TRAIL: "Trail / terra",
  PISTA: "Pista",
  MISTO: "Misto",
};

export const LEVELS: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

/**
 * Lê as linhas do campo de lotes do admin. Formato por linha:
 *   distância | nome do lote | preço | último dia (AAAA-MM-DD)
 * Distância e data podem ficar vazias. Linhas inválidas são ignoradas.
 */
export function parseLots(text: string): {
  distance: string | null;
  name: string;
  price: number;
  endsAt: Date | null;
}[] {
  const lots = [];
  for (const line of text.split(/\r?\n/)) {
    const [distance, name, price, endsAt] = line.split("|").map((p) => p.trim());
    if (!name || price === undefined) continue;
    const value = Number(price.replace(/[^\d,.-]/g, "").replace(",", "."));
    if (!Number.isFinite(value) || price === "") continue;
    const date = endsAt ? new Date(`${endsAt}T12:00:00Z`) : null;
    lots.push({
      distance: distance || null,
      name,
      price: value,
      endsAt: date && !isNaN(date.getTime()) ? date : null,
    });
  }
  return lots;
}

/** Inverso de parseLots, para preencher o formulário de edição. */
export function lotsToText(lots: RaceLot[]): string {
  return lots
    .map((l) =>
      [
        l.distance ?? "",
        l.name,
        l.price,
        l.endsAt ? l.endsAt.toISOString().slice(0, 10) : "",
      ].join(" | ")
    )
    .join("\n");
}

/** Dia (UTC, como é gravado) em que o lote termina, comparável a "hoje". */
function lotEndDay(l: RaceLot): string | null {
  return l.endsAt ? l.endsAt.toISOString().slice(0, 10) : null;
}

export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export type LotStatus = "past" | "current" | "next";

/**
 * Agrupa os lotes por distância e marca qual está valendo hoje: o primeiro (por
 * data) que ainda não terminou; os anteriores são "past" e os seguintes "next".
 */
export function groupLots(lots: RaceLot[]) {
  const today = todayKey();
  const groups = new Map<string, RaceLot[]>();
  for (const l of lots) {
    const k = l.distance ?? "";
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return Array.from(groups.entries()).map(([distance, items]) => {
    const sorted = [...items].sort((a, b) => {
      const ea = lotEndDay(a) ?? "9999";
      const eb = lotEndDay(b) ?? "9999";
      return ea.localeCompare(eb) || a.price - b.price;
    });
    const currentIdx = sorted.findIndex((l) => (lotEndDay(l) ?? "9999") >= today);
    return {
      distance,
      lots: sorted.map((lot, i) => ({
        lot,
        status: (currentIdx === -1 || i < currentIdx
          ? "past"
          : i === currentIdx
            ? "current"
            : "next") as LotStatus,
      })),
    };
  });
}
