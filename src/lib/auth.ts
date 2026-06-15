import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const COOKIE_NAME = "corra_admin";
const SECRET = process.env.ADMIN_SESSION_SECRET || "dev-secret-troque-isto";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

/** Cria um token assinado (valor.assinatura) válido por MAX_AGE. */
export function createSessionToken(): string {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = `admin:${expires}`;
  return `${payload}.${sign(payload)}`;
}

/** Verifica se um token é válido e não expirou. */
export function verifySessionToken(token?: string | null): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return false;
  const payload = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  if (sign(payload) !== signature) return false;
  const [, expiresStr] = payload.split(":");
  const expires = Number(expiresStr);
  return Number.isFinite(expires) && expires > Date.now();
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  // comparação em tempo constante
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function setSessionCookie() {
  cookies().set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function isAuthenticated(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/** Use no topo de páginas admin protegidas. Redireciona para o login se não autenticado. */
export function requireAuth() {
  if (!isAuthenticated()) redirect("/admin/login");
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

/* ----------------------------------------------------------------------------
 * Autenticação de USUÁRIO (cadastro/login de visitantes)
 * -------------------------------------------------------------------------- */

const USER_COOKIE = "corra_user";

/** Gera hash de senha com scrypt (salt:hash), sem dependências externas. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const test = crypto.scryptSync(password, salt, 64);
  return hashBuf.length === test.length && crypto.timingSafeEqual(hashBuf, test);
}

export function setUserSession(userId: string) {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = `${userId}:${expires}`;
  cookies().set(USER_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearUserSession() {
  cookies().delete(USER_COOKIE);
}

/** Lê o cookie de usuário e devolve o id, se a sessão for válida. */
export function getUserId(): string | null {
  const token = cookies().get(USER_COOKIE)?.value;
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  if (sign(payload) !== token.slice(idx + 1)) return null;
  const [userId, expiresStr] = payload.split(":");
  if (!(Number(expiresStr) > Date.now())) return null;
  return userId || null;
}
