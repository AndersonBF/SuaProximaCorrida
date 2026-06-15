import "dotenv/config";
import nodemailer from "nodemailer";
import { welcomeEmail } from "../src/lib/email";

/**
 * Testa o e-mail de boas-vindas.
 *
 * Uso:
 *   npm run email:test                 -> sem SMTP: usa conta de teste Ethereal
 *                                         e imprime um LINK de pré-visualização.
 *   npm run email:test voce@email.com  -> com SMTP configurado no .env: envia
 *                                         de verdade para esse endereço.
 */
async function main() {
  const to = process.argv[2] || "destinatario@exemplo.com";
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM } = process.env;

  let transporter: nodemailer.Transporter;
  let ethereal = false;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log(`📤 Enviando via SMTP (${SMTP_HOST}) para ${to}...`);
  } else {
    const acc = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: acc.smtp.host,
      port: acc.smtp.port,
      secure: acc.smtp.secure,
      auth: { user: acc.user, pass: acc.pass },
    });
    ethereal = true;
    console.log("ℹ️  SMTP não configurado — usando caixa de teste Ethereal.");
  }

  const mail = welcomeEmail("Anderson");
  const info = await transporter.sendMail({
    from: SMTP_FROM || '"Corra Melhor" <teste@corramelhor.local>',
    to,
    ...mail,
  });

  console.log("✅ Enviado:", info.messageId);
  if (ethereal) {
    console.log("\n🔗 Abra para VER o e-mail:");
    console.log("   " + nodemailer.getTestMessageUrl(info) + "\n");
  }
}

main().catch((e) => {
  console.error("Falhou:", e.message);
  process.exit(1);
});
