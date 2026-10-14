"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

function refresh() {
  revalidatePath("/admin/assessorias");
  revalidatePath("/assessorias");
}

export async function setAssessoriaStatus(formData: FormData) {
  if (!isAuthenticated()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["PENDING", "APPROVED", "REJECTED"].includes(status)) return;
  await prisma.assessoria.update({
    where: { id },
    data: { status: status as "PENDING" | "APPROVED" | "REJECTED" },
  });
  refresh();
}

export async function deleteAssessoria(formData: FormData) {
  if (!isAuthenticated()) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.assessoria.delete({ where: { id } });
  refresh();
}
