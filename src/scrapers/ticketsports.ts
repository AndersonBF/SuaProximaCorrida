import type { Scraper, ScrapedRace } from "./types";

/**
 * Scraper do Ticket Sports via a API JSON que alimenta o calendário do site
 * (https://www.ticketsports.com.br/Calendario/Corrida-de-Rua).
 *
 * A API devolve eventos de todas as modalidades e de todo o Brasil, então
 * filtramos por UF, descartamos eventos virtuais e o que claramente não é
 * corrida (ciclismo, natação, triathlon...).
 *
 * O preço não vem na listagem (campo `price` sempre nulo) — fica "Sob consulta".
 */
const ENDPOINT = "https://www.ticketsports.com.br/api/events/list";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

interface TsEvent {
  organizer?: string;
  address?: string;
  isVirtualEvent?: boolean;
  uri?: string;
  eventId?: number;
  title?: string;
  logoImageSource?: string;
  day?: string;
  month?: string;
  year?: string;
  status?: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

const NOT_RUNNING =
  /pedal|mtb|ciclis|bike|bicicl|nata[cç][aã]o|travessia|[aá]guas abertas|triathlon|triatlo|ironman|swim|surf|jiu|futeb|beach|stand up|\bsup\b|duathlon|aquathlon/i;

const RUNNING =
  /corrida|\bcorre\b|milhas?\b|\brun\b|running|runner|maratona|marathon|meia|half|trail|ultra|\d+\s?k\b|\d+\s?km|caminhada|circuito|trein[aã]o|rústica|rustica|kids|night|prova|desafio|etapa/i;

function parseDate(ev: TsEvent): Date | null {
  const day = Number(ev.day);
  const month = MONTHS[(ev.month || "").toLowerCase().slice(0, 3)];
  const year = Number(ev.year);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, 7, 0, 0, 0);
}

export const ticketSportsScraper: Scraper = {
  name: "Ticket Sports",

  async run({ state }): Promise<ScrapedRace[]> {
    const uf = (state || "").toUpperCase();
    let events: TsEvent[];
    try {
      const res = await fetch(`${ENDPOINT}?quantity=5000&atlheteId=0&term=`, {
        headers: { "user-agent": UA, accept: "application/json" },
      });
      if (!res.ok) {
        console.warn(`[ticketsports] HTTP ${res.status}`);
        return [];
      }
      events = (await res.json()) as TsEvent[];
    } catch (err) {
      console.warn("[ticketsports] falha:", (err as Error).message);
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const out: ScrapedRace[] = [];
    const seen = new Set<string>();

    for (const ev of events) {
      if (!ev.eventId || !ev.title || !ev.uri || ev.isVirtualEvent) continue;
      const externalId = String(ev.eventId);
      if (seen.has(externalId)) continue;

      // "Curitiba, PR"
      const m = (ev.address || "").trim().match(/^(.+?),\s*([A-Za-z]{2})$/);
      if (!m) continue;
      const evUf = m[2].toUpperCase();
      if (uf && evUf !== uf) continue;

      const name = ev.title.replace(/\s+/g, " ").trim();
      if (NOT_RUNNING.test(name) || !RUNNING.test(name)) continue;

      const date = parseDate(ev);
      if (!date || date < today) continue;

      seen.add(externalId);
      out.push({
        externalId,
        name,
        date,
        state: evUf,
        city: m[1].trim(),
        distances: [],
        organizer: ev.organizer?.trim() || undefined,
        imageUrl: ev.logoImageSource || undefined,
        registrationUrl: ev.uri,
        sourceUrl: ev.uri,
        source: "Ticket Sports",
      });
    }

    console.log(
      `  [ticketsports] ${out.length} corrida(s) futuras${uf ? ` em ${uf}` : ""}`
    );
    return out;
  },
};
