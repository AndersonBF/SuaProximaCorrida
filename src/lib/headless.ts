import type { Browser } from "playwright";

/**
 * Renderização headless (Playwright/Chromium) para páginas 100% JavaScript
 * onde preço/imagem só aparecem após o JS rodar (ex: Ticket Sports).
 *
 * Ativado por USE_HEADLESS=1. O import do Playwright é dinâmico para não entrar
 * no bundle do Next — só o script de scraping carrega isso.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

let browserPromise: Promise<Browser> | null = null;

export function headlessEnabled(): boolean {
  return process.env.USE_HEADLESS === "1" || process.env.USE_HEADLESS === "true";
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const { chromium } = await import("playwright");
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

/** Renderiza a página com JS executado e devolve o HTML final (ou null). */
export async function renderHtml(url: string): Promise<string | null> {
  try {
    const browser = await getBrowser();
    const ctx = await browser.newContext({ userAgent: UA });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1500); // conteúdo tardio
    const html = await page.content();
    await ctx.close();
    return html;
  } catch (err) {
    console.warn("[headless] falhou:", (err as Error).message);
    return null;
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch {
      /* ignore */
    }
    browserPromise = null;
  }
}
