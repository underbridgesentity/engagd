"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { emailCampaigns } from "@/db/schema";
import { audit } from "@/lib/audit";
import { enqueueCampaignSend } from "@/lib/jobs";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

const composeSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(300),
  intro: z.string().trim().min(1, "Write a short message for your guests").max(10000),
  audience: z.enum(["all", "non_responders", "attending", "maybe", "waitlisted"]),
  sendMode: z.enum(["now", "schedule"]),
  scheduledAt: z.string().optional().default(""),
});

export type ComposeState = { error?: string; ok?: boolean };

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function createCampaign(
  orgSlug: string,
  eventId: string,
  _prev: ComposeState,
  formData: FormData
): Promise<ComposeState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const parsed = composeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  let scheduledFor: Date | null = null;
  if (data.sendMode === "schedule") {
    if (!data.scheduledAt) return { error: "Pick a date and time to schedule the send" };
    scheduledFor = new Date(data.scheduledAt);
    if (isNaN(scheduledFor.getTime())) return { error: "Invalid schedule time" };
    if (scheduledFor.getTime() < Date.now()) return { error: "The scheduled time is in the past" };
  }

  // Body is stored as simple paragraphs. The personal RSVP link and the
  // tracking pixel are appended per recipient at send time.
  const bodyHtml = data.intro
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px 0;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("\n");

  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      organisationId: ctx.organisationId,
      eventId: event.id,
      name: data.subject,
      subject: data.subject,
      bodyHtml,
      audience: data.audience,
      status: "scheduled",
      scheduledFor,
      createdByUserId: ctx.userId,
    })
    .returning({ id: emailCampaigns.id });

  await enqueueCampaignSend(campaign.id, scheduledFor ?? undefined);

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: scheduledFor ? "campaign.scheduled" : "campaign.queued",
    entityType: "campaign",
    entityId: campaign.id,
    detail: { eventId: event.id, audience: data.audience, scheduledFor: scheduledFor?.toISOString() },
  });

  revalidatePath(`/o/${orgSlug}/events/${event.id}/invites`);
  return { ok: true };
}

export async function cancelCampaign(orgSlug: string, eventId: string, campaignId: string) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  // Only scheduled campaigns can be cancelled; the send handler re-checks
  // status before doing anything.
  await db
    .update(emailCampaigns)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(emailCampaigns.id, campaignId),
        eq(emailCampaigns.eventId, event.id),
        eq(emailCampaigns.organisationId, ctx.organisationId),
        eq(emailCampaigns.status, "scheduled")
      )
    );

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "campaign.cancelled",
    entityType: "campaign",
    entityId: campaignId,
    detail: { eventId: event.id },
  });

  revalidatePath(`/o/${orgSlug}/events/${event.id}/invites`);
}
