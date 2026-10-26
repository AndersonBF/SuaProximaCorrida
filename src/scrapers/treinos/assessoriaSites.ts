import * as cheerio from "cheerio";
import type { ScrapedTreino, TreinoScraper } from "./types";
import { extractSlots, detectCity, type Slot } from "./schedule";
import { discoverInstagram } from "./instagram";
import { TREINO_SITES, type TreinoSite } from "./sites";
import { prisma } from "@/lib/prisma";
import { renderHtml } from "@/lib/headless";

const UA =
  "Mozilla/5.0 (compatible; SuaProximaCorridaBot/0.1; +agregador-de-corridas)";

const BLOCKS =
  "p,div,li,h1,h2,h3,h4,h5,h6,tr,section,article,header,footer,ul,ol,table,dt,dd,address";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** HTML -> texto com quebras de linha nos blocos (para o parser de horários). */
function htmlToText(html: string): { text: string; $: cheerio.CheerioAPI } {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,iframe").remove();
  $("br").replaceWith("\n");
  $(BLOCKS).each((_, el) => {
    $(el).append("\n");
  });
  $("td,th").each((_, el) => {
    $(el).append(" | ");
  });
  return { text: $.root().text(), $ };
}

/** Links internos que costumam trazer horários/unidades. */
function candidateLinks($: cheerio.CheerioAPI, base: URL): string[] {
  const out = new Set<string>();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const label = `${$(a).text()} ${href}`;
    if (!/hor[aá]rio|treino|unidade|polo|onde|modalidade|corrida/i.test(label)) return;
    if (/contratar|checkout|carrinho|login|entrar|blog|noticia|\.pdf/i.test(label)) return;
    try {
      const u = new URL(href, base);
      if (u.host !== base.host) return;
      u.hash = "";
      out.add(u.href);
    } catch {
      /* link inválido */
    }
  });
  return [...out].slice(0, 5);
}

function contacts($: cheerio.CheerioAPI) {
  let instagram: string | undefined;
  let whatsapp: string | undefined;
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const ig = href.match(/instagram\.com\/([A-Za-z0-9._]{2,30})\/?(?:\?|$)/i);
    if (ig && !instagram && !/^(p|reel|explore|accounts)$/i.test(ig[1]))
      instagram = `https://www.instagram.com/${ig[1]}`;
    const wa =
      href.match(/wa\.me\/(\d{10,15})/i) ??
      href.match(/whatsapp\.com\/send\/?\?(?:[^"']*&)?phone=(\d{10,15})/i);
    if (wa && !whatsapp) whatsapp = wa[1];
  });
  return { instagram, whatsapp };
}

const RUNNING = /corrida|running|runner|correr|pace|maratona/i;
const FREE = /gratuit|gr[aá]tis|sem custo|aberto (?:ao|à) (?:p[uú]blico|comunidade)/i;

function slugPart(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function scrapeSite(site: TreinoSite): Promise<ScrapedTreino[]> {
  const base = new URL(site.url);
  const pages = new Map<string, { text: string; $: cheerio.CheerioAPI }>();

  async function load(url: string, allowHeadless: boolean) {
    if (pages.has(url)) return;
    let html = await fetchHtml(url);
    let parsed = html ? htmlToText(html) : null;
    if ((!parsed || extractSlots(parsed.text).length === 0) && allowHeadless) {
      const rendered = await renderHtml(url);
      if (rendered) parsed = htmlToText(rendered);
    }
    if (parsed) pages.set(url, parsed);
  }

  await load(site.url, true);
  const home = pages.get(site.url);
  if (!home) return [];
  const extra = [
    ...candidateLinks(home.$, base),
    ...(site.paths ?? []).map((p) => new URL(p, base).href),
  ];
  for (const u of extra) await load(u, true);

  const found = new Map<string, { slot: Slot; page: string; text: string }>();
  let contact: { instagram?: string; whatsapp?: string } = {};
  for (const [url, { text, $ }] of pages) {
    if (!RUNNING.test(text)) continue;
    contact = { ...contacts($), ...Object.fromEntries(Object.entries(contact).filter(([, v]) => v)) };
    for (const slot of extractSlots(text)) {
      const key = `${slot.location ?? ""}|${slot.weekdays.join(",")}|${slot.startTime}`;
      if (!found.has(key)) found.set(key, { slot, page: url, text });
    }
  }

  if (contact.instagram) discoverInstagram(contact.instagram, site);
  const host = base.host.replace(/^www\./, "");
  return [...found.entries()].slice(0, 14).map(([key, { slot, page }]) => {
    const free = !!site.free || FREE.test(slot.text);
    return {
      externalId: `${host}|${slugPart(key)}`,
      name: `${site.name} · ${slot.location ?? site.city}`,
      kind: "SEMANAL" as const,
      weekdays: slot.weekdays,
      startTime: slot.startTime,
      endTime: slot.endTime,
      scheduleText: slot.text.slice(0, 200),
      state: site.state,
      city: detectCity(`${slot.location ?? ""} ${slot.text}`) ?? site.city,
      location: slot.location,
      organizer: site.name,
      free,
      priceInfo: free ? "Gratuito" : undefined,
      instagram: contact.instagram,
      whatsapp: contact.whatsapp,
      website: site.url,
      sourceUrl: page,
    };
  });
}

/** Sites das assessorias aprovadas no diretório do próprio projeto. */
async function directorySites(state?: string): Promise<TreinoSite[]> {
  const rows = await prisma.assessoria.findMany({
    where: { status: "APPROVED", website: { not: null }, ...(state ? { state } : {}) },
    select: { name: true, website: true, city: true, state: true },
  });
  return rows.map((r) => ({ name: r.name, url: r.website!, city: r.city, state: r.state }));
}

export const assessoriaSitesScraper: TreinoScraper = {
  name: "Site da assessoria",

  async run({ state }) {
    const sites = [
      ...TREINO_SITES,
      ...(await directorySites(state)),
    ].filter((s) => !state || s.state === state);

    const out: ScrapedTreino[] = [];
    for (const site of sites) {
      try {
        const treinos = await scrapeSite(site);
        console.log(`    ${site.name}: ${treinos.length} horário(s)`);
        out.push(...treinos);
      } catch (err) {
        console.warn(`    ${site.name}: falhou (${(err as Error).message})`);
      }
    }
    return out;
  },
};
