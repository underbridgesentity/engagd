"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, events } from "@/db/schema";
import {
  getEventQuestions,
  parseRsvpForm,
  updateRsvpByToken,
  type RsvpFormState,
} from "@/lib/rsvp";

// Update an existing RSVP via the attendee's personal token. Never blocked
// by attendee caps (soft wall is organiser-side only).
export async function updatePersonalRsvp(
  token: string,
  _prev: RsvpFormState,
  formData: FormData
): Promise<RsvpFormState> {
  const [attendee] = await db
    .select({ id: attendees.id, eventId: attendees.eventId })
    .from(attendees)
    .where(eq(attendees.qrToken, token))
    .limit(1);
  if (!attendee) {
    return {
      status: "error",
      errors: {},
      formError: "This link is no longer valid.",
    };
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, attendee.eventId))
    .limit(1);
  if (!event || event.status !== "active") {
    return {
      status: "error",
      errors: {},
      formError: "This event is no longer accepting RSVP changes.",
    };
  }

  const questions = await getEventQuestions(event.id);
  const parsed = parseRsvpForm(
    formData,
    {
      allowPlusOnes: event.allowPlusOnes,
      maxPlusOnes: event.maxPlusOnes,
      collectDietary: event.collectDietary,
    },
    questions
  );
  if (parsed.errors) {
    return {
      status: "error",
      errors: parsed.errors,
      formError: "Please fix the highlighted fields.",
    };
  }

  const result = await updateRsvpByToken(token, parsed.data);
  if (!result.ok) {
    return { status: "error", errors: {}, formError: result.error };
  }
  return { status: "success", qrToken: token };
}
