import type { ScrapedTreino, TreinoScraper } from "./types";
import { extractSlots, detectCity } from "./schedule";
import { closeBrowser } from "@/lib/headless";

/**
 * Lê a BIO pública de perfis de grupos/assessorias no Instagram (e o link da
 * bio, como Linktree), onde muitos publicam "TREINO ter/qui 6h Parque X".
 *
 * Só usa o que aparece para qualquer visitante sem login (bio, link da bio).
 * Não lê posts, não faz login e espera alguns segundos entre perfis. O
 * Instagram não permite coleta automatizada nos termos de uso e pode bloquear
 * ou mudar a página a qualquer momento: se falhar, o scraper só devolve menos
 * resultados.
 */

export interface InstagramProfile {
  handle: string;
  name: string;
  city: string;
  state: string;
  free?: boolean;
}

export const INSTAGRAM_PROFILES: InstagramProfile[] = [
  { handle: "highpacerunners", name: "High Pace Runners", city: "Curitiba", state: "PR" },
  { handle: "equipiazza", name: "Equipiazza", city: "Curitiba", state: "PR" },
  { handle: "r80corrida", name: "R80 Assessoria", city: "Curitiba", state: "PR" },
  { handle: "therunningmoms", name: "The Running Moms", city: "Curitiba", state: "PR" },
  { handle: "maxxymaassessoria", name: "Maxxyma Assessoria", city: "Curitiba", state: "PR" },
  { handle: "insanerunningcrew", name: "Insane Running Crew", city: "Curitiba", state: "PR" },
  { handle: "v8assessoria", name: "V8 Assessoria", city: "Curitiba", state: "PR" },
  { handle: "believeandrun", name: "Believe & Run", city: "Londrina", state: "PR" },
  { handle: "studiocarpediemlondrina", name: "Studio Carpe Diem", city: "Londrina", state: "PR" },
  { handle: "acorremar", name: "Acorremar", city: "Maringá", state: "PR" },
  { handle: "foccoclubedecorrida", name: "FOCCO Clube de Corrida", city: "Maringá", state: "PR" },
];

/** Perfis achados nos próprios sites das assessorias (o link do Instagram no rodapé). */
const discovered = new Map<string, InstagramProfile>();

export function discoverInstagram(
  url: string,
  site: { name: string; city: string; state: string; free?: boolean }
) {
  const handle = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1]?.toLowerCase();
  if (handle && !discovered.has(handle))
    discovered.set(handle, { handle, name: site.name, city: site.city, state: site.state, free: site.free });
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Texto de um link externo da bio (Linktree etc.), via fetch simples. */
async function fetchLinkText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
      .replace(/<\/(p|div|li|h\d|a)>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&");
  } catch {
    return "";
  }
}

export const instagramScraper: TreinoScraper = {
  name: "Instagram",

  async run({ state }): Promise<ScrapedTreino[]> {
    const all = new Map<string, InstagramProfile>();
    for (const p of [...INSTAGRAM_PROFILES, ...discovered.values()]) {
      if (!all.has(p.handle.toLowerCase())) all.set(p.handle.toLowerCase(), p);
    }
    const profiles = [...all.values()].filter((p) => !state || p.state === state);
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ userAgent: UA, locale: "pt-BR" });
    const out: ScrapedTreino[] = [];

    try {
      for (const prof of profiles) {
        const page = await ctx.newPage();
        try {
          await page.goto(`https://www.instagram.com/${prof.handle}/`, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await page.waitForTimeout(3000);

          const data = await page.evaluate(() => {
            const body = document.body.innerText;
            const cut = body.indexOf("Mostrar mais posts");
            const bio = body.slice(0, cut > 0 ? cut : 1500);
            const link =
              [...document.querySelectorAll<HTMLAnchorElement>("a[href*='l.instagram.com']")]
                .map((a) => {
                  try {
                    return new URL(a.href).searchParams.get("u") ?? "";
                  } catch {
                    return "";
                  }
                })
                .find(Boolean) ?? "";
            const found = !/não está disponível|isn't available|Página não encontrada/i.test(body);
            return { bio, link, found, title: document.title };
          });

          if (!data.found || !/@/.test(data.title)) {
            console.log(`    @${prof.handle}: perfil não encontrado`);
            continue;
          }

          const linkText = data.link ? await fetchLinkText(data.link) : "";
          const slots = extractSlots(`${data.bio}\n${linkText}`);
          console.log(
            `    @${prof.handle}: ${slots.length} horário(s)${data.link ? ` (link: ${data.link.slice(0, 40)})` : ""}`
          );

          const igUrl = `https://www.instagram.com/${prof.handle}`;
          for (const s of slots.slice(0, 6)) {
            out.push({
              externalId: `ig:${prof.handle}|${(s.location ?? "").toLowerCase()}|${s.weekdays.join(",")}|${s.startTime}`,
              name: `${prof.name} · ${s.location ?? prof.city}`,
              kind: "SEMANAL",
              weekdays: s.weekdays,
              startTime: s.startTime,
              endTime: s.endTime,
              scheduleText: s.text.slice(0, 200),
              state: prof.state,
              city: detectCity(`${s.location ?? ""} ${s.text}`) ?? prof.city,
              location: s.location,
              organizer: prof.name,
              free: prof.free,
              instagram: igUrl,
              website: data.link || undefined,
              sourceUrl: igUrl,
            });
          }
        } catch (err) {
          console.warn(`    @${prof.handle}: ${(err as Error).message.split("\n")[0]}`);
        } finally {
          await page.close();
        }
        await sleep(4000);
      }
    } finally {
      await browser.close();
      await closeBrowser();
    }
    return out;
  },
};
