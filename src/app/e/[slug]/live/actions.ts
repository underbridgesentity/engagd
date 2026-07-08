"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { audienceQuestions, pollOptions, polls, pollVotes } from "@/db/schema";
import { getOrSetFingerprint } from "@/lib/fingerprint";
import { eventChannel, realtime, RT } from "@/lib/realtime";
import { getPublicEventBySlug } from "@/lib/rsvp";

// Accountless attendee actions. Scoped purely by event slug; only ACTIVE
// events accept writes. Votes are anonymous, deduped by the fingerprint
// cookie plus the unique index on (pollId, pollOptionId, voterFingerprint).

export type AttendeeActionState = { error?: string; ok?: boolean };

async function getActiveEvent(slug: string) {
  const event = await getPublicEventBySlug(slug);
  if (!event || event.status !== "active") return null;
  return event;
}

export async function submitVote(
  slug: string,
  pollId: string,
  _prev: AttendeeActionState,
  formData: FormData
): Promise<AttendeeActionState> {
  const event = await getActiveEvent(slug);
  if (!event) return { error: "This event is not live right now." };

  const [poll] = await db
    .select()
    .from(polls)
    .where(and(eq(polls.id, pollId), eq(polls.eventId, event.id)));
  if (!poll || poll.status !== "open") {
    return { error: "This poll is closed." };
  }

  const chosen = formData
    .getAll("option")
    .map(String)
    .filter(Boolean)
    .slice(0, 20);
  if (chosen.length === 0) return { error: "Pick an option first." };
  if (!poll.allowMultiple && chosen.length > 1) {
    return { error: "Pick just one option." };
  }

  // Only accept option IDs that belong to this poll.
  const validOptions = await db
    .select({ id: pollOptions.id })
    .from(pollOptions)
    .where(
      and(eq(pollOptions.pollId, poll.id), inArray(pollOptions.id, chosen))
    );
  if (validOptions.length !== chosen.length) {
    return { error: "Something went wrong. Refresh and try again." };
  }

  const fingerprint = await getOrSetFingerprint();

  if (!poll.allowMultiple) {
    // Single-choice: the unique index is per option, so guard against a
    // second vote on a different option explicitly.
    const [existing] = await db
      .select({ id: pollVotes.id })
      .from(pollVotes)
      .where(
        and(
          eq(pollVotes.pollId, poll.id),
          eq(pollVotes.voterFingerprint, fingerprint)
        )
      )
      .limit(1);
    if (existing) return { ok: true };
  }

  await db
    .insert(pollVotes)
    .values(
      validOptions.map((o) => ({
        pollId: poll.id,
        pollOptionId: o.id,
        voterFingerprint: fingerprint,
      }))
    )
    .onConflictDoNothing();

  await realtime().publish(eventChannel(event.id), RT.pollUpdated, {});
  revalidatePath(`/e/${slug}/live`);
  return { ok: true };
}

const questionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(3, "Type your question first")
    .max(500, "Keep it under 500 characters"),
  displayName: z
    .string()
    .trim()
    .max(80, "Keep your name under 80 characters")
    .optional(),
});

export async function submitQuestion(
  slug: string,
  _prev: AttendeeActionState,
  formData: FormData
): Promise<AttendeeActionState> {
  const event = await getActiveEvent(slug);
  if (!event) return { error: "This event is not live right now." };

  const parsed = questionSchema.safeParse({
    text: formData.get("text"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Ensure the fingerprint cookie exists so the device has a stable identity.
  await getOrSetFingerprint();

  await db.insert(audienceQuestions).values({
    eventId: event.id,
    text: parsed.data.text,
    displayName: parsed.data.displayName || null,
  });

  await realtime().publish(eventChannel(event.id), RT.questionUpdated, {});
  revalidatePath(`/e/${slug}/live`);
  return { ok: true };
}

export async function upvoteQuestion(
  slug: string,
  questionId: string
): Promise<AttendeeActionState> {
  const event = await getActiveEvent(slug);
  if (!event) return { error: "This event is not live right now." };

  // Client-side localStorage dedupe only; anonymous surface, best effort.
  await db
    .update(audienceQuestions)
    .set({ upvotes: sql`${audienceQuestions.upvotes} + 1` })
    .where(
      and(
        eq(audienceQuestions.id, questionId),
        eq(audienceQuestions.eventId, event.id),
        inArray(audienceQuestions.status, ["approved", "answered"])
      )
    );

  await realtime().publish(eventChannel(event.id), RT.questionUpdated, {});
  revalidatePath(`/e/${slug}/live`);
  return { ok: true };
}
