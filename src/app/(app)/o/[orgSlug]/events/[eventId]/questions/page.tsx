import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customQuestions } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { createQuestion, deleteQuestion, moveQuestion, updateQuestion } from "./actions";
import { QuestionsEditor } from "./questions-editor";

export default async function QuestionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const questions = await db
    .select()
    .from(customQuestions)
    .where(eq(customQuestions.eventId, event.id))
    .orderBy(asc(customQuestions.sortOrder), asc(customQuestions.createdAt));

  const items = questions.map((q) => ({
    id: q.id,
    label: q.label,
    fieldType: q.fieldType,
    required: q.required,
    options: q.options,
    update: updateQuestion.bind(null, orgSlug, event.id, q.id),
    remove: deleteQuestion.bind(null, orgSlug, event.id, q.id),
    moveUp: moveQuestion.bind(null, orgSlug, event.id, q.id, "up"),
    moveDown: moveQuestion.bind(null, orgSlug, event.id, q.id, "down"),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-fg">Custom questions</h2>
        <p className="mt-1 text-sm text-fg-dim">
          Extra fields guests answer when they RSVP. Shown in the order below.
        </p>
      </div>
      <QuestionsEditor
        questions={items}
        createAction={createQuestion.bind(null, orgSlug, event.id)}
      />
    </div>
  );
}
