import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildOutboundUrl } from "@/lib/outbound";

/**
 * Redirecionador de saída: /ir/[id]
 * Registra o clique (contador na corrida) e redireciona para o site oficial
 * de inscrição com UTM/afiliado.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const race = await prisma.race.findUnique({
    where: { id: params.id },
    select: { registrationUrl: true },
  });

  if (!race) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // conta o clique (não derruba o redirect se falhar)
  try {
    await prisma.race.update({
      where: { id: params.id },
      data: { clicks: { increment: 1 } },
    });
  } catch {
    /* ignore */
  }

  return NextResponse.redirect(buildOutboundUrl(race.registrationUrl), 302);
}
