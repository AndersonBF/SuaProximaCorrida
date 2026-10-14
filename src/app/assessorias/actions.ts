"use server";

import { prisma } from "@/lib/prisma";
import { assessoriaSchema, uniqueAssessoriaSlug } from "@/lib/assessorias";

export type AssessoriaState = { error?: string; ok?: string } | undefined;

/**
 * Pedido de cadastro de assessoria. Entra como PENDING e só aparece no site
 * depois que o admin aprovar.
 */
export async function submitAssessoria(
  _prev: AssessoriaState,
  formData: FormData
): Promise<AssessoriaState> {
  // campo-isca: bots preenchem, pessoas não veem
  if (String(formData.get("website_url_check") ?? "").trim() !== "") {
    return { ok: "Recebemos o cadastro. Vamos analisar e publicar em breve." };
  }

  const parsed = assessoriaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  if (!data.instagram && !data.whatsapp && !data.website) {
    return {
      error: "Informe ao menos um contato: Instagram, WhatsApp ou site.",
    };
  }

  // evita duplicata óbvia (mesmo nome e cidade) aguardando ou já publicada
  const dup = await prisma.assessoria.findFirst({
    where: {
      name: { equals: data.name, mode: "insensitive" },
      city: { equals: data.city, mode: "insensitive" },
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (dup) {
    return { ok: "Essa assessoria já está cadastrada. Obrigado!" };
  }

  await prisma.assessoria.create({
    data: {
      ...data,
      slug: await uniqueAssessoriaSlug(data.name, data.city),
      status: "PENDING",
    },
  });

  return {
    ok: "Cadastro enviado! Vamos analisar e publicar em breve.",
  };
}
