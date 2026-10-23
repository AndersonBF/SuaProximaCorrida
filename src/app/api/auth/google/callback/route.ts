import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { setUserSession } from "@/lib/auth";
import { sendEmail, welcomeEmail } from "@/lib/email";
import {
  GOOGLE_STATE_COOKIE,
  fetchGoogleProfile,
  googleConfigured,
  siteOrigin,
} from "@/lib/google";

export const dynamic = "force-dynamic";

/** Volta do Google: valida, acha ou cria a conta e abre a sessão. */
export async function GET(req: NextRequest) {
  const origin = siteOrigin();
  const fail = () => {
    const res = NextResponse.redirect(`${origin}/entrar?erro=google`);
    res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
    return res;
  };

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expected = cookies().get(GOOGLE_STATE_COOKIE)?.value;

  if (!googleConfigured() || !code || !state || !expected || state !== expected) {
    return fail();
  }

  const profile = await fetchGoogleProfile(code);
  // só confia no e-mail se o Google o verificou (evita tomar contas alheias)
  if (!profile || !profile.emailVerified) return fail();

  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      // já tinha conta com esse e-mail: liga o Google a ela
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: profile.sub },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
        },
      });
      await sendEmail({ to: user.email, ...welcomeEmail(user.name ?? "") });
    }
  }

  setUserSession(user.id);
  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
  return res;
}
