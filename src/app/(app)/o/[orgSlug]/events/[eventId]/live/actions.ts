"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { audienceQuestions, pollOptions, polls } from "@/db/schema";
import { eventChannel, realtime, RT } from "@/lib/realtime";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

export type LiveActionState = { error?: string; ok?: boolean };

const createPollSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300),
  options: z
    .array(z.string().trim().min(1).max(200))
    .min(2, "Add at least two options")
    .max(20, "Keep it to 20 options or fewer"),
  allowMultiple: z.boolean(),
});

function livePath(orgSlug: string, eventId: string) {
  return `/o/${orgSlug}/events/${eventId}/live`;
}

async function publishPoll(eventId: string) {
  await realtime().publish(eventChannel(eventId), RT.pollUpdated, {});
}

async function publishQuestion(eventId: string) {
  await realtime().publish(eventChannel(eventId), RT.questionUpdated, {});
}

export async function createPoll(
  orgSlug: string,
  eventId: string,
  _prev: LiveActionState,
  formData: FormData
): Promise<LiveActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const parsed = createPollSchema.safeParse({
    question: formData.get("question"),
    options: String(formData.get("options") ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean),
    allowMultiple: formData.get("allowMultiple") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [poll] = await db
    .insert(polls)
    .values({
      eventId: event.id,
      question: parsed.data.question,
      allowMultiple: parsed.data.allowMultiple,
    })
    .returning({ id: polls.id });
  await db.insert(pollOptions).values(
    parsed.data.options.map((label, i) => ({
      pollId: poll.id,
      label,
      sortOrder: i,
    }))
  );

  await publishPoll(event.id);
  revalidatePath(livePath(orgSlug, eventId));
  return { ok: true };
}

export async function setPollStatus(
  orgSlug: string,
  eventId: string,
  pollId: string,
  status: "open" | "closed"
): Promise<LiveActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  if (status === "open") {
    // One poll on stage at a time: opening a poll closes any other open poll.
    await db
      .update(polls)
      .set({ status: "closed" })
      .where(
        and(
          eq(polls.eventId, event.id),
          eq(polls.status, "open"),
          ne(polls.id, pollId)
        )
      );
  }
  await db
    .update(polls)
    .set({ status })
    .where(and(eq(polls.id, pollId), eq(polls.eventId, event.id)));

  await publishPoll(event.id);
  revalidatePath(livePath(orgSlug, eventId));
  return { ok: true };
}

export async function deletePoll(
  orgSlug: string,
  eventId: string,
  pollId: string
): Promise<LiveActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  await db
    .delete(polls)
    .where(and(eq(polls.id, pollId), eq(polls.eventId, event.id)));

  await publishPoll(event.id);
  revalidatePath(livePath(orgSlug, eventId));
  return { ok: true };
}

const MODERATION_STATUSES = [
  "pending",
  "approved",
  "answered",
  "dismissed",
] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export async function setQuestionStatus(
  orgSlug: string,
  eventId: string,
  questionId: string,
  status: ModerationStatus
): Promise<LiveActionState> {
  if (!MODERATION_STATUSES.includes(status)) return { error: "Invalid status" };
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  await db
    .update(audienceQuestions)
    .set({ status })
    .where(
      and(
        eq(audienceQuestions.id, questionId),
        eq(audienceQuestions.eventId, event.id)
      )
    );

  await publishQuestion(event.id);
  revalidatePath(livePath(orgSlug, eventId));
  return { ok: true };
}

export async function deleteQuestions(
  orgSlug: string,
  eventId: string,
  questionIds: string[]
): Promise<LiveActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  if (questionIds.length === 0) return { ok: true };

  await db
    .delete(audienceQuestions)
    .where(
      and(
        eq(audienceQuestions.eventId, event.id),
        inArray(audienceQuestions.id, questionIds)
      )
    );

  await publishQuestion(event.id);
  revalidatePath(livePath(orgSlug, eventId));
  return { ok: true };
}
