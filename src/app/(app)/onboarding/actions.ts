"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { memberships, organisations } from "@/db/schema";
import { audit } from "@/lib/audit";
import { randomSuffix, slugify } from "@/lib/slug";

const schema = z.object({
  name: z.string().trim().min(2, "too-short").max(80, "too-long"),
});

export async function createOrganisation(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect(`/onboarding?error=${parsed.error.issues[0].message}`);
  }
  const name = parsed.data.name;

  let slug = slugify(name);
  if (!slug) slug = `org-${randomSuffix()}`;
  const [taken] = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(eq(organisations.slug, slug));
  if (taken) slug = `${slug}-${randomSuffix()}`;

  const [org] = await db
    .insert(organisations)
    .values({ name, slug })
    .returning();
  await db.insert(memberships).values({
    organisationId: org.id,
    userId,
    role: "owner",
  });
  await audit({
    organisationId: org.id,
    userId,
    action: "organisation.created",
    entityType: "organisation",
    entityId: org.id,
    detail: { name, slug },
  });

  redirect(`/o/${org.slug}`);
}
