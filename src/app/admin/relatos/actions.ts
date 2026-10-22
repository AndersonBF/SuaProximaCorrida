"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function setReportResolved(formData: FormData) {
  if (!isAuthenticated()) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.raceReport.update({
    where: { id },
    data: { resolved: formData.get("resolved") === "1" },
  });
  revalidatePath("/admin/relatos");
}

export async function deleteReport(formData: FormData) {
  if (!isAuthenticated()) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.raceReport.delete({ where: { id } });
  revalidatePath("/admin/relatos");
}
