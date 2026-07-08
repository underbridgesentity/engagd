import { z } from "zod";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendees, customQuestions, events } from "@/db/schema";

// Shared RSVP logic for the public microsite form (/e/[slug]) and the
// personal RSVP page (/r/[token]). Pure validation lives here; the thin
// "use server" actions in each route call into these helpers.

export type CustomQuestionRow = typeof customQuestions.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type AttendeeRow = typeof attendees.$inferSelect;

// Serializable subset of a custom question, safe to pass to the client form.
export type PublicQuestion = {
  id: string;
  label: string;
  fieldType: CustomQuestionRow["fieldType"];
  required: boolean;
  options: string[];
};

export type RsvpChoice = "yes" | "no" | "maybe";

export const RSVP_STATUS_BY_CHOICE = {
  yes: "responded_yes",
  no: "responded_no",
  maybe: "responded_maybe",
} as const;

export type CustomAnswerValue = string | string[] | number | boolean;

export type RsvpFieldErrors = Record<string, string>;

export type RsvpFormState =
  | { status: "idle" }
  | { status: "error"; errors: RsvpFieldErrors; formError?: string }
  | { status: "success"; qrToken: string };

export type RsvpFormConfig = {
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  collectDietary: boolean;
};

export type ParsedRsvp = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  choice: RsvpChoice;
  plusOnes: number;
  dietaryNotes: string | null;
  accessibilityNotes: string | null;
  customAnswers: Record<string, CustomAnswerValue>;
};

const baseSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(120, "Keep it under 120 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(120, "Keep it under 120 characters"),
  email: z
    .email("Enter a valid email address")
    .trim()
    .toLowerCase()
    .max(254, "Keep it under 254 characters"),
  phone: z
    .string()
    .trim()
    .max(40, "Keep it under 40 characters")
    .optional()
    .or(z.literal("")),
  choice: z.enum(["yes", "no", "maybe"], {
    message: "Let us know if you are coming",
  }),
});

export function parseRsvpForm(
  formData: FormData,
  config: RsvpFormConfig,
  questions: PublicQuestion[]
): { data: ParsedRsvp; errors: null } | { data: null; errors: RsvpFieldErrors } {
  const errors: RsvpFieldErrors = {};

  const base = baseSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    choice: formData.get("choice") ?? undefined,
  });
  if (!base.success) {
    for (const issue of base.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
  }

  let plusOnes = 0;
  if (config.allowPlusOnes) {
    const raw = String(formData.get("plusOnes") ?? "0").trim();
    const n = Number.parseInt(raw === "" ? "0" : raw, 10);
    if (!Number.isInteger(n) || n < 0 || n > config.maxPlusOnes) {
      errors.plusOnes = `Plus ones must be between 0 and ${config.maxPlusOnes}`;
    } else {
      plusOnes = n;
    }
  }

  const note = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v ? v.slice(0, 2000) : null;
  };
  const dietaryNotes = config.collectDietary ? note("dietaryNotes") : null;
  const accessibilityNotes = config.collectDietary
    ? note("accessibilityNotes")
    : null;

  const customAnswers: Record<string, CustomAnswerValue> = {};
  for (const q of questions) {
    const key = `q_${q.id}`;
    switch (q.fieldType) {
      case "checkbox": {
        const on = formData.get(key) === "on";
        if (q.required && !on) {
          errors[key] = "This box must be checked";
          break;
        }
        customAnswers[q.id] = on;
        break;
      }
      case "multiselect": {
        const values = formData
          .getAll(key)
          .map(String)
          .filter((v) => q.options.includes(v));
        if (q.required && values.length === 0) {
          errors[key] = "Choose at least one option";
          break;
        }
        if (values.length > 0) customAnswers[q.id] = values;
        break;
      }
      case "select": {
        const v = String(formData.get(key) ?? "").trim();
        if (!v) {
          if (q.required) errors[key] = "Choose an option";
          break;
        }
        if (!q.options.includes(v)) {
          errors[key] = "Choose one of the listed options";
          break;
        }
        customAnswers[q.id] = v;
        break;
      }
      case "number": {
        const raw = String(formData.get(key) ?? "").trim();
        if (!raw) {
          if (q.required) errors[key] = "This field is required";
          break;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          errors[key] = "Enter a number";
          break;
        }
        customAnswers[q.id] = n;
        break;
      }
      // text, textarea, date
      default: {
        const v = String(formData.get(key) ?? "").trim();
        if (!v) {
          if (q.required) errors[key] = "This field is required";
          break;
        }
        customAnswers[q.id] = v.slice(0, 2000);
      }
    }
  }

  if (!base.success || Object.keys(errors).length > 0) {
    return { data: null, errors };
  }

  const b = base.data;
  return {
    data: {
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email,
      phone: b.phone ? b.phone : null,
      choice: b.choice,
      plusOnes,
      dietaryNotes,
      accessibilityNotes,
      customAnswers,
    },
    errors: null,
  };
}

// Public visibility rule: active events are fully public, completed events
// remain viewable. Drafts and archived events do not exist to the public.
export async function getPublicEventBySlug(
  slug: string
): Promise<EventRow | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);
  if (!event) return null;
  if (event.status !== "active" && event.status !== "completed") return null;
  return event;
}

export async function getEventQuestions(
  eventId: string
): Promise<PublicQuestion[]> {
  const rows = await db
    .select()
    .from(customQuestions)
    .where(eq(customQuestions.eventId, eventId))
    .orderBy(asc(customQuestions.sortOrder), asc(customQuestions.createdAt));
  return rows.map((q) => ({
    id: q.id,
    label: q.label,
    fieldType: q.fieldType,
    required: q.required,
    options: q.options,
  }));
}

// Upsert by (eventId, email). New attendees arrive via the public link;
// existing attendees (for example invited by email) keep their original
// source but get their response recorded. Deliberately no attendee cap
// check here: the cap is a soft wall handled organiser-side only.
export async function upsertPublicRsvp(
  eventId: string,
  data: ParsedRsvp
): Promise<string> {
  const now = new Date();
  const [row] = await db
    .insert(attendees)
    .values({
      eventId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      rsvpStatus: RSVP_STATUS_BY_CHOICE[data.choice],
      plusOnes: data.plusOnes,
      dietaryNotes: data.dietaryNotes,
      accessibilityNotes: data.accessibilityNotes,
      customAnswers: data.customAnswers,
      source: "public_link",
      respondedAt: now,
    })
    .onConflictDoUpdate({
      target: [attendees.eventId, attendees.email],
      set: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        rsvpStatus: RSVP_STATUS_BY_CHOICE[data.choice],
        plusOnes: data.plusOnes,
        dietaryNotes: data.dietaryNotes,
        accessibilityNotes: data.accessibilityNotes,
        customAnswers: data.customAnswers,
        respondedAt: now,
        updatedAt: now,
        // source intentionally untouched so invited attendees keep theirs
      },
    })
    .returning({ qrToken: attendees.qrToken });
  return row.qrToken;
}

// Update an existing attendee found via their personal token.
export async function updateRsvpByToken(
  qrToken: string,
  data: ParsedRsvp
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [attendee] = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(eq(attendees.qrToken, qrToken))
    .limit(1);
  if (!attendee) return { ok: false, error: "This link is no longer valid." };

  try {
    await db
      .update(attendees)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        rsvpStatus: RSVP_STATUS_BY_CHOICE[data.choice],
        plusOnes: data.plusOnes,
        dietaryNotes: data.dietaryNotes,
        accessibilityNotes: data.accessibilityNotes,
        customAnswers: data.customAnswers,
        respondedAt: new Date(),
      })
      .where(eq(attendees.id, attendee.id));
    return { ok: true };
  } catch {
    // Most likely the (eventId, email) unique index: the new email already
    // belongs to another attendee on this event.
    return {
      ok: false,
      error:
        "That email is already used by another RSVP for this event. Use a different email or keep your current one.",
    };
  }
}

// First open of a personal link moves invited attendees to opened, so
// organisers can see who has at least seen their invitation.
export async function markOpened(attendeeId: string): Promise<void> {
  await db
    .update(attendees)
    .set({ rsvpStatus: "opened" })
    .where(
      sql`${attendees.id} = ${attendeeId} and ${attendees.rsvpStatus} = 'invited'`
    );
}
