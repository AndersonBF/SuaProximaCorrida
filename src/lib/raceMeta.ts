/** Maior distância (km) a partir das strings de distância da corrida. */
function maxDistanceKm(distances: string[]): number {
  let max = 0;
  for (const d of distances) {
    const m = d.match(/(\d+(?:[.,]\d+)?)/);
    if (m) max = Math.max(max, parseFloat(m[1].replace(",", ".")));
  }
  return max;
}

export type RaceType = { label: string; cls: string };

/** Infere o "tipo" da corrida pelo nome e distâncias, para o badge colorido. */
export function raceType(name: string, distances: string[]): RaceType {
  const n = name.toLowerCase();
  const km = maxDistanceKm(distances);

  if (/\btrail\b|monta|cross|serra/.test(n))
    return { label: "Trail", cls: "border-emerald-500/40 text-emerald-300" };
  if (/noturn|night/.test(n))
    return { label: "Noturna", cls: "border-indigo-400/40 text-indigo-300" };
  if (/revezamento|relay/.test(n))
    return { label: "Revezamento", cls: "border-sky-400/40 text-sky-300" };
  if (/\bkids\b|infantil/.test(n) || (km > 0 && km <= 3))
    return { label: "Kids", cls: "border-pink-400/40 text-pink-300" };
  if (/ultra/.test(n) || km >= 30)
    return { label: "Ultra", cls: "border-red-500/40 text-red-400" };
  if (km >= 42) return { label: "Maratona", cls: "border-accent/50 text-accent" };
  if (km >= 21) return { label: "Meia", cls: "border-amber-400/40 text-amber-300" };
  if (km >= 10) return { label: "10K", cls: "border-white/30 text-white/85" };
  if (km > 0) return { label: "5K", cls: "border-white/30 text-white/85" };
  return { label: "Corrida", cls: "border-white/30 text-white/70" };
}

/** Dias até a corrida (a partir de hoje, 0 = hoje). */
export function daysUntil(date: Date | string): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** Rótulo de contagem regressiva (só quando faz sentido destacar). */
export function countdownLabel(date: Date | string): string | null {
  const d = daysUntil(date);
  if (d < 0) return null;
  if (d === 0) return "É hoje!";
  if (d === 1) return "Amanhã";
  if (d <= 30) return `Faltam ${d} dias`;
  return null;
}
