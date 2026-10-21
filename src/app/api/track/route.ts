import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { IGNORE_COOKIE } from "@/lib/tracking";

/**
 * Coleta de acessos: /api/track
 * - { path, referrer } → registra uma visualização e devolve o id
 * - { id }             → heartbeat: mantém a visita "online" (atualiza lastSeenAt)
 * Ignora robôs, as páginas /admin e as visitas do próprio admin logado.
 */

const VISITOR_COOKIE = "spc_vid";
const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|curl|wget|python|axios/i;

function deviceFrom(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Localização aproximada (cidade) que a Vercel informa no cabeçalho; vazio no localhost. */
function geoFrom(req: Request) {
  const read = (name: string) => {
    const v = req.headers.get(name);
    if (!v) return null;
    try {
      return decodeURIComponent(v).slice(0, 80);
    } catch {
      return v.slice(0, 80);
    }
  };
  return {
    country: read("x-vercel-ip-country"),
    region: read("x-vercel-ip-country-region"),
    city: read("x-vercel-ip-city"),
  };
}

/** Reduz o referrer ao domínio; descarta quando vem do próprio site. */
function referrerHost(ref: unknown, ownHost: string | null): string | null {
  if (typeof ref !== "string" || !ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (ownHost && host === ownHost.replace(/^www\./, "").split(":")[0]) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT_RE.test(ua) || isAuthenticated() || cookies().get(IGNORE_COOKIE)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: { id?: unknown; path?: unknown; referrer?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // heartbeat
  if (typeof body.id === "string") {
    try {
      await prisma.pageView.update({
        where: { id: body.id },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      /* visita não existe mais — ignora */
    }
    return new NextResponse(null, { status: 204 });
  }

  if (typeof body.path !== "string" || !body.path.startsWith("/")) {
    return new NextResponse(null, { status: 400 });
  }
  const path = body.path.split("?")[0].slice(0, 300);
  if (path.startsWith("/admin")) return new NextResponse(null, { status: 204 });

  let visitorId = cookies().get(VISITOR_COOKIE)?.value;
  const isNew = !visitorId;
  if (!visitorId) visitorId = crypto.randomUUID();

  const view = await prisma.pageView.create({
    data: {
      visitorId,
      path,
      referrer: referrerHost(body.referrer, req.headers.get("host")),
      device: deviceFrom(ua),
      isNew,
      ...geoFrom(req),
    },
    select: { id: true },
  });

  const res = NextResponse.json({ id: view.id });
  if (isNew) {
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 ano
    });
  }
  return res;
}
