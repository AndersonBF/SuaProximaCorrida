"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { raceSchema } from "@/lib/validators";
import { slugify } from "@/lib/format";
import {
  checkPassword,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  loginLockedFor,
  registerLoginFailure,
  clearLoginFailures,
} from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

export async function login(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0].trim() ||
    headers().get("x-real-ip") ||
    "local";
  const locked = loginLockedFor(ip);
  if (locked) {
    return { error: `Muitas tentativas. Tente de novo em ${locked} min.` };
  }
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    registerLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 800)); // atrasa tentativas em sequência
    return { error: "Senha incorreta." };
  }
  clearLoginFailures(ip);
  setSessionCookie();
  redirect("/admin");
}

export async function logout() {
  clearSessionCookie();
  redirect("/admin/login");
}

async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name) || "corrida";
  let slug = base;
  let i = 1;
  while (true) {
    const existing = await prisma.race.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
}

function parse(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = raceSchema.safeParse(raw);
  return parsed;
}

function toData(input: ReturnType<typeof raceSchema.parse>) {
  return {
    name: input.name,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    date: new Date(input.date),
    endDate: input.endDate ? new Date(input.endDate) : null,
    state: input.state.toUpperCase(),
    city: input.city,
    location: input.location ?? null,
    distances: input.distances,
    priceFrom: input.priceFrom ?? null,
    priceTo: input.priceTo ?? null,
    organizer: input.organizer ?? null,
    registrationUrl: input.registrationUrl,
    source: input.source || "Manual",
    sourceUrl: input.sourceUrl ?? null,
    status: input.status,
    featured: input.featured,
  };
}

export async function createRace(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isAuthenticated()) return { error: "Não autenticado." };
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(" · ") };
  }
  const data = toData(parsed.data);
  const slug = await uniqueSlug(data.name);
  await prisma.race.create({ data: { ...data, slug } });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateRace(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isAuthenticated()) return { error: "Não autenticado." };
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(" · ") };
  }
  const data = toData(parsed.data);
  const slug = await uniqueSlug(data.name, id);
  await prisma.race.update({ where: { id }, data: { ...data, slug } });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteRace(formData: FormData) {
  if (!isAuthenticated()) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.race.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
}
