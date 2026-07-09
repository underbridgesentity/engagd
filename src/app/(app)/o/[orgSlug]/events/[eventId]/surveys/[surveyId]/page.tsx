import type * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendees, surveyQuestions, surveyResponses, surveys } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { Badge, Button, Card, StatTile } from "@/components/ui";
import { APP_URL } from "../../../_shared";
import {
  createSurveyQuestion,
  deleteSurvey,
  deleteSurveyQuestion,
  moveSurveyQuestion,
  setSurveyStatus,
  updateSurveyQuestion,
} from "../actions";
import { SurveyQuestionsEditor } from "./survey-questions-editor";
import { ConfirmSubmit } from "@/app/(app)/_components/confirm-submit";

const STATUS_TONE = { draft: "neutral", open: "mint", closed: "ember" } as const;

type AnswerValue = string | string[] | number | boolean;

function OptionBars({ rows, total }: { rows: Array<{ label: string; count: number }>; total: number }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-fg">{row.label}</span>
              <span className="shrink-0 font-data text-xs text-fg-dim">
                {row.count} ({pct}%)
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-raised-2">
              <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string; surveyId: string }>;
}) {
  const { orgSlug, eventId, surveyId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.eventId, event.id)));
  if (!survey) notFound();

  const [questions, responses, [{ emailCount }]] = await Promise.all([
    db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, survey.id))
      .orderBy(asc(surveyQuestions.sortOrder)),
    db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, survey.id))
      .orderBy(desc(surveyResponses.createdAt)),
    db
      .select({ emailCount: sql<number>`count(*)::int` })
      .from(attendees)
      .where(and(eq(attendees.eventId, event.id), isNotNull(attendees.email))),
  ]);

  const items = questions.map((q) => ({
    id: q.id,
    label: q.label,
    fieldType: q.fieldType,
    required: q.required,
    options: q.options,
    update: updateSurveyQuestion.bind(null, orgSlug, event.id, survey.id, q.id),
    remove: deleteSurveyQuestion.bind(null, orgSlug, event.id, survey.id, q.id),
    moveUp: moveSurveyQuestion.bind(null, orgSlug, event.id, survey.id, q.id, "up"),
    moveDown: moveSurveyQuestion.bind(null, orgSlug, event.id, survey.id, q.id, "down"),
  }));

  const publicUrl = `${APP_URL}/s/${survey.id}`;
  const totalResponses = responses.length;
  const responseRate =
    emailCount > 0 ? `${Math.round((totalResponses / emailCount) * 100)}%` : "n/a";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/o/${orgSlug}/events/${event.id}/surveys`}
            className="text-sm text-fg-dim hover:text-fg"
          >
            Back to surveys
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl text-fg">{survey.title}</h2>
            <Badge tone={STATUS_TONE[survey.status]}>{survey.status}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {survey.status !== "open" ? (
            <form action={setSurveyStatus.bind(null, orgSlug, event.id, survey.id, "open")}>
              <Button type="submit">
                {survey.status === "closed" ? "Reopen survey" : "Open survey"}
              </Button>
            </form>
          ) : (
            <form action={setSurveyStatus.bind(null, orgSlug, event.id, survey.id, "closed")}>
              <Button type="submit" variant="secondary">
                Close survey
              </Button>
            </form>
          )}
          <form action={deleteSurvey.bind(null, orgSlug, event.id, survey.id)}>
            <ConfirmSubmit
              confirmLabel="Delete survey and responses?"
              className="inline-flex items-center justify-center rounded-xl border border-coral/40 bg-coral/15 px-4 py-2 text-sm font-semibold text-coral transition-colors hover:bg-coral/25"
            >
              Delete
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      <Card className="space-y-2">
        <h3 className="font-display text-base text-fg">Share</h3>
        <p className="text-sm text-fg-dim">
          Anonymous link anyone can use once the survey is open:
        </p>
        <p className="break-all font-data text-sm text-signal-strong">{publicUrl}</p>
        <p className="text-sm text-fg-dim">
          Personalised link, appending each attendee&apos;s QR token, attributes
          the response to them:
        </p>
        <p className="break-all font-data text-sm text-fg-faint">
          {publicUrl}/&#123;attendee QR token&#125;
        </p>
        {survey.status !== "open" ? (
          <p className="text-xs text-ember">
            The survey is {survey.status}. Links show a closed message until you open it.
          </p>
        ) : null}
      </Card>

      <section className="space-y-4">
        <h3 className="font-display text-lg text-fg">Questions</h3>
        <SurveyQuestionsEditor
          questions={items}
          createAction={createSurveyQuestion.bind(null, orgSlug, event.id, survey.id)}
        />
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-lg text-fg">Results</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile label="Responses" value={totalResponses} />
          <StatTile
            label="Response rate"
            value={responseRate}
            sub={`of ${emailCount} attendee${emailCount === 1 ? "" : "s"} with email`}
          />
        </div>

        {totalResponses === 0 ? (
          <p className="text-sm text-fg-dim">No responses yet.</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => {
              const answers = responses
                .map((r) => (r.answers as Record<string, AnswerValue>)[q.id])
                .filter((a) => a !== undefined && a !== null && a !== "");
              const answered = answers.length;

              let body: React.ReactNode;
              if (q.fieldType === "select" || q.fieldType === "multiselect") {
                const counts = new Map<string, number>(q.options.map((o) => [o, 0]));
                for (const a of answers) {
                  const values = Array.isArray(a) ? a : [String(a)];
                  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
                }
                body = (
                  <OptionBars
                    rows={[...counts.entries()].map(([label, count]) => ({ label, count }))}
                    total={answered}
                  />
                );
              } else if (q.fieldType === "checkbox") {
                const yes = responses.filter(
                  (r) => (r.answers as Record<string, AnswerValue>)[q.id] === true
                ).length;
                body = (
                  <OptionBars
                    rows={[
                      { label: "Checked", count: yes },
                      { label: "Not checked", count: totalResponses - yes },
                    ]}
                    total={totalResponses}
                  />
                );
              } else if (q.fieldType === "number") {
                const nums = answers
                  .map((a) => (typeof a === "number" ? a : Number(a)))
                  .filter((n) => Number.isFinite(n));
                body =
                  nums.length === 0 ? (
                    <p className="text-sm text-fg-dim">No numeric answers yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-6 font-data text-sm text-fg">
                      <span>
                        <span className="text-fg-faint">Average </span>
                        {(nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2)}
                      </span>
                      <span>
                        <span className="text-fg-faint">Min </span>
                        {Math.min(...nums)}
                      </span>
                      <span>
                        <span className="text-fg-faint">Max </span>
                        {Math.max(...nums)}
                      </span>
                    </div>
                  );
              } else {
                body =
                  answered === 0 ? (
                    <p className="text-sm text-fg-dim">No answers yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {answers.map((a, i) => (
                        <li
                          key={i}
                          className="rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg"
                        >
                          {Array.isArray(a) ? a.join(", ") : String(a)}
                        </li>
                      ))}
                    </ul>
                  );
              }

              return (
                <Card key={q.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-fg">{q.label}</p>
                    <span className="font-data text-xs text-fg-faint">
                      {answered} answer{answered === 1 ? "" : "s"}
                    </span>
                  </div>
                  {body}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
