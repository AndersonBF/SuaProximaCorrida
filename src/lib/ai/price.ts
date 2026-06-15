import Anthropic from "@anthropic-ai/sdk";

/**
 * Extração de preço de inscrição com IA (Claude), usada como fallback quando a
 * heurística de regex não encontra um valor confiável. Gated por
 * ANTHROPIC_API_KEY — sem a chave, retorna null e o scraper segue normalmente.
 *
 * Observação honesta: a IA lê o TEXTO da página. Em sites 100% JavaScript
 * (ex: Ticket Sports), o preço não está no HTML, então nem a IA o encontra —
 * para esses casos seria preciso um navegador headless. A IA ajuda nas páginas
 * server-rendered cujo preço aparece em formato "bagunçado" que o regex erra.
 */

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM = `Você extrai o PREÇO DE INSCRIÇÃO de corridas de rua a partir do texto de uma página de evento.

Responda SEMPRE em JSON com as chaves priceFrom e priceTo (números em reais, ou null).

Regras:
- priceFrom = menor valor de inscrição ("a partir de"); priceTo = maior valor (ou null se houver só um valor).
- Considere apenas valores de INSCRIÇÃO/lote/categoria. IGNORE: premiação/prêmios ("R$ 1.000 ao 1º lugar"), taxas de serviço/conveniência, patrocínio, doações e qualquer valor que não seja o custo de participar.
- Se a página não mostrar preço de inscrição (ex: "inscrições em breve", ou o preço só aparece após clicar), retorne priceFrom e priceTo como null. NÃO invente.
- Valores plausíveis de inscrição costumam ficar entre R$20 e R$900.`;

const SCHEMA = {
  type: "object",
  properties: {
    priceFrom: { anyOf: [{ type: "number" }, { type: "null" }] },
    priceTo: { anyOf: [{ type: "number" }, { type: "null" }] },
  },
  required: ["priceFrom", "priceTo"],
  additionalProperties: false,
} as const;

export async function extractPriceWithAI(
  pageText: string,
  eventName: string
): Promise<{ priceFrom?: number; priceTo?: number } | null> {
  const c = getClient();
  if (!c) return null;

  const text = pageText.slice(0, 8000);
  try {
    const res = await c.messages.create({
      model: process.env.AI_MODEL || "claude-opus-4-8",
      max_tokens: 256,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: `Evento: ${eventName}\n\nTexto da página de inscrição:\n${text}`,
        },
      ],
      // Structured Outputs: força a resposta a seguir o schema JSON
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;

    const parsed = JSON.parse(block.text) as {
      priceFrom: number | null;
      priceTo: number | null;
    };

    const clamp = (v: number | null) =>
      v != null && v >= 10 && v <= 2000 ? v : undefined;
    const priceFrom = clamp(parsed.priceFrom);
    const priceTo = clamp(parsed.priceTo);
    if (priceFrom === undefined && priceTo === undefined) return null;
    return { priceFrom, priceTo: priceTo !== priceFrom ? priceTo : undefined };
  } catch (err) {
    console.warn("[ai] extração de preço falhou:", (err as Error).message);
    return null;
  }
}
