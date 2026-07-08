import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, events, surveyQuestions, surveys } from "@/db/schema";
import { EventLogo, FriendlyNotFound, MicrositeShell } from "../../e/microsite";
import { submitSurveyResponse } from "./actions";
import { SurveyForm, type PublicSurveyQuestion } from "./survey-form";

// Shared server renderer for /s/[surveyId] and /s/[surveyId]/[token].
// Attendees are accountless; the optional token only attributes the response.

export async function getSurveyWithEvent(surveyId: string) {
  const [row] = await db
    .select({ survey: surveys, event: events })
    .from(surveys)
    .innerJoin(events, eq(events.id, surveys.eventId))
    .where(eq(surveys.id, surveyId));
  return row ?? null;
}

export async function PublicSurveyPage({
  surveyId,
  token,
}: {
  surveyId: string;
  token: string | null;
}) {
  const row = await getSurveyWithEvent(surveyId);
  if (!row || row.survey.status === "draft") {
    return (
      <FriendlyNotFound message="This survey link does not exist or is not available yet. Check the link you were sent." />
    );
  }
  const { survey, event } = row;

  if (survey.status !== "open") {
    return (
      <MicrositeShell config={event.micrositeConfig}>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center pt-10 text-center">
          <EventLogo config={event.micrositeConfig} />
          <p className="font-display text-2xl text-fg">This survey has closed</p>
          <p className="mt-2 max-w-sm text-sm text-fg-dim">
            Thanks for your interest in sharing feedback on {event.name}. This
            survey is no longer accepting responses.
          </p>
        </div>
      </MicrositeShell>
    );
  }

  // Validate the token up front so a broken link fails fast, not on submit.
  let attendeeFirstName: string | null = null;
  if (token) {
    const [attendee] = await db
      .select({ eventId: attendees.eventId, firstName: attendees.firstName })
      .from(attendees)
      .where(eq(attendees.qrToken, token))
      .limit(1);
    if (!attendee || attendee.eventId !== event.id) {
      return (
        <FriendlyNotFound message="This personal survey link is not valid. Check the link you were sent, or use the general survey link." />
      );
    }
    attendeeFirstName = attendee.firstName;
  }

  const questions = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, survey.id))
    .orderBy(asc(surveyQuestions.sortOrder));

  const publicQuestions: PublicSurveyQuestion[] = questions.map((q) => ({
    id: q.id,
    label: q.label,
    fieldType: q.fieldType,
    required: q.required,
    options: q.options,
  }));

  return (
    <MicrositeShell config={event.micrositeConfig}>
      <div className="pt-10">
        <EventLogo config={event.micrositeConfig} />
        <p className="font-data text-xs uppercase tracking-wider text-fg-faint">
          {event.name}
        </p>
        <h1 className="mt-1 font-display text-2xl text-fg">{survey.title}</h1>
        <p className="mt-2 text-sm text-fg-dim">
          {attendeeFirstName ? `Hi ${attendeeFirstName}. ` : ""}
          We would love your feedback. It only takes a minute.
        </p>
        <div className="mt-6">
          <SurveyForm
            action={submitSurveyResponse.bind(null, survey.id, token)}
            questions={publicQuestions}
            personalised={Boolean(token)}
          />
        </div>
      </div>
    </MicrositeShell>
  );
}
