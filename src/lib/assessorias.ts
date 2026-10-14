import { z } from "zod";
import { prisma } from "./prisma";
import { slugify } from "./format";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Texto muito longo (máx. ${max} caracteres)`)
    .optional()
    .transform((v) => (v ? v : undefined));

/** "@fulano", "instagram.com/fulano" ou URL completa -> URL do perfil. */
function normalizeInstagram(raw?: string): string | undefined {
  if (!raw) return undefined;
  const handle = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(handle)
    ? `https://www.instagram.com/${handle}`
    : undefined;
}

/** Mantém só dígitos; assume Brasil (55) quando vier sem DDI. */
function normalizeWhatsapp(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
}

function normalizeWebsite(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim();
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes(".") ? u.href : undefined;
  } catch {
    return undefined;
  }
}

export const assessoriaSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da assessoria").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(60),
  state: z
    .string()
    .trim()
    .length(2, "Use a sigla do estado (ex: PR)")
    .transform((v) => v.toUpperCase()),
  description: optional(500),
  trainingInfo: optional(300),
  instagram: optional(120).transform(normalizeInstagram),
  whatsapp: optional(30).transform(normalizeWhatsapp),
  website: optional(200).transform(normalizeWebsite),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail de contato inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type AssessoriaInput = z.infer<typeof assessoriaSchema>;

export async function uniqueAssessoriaSlug(name: string, city: string) {
  const base = slugify(`${name} ${city}`) || "assessoria";
  let slug = base;
  let i = 1;
  while (await prisma.assessoria.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}
