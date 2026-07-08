"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, surveyQuestions, surveyResponses, surveys } from "@/db/schema";

// Public, accountless survey submission. Keyed by survey id in the path,
// optionally attributed to an attendee via their opaque QR token. No PII in
// query strings; no auth.

export type SurveyAnswerValue = string | string[] | number | boolean;

export type SurveyFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; formError?: string }
  | { status: "success" };

export async function submitSurveyResponse(
  surveyId: string,
  qrToken: string | null,
  _prev: SurveyFormState,
  formData: FormData
): Promise<SurveyFormState> {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(eq(surveys.id, surveyId));
  if (!survey || survey.status !== "open") {
    return {
      status: "error",
      errors: {},
      formError: "This survey has closed.",
    };
  }

  // Resolve the attendee for attribution before accepting anything.
  let attendeeId: string | null = null;
  if (qrToken) {
    const [attendee] = await db
      .select({ id: attendees.id, eventId: attendees.eventId })
      .from(attendees)
      .where(eq(attendees.qrToken, qrToken))
      .limit(1);
    if (!attendee || attendee.eventId !== survey.eventId) {
      return {
        status: "error",
        errors: {},
        formError: "This personal link is not valid for this survey.",
      };
    }
    attendeeId = attendee.id;
  }

  const questions = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, survey.id));

  const errors: Record<string, string> = {};
  const answers: Record<string, SurveyAnswerValue> = {};

  for (const q of questions) {
    const name = `q_${q.id}`;
    switch (q.fieldType) {
      case "multiselect": {
        const values = formData
          .getAll(name)
          .map((v) => String(v))
          .filter((v) => q.options.includes(v));
        if (q.required && values.length === 0) {
          errors[name] = "Choose at least one option";
        } else if (values.length > 0) {
          answers[q.id] = values;
        }
        break;
      }
      case "checkbox": {
        const checked = formData.get(name) === "on";
        if (q.required && !checked) {
          errors[name] = "This must be checked";
        } else {
          answers[q.id] = checked;
        }
        break;
      }
      case "number": {
        const raw = String(formData.get(name) ?? "").trim();
        if (!raw) {
          if (q.required) errors[name] = "This field is required";
          break;
        }
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          errors[name] = "Enter a valid number";
        } else {
          answers[q.id] = num;
        }
        break;
      }
      case "select": {
        const raw = String(formData.get(name) ?? "").trim();
        if (!raw) {
          if (q.required) errors[name] = "Choose an option";
          break;
        }
        if (!q.options.includes(raw)) {
          errors[name] = "Choose a valid option";
        } else {
          answers[q.id] = raw;
        }
        break;
      }
      default: {
        // text, textarea, date
        const raw = String(formData.get(name) ?? "").trim();
        if (!raw) {
          if (q.required) errors[name] = "This field is required";
          break;
        }
        if (raw.length > 5000) {
          errors[name] = "Answer is too long";
        } else {
          answers[q.id] = raw;
        }
        break;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      formError: "Please fix the highlighted fields.",
    };
  }

  if (attendeeId) {
    // One response per attendee: update in place if they already answered.
    const [existing] = await db
      .select({ id: surveyResponses.id })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.surveyId, survey.id),
          eq(surveyResponses.attendeeId, attendeeId)
        )
      )
      .limit(1);
    if (existing) {
      await db
        .update(surveyResponses)
        .set({ answers })
        .where(eq(surveyResponses.id, existing.id));
      return { status: "success" };
    }
  }

  await db.insert(surveyResponses).values({
    surveyId: survey.id,
    attendeeId,
    answers,
  });

  return { status: "success" };
}
