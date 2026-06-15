import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Corra Melhor";

let realTransport: nodemailer.Transporter | null = null;
let etherealPromise: Promise<nodemailer.Transporter> | null = null;

function getRealTransport(): nodemailer.Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!realTransport) {
    realTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return realTransport;
}

/** Caixa de teste (Ethereal) — usada em dev quando não há SMTP configurado. */
async function getEtherealTransport(): Promise<nodemailer.Transporter> {
  if (!etherealPromise) {
    etherealPromise = nodemailer.createTestAccount().then((acc) =>
      nodemailer.createTransport({
        host: acc.smtp.host,
        port: acc.smtp.port,
        secure: acc.smtp.secure,
        auth: { user: acc.user, pass: acc.pass },
      })
    );
  }
  return etherealPromise;
}

/**
 * Envia um e-mail. Nunca lança.
 * - Com SMTP configurado → envia de verdade.
 * - Sem SMTP, em dev → usa Ethereal e devolve `previewUrl` (link pra VER o e-mail).
 * - Sem SMTP, em produção → não envia.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; previewUrl?: string }> {
  const from = SMTP_FROM || `${siteName} <no-reply@corramelhor.local>`;

  const real = getRealTransport();
  if (real) {
    try {
      await real.sendMail({ from, ...opts });
      return { sent: true };
    } catch (err) {
      console.warn("[email] falha ao enviar:", (err as Error).message);
      return { sent: false };
    }
  }

  // Sem SMTP: em produção não envia; em dev usa Ethereal para preview.
  if (process.env.NODE_ENV === "production") {
    console.log(`[email] SMTP não configurado — envio pulado para ${opts.to}`);
    return { sent: false };
  }

  try {
    const t = await getEtherealTransport();
    const info = await t.sendMail({ from, ...opts });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[email] (dev/Ethereal) preview: ${previewUrl}`);
    return { sent: true, previewUrl };
  } catch (err) {
    console.warn("[email] falha (ethereal):", (err as Error).message);
    return { sent: false };
  }
}

/** Conteúdo do e-mail de boas-vindas enviado no cadastro. */
export function welcomeEmail(name: string) {
  const first = name.split(" ")[0] || name;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#121214;border-radius:16px;overflow:hidden;border:1px solid #26262c">
    <div style="padding:28px 28px 8px">
      <h1 style="margin:0;font-size:22px;color:#fafafa">
        Corra <span style="color:#f97316">Melhor</span>
      </h1>
    </div>
    <div style="padding:8px 28px 28px;color:#d4d4d4;line-height:1.6;font-size:15px">
      <p>Olá, <strong style="color:#fff">${first}</strong>! 🏃</p>
      <p>Sua conta no <strong>${siteName}</strong> foi criada com sucesso.</p>
      <p>Agora você pode <strong>salvar as corridas</strong> que vai participar e
      acompanhar tudo em um só lugar — com o link oficial de inscrição de cada uma.</p>
      <a href="#" style="display:inline-block;margin-top:12px;background:#f97316;color:#0a0a0b;
        text-decoration:none;font-weight:600;padding:11px 20px;border-radius:10px">
        Ver corridas do Paraná
      </a>
      <p style="margin-top:24px;color:#8a8a8a;font-size:13px">
        Bons treinos e boas provas! 👟
      </p>
    </div>
  </div>`;
  return {
    subject: `Bem-vindo ao ${siteName}! 🏃`,
    html,
    text: `Olá, ${first}! Sua conta no ${siteName} foi criada com sucesso. Agora você pode salvar as corridas que vai participar.`,
  };
}
