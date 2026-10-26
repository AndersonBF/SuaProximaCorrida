/**
 * Extrai "quando é o treino" de texto corrido de páginas de assessorias.
 * Heurístico: procura trechos com dia(s) da semana + horário. Exemplos que
 * entende: "Ter/Qui 06h30", "Segundas e quartas, das 19h às 20h30",
 * "Seg a Sex 5h30 às 7h45", "Sábado 7:30".
 */

import { WEEKDAY_ABBR } from "@/lib/treinoMeta";

export interface Slot {
  weekdays: number[]; // 0 = dom ... 6 = sáb
  startTime: string; // "06:30"
  endTime?: string;
  location?: string;
  text: string; // trecho original
}

const DAY_WORD =
  "(?:dom(?:ingo)?s?|seg(?:unda)?s?(?:-feira)?|ter(?:[cç]a)?s?(?:-feira)?|qua(?:rta)?s?(?:-feira)?|qui(?:nta)?s?(?:-feira)?|sex(?:ta)?s?(?:-feira)?|s[aá]b(?:ado)?s?|[2-6]\\s?ª(?:\\s?-?\\s?feira)?)";
const NOT_LETTER_BEFORE = String.raw`(?<![\p{L}])`;
const NOT_LETTER_AFTER = String.raw`(?![\p{L}])`;

const DAY_RE = new RegExp(`${NOT_LETTER_BEFORE}${DAY_WORD}${NOT_LETTER_AFTER}`, "giu");
// grupo de dias: "Ter/Qui", "Segundas e quartas", "Seg a Sex", "Ter, Qui e Sáb"
const SEP = String.raw`\s*(?:/|,|&|\be\b|\ba\b|à|–|—|-|\s)\s*`;
const GROUP_RE = new RegExp(
  `${NOT_LETTER_BEFORE}${DAY_WORD}(?:${SEP}${DAY_WORD})*${NOT_LETTER_AFTER}`,
  "giu"
);
const TIME = String.raw`(\d{1,2})\s*(?:h|:|H)\s*(\d{2})?`;
const TO = String.raw`\s*(?:às|as|a|–|—|-|até)\s*`;
const RANGE_RE = new RegExp(`${TIME}(?:${TO}${TIME})?`, "gu");

export { WEEKDAY_ABBR };

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function dayIndex(word: string): number | null {
  // ordinal: "2ª" = segunda ... "6ª" = sexta
  const ord = word.match(/^([2-6])\s?ª/);
  if (ord) return Number(ord[1]) - 1;
  const w = norm(word);
  if (w.startsWith("dom")) return 0;
  if (w.startsWith("seg")) return 1;
  if (w.startsWith("ter")) return 2;
  if (w.startsWith("qua")) return 3;
  if (w.startsWith("qui")) return 4;
  if (w.startsWith("sex")) return 5;
  if (w.startsWith("sab")) return 6;
  return null;
}

function groupToDays(group: string): number[] {
  const words = [...group.matchAll(DAY_RE)].map((m) => m[0]);
  const idx = words.map(dayIndex).filter((n): n is number => n !== null);
  if (idx.length === 0) return [];
  // faixa: "Seg a Sex" / "Seg - Sex" (dois dias ligados por "a" ou hífen)
  const between = group.replace(DAY_RE, "|");
  const isRange = idx.length === 2 && /(?:^|\s)(?:a|à|às|as)(?:\s|$)|[–—-]/iu.test(between);
  if (isRange && idx[0] < idx[1]) {
    const out: number[] = [];
    for (let d = idx[0]; d <= idx[1]; d++) out.push(d);
    return out;
  }
  return [...new Set(idx)].sort((a, b) => a - b);
}

const pad = (n: number) => String(n).padStart(2, "0");
function hhmm(h: string, m?: string): string | null {
  const hh = parseInt(h, 10);
  const mm = m ? parseInt(m, 10) : 0;
  if (hh < 4 || hh > 22 || mm > 59) return null; // fora do horário de treino
  return `${pad(hh)}:${pad(mm)}`;
}

function toMinutes(hhmmStr: string): number {
  const [h, m] = hhmmStr.split(":").map(Number);
  return h * 60 + m;
}

const PLACE_RE =
  /\bJardim Bot[aâ]nico\b|\b(?:Parque|Pra[cç]a|Pista|Bosque|Est[aá]dio|Orla|Lago|Aut[oó]dromo|Vel[oó]dromo|Gin[aá]sio|Arena|Campus|AABB|Clube)\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç.]*(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wáéíóúâêôãõç]+){0,2}/u;

function findPlace(s: string): string | undefined {
  const m = s.match(PLACE_RE);
  return m?.[0]
    .trim()
    .replace(/\s+(?:Dom|Seg|Ter|Qua|Qui|Sex|S[aá]b)\w*$/u, "") // dia colado ao nome do local
    .replace(/[.,;:]+$/, "");
}

/** Linhas que descrevem funcionamento de loja/academia, não treino. */
const NOISE =
  /atendimento|funcionamento|secretaria|recep[cç][aã]o|hor[aá]rio de (?:loja|abertura)|aberto|fechado|copyright|plant[aã]o|funcional|funcionais|muscula|crossfit|pilates|kettlebell|yoga|nata[cç][aã]o|ciclis/iu;

export function extractSlots(text: string): Slot[] {
  const lines = text
    .split(/\n+/)
    .flatMap((l) => l.split(/[;•·|]/))
    // parágrafos: cada frase vira uma linha
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-ZÁ-Ú])/u))
    // textos colados por tags inline ("BacacheriSeg/Qua") ganham espaço
    .map((l) => l.replace(/([a-zà-ú])([A-ZÁ-Ú])/g, "$1 $2").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const slots: Slot[] = [];
  let lastPlace: string | undefined;
  let lastPlaceAt = -99;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const place = findPlace(line);
    if (place) {
      lastPlace = place;
      lastPlaceAt = i;
    }
    if (NOISE.test(line)) continue;

    let groups = [...line.matchAll(GROUP_RE)].filter((m) => groupToDays(m[0]).length);
    // "ter" sozinho em minúsculo costuma ser o verbo "ter"
    groups = groups.filter((m) => !(/^ter$/i.test(m[0].trim()) && m[0].trim() !== "Ter"));
    let times = [...line.matchAll(RANGE_RE)];

    // dia numa linha e horário na seguinte: junta
    if (groups.length && !times.length && lines[i + 1] && !NOISE.test(lines[i + 1])) {
      const next = lines[i + 1];
      if ([...next.matchAll(RANGE_RE)].length && ![...next.matchAll(GROUP_RE)].length) {
        line = `${line} ${next}`;
        times = [...line.matchAll(RANGE_RE)];
        i++;
      }
    }
    if (!groups.length || !times.length) continue;

    // evita parágrafos de texto corrido
    if (line.length > 220) continue;

    const where = findPlace(line) ?? (i - lastPlaceAt <= 3 ? lastPlace : undefined);
    // cada horário vale para o grupo de dias que aparece antes dele na frase
    // ("seg e qua às 18h45, ter e qui às 6h" -> 18h45 só seg/qua, 6h só ter/qui)
    const gs = groups.map((g) => ({ at: g.index ?? 0, days: groupToDays(g[0]) }));
    const seen = new Set<string>();
    for (const t of times.slice(0, 6)) {
      const before = gs.filter((g) => g.at <= (t.index ?? 0));
      const days = (before.length ? before[before.length - 1] : gs[0]).days;
      const start = hhmm(t[1], t[2]);
      if (!start) continue;
      const end = t[3] ? hhmm(t[3], t[4]) ?? undefined : undefined;
      // janela longa (ex: 9h às 18h) é horário de atendimento, não de treino
      if (end && toMinutes(end) - toMinutes(start) > 240) continue;
      const key = `${days.join(",")}|${start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slots.push({ weekdays: days, startTime: start, endTime: end, location: where, text: line });
    }
  }
  return slots;
}

/** Cidades da região metropolitana de Curitiba e do interior do PR citadas junto ao local. */
const PR_CITIES = [
  "São José dos Pinhais",
  "Campo Largo",
  "Campo Magro",
  "Almirante Tamandaré",
  "Fazenda Rio Grande",
  "Quatro Barras",
  "Foz do Iguaçu",
  "Ponta Grossa",
  "Pinhais",
  "Colombo",
  "Araucária",
  "Piraquara",
  "Curitiba",
  "Londrina",
  "Maringá",
  "Cascavel",
  "Guarapuava",
];

/** Cidade citada no trecho (ex: "Parque das Águas (Pinhais)"), ou null. */
export function detectCity(text: string): string | null {
  const t = text.toLowerCase();
  return PR_CITIES.find((c) => t.includes(c.toLowerCase())) ?? null;
}

export function formatWeekdays(days: number[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a - b);
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (sorted.length >= 3 && consecutive)
    return `${WEEKDAY_ABBR[sorted[0]]} a ${WEEKDAY_ABBR[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => WEEKDAY_ABBR[d]).join(" · ");
}
