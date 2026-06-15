import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd 'de' MMM 'de' yyyy", { locale: ptBR });
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatPrice(value?: number | null): string {
  if (value === null || value === undefined) return "Sob consulta";
  if (value === 0) return "Gratuito";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPriceRange(
  from?: number | null,
  to?: number | null
): string {
  if (from === null || from === undefined) return "Sob consulta";
  if (to && to !== from) {
    return `${formatPrice(from)} a ${formatPrice(to)}`;
  }
  if (from === 0) return "Gratuito";
  return `A partir de ${formatPrice(from)}`;
}

/** Versão curta para cards: "Grátis", "R$ 89", "—". */
export function formatPriceShort(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "Grátis";
  return `R$ ${Math.round(value)}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
