import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveRefresh } from "@/components/live-refresh";
import { readFingerprint } from "@/lib/fingerprint";
import { getLivePolls, getLiveQuestions, getVotesByFingerprint } from "@/lib/live";
import { getPublicEventBySlug } from "@/lib/rsvp";
import { EventLogo, MicrositeShell } from "../../microsite";
import {
  PollVote,
  QuestionForm,
  QuestionList,
  type PublicQuestionItem,
} from "./live-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  return { title: event ? `Live · ${event.name}` : "Event not found" };
}

export default async function AttendeeLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  if (event.status !== "active") {
    return (
      <MicrositeShell config={event.micrositeConfig}>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
          <p className="font-display text-2xl text-fg">
            {event.name} is not live right now
          </p>
          <p className="mt-2 max-w-sm text-sm text-fg-dim">
            Polls and Q&amp;A open while the event is running. Check back
            during the event.
          </p>
          <Link
            href={`/e/${event.slug}`}
            className="mt-6 rounded-lg bg-signal px-5 py-3 text-sm font-medium text-ink"
          >
            Back to the event page
          </Link>
        </div>
      </MicrositeShell>
    );
  }

  const fingerprint = await readFingerprint();
  const [openPolls, allQuestions] = await Promise.all([
    getLivePolls(event.id, ["open"]),
    getLiveQuestions(event.id),
  ]);
  const myVotes = await getVotesByFingerprint(
    openPolls.map((p) => p.id),
    fingerprint
  );
  const publicQuestions: PublicQuestionItem[] = allQuestions
    .filter((q) => q.status === "approved" || q.status === "answered")
    .map((q) => ({
      id: q.id,
      text: q.text,
      displayName: q.displayName,
      upvotes: q.upvotes,
      status: q.status as "approved" | "answered",
    }));

  return (
    <MicrositeShell config={event.micrositeConfig}>
      <LiveRefresh eventId={event.id} />

      <header className="mt-6">
        <EventLogo config={event.micrositeConfig} />
        <p className="font-data text-xs uppercase tracking-wider text-signal-strong">
          Live now
        </p>
        <h1 className="mt-1 font-display text-2xl text-fg">{event.name}</h1>
      </header>

      <section aria-labelledby="live-polls-heading" className="mt-8">
        <h2 id="live-polls-heading" className="text-lg text-fg">
          Polls
        </h2>
        {openPolls.length === 0 ? (
          <p className="mt-3 rounded-[10px] border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-dim">
            No open polls right now. Keep this page open.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {openPolls.map((poll) => (
              <PollVote
                key={poll.id}
                slug={event.slug}
                poll={poll}
                votedOptionIds={myVotes[poll.id] ?? []}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="live-qa-heading" className="mt-10">
        <h2 id="live-qa-heading" className="text-lg text-fg">
          Ask a question
        </h2>
        <div className="mt-3">
          <QuestionForm slug={event.slug} />
        </div>
        <div className="mt-4">
          <QuestionList
            slug={event.slug}
            eventId={event.id}
            questions={publicQuestions}
          />
        </div>
      </section>
    </MicrositeShell>
  );
}
