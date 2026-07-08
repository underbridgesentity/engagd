"use server";

import {
  getEventQuestions,
  getPublicEventBySlug,
  parseRsvpForm,
  upsertPublicRsvp,
  type RsvpFormState,
} from "@/lib/rsvp";

// Public microsite RSVP submission. Scoped purely by the event slug; there
// is no session on attendee surfaces. Never blocked by attendee caps.
export async function submitPublicRsvp(
  slug: string,
  _prev: RsvpFormState,
  formData: FormData
): Promise<RsvpFormState> {
  const event = await getPublicEventBySlug(slug);
  if (!event || event.status !== "active" || !event.publicRsvpEnabled) {
    return {
      status: "error",
      errors: {},
      formError: "RSVPs are not open for this event.",
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

  try {
    const qrToken = await upsertPublicRsvp(event.id, parsed.data);
    return { status: "success", qrToken };
  } catch {
    return {
      status: "error",
      errors: {},
      formError: "Something went wrong saving your RSVP. Please try again.",
    };
  }
}
