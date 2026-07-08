"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { customQuestions } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

const questionSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(300),
  fieldType: z.enum(["text", "textarea", "select", "multiselect", "checkbox", "number", "date"]),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1)).max(50),
});

export type QuestionActionState = { error?: string; ok?: boolean };

const SELECT_TYPES = ["select", "multiselect"];

function parseQuestion(formData: FormData) {
  const fieldType = String(formData.get("fieldType") ?? "text");
  const options = SELECT_TYPES.includes(fieldType)
    ? String(formData.get("options") ?? "")
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];
  return questionSchema.safeParse({
    label: formData.get("label"),
    fieldType,
    required: formData.get("required") === "on" || formData.get("required") === "true",
    options,
  });
}

function firstError(issues: z.ZodError["issues"]) {
  return issues[0]?.message ?? "Invalid input";
}

export async function createQuestion(
  orgSlug: string,
  eventId: string,
  _prev: QuestionActionState,
  formData: FormData
): Promise<QuestionActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const parsed = parseQuestion(formData);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  if (SELECT_TYPES.includes(parsed.data.fieldType) && parsed.data.options.length === 0) {
    return { error: "Add at least one option for a select question" };
  }

  const existing = await db
    .select({ sortOrder: customQuestions.sortOrder })
    .from(customQuestions)
    .where(eq(customQuestions.eventId, event.id));
  const nextSort = existing.reduce((max, q) => Math.max(max, q.sortOrder), -1) + 1;

  await db.insert(customQuestions).values({
    eventId: event.id,
    label: parsed.data.label,
    fieldType: parsed.data.fieldType,
    required: parsed.data.required,
    options: parsed.data.options,
    sortOrder: nextSort,
  });

  revalidatePath(`/o/${orgSlug}/events/${event.id}/questions`);
  return { ok: true };
}

export async function updateQuestion(
  orgSlug: string,
  eventId: string,
  questionId: string,
  _prev: QuestionActionState,
  formData: FormData
): Promise<QuestionActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const parsed = parseQuestion(formData);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  if (SELECT_TYPES.includes(parsed.data.fieldType) && parsed.data.options.length === 0) {
    return { error: "Add at least one option for a select question" };
  }

  await db
    .update(customQuestions)
    .set({
      label: parsed.data.label,
      fieldType: parsed.data.fieldType,
      required: parsed.data.required,
      options: parsed.data.options,
    })
    .where(and(eq(customQuestions.id, questionId), eq(customQuestions.eventId, event.id)));

  revalidatePath(`/o/${orgSlug}/events/${event.id}/questions`);
  return { ok: true };
}

export async function deleteQuestion(orgSlug: string, eventId: string, questionId: string) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  await db
    .delete(customQuestions)
    .where(and(eq(customQuestions.id, questionId), eq(customQuestions.eventId, event.id)));
  revalidatePath(`/o/${orgSlug}/events/${event.id}/questions`);
}

export async function moveQuestion(
  orgSlug: string,
  eventId: string,
  questionId: string,
  direction: "up" | "down"
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const list = await db
    .select()
    .from(customQuestions)
    .where(eq(customQuestions.eventId, event.id))
    .orderBy(asc(customQuestions.sortOrder), asc(customQuestions.createdAt));
  const idx = list.findIndex((q) => q.id === questionId);
  if (idx < 0) return;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return;

  // Normalise sort orders while swapping so duplicates self-heal.
  const reordered = [...list];
  [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
  await Promise.all(
    reordered.map((q, i) =>
      db
        .update(customQuestions)
        .set({ sortOrder: i })
        .where(and(eq(customQuestions.id, q.id), eq(customQuestions.eventId, event.id)))
    )
  );
  revalidatePath(`/o/${orgSlug}/events/${event.id}/questions`);
}
