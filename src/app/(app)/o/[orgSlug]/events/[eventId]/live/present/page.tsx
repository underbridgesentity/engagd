import Link from "next/link";
import { LiveRefresh } from "@/components/live-refresh";
import { getLivePolls, getLiveQuestions } from "@/lib/live";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

// Full-screen stage view for projection. Rendered fixed over the app chrome
// so the dashboard shell never shows on the big screen.
export default async function PresenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ orgSlug, eventId }, { view }] = await Promise.all([
    params,
    searchParams,
  ]);
  const ctx = await requireOrg(orgSlug);
  const event = await requireOrgEvent(ctx, eventId);

  const showQa = view === "qa";
  const [openPolls, questions] = await Promise.all([
    getLivePolls(event.id, ["open"]),
    getLiveQuestions(event.id),
  ]);
  const poll = openPolls[0] ?? null;
  const approved = questions
    .filter((q) => q.status === "approved")
    .slice(0, 8);

  const base = `/o/${orgSlug}/events/${eventId}/live/present`;

  return (
    <div className="theme-dark fixed inset-0 z-50 flex flex-col bg-ink text-fg">
      <LiveRefresh eventId={event.id} />

      <header className="flex items-center justify-between px-10 pt-8">
        <p className="font-display text-2xl text-fg-dim">{event.name}</p>
        <nav className="flex items-center gap-2">
          <Link
            href={base}
            className={
              "rounded-lg px-4 py-2 text-sm " +
              (showQa
                ? "text-fg-faint hover:text-fg"
                : "bg-raised-2 text-fg")
            }
          >
            Poll
          </Link>
          <Link
            href={`${base}?view=qa`}
            className={
              "rounded-lg px-4 py-2 text-sm " +
              (showQa
                ? "bg-raised-2 text-fg"
                : "text-fg-faint hover:text-fg")
            }
          >
            Q&amp;A
          </Link>
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col justify-center px-10 py-8 lg:px-20">
        {showQa ? (
          approved.length === 0 ? (
            <StageEmpty
              title="No questions on screen yet"
              hint="Approved questions appear here, biggest upvotes first."
            />
          ) : (
            <ol className="mx-auto w-full max-w-5xl space-y-6">
              {approved.map((q, i) => (
                <li key={q.id} className="flex items-baseline gap-6">
                  <span className="w-20 shrink-0 text-right font-data text-2xl text-signal-strong lg:text-3xl">
                    {q.upvotes}
                    <span className="ml-1 text-sm text-fg-faint">votes</span>
                  </span>
                  <div className="min-w-0">
                    <p
                      className={
                        "font-display leading-snug text-fg " +
                        (i === 0 ? "text-4xl lg:text-5xl" : "text-2xl lg:text-3xl")
                      }
                    >
                      {q.text}
                    </p>
                    <p className="mt-1 text-base text-fg-faint">
                      {q.displayName?.trim() || "Anonymous"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )
        ) : poll ? (
          <div className="mx-auto w-full max-w-5xl">
            <p className="font-display text-4xl leading-tight text-fg lg:text-6xl">
              {poll.question}
            </p>
            <p className="mt-3 font-data text-lg text-fg-faint">
              {poll.voterCount} {poll.voterCount === 1 ? "person has" : "people have"}{" "}
              voted
            </p>
            <div className="mt-10 space-y-7">
              {poll.options.map((option) => {
                const pct =
                  poll.totalVotes === 0
                    ? 0
                    : Math.round((option.votes / poll.totalVotes) * 100);
                return (
                  <div key={option.id}>
                    <div className="flex items-baseline justify-between gap-6">
                      <span className="min-w-0 truncate text-2xl text-fg lg:text-3xl">
                        {option.label}
                      </span>
                      <span className="shrink-0 font-data text-2xl text-signal-strong lg:text-3xl">
                        {pct}%
                        <span className="ml-2 text-base text-fg-faint">
                          {option.votes}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-5 overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full rounded-full bg-signal transition-[width] duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <StageEmpty
            title="No poll is open right now"
            hint="Open a poll from the live hub and it appears here instantly."
          />
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-line px-10 py-5">
        <p className="font-data text-lg text-fg-dim">
          Join at{" "}
          <span className="text-signal-strong">engagd.co.za/join</span>
          {event.joinCode ? (
            <>
              {" "}with code{" "}
              <span className="rounded-md bg-raised-2 px-2 py-0.5 text-fg">
                {event.joinCode}
              </span>
            </>
          ) : null}
        </p>
        <Link
          href={`/o/${orgSlug}/events/${eventId}/live`}
          className="text-sm text-fg-faint hover:text-fg"
        >
          Exit
        </Link>
      </footer>
    </div>
  );
}

function StageEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-display text-4xl text-fg-dim">{title}</p>
      <p className="mt-3 text-lg text-fg-faint">{hint}</p>
    </div>
  );
}
