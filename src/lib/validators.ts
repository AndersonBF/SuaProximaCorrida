import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  });

export const raceSchema = z.object({
  name: z.string().trim().min(3, "Nome muito curto"),
  description: optionalString,
  imageUrl: optionalString,
  date: z.string().min(1, "Data obrigatória"),
  endDate: optionalString,
  state: z.string().trim().min(2, "UF obrigatória").max(2, "Use a sigla (ex: SP)"),
  city: z.string().trim().min(2, "Cidade obrigatória"),
  location: optionalString,
  distances: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean)
    ),
  priceFrom: optionalNumber,
  priceTo: optionalNumber,
  organizer: optionalString,
  surface: z
    .enum(["ASFALTO", "TRAIL", "PISTA", "MISTO"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  level: z
    .enum(["INICIANTE", "INTERMEDIARIO", "AVANCADO"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  kitInfo: optionalString,
  routeUrl: optionalString,
  elevationGain: optionalNumber,
  lots: z.string().optional(),
  registrationUrl: z.string().trim().url("Link de inscrição inválido"),
  source: z.string().trim().default("Manual"),
  sourceUrl: optionalString,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  featured: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "on"),
});

export type RaceInput = z.infer<typeof raceSchema>;
