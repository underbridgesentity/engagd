"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

const emailSchema = z.object({ email: z.string().email() });

export async function signInWithEmail(formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    redirect("/login?error=invalid-email");
  }
  await signIn("resend", {
    email: parsed.data.email,
    redirectTo: "/home",
  });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/home" });
}
