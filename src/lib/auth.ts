import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const COOKIE_NAME = "corra_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias
const isProd = process.env.NODE_ENV === "production";

/**
 * Lê um segredo do ambiente. Em produção não há valor padrão: sem a variável
 * (ou com algo curto demais), o login do admin fica bloqueado em vez de
 * aceitar uma senha conhecida como "admin123".
 */
function requiredSecret(name: string, devFallback: string): string | null {
  const value = process.env[name];
  if (value && value.length >= 16) return value;
  if (!isProd) return value || devFallback;
  console.error(`[auth] ${name} ausente ou com menos de 16 caracteres — login do admin desativado.`);
  return null;
}

function sessionSecret(): string {
  // sem segredo em produção: chave aleatória por processo, nenhum cookie vale
  return requiredSecret("ADMIN_SESSION_SECRET", "dev-secret-troque-isto") ?? RANDOM_KEY;
}
const RANDOM_KEY = crypto.randomBytes(32).toString("hex");

function sign(value: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

/** Compara strings em tempo constante (não vaza tamanho nem conteúdo). */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
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
  if (!safeEqual(sign(payload), signature)) return false;
  const [, expiresStr] = payload.split(":");
  const expires = Number(expiresStr);
  return Number.isFinite(expires) && expires > Date.now();
}

export function checkPassword(password: string): boolean {
  const expected = requiredSecret("ADMIN_PASSWORD", "admin123");
  if (!expected || !password) return false;
  return safeEqual(password, expected);
}

/* Limite de tentativas de login do admin (por IP, em memória). */
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 min
const attempts = new Map<string, { count: number; first: number }>();

/** Minutos restantes de bloqueio para o IP, ou 0 se pode tentar. */
export function loginLockedFor(ip: string): number {
  const a = attempts.get(ip);
  if (!a) return 0;
  const left = a.first + LOCK_MS - Date.now();
  if (left <= 0) {
    attempts.delete(ip);
    return 0;
  }
  return a.count >= MAX_ATTEMPTS ? Math.ceil(left / 60000) : 0;
}

export function registerLoginFailure(ip: string) {
  const a = attempts.get(ip);
  if (!a || a.first + LOCK_MS < Date.now()) attempts.set(ip, { count: 1, first: Date.now() });
  else a.count++;
}

export function clearLoginFailures(ip: string) {
  attempts.delete(ip);
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
  if (!safeEqual(sign(payload), token.slice(idx + 1))) return null;
  const [userId, expiresStr] = payload.split(":");
  if (!(Number(expiresStr) > Date.now())) return null;
  return userId || null;
}
