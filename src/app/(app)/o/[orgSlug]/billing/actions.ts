"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { organisations, users } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { audit } from "@/lib/audit";
import {
  checkDowngrade,
  isDowngrade,
  PaymentsNotConfiguredError,
  startSubscriptionCheckout,
} from "@/lib/billing";
import { appBaseUrl } from "@/lib/url";

const schema = z.object({
  tier: z.enum(["free", "starter", "professional", "enterprise"]),
  interval: z.enum(["monthly", "annual"]),
});

// Real payment collection: paid tiers go through a Paystack checkout with
// Engagd's platform key; only the server-side verify applies the change.
// Free downgrades apply immediately. Enterprise is sales-led.
export async function changePlan(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "owner");

  const parsed = schema.safeParse({
    tier: formData.get("tier"),
    interval: formData.get("interval"),
  });
  if (!parsed.success) redirect(`/o/${orgSlug}/billing?error=invalid-plan`);

  const { tier, interval } = parsed.data;

  if (tier === "enterprise") {
    redirect(`/o/${orgSlug}/billing?error=enterprise-contact`);
  }

  const from = {
    tier: ctx.organisation.planTier,
    interval: ctx.organisation.billingInterval,
  };
  if (from.tier === tier && from.interval === interval) {
    redirect(`/o/${orgSlug}/billing?ok=unchanged`);
  }

  // Guard downgrades: current usage must fit inside the target tier.
  if (isDowngrade(from.tier, tier)) {
    const check = await checkDowngrade(ctx.organisationId, tier);
    if (!check.ok) {
      redirect(
        `/o/${orgSlug}/billing?error=downgrade-blocked&detail=${encodeURIComponent(check.problems.join(" "))}`
      );
    }
  }

  // Downgrade to free needs no payment: apply immediately, audited.
  if (tier === "free") {
    await db
      .update(organisations)
      .set({
        planTier: "free",
        billingInterval: interval,
        billingStatus: "active",
      })
      .where(eq(organisations.id, ctx.organisationId));
    await audit({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      action: "billing.plan_changed",
      entityType: "organisation",
      entityId: ctx.organisationId,
      detail: { from, to: { tier, interval }, via: "free_downgrade" },
    });
    revalidatePath(`/o/${orgSlug}/billing`);
    redirect(`/o/${orgSlug}/billing?ok=plan-changed`);
  }

  // Paid tier: start a checkout and send the owner to Paystack.
  const [owner] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, ctx.userId));
  if (!owner?.email) redirect(`/o/${orgSlug}/billing?error=invalid-plan`);

  let authorizationUrl: string;
  try {
    const checkout = await startSubscriptionCheckout(
      ctx.organisationId,
      tier,
      interval,
      owner.email,
      appBaseUrl()
    );
    authorizationUrl = checkout.authorizationUrl;
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) {
      if (process.env.NODE_ENV !== "production") {
        // Local dev without a platform key: keep the audited direct switch
        // so the rest of the product remains testable.
        await db
          .update(organisations)
          .set({
            planTier: tier,
            billingInterval: interval,
            billingStatus: "active",
          })
          .where(eq(organisations.id, ctx.organisationId));
        await audit({
          organisationId: ctx.organisationId,
          userId: ctx.userId,
          action: "billing.plan_changed",
          entityType: "organisation",
          entityId: ctx.organisationId,
          detail: {
            from,
            to: { tier, interval },
            via: "dev_direct_switch_no_platform_key",
          },
        });
        revalidatePath(`/o/${orgSlug}/billing`);
        redirect(`/o/${orgSlug}/billing?ok=plan-changed`);
      }
      redirect(`/o/${orgSlug}/billing?error=payments-not-configured`);
    }
    throw err;
  }

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "billing.checkout_started",
    entityType: "organisation",
    entityId: ctx.organisationId,
    detail: { from, to: { tier, interval } },
  });

  redirect(authorizationUrl);
}
