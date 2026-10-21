"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { IGNORE_COOKIE } from "@/lib/tracking";

/** Liga/desliga a contagem das visitas deste aparelho (para testar sem sujar os números). */
export async function toggleIgnoreDevice() {
  if (!isAuthenticated()) return;
  if (cookies().get(IGNORE_COOKIE)) {
    cookies().delete(IGNORE_COOKIE);
  } else {
    cookies().set(IGNORE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  revalidatePath("/admin/acessos");
}
