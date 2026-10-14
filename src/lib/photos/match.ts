/**
 * Casamento entre uma corrida nossa e um álbum de fotos de uma plataforma.
 * Conservador: nome cobre as palavras-chave E a data bate. É melhor não mostrar
 * link do que mostrar o álbum de outra prova.
 */
export interface PhotoEvent {
  title: string;
  url: string;
  start?: Date;
  end?: Date;
  city?: string;
  state?: string;
}

export interface PhotoProvider {
  /** Nome exibido (ex: "Fotop"). */
  name: string;
  /** Busca álbuns por trecho do nome. Nunca deve lançar. */
  search(term: string): Promise<PhotoEvent[]>;
}

export interface RaceLike {
  name: string;
  date: Date;
  endDate?: Date | null;
  state?: string | null;
  city?: string | null;
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "a", "o", "em", "no", "na", "para",
  "corrida", "corridas", "run", "prova", "etapa", "circuito", "edicao",
  "oficial", "fotos", "foto", "evento", "caminhada",
]);

function strip(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Palavras relevantes do nome (sem ano, ordinal, etapa ou palavras genéricas). */
export function keyTokens(name: string): string[] {
  return strip(name)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length > 1 &&
        !STOPWORDS.has(t) &&
        !/^\d{1,2}(a|o)?$/.test(t) && // ordinais: 6a, 2o
        !/^(19|20)\d{2}$/.test(t) // ano
    );
}

/** Termos de busca: a frase toda e as palavras mais distintivas. */
export function searchTerms(name: string): string[] {
  const tokens = keyTokens(name);
  if (tokens.length === 0) return [];
  const longest = [...tokens].sort((a, b) => b.length - a.length);
  return Array.from(new Set([tokens.join(" "), longest[0]])).filter(Boolean);
}

const DAY = 864e5;
const day = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function matches(race: RaceLike, ev: PhotoEvent): boolean {
  const want = keyTokens(race.name);
  if (want.length === 0) return false;
  const have = new Set(keyTokens(ev.title));
  const covered = want.filter((t) => have.has(t)).length / want.length;
  if (covered < 0.75) return false;

  // estado conhecido nos dois lados e diferente: é outra prova
  if (race.state && ev.state && race.state.toUpperCase() !== ev.state.toUpperCase()) {
    return false;
  }

  // cidade conhecida nos dois lados e sem relação: é outra prova
  if (race.city && ev.city) {
    const a = strip(race.city).replace(/[^a-z0-9]/g, "");
    const b = strip(ev.city).replace(/[^a-z0-9]/g, "");
    if (a && b && !a.includes(b) && !b.includes(a)) return false;
  }

  if (!ev.start) return false; // sem data não arriscamos
  const evEnd = ev.end ?? ev.start;
  const rStart = day(race.date);
  const rEnd = day(race.endDate ?? race.date);
  // folga de 1 dia (fuso / evento em dois dias)
  return rStart <= day(evEnd) + DAY && rEnd >= day(ev.start) - DAY;
}

/** "2026-10-14T03:00:00.000Z" (UTC) -> data local do Brasil (UTC-3). */
export function brDateFromIso(iso?: string | null): Date | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return undefined;
  const d = new Date(t - 3 * 3600e3);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** "dd/mm/aaaa" -> Date local. */
export function parseBr(d?: string | null): Date | undefined {
  const m = d?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : undefined;
}

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
