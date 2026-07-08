import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { Badge, Card, EmptyState } from "@/components/ui";
import { createSurvey } from "./actions";
import { CreateSurveyForm } from "./create-survey-form";

const STATUS_TONE = {
  draft: "neutral",
  open: "mint",
  closed: "ember",
} as const;

export default async function SurveysPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const rows = await db
    .select({
      survey: surveys,
      responseCount: sql<number>`count(${surveyResponses.id})::int`,
    })
    .from(surveys)
    .leftJoin(surveyResponses, eq(surveyResponses.surveyId, surveys.id))
    .where(eq(surveys.eventId, event.id))
    .groupBy(surveys.id)
    .orderBy(desc(surveys.createdAt));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-fg">Post-event surveys</h2>
        <p className="mt-1 text-sm text-fg-dim">
          Collect feedback from attendees after the event. Open a survey to
          share its public link.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No surveys yet"
          hint="Create a survey, add questions, then open it to start collecting responses."
        />
      ) : (
        <div className="space-y-2">
          {rows.map(({ survey, responseCount }) => (
            <Link
              key={survey.id}
              href={`/o/${orgSlug}/events/${event.id}/surveys/${survey.id}`}
              className="block"
            >
              <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-signal/60">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{survey.title}</p>
                  <p className="mt-1 font-data text-xs text-fg-faint">
                    {responseCount} response{responseCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[survey.status]}>{survey.status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateSurveyForm action={createSurvey.bind(null, orgSlug, event.id)} />
    </div>
  );
}
