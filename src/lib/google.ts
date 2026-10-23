import { headers } from "next/headers";

export const GOOGLE_STATE_COOKIE = "corra_google_state";

export const googleClientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const googleClientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? "";

export const googleConfigured = () => !!googleClientId() && !!googleClientSecret();

/** Origem do site (atrás do proxy do Vercel o host vem em x-forwarded-host). */
export function siteOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/** URL de retorno cadastrada no Google Cloud Console. */
export const googleRedirectUri = () => `${siteOrigin()}/api/auth/google/callback`;

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/** Troca o código recebido do Google pelos dados básicos do perfil. */
export async function fetchGoogleProfile(code: string): Promise<GoogleProfile | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!info.sub || !info.email) return null;
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified === true,
    name: info.name?.trim() || null,
  };
}
