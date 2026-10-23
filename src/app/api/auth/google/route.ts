import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  googleClientId,
  googleConfigured,
  googleRedirectUri,
  siteOrigin,
} from "@/lib/google";

export const dynamic = "force-dynamic";

/** Inicia o login: manda a pessoa para a tela de consentimento do Google. */
export function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${siteOrigin()}/entrar?erro=google`);
  }

  const state = crypto.randomBytes(24).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return res;
}
