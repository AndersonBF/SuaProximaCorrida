import type { Scraper, ScrapedRace } from "./types";
import { extractPriceWithAI, aiEnabled } from "@/lib/ai/price";
import { headlessEnabled, renderHtml } from "@/lib/headless";

// tetos por execução (controle de custo/tempo)
let aiCalls = 0;
const AI_LIMIT = Number(process.env.AI_PRICE_LIMIT) || 60;
let headlessCalls = 0;
const HEADLESS_LIMIT = Number(process.env.HEADLESS_LIMIT) || 40;

/**
 * Scraper do calendário do corridasbr.com.br.
 *
 * Estratégia:
 *  1. Baixa o calendário do estado (ex: /pr/Calendario.asp) e lista os eventos
 *     (id "escolha", nome e cidade de cada linha da tabela).
 *  2. Para cada evento, baixa a página de detalhe e extrai data, local de
 *     largada, distâncias, organizador e — o mais importante — o LINK REAL de
 *     inscrição, que o site guarda em `window.open('...siteevento.asp?c=<URL>')`.
 *  3. Quando não há link de inscrição, usa a própria página do evento no
 *     corridasbr como fallback (continua sendo um link real e específico).
 *
 * O site usa charset ISO-8859-1, então decodificamos como latin1 e tratamos
 * as entidades HTML manualmente.
 *
 * Variável opcional CORRA_SCRAPE_LIMIT limita a quantidade de eventos (útil em
 * testes). Sem ela, processa todos.
 */

const HOST = "https://www.corridasbr.com.br";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function fetchLatin1(url: string, referer?: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html",
      ...(referer ? { referer } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("latin1");
}

const NAMED: Record<string, string> = {
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  acirc: "â", ecirc: "ê", ocirc: "ô", atilde: "ã", otilde: "õ",
  agrave: "à", ccedil: "ç", ntilde: "ñ",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  Acirc: "Â", Ecirc: "Ê", Ocirc: "Ô", Atilde: "Ã", Otilde: "Õ",
  Agrave: "À", Ccedil: "Ç",
  amp: "&", quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">",
};

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED[name] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** "42/21/10/5km" -> ["42km","21km","10km","5km"]; "16,5/5km" -> ["16,5km","5km"] */
function parseDistances(raw?: string): string[] {
  if (!raw) return [];
  const s = decode(raw);
  const unit = s.match(/([a-zA-Z]+)\s*$/)?.[1] ?? "km";
  const nums = s.replace(/[a-zA-Z]+\s*$/, "");
  return nums
    .split("/")
    .map((n) => n.trim())
    .filter((n) => /\d/.test(n))
    .map((n) => `${n}${unit}`);
}

/** "05/07/2026" -> Date */
function parseDate(raw?: string): Date | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 7, 0, 0, 0);
}

/** Identifica a plataforma a partir do domínio do link de inscrição. */
function sourceFromUrl(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    const map: Record<string, string> = {
      "ticketsports.com.br": "Ticket Sports",
      "sympla.com.br": "Sympla",
      "doity.com.br": "Doity",
      "minhasinscricoes.com.br": "Minhas Inscrições",
      "bigticket.com.br": "Big Ticket",
      "gopanda.com.br": "Gopanda",
      "centraldasinscricoes.com.br": "Central das Inscrições",
      "agendaoffroad.com.br": "Agenda Off Road",
      "vemcorrer.com": "Vem Correr",
      "focoradical.com.br": "Foco Radical",
      "paguecorridas.com.br": "Pague Corridas",
      "assessocor.online": "Assessocor",
    };
    if (map[h]) return map[h];
    if (h.includes("liverun") || h.includes("live")) return "LIVE! Run XP";
    return h;
  } catch {
    return "corridasbr";
  }
}

/** Extrai a imagem de compartilhamento (og:image / twitter:image) de um HTML. */
function extractOgImage(html: string): string | undefined {
  const metas = html.match(/<meta[^>]+>/gi) || [];
  let twitter: string | undefined;
  for (const tag of metas) {
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    if (/property=["']og:image["']/i.test(tag)) return content; // preferencial
    if (/name=["']twitter:image["']/i.test(tag)) twitter ??= content;
  }
  return twitter;
}

function resolveUrl(src: string, base: string): string | undefined {
  try {
    return new URL(src, base).href;
  } catch {
    return undefined;
  }
}

/** Descarta logos, ícones, avatares e selos — não são o cartaz do evento. */
function isJunkImg(src: string): boolean {
  return /logo|sprite|icone?|\bic-|\.svg(\?|$)|usuario|avatar|placeholder|bandeira|\bflag\b|whats|facebook|instagram|selo|raldi|qrcode/i.test(
    src
  );
}

/** Imagem confiável: og:image ou JSON-LD (não precisa validar). */
function extractTrustedImage(html: string, pageUrl: string): string | undefined {
  const og = extractOgImage(html);
  if (og) return resolveUrl(og, pageUrl);
  return html.match(/"image"\s*:\s*\[?\s*"(https?:[^"]+)"/i)?.[1];
}

/** Palpite de cartaz: primeiro <img> "de conteúdo" (precisa ser validado). */
function extractFallbackImage(html: string, pageUrl: string): string | undefined {
  const imgs = Array.from(html.matchAll(/<img[^>]+src=["']?([^"' >]+)/gi))
    .map((m) => m[1])
    .filter((s) => s && !s.startsWith("data:"));
  const hinted = imgs.find(
    (s) => /evento|inscricao|thumb|arte|cartaz|banner|upload|img-\d/i.test(s) && !isJunkImg(s)
  );
  const pick = hinted ?? imgs.find((s) => !isJunkImg(s));
  return pick ? resolveUrl(pick, pageUrl) : undefined;
}

/** Confere via HEAD se a URL existe e é uma imagem (evita ícone quebrado). */
async function isValidImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", headers: { "user-agent": UA } });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    return ct === "" || ct.startsWith("image/");
  } catch {
    return false;
  }
}

/**
 * Preço a partir dos valores "R$ X,XX" presentes no HTML (plataformas
 * server-rendered). Heurística conservadora para evitar lixo:
 *   - ignora < R$20 (taxas de serviço) e > R$900 (premiação/ruído);
 *   - só assume um teto (faixa) quando ele é no máximo 5× o piso — acima disso
 *     normalmente é premiação ("R$ 1.000 ao 1º lugar"), não inscrição.
 * Não funciona em sites 100% JS (Ticket Sports etc.) — fica "Sob consulta".
 */
function extractPrice(html: string): { priceFrom?: number; priceTo?: number } {
  const vals = Array.from(html.matchAll(/R\$\s*([\d.]+,\d{2})/g))
    .map((m) => parseFloat(m[1].replace(/\./g, "").replace(",", ".")))
    .filter((v) => Number.isFinite(v) && v >= 20 && v <= 900);
  if (!vals.length) return {};
  const from = Math.min(...vals);
  const max = Math.max(...vals);
  const to = max !== from && max <= from * 5 ? max : undefined;
  return { priceFrom: from, priceTo: to };
}

/** Texto limpo da página (sem tags/scripts) para enviar à IA. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai a imagem de um HTML (trusted → fallback validado). */
async function imageFrom(html: string, url: string): Promise<string | undefined> {
  let imageUrl = extractTrustedImage(html, url);
  if (!imageUrl) {
    const cand = extractFallbackImage(html, url);
    if (cand && (await isValidImage(cand))) imageUrl = cand;
  }
  return imageUrl;
}

/** Extrai preço de um HTML: regex → IA (fallback, bounded). */
async function priceFrom(
  html: string,
  eventName: string
): Promise<{ priceFrom?: number; priceTo?: number }> {
  let price = extractPrice(html);
  if (price.priceFrom === undefined && aiEnabled() && aiCalls < AI_LIMIT) {
    const text = htmlToText(html);
    if (/r\$|reais|inscri|valor|lote/i.test(text)) {
      aiCalls++;
      const ai = await extractPriceWithAI(text, eventName);
      if (ai) price = ai;
    }
  }
  return price;
}

/** Baixa a página de inscrição e extrai imagem + preço. Usa headless como
 *  fallback (sites JS) quando algo faltar. */
async function fetchRegistrationMeta(
  url: string,
  eventName: string
): Promise<{ imageUrl?: string; priceFrom?: number; priceTo?: number }> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
    });
    if (!res.ok) return {};
    const html = await res.text();

    let imageUrl = await imageFrom(html, url);
    let price = await priceFrom(html, eventName);

    // Fallback headless (renderiza o JS) quando faltar imagem ou preço.
    if (
      headlessEnabled() &&
      headlessCalls < HEADLESS_LIMIT &&
      (!imageUrl || price.priceFrom === undefined)
    ) {
      headlessCalls++;
      const rendered = await renderHtml(url);
      if (rendered) {
        if (!imageUrl) imageUrl = await imageFrom(rendered, url);
        if (price.priceFrom === undefined) price = await priceFrom(rendered, eventName);
      }
    }

    return { imageUrl, ...price };
  } catch {
    return {};
  }
}

/** Extrai o valor de um campo rotulado na página de detalhe. */
function field(html: string, label: string): string | undefined {
  const re = new RegExp(
    label + "\\s*</span></td>\\s*<td[^>]*>\\s*(?:<span[^>]*>)?([^<]+)",
    "i"
  );
  const m = html.match(re);
  return m ? decode(m[1]) : undefined;
}

interface CalRow {
  id: string;
  name: string;
  city: string;
  dateDDMM?: string;
  distances?: string;
}

function parseCalendar(html: string): CalRow[] {
  const rows = html.split(/<tr align="center"/i).slice(1);
  const out: CalRow[] = [];
  for (const row of rows) {
    const id = row.match(/escolha=(\d+)/)?.[1];
    if (!id) continue;
    const name = row.match(/mostracorrida\.asp\?escolha=\d+[^>]*>([^<]+)<\/a>/i)?.[1];
    const city = row.match(/cidade=[^']*'[^>]*>([^<]+)<\/a>/i)?.[1];
    const dateDDMM = row.match(/<td width="40">\s*([\d.]+)/i)?.[1];
    const distances = row.match(/<td width="120">\s*([^<]+)</i)?.[1];
    if (!name || !city) continue;
    out.push({
      id,
      name: decode(name),
      city: decode(city),
      dateDDMM,
      distances,
    });
  }
  // dedup por id (o calendário pode repetir blocos)
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

/** Ano provável a partir de "dd.mm" relativo a hoje (eventos são futuros). */
function inferDateFromDDMM(ddmm: string): Date | null {
  const m = ddmm.match(/(\d{1,2})\.(\d{1,2})/);
  if (!m) return null;
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, Number(m[2]) - 1, Number(m[1]), 7, 0, 0, 0);
  // se já passou há mais de 1 mês, provavelmente é do ano que vem
  if (candidate.getTime() < now.getTime() - 31 * 864e5) year += 1;
  return new Date(year, Number(m[2]) - 1, Number(m[1]), 7, 0, 0, 0);
}

async function fetchDetail(
  base: string,
  referer: string,
  row: CalRow
): Promise<ScrapedRace | null> {
  const detailUrl = `${base}/mostracorrida.asp?escolha=${row.id}`;
  let html = "";
  try {
    html = await fetchLatin1(detailUrl, referer);
  } catch {
    html = "";
  }

  const linkRaw = html.match(/siteevento\.asp\?c=(https?:\/\/[^'"]+)/i)?.[1];
  const registrationUrl = linkRaw ? decode(linkRaw) : detailUrl;

  const date =
    parseDate(field(html, "Data")) ??
    (row.dateDDMM ? inferDateFromDDMM(row.dateDDMM) : null);
  if (!date) return null;

  const distances =
    parseDistances(field(html, "ncia\\(s\\)")) || parseDistances(row.distances);

  // só busca imagem/preço quando há link real de inscrição; o fallback do
  // corridasbr não tem cartaz nem valores.
  const meta = linkRaw
    ? await fetchRegistrationMeta(registrationUrl, row.name)
    : {};

  return {
    externalId: row.id,
    name: row.name,
    date,
    state: base.split("/").pop()?.toUpperCase() || "PR",
    city: row.city,
    location: field(html, "Largada"),
    distances: distances.length ? distances : parseDistances(row.distances),
    organizer: field(html, "Organizador"),
    imageUrl: meta.imageUrl,
    priceFrom: meta.priceFrom,
    priceTo: meta.priceTo,
    registrationUrl,
    sourceUrl: detailUrl,
    // exibe a plataforma real quando há link de inscrição; senão, a própria fonte
    source: linkRaw ? sourceFromUrl(registrationUrl) : "corridasbr",
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const corridasbrScraper: Scraper = {
  name: "corridasbr",

  async run({ state }): Promise<ScrapedRace[]> {
    const uf = (state || "pr").toLowerCase();
    const base = `${HOST}/${uf}`;
    const calendarUrl = `${base}/Calendario.asp`;

    // O site divide o calendário em páginas por período:
    //   Calendario.asp (próximas semanas), Calendario2.asp (~2 meses à frente),
    //   Calendario3.asp (mais distante). Raspamos as três.
    const calPages = ["Calendario.asp", "Calendario2.asp", "Calendario3.asp"];
    let rows: CalRow[] = [];
    for (const page of calPages) {
      try {
        const html = await fetchLatin1(`${base}/${page}`, calendarUrl);
        rows.push(...parseCalendar(html));
      } catch (err) {
        if (page === "Calendario.asp") {
          console.warn("[corridasbr] falha no calendário:", (err as Error).message);
          return [];
        }
        // páginas extras são opcionais
      }
    }
    // dedupe global por id (eventos podem repetir entre páginas)
    const seenIds = new Set<string>();
    rows = rows.filter((r) => (seenIds.has(r.id) ? false : (seenIds.add(r.id), true)));

    const limit = Number(process.env.CORRA_SCRAPE_LIMIT) || rows.length;
    rows = rows.slice(0, limit);
    console.log(`  [corridasbr] ${rows.length} eventos no calendário ${uf.toUpperCase()}`);

    const results: ScrapedRace[] = [];
    const BATCH = 5;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const settled = await Promise.all(
        batch.map((r) => fetchDetail(base, calendarUrl, r).catch(() => null))
      );
      for (const r of settled) if (r) results.push(r);
      if (i + BATCH < rows.length) await delay(400);
    }

    return results;
  },
};
