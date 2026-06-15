/**
 * Monta a URL de saída para o site de inscrição, adicionando UTM (e, no futuro,
 * código de afiliado por plataforma). É por aqui que medimos o valor entregue
 * a cada organizador e, quando houver acordo de afiliado, ganhamos comissão.
 */

// Quando você fechar parcerias de afiliado, preencha por host:
//   "ticketsports.com.br": { param: "ref", code: "corramelhor" }
const AFFILIATE: Record<string, { param: string; code: string }> = {
  // exemplos (desativados até ter acordo real):
  // "ticketsports.com.br": { param: "utm_term", code: "corramelhor" },
};

export function buildOutboundUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.searchParams.set("utm_source", "corramelhor");
    u.searchParams.set("utm_medium", "referral");
    u.searchParams.set("utm_campaign", "corra-melhor");

    const host = u.hostname.replace(/^www\./, "");
    const aff = AFFILIATE[host];
    if (aff) u.searchParams.set(aff.param, aff.code);

    return u.toString();
  } catch {
    return raw;
  }
}
