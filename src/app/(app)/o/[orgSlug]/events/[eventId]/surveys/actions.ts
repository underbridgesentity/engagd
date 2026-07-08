"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { surveyQuestions, surveys } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireOrg, requireOrgEvent, type OrgContext } from "@/lib/tenancy";

export type SurveyActionState = { error?: string; ok?: boolean };

const SELECT_TYPES = ["select", "multiselect"];

const questionSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(300),
  fieldType: z.enum([
    "text",
    "textarea",
    "select",
    "multiselect",
    "checkbox",
    "number",
    "date",
  ]),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1)).max(50),
});

function firstError(issues: z.ZodError["issues"]) {
  return issues[0]?.message ?? "Invalid input";
}

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
    required:
      formData.get("required") === "on" || formData.get("required") === "true",
    options,
  });
}

// Fetch a survey only if it belongs to an event in the caller's org.
async function requireOrgSurvey(ctx: OrgContext, eventId: string, surveyId: string) {
  const event = await requireOrgEvent(ctx, eventId);
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.eventId, event.id)));
  if (!survey) throw new Error("Survey not found");
  return { event, survey };
}

const surveysPath = (orgSlug: string, eventId: string) =>
  `/o/${orgSlug}/events/${eventId}/surveys`;

export async function createSurvey(
  orgSlug: string,
  eventId: string,
  _prev: SurveyActionState,
  formData: FormData
): Promise<SurveyActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };
  if (title.length > 200) return { error: "Title is too long" };

  const [survey] = await db
    .insert(surveys)
    .values({ eventId: event.id, title })
    .returning();

  revalidatePath(surveysPath(orgSlug, event.id));
  redirect(`${surveysPath(orgSlug, event.id)}/${survey.id}`);
}

export async function setSurveyStatus(
  orgSlug: string,
  eventId: string,
  surveyId: string,
  status: "open" | "closed"
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const { event, survey } = await requireOrgSurvey(ctx, eventId, surveyId);
  await db.update(surveys).set({ status }).where(eq(surveys.id, survey.id));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: status === "open" ? "survey.opened" : "survey.closed",
    entityType: "survey",
    entityId: survey.id,
    detail: { title: survey.title, eventId: event.id },
  });
  revalidatePath(`${surveysPath(orgSlug, event.id)}/${survey.id}`);
  revalidatePath(surveysPath(orgSlug, event.id));
}

export async function deleteSurvey(
  orgSlug: string,
  eventId: string,
  surveyId: string
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const { event, survey } = await requireOrgSurvey(ctx, eventId, surveyId);
  await db.delete(surveys).where(eq(surveys.id, survey.id));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "survey.deleted",
    entityType: "survey",
    entityId: survey.id,
    detail: { title: survey.title, eventId: event.id },
  });
  revalidatePath(surveysPath(orgSlug, event.id));
  redirect(surveysPath(orgSlug, event.id));
}

export async function createSurveyQuestion(
  orgSlug: string,
  eventId: string,
  surveyId: string,
  _prev: SurveyActionState,
  formData: FormData
): Promise<SurveyActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const { event, survey } = await requireOrgSurvey(ctx, eventId, surveyId);
  const parsed = parseQuestion(formData);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  if (
    SELECT_TYPES.includes(parsed.data.fieldType) &&
    parsed.data.options.length === 0
  ) {
    return { error: "Add at least one option for a select question" };
  }

  const existing = await db
    .select({ sortOrder: surveyQuestions.sortOrder })
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, survey.id));
  const nextSort = existing.reduce((max, q) => Math.max(max, q.sortOrder), -1) + 1;

  await db.insert(surveyQuestions).values({
    surveyId: survey.id,
    label: parsed.data.label,
    fieldType: parsed.data.fieldType,
    required: parsed.data.required,
    options: parsed.data.options,
    sortOrder: nextSort,
  });

  revalidatePath(`${surveysPath(orgSlug, event.id)}/${survey.id}`);
  return { ok: true };
}

export async function updateSurveyQuestion(
  orgSlug: string,
  eventId: string,
  surveyId: string,
  questionId: string,
  _prev: SurveyActionState,
  formData: FormData
): Promise<SurveyActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const { event, survey } = await requireOrgSurvey(ctx, eventId, surveyId);
  const parsed = parseQuestion(formData);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  if (
    SELECT_TYPES.includes(parsed.data.fieldType) &&
    parsed.data.options.length === 0
  ) {
    return { error: "Add at least one option for a select question" };
  }

  await db
    .update(surveyQuestions)
    .set({
      label: parsed.data.label,
      fieldType: parsed.data.fieldType,
      required: parsed.data.required,
      options: parsed.data.options,
    })
    .where(
      and(
        eq(surveyQuestions.id, questionId),
        eq(surveyQuestions.surveyId, survey.id)
      )
    );

  revalidatePath(`${surveysPath(orgSlug, event.id)}/${survey.id}`);
  return { ok: true };
}

export async function deleteSurveyQuestion(
  orgSlug: string,
  eventId: string,
  surveyId: string,
  questionId: string
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const { event, survey } = await requireOrgSurvey(ctx, eventId, surveyId);
  await db
    .delete(surveyQuestions)
    .where(
      and(
        eq(surveyQuestions.id, questionId),
        eq(surveyQuestions.surveyId, survey.id)
      )
    );
  revalidatePath(`${surveysPath(orgSlug, event.id)}/${survey.id}`);
}

export async function moveSurveyQuestion(
  orgSlug: string,
  eventId: string,
  surveyId: string,
  questionId: string,
  direction: "up" | "down"
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const { event, survey } = await requireOrgSurvey(ctx, eventId, surveyId);
  const list = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, survey.id))
    .orderBy(asc(surveyQuestions.sortOrder));
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
        .update(surveyQuestions)
        .set({ sortOrder: i })
        .where(
          and(
            eq(surveyQuestions.id, q.id),
            eq(surveyQuestions.surveyId, survey.id)
          )
        )
    )
  );
  revalidatePath(`${surveysPath(orgSlug, event.id)}/${survey.id}`);
}
