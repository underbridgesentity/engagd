"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { organisations } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { audit } from "@/lib/audit";

const schema = z.object({
  tier: z.enum(["free", "starter", "professional", "enterprise"]),
  interval: z.enum(["monthly", "annual"]),
});

// Payment collection is stubbed for now: changing plan updates the org
// directly. When the payment provider lands, this becomes a checkout flow.
export async function changePlan(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "owner");

  const parsed = schema.safeParse({
    tier: formData.get("tier"),
    interval: formData.get("interval"),
  });
  if (!parsed.success) redirect(`/o/${orgSlug}/billing?error=invalid-plan`);

  if (parsed.data.tier === "enterprise") {
    redirect(`/o/${orgSlug}/billing?error=enterprise-contact`);
  }

  const from = {
    tier: ctx.organisation.planTier,
    interval: ctx.organisation.billingInterval,
  };
  if (from.tier === parsed.data.tier && from.interval === parsed.data.interval) {
    redirect(`/o/${orgSlug}/billing?ok=unchanged`);
  }

  await db
    .update(organisations)
    .set({
      planTier: parsed.data.tier,
      billingInterval: parsed.data.interval,
    })
    .where(eq(organisations.id, ctx.organisationId));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "billing.plan_changed",
    entityType: "organisation",
    entityId: ctx.organisationId,
    detail: { from, to: parsed.data },
  });

  revalidatePath(`/o/${orgSlug}/billing`);
  redirect(`/o/${orgSlug}/billing?ok=plan-changed`);
}
