"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { paymentProviderConfigs } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { encryptSecret } from "@/lib/crypto";
import { audit } from "@/lib/audit";

function back(orgSlug: string, param: string): never {
  redirect(`/o/${orgSlug}/settings/payments?${param}`);
}

const saveSchema = z.object({
  provider: z.literal("yoco"),
  publicKey: z
    .string()
    .trim()
    .regex(/^pk_(live|test)_/, "invalid public key"),
  secretKey: z
    .string()
    .trim()
    .regex(/^sk_(live|test)_/, "invalid secret key"),
});

export async function savePaymentConfig(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const ent = await getEntitlements(ctx.organisationId);
  if (!ent.paidTicketing) back(orgSlug, "error=paid-locked");

  const parsed = saveSchema.safeParse({
    provider: formData.get("provider"),
    publicKey: formData.get("publicKey"),
    secretKey: formData.get("secretKey"),
  });
  if (!parsed.success) back(orgSlug, "error=invalid-keys");

  // The secret is encrypted immediately and only the ciphertext is stored.
  // It is never echoed back to any client.
  const encryptedSecret = encryptSecret(parsed.data.secretKey);

  const [existing] = await db
    .select({ id: paymentProviderConfigs.id })
    .from(paymentProviderConfigs)
    .where(
      and(
        eq(paymentProviderConfigs.organisationId, ctx.organisationId),
        isNull(paymentProviderConfigs.eventId)
      )
    )
    .limit(1);

  let configId: string;
  if (existing) {
    await db
      .update(paymentProviderConfigs)
      .set({
        provider: parsed.data.provider,
        publicKey: parsed.data.publicKey,
        encryptedSecret,
      })
      .where(eq(paymentProviderConfigs.id, existing.id));
    configId = existing.id;
  } else {
    const [row] = await db
      .insert(paymentProviderConfigs)
      .values({
        organisationId: ctx.organisationId,
        eventId: null,
        provider: parsed.data.provider,
        publicKey: parsed.data.publicKey,
        encryptedSecret,
      })
      .returning({ id: paymentProviderConfigs.id });
    configId = row.id;
  }

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "payment_config.updated",
    entityType: "payment_provider_config",
    entityId: configId,
    detail: {
      provider: parsed.data.provider,
      publicKey: parsed.data.publicKey,
      replaced: Boolean(existing),
    },
  });

  revalidatePath(`/o/${orgSlug}/settings/payments`);
  back(orgSlug, "ok=saved");
}

export async function removePaymentConfig(orgSlug: string) {
  const ctx = await requireOrg(orgSlug, "admin");

  const ent = await getEntitlements(ctx.organisationId);
  if (!ent.paidTicketing) back(orgSlug, "error=paid-locked");

  const [existing] = await db
    .select({
      id: paymentProviderConfigs.id,
      provider: paymentProviderConfigs.provider,
    })
    .from(paymentProviderConfigs)
    .where(
      and(
        eq(paymentProviderConfigs.organisationId, ctx.organisationId),
        isNull(paymentProviderConfigs.eventId)
      )
    )
    .limit(1);
  if (!existing) back(orgSlug, "error=not-configured");

  await db
    .delete(paymentProviderConfigs)
    .where(eq(paymentProviderConfigs.id, existing.id));

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "payment_config.removed",
    entityType: "payment_provider_config",
    entityId: existing.id,
    detail: { provider: existing.provider },
  });

  revalidatePath(`/o/${orgSlug}/settings/payments`);
  back(orgSlug, "ok=removed");
}
