import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/**
 * Preenche a imagem (imageUrl) das corridas que estão sem, lendo a og:image /
 * twitter:image / JSON-LD da página de inscrição (ou da página de origem).
 * Corridas futuras primeiro. Uso: npm run images
 *   CORRA_IMAGES_LIMIT limita a quantidade (testes).
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// logos, ícones, banners de propaganda e imagens genéricas do site (não são o cartaz da corrida)
const JUNK =
  /logo|sprite|icone?\b|\.svg(\?|$)|avatar|placeholder|favicon|veniaClosed|LargeRectangle|\/banners\/|fav\.png|cronometro|og-image|thumb\.jpg|hero-banner|default|sem-?imagem/i;

function metaImage(html: string): string | undefined {
  let twitter: string | undefined;
  for (const tag of html.match(/<meta[^>]+>/gi) ?? []) {
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    if (/property=["']og:image(:secure_url)?["']/i.test(tag)) return content;
    if (/name=["']twitter:image["']/i.test(tag)) twitter ??= content;
  }
  return twitter ?? html.match(/"image"\s*:\s*\[?\s*"(https?:[^"]+)"/i)?.[1];
}

async function isImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(10000) });
    return res.ok && (res.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
}

async function imageFromPage(pageUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return;
    const raw = metaImage(await res.text());
    if (!raw) return;
    const abs = new URL(raw.replace(/&amp;/g, "&"), pageUrl).href;
    if (JUNK.test(abs)) return;
    return (await isImage(abs)) ? abs : undefined;
  } catch {
    return;
  }
}

async function main() {
  const limit = Number(process.env.CORRA_IMAGES_LIMIT) || undefined;
  const races = await prisma.race.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: "" }] },
    select: { id: true, name: true, date: true, registrationUrl: true, sourceUrl: true },
  });
  const now = Date.now();
  // futuras primeiro (mais próximas antes), depois as passadas (mais recentes antes)
  races.sort((a, b) => {
    const fa = a.date.getTime() >= now, fb = b.date.getTime() >= now;
    if (fa !== fb) return fa ? -1 : 1;
    return fa ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime();
  });
  const todo = limit ? races.slice(0, limit) : races;
  console.log(`\n🖼️  Buscando imagem de ${todo.length} corrida(s) sem imagem...\n`);

  let ok = 0;
  for (const r of todo) {
    // só a página de inscrição: a página de origem (agregador) traz banner de propaganda
    const urls = [r.registrationUrl].filter((u): u is string => !!u);
    let img: string | undefined;
    for (const u of [...new Set(urls)]) {
      img = await imageFromPage(u);
      if (img) break;
    }
    // a mesma imagem em várias corridas = imagem genérica do site, não do evento
    if (img && (await prisma.race.count({ where: { imageUrl: img } })) >= 2) img = undefined;
    if (img) {
      await prisma.race.update({ where: { id: r.id }, data: { imageUrl: img } });
      ok++;
      console.log(`  ✓ ${r.name}`);
    }
    await sleep(200);
  }
  console.log(`\n✅ ${ok}/${todo.length} corrida(s) ganharam imagem.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
