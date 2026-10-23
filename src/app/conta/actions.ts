"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  setUserSession,
  clearUserSession,
  getUserId,
} from "@/lib/auth";
import { sendEmail, welcomeEmail, resetPasswordEmail } from "@/lib/email";

export type AuthState =
  | { error?: string; ok?: string; previewUrl?: string }
  | undefined;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe uma conta com esse e-mail." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password) },
  });

  // e-mail de boas-vindas (best-effort; só sai se o SMTP estiver configurado)
  await sendEmail({ to: user.email, ...welcomeEmail(user.name ?? "") });

  setUserSession(user.id);
  redirect("/");
}

export async function loginUser(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.passwordHash) {
    return { error: "Esta conta usa o login com Google. Use o botão \"Continuar com Google\"." };
  }
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "E-mail ou senha incorretos." };
  }
  setUserSession(user.id);
  redirect("/");
}

export async function logoutUser() {
  clearUserSession();
  redirect("/");
}

/* ----------------------------------------------------------------------------
 * Recuperação e alteração de senha
 * -------------------------------------------------------------------------- */

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

/** Origem do site (para montar o link do e-mail). */
function siteOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

const passwordRule = z.string().min(6, "A senha precisa ter ao menos 6 caracteres");

/**
 * Pede o link de redefinição. A resposta é sempre a mesma exista ou não o
 * e-mail, para não revelar quais e-mails têm conta.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  let previewUrl: string | undefined;

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      }),
    ]);

    const link = `${siteOrigin()}/redefinir-senha/${token}`;
    const res = await sendEmail({
      to: user.email,
      ...resetPasswordEmail(user.name ?? "", link),
    });
    // em desenvolvimento (sem SMTP) mostra o link do e-mail de teste
    if (process.env.NODE_ENV !== "production") previewUrl = res.previewUrl;
  }

  return {
    ok: "Se esse e-mail tiver uma conta, enviamos um link para redefinir a senha. Ele vale por 1 hora.",
    previewUrl,
  };
}

/** Define a nova senha a partir do token recebido por e-mail. */
export async function resetPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const rule = passwordRule.safeParse(password);
  if (!rule.success) return { error: rule.error.errors[0]?.message };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado. Peça um novo." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  setUserSession(row.userId);
  redirect("/conta?ok=senha");
}

/** Altera a senha do usuário logado (exige a senha atual). */
export async function changePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const userId = getUserId();
  if (!userId) return { error: "Você precisa estar logado." };

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const rule = passwordRule.safeParse(password);
  if (!rule.success) return { error: rule.error.errors[0]?.message };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && !user.passwordHash) {
    return {
      error: "Sua conta usa o login com Google. Para criar uma senha, use \"Esqueci minha senha\".",
    };
  }
  if (!user?.passwordHash || !verifyPassword(current, user.passwordHash)) {
    return { error: "A senha atual está incorreta." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(password) },
  });
  return { ok: "Senha alterada com sucesso." };
}

/** Atualiza o nome do usuário logado. */
export async function updateProfile(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const userId = getUserId();
  if (!userId) return { error: "Você precisa estar logado." };

  const parsed = z
    .string()
    .trim()
    .min(2, "Informe seu nome")
    .max(80, "Nome muito longo")
    .safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data } });
  revalidatePath("/", "layout");
  return { ok: "Nome atualizado." };
}
