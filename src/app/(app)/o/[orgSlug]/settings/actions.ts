"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { organisations, replyToVerifications } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { appBaseUrl as baseUrl } from "@/lib/url";

function back(orgSlug: string, param: string): never {
  redirect(`/o/${orgSlug}/settings?${param}`);
}

async function sendVerificationEmail(email: string, token: string, orgName: string) {
  const link = `${baseUrl()}/api/verify-reply-to?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: `Confirm reply-to address for ${orgName} on Engagd`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Confirm this reply-to address</h2>
        <p>${orgName} wants to use this address as the reply-to on event emails sent through Engagd.</p>
        <p><a href="${link}" style="display:inline-block;background:#5b8cff;color:#0b0e14;padding:10px 18px;border-radius:8px;text-decoration:none;">Confirm address</a></p>
        <p style="color:#667089;font-size:12px;">If you did not expect this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function renameOrganisation(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const parsed = z
    .object({ name: z.string().trim().min(2).max(80) })
    .safeParse({ name: formData.get("name") });
  if (!parsed.success) back(orgSlug, "error=invalid-name");

  const previous = ctx.organisation.name;
  if (previous === parsed.data.name) back(orgSlug, "ok=unchanged");

  await db
    .update(organisations)
    .set({ name: parsed.data.name })
    .where(eq(organisations.id, ctx.organisationId));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "organisation.renamed",
    entityType: "organisation",
    entityId: ctx.organisationId,
    detail: { from: previous, to: parsed.data.name },
  });

  revalidatePath(`/o/${orgSlug}`, "layout");
  back(orgSlug, "ok=renamed");
}

export async function addReplyTo(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const ent = await getEntitlements(ctx.organisationId);
  if (!ent.replyToVerification) back(orgSlug, "error=reply-to-locked");

  const parsed = z
    .object({ email: z.string().email() })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) back(orgSlug, "error=invalid-email");
  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: replyToVerifications.id })
    .from(replyToVerifications)
    .where(
      and(
        eq(replyToVerifications.organisationId, ctx.organisationId),
        eq(replyToVerifications.email, email)
      )
    );
  if (existing) back(orgSlug, "error=already-added");

  const [row] = await db
    .insert(replyToVerifications)
    .values({ organisationId: ctx.organisationId, email })
    .returning();

  try {
    await sendVerificationEmail(email, row.token, ctx.organisation.name);
  } catch {
    back(orgSlug, "error=email-failed");
  }

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "reply_to.added",
    entityType: "reply_to_verification",
    entityId: row.id,
    detail: { email },
  });

  revalidatePath(`/o/${orgSlug}/settings`);
  back(orgSlug, "ok=verification-sent");
}

export async function resendReplyTo(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const parsed = z
    .object({ id: z.string().min(1) })
    .safeParse({ id: formData.get("id") });
  if (!parsed.success) back(orgSlug, "error=not-found");

  const [row] = await db
    .select()
    .from(replyToVerifications)
    .where(
      and(
        eq(replyToVerifications.id, parsed.data.id),
        eq(replyToVerifications.organisationId, ctx.organisationId)
      )
    );
  if (!row) back(orgSlug, "error=not-found");
  if (row.verifiedAt) back(orgSlug, "ok=already-verified");

  try {
    await sendVerificationEmail(row.email, row.token, ctx.organisation.name);
  } catch {
    back(orgSlug, "error=email-failed");
  }

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "reply_to.verification_resent",
    entityType: "reply_to_verification",
    entityId: row.id,
    detail: { email: row.email },
  });

  back(orgSlug, "ok=verification-sent");
}

export async function removeReplyTo(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const parsed = z
    .object({ id: z.string().min(1) })
    .safeParse({ id: formData.get("id") });
  if (!parsed.success) back(orgSlug, "error=not-found");

  const [row] = await db
    .select()
    .from(replyToVerifications)
    .where(
      and(
        eq(replyToVerifications.id, parsed.data.id),
        eq(replyToVerifications.organisationId, ctx.organisationId)
      )
    );
  if (!row) back(orgSlug, "error=not-found");

  await db
    .delete(replyToVerifications)
    .where(eq(replyToVerifications.id, row.id));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "reply_to.removed",
    entityType: "reply_to_verification",
    entityId: row.id,
    detail: { email: row.email },
  });

  revalidatePath(`/o/${orgSlug}/settings`);
  back(orgSlug, "ok=reply-to-removed");
}
