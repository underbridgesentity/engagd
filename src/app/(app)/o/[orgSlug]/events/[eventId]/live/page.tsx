import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { LiveRefresh } from "@/components/live-refresh";
import { getLivePolls, getLiveQuestions } from "@/lib/live";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { APP_URL } from "../../_shared";
import { CreatePollForm, PollCard, QuestionModeration } from "./live-client";

export default async function LiveHubPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug);
  const event = await requireOrgEvent(ctx, eventId);

  const [polls, questions] = await Promise.all([
    getLivePolls(event.id),
    getLiveQuestions(event.id),
  ]);

  const liveUrl = `${APP_URL}/e/${event.slug}/live`;

  return (
    <div className="space-y-8">
      <LiveRefresh eventId={event.id} />

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-fg-faint">
            Attendees join at
          </p>
          <p className="font-data text-sm text-signal-strong">{liveUrl}</p>
          {event.joinCode ? (
            <p className="text-sm text-fg-dim">
              Or enter code{" "}
              <span className="font-data text-fg">{event.joinCode}</span> at
              engagd.co.za/join
            </p>
          ) : null}
          {event.status !== "active" ? (
            <p className="text-sm text-ember">
              This event is not active, so the attendee live page is closed.
            </p>
          ) : null}
        </div>
        <Link
          href={`/o/${orgSlug}/events/${eventId}/live/present`}
          target="_blank"
          className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal-strong"
        >
          Open presenter view
        </Link>
      </Card>

      <section className="space-y-4" aria-labelledby="polls-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="polls-heading" className="text-lg text-fg">
            Polls
          </h2>
          <Badge tone="neutral">{polls.length} total</Badge>
        </div>
        <CreatePollForm orgSlug={orgSlug} eventId={eventId} />
        {polls.length === 0 ? (
          <EmptyState
            title="No polls yet"
            hint="Create a poll, open it when you are ready, and results update live as votes come in."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                orgSlug={orgSlug}
                eventId={eventId}
                poll={poll}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="qa-heading">
        <h2 id="qa-heading" className="text-lg text-fg">
          Audience Q&amp;A
        </h2>
        {questions.length === 0 ? (
          <EmptyState
            title="No questions yet"
            hint="Questions attendees submit land here as pending. Approve the good ones to put them on screen."
          />
        ) : (
          <QuestionModeration
            orgSlug={orgSlug}
            eventId={eventId}
            questions={questions}
          />
        )}
      </section>
    </div>
  );
}
