import Link from "next/link";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { orgAnalyticsFull } from "@/lib/analytics";
import { Card, EmptyState, StatTile } from "@/components/ui";

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function pctOrDash(value: number | null): string {
  return value === null ? "--" : `${Math.round(value * 100)}%`;
}

function FunnelBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-fg-dim">{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded bg-raised-2">
        <div className={`h-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right font-data text-sm text-fg">
        {value.toLocaleString("en-ZA")}
      </span>
    </div>
  );
}

// A stat tile with a thin percentage meter underneath the number.
function RateTile({
  label,
  part,
  whole,
  sub,
  tone,
}: {
  label: string;
  part: number;
  whole: number;
  sub: string;
  tone: string;
}) {
  const width = whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-fg-faint">
        {label}
      </span>
      <span className="font-display text-3xl text-fg">{pct(part, whole)}</span>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised-2">
        <div className={`h-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <span className="mt-1 font-data text-xs text-fg-dim">{sub}</span>
    </Card>
  );
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const ent = await getEntitlements(ctx.organisationId);
  const rows = await orgAnalyticsFull(ctx.organisationId);

  const totals = rows.reduce(
    (acc, r) => ({
      invited: acc.invited + r.invited,
      sent: acc.sent + r.sent,
      opened: acc.opened + r.opened,
      yes: acc.yes + r.yes,
      no: acc.no + r.no,
      maybe: acc.maybe + r.maybe,
      waitlisted: acc.waitlisted + r.waitlisted,
      withEmail: acc.withEmail + r.withEmail,
      checkedIn: acc.checkedIn + r.checkedIn,
      pollCount: acc.pollCount + r.pollCount,
      pollVotes: acc.pollVotes + r.pollVotes,
      pollVoters: acc.pollVoters + r.pollVoters,
      questionsSubmitted: acc.questionsSubmitted + r.questionsSubmitted,
      questionsApproved: acc.questionsApproved + r.questionsApproved,
      questionsAnswered: acc.questionsAnswered + r.questionsAnswered,
      questionUpvotes: acc.questionUpvotes + r.questionUpvotes,
      surveyCount: acc.surveyCount + r.surveyCount,
      surveyResponses: acc.surveyResponses + r.surveyResponses,
    }),
    {
      invited: 0,
      sent: 0,
      opened: 0,
      yes: 0,
      no: 0,
      maybe: 0,
      waitlisted: 0,
      withEmail: 0,
      checkedIn: 0,
      pollCount: 0,
      pollVotes: 0,
      pollVoters: 0,
      questionsSubmitted: 0,
      questionsApproved: 0,
      questionsAnswered: 0,
      questionUpvotes: 0,
      surveyCount: 0,
      surveyResponses: 0,
    }
  );
  const max = Math.max(totals.invited, 1);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-fg">Analytics</h1>
          <p className="mt-1 text-sm text-fg-dim">
            Invites, RSVPs, day-of engagement and follow-up across every event
            in {ctx.organisation.name}.
          </p>
        </div>
        {ent.analytics === "full" && rows.length > 0 ? (
          <a
            href={`/o/${orgSlug}/analytics/export`}
            className="rounded-lg border border-line-strong px-4 py-2 text-sm text-fg transition-colors hover:border-signal/60"
          >
            Export CSV
          </a>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing to measure yet"
            hint="Analytics fill in as soon as your first event has invitees. Create an event and send some invitations."
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Open rate"
              value={pct(totals.opened, totals.sent)}
              sub={`${totals.opened.toLocaleString("en-ZA")} of ${totals.sent.toLocaleString("en-ZA")} emails opened`}
            />
            <StatTile
              label="RSVP conversion"
              value={pct(totals.yes, totals.invited)}
              sub={`${totals.yes.toLocaleString("en-ZA")} yes of ${totals.invited.toLocaleString("en-ZA")} invited`}
            />
            <StatTile
              label="Waitlisted"
              value={totals.waitlisted.toLocaleString("en-ZA")}
            />
          </div>

          <Card className="mt-6">
            <h2 className="font-display text-lg text-fg">Org-wide funnel</h2>
            <div className="mt-5 space-y-3">
              <FunnelBar label="Invited" value={totals.invited} max={max} tone="bg-signal/60" />
              <FunnelBar label="Opened" value={totals.opened} max={max} tone="bg-signal" />
              <FunnelBar label="Yes" value={totals.yes} max={max} tone="bg-mint" />
              <FunnelBar label="Maybe" value={totals.maybe} max={max} tone="bg-ember" />
              <FunnelBar label="No" value={totals.no} max={max} tone="bg-coral" />
              <FunnelBar label="Waitlisted" value={totals.waitlisted} max={max} tone="bg-fg-faint" />
            </div>
          </Card>

          <h2 className="mt-8 font-display text-lg text-fg">Day of</h2>
          <p className="mt-1 text-sm text-fg-dim">
            What happened at the door and in the room.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <RateTile
              label="Check-in rate"
              part={totals.checkedIn}
              whole={totals.yes}
              sub={`${totals.checkedIn.toLocaleString("en-ZA")} checked in of ${totals.yes.toLocaleString("en-ZA")} confirmed`}
              tone="bg-mint"
            />
            <RateTile
              label="Poll participation"
              part={totals.pollVoters}
              whole={totals.checkedIn}
              sub={`${totals.pollVoters.toLocaleString("en-ZA")} voters, ${totals.pollVotes.toLocaleString("en-ZA")} votes across ${totals.pollCount.toLocaleString("en-ZA")} polls`}
              tone="bg-signal"
            />
            <Card className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-fg-faint">
                Q&amp;A activity
              </span>
              <span className="font-display text-3xl text-fg">
                {totals.questionsSubmitted.toLocaleString("en-ZA")}
              </span>
              <span className="font-data text-xs text-fg-dim">
                {totals.questionsApproved.toLocaleString("en-ZA")} approved,{" "}
                {totals.questionsAnswered.toLocaleString("en-ZA")} answered,{" "}
                {totals.questionUpvotes.toLocaleString("en-ZA")} upvotes
              </span>
            </Card>
          </div>

          <h2 className="mt-8 font-display text-lg text-fg">Follow-up</h2>
          <p className="mt-1 text-sm text-fg-dim">
            Post-event survey performance.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <RateTile
              label="Survey response rate"
              part={totals.surveyResponses}
              whole={totals.withEmail}
              sub={`${totals.surveyResponses.toLocaleString("en-ZA")} responses from ${totals.withEmail.toLocaleString("en-ZA")} attendees with email`}
              tone="bg-ember"
            />
            <StatTile
              label="Surveys"
              value={totals.surveyCount.toLocaleString("en-ZA")}
            />
            <StatTile
              label="Responses"
              value={totals.surveyResponses.toLocaleString("en-ZA")}
            />
          </div>

          {ent.analytics === "full" ? (
            <Card className="mt-8 overflow-x-auto p-0">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left font-data text-xs uppercase tracking-wider text-fg-faint">
                    <th className="px-5 py-3 font-normal">Event</th>
                    <th className="px-5 py-3 font-normal">Invited</th>
                    <th className="px-5 py-3 font-normal">Open rate</th>
                    <th className="px-5 py-3 font-normal">Yes</th>
                    <th className="px-5 py-3 font-normal">No</th>
                    <th className="px-5 py-3 font-normal">Maybe</th>
                    <th className="px-5 py-3 font-normal">Conversion</th>
                    <th className="px-5 py-3 font-normal">Checked in</th>
                    <th className="px-5 py-3 font-normal">Check-in rate</th>
                    <th className="px-5 py-3 font-normal">Poll part.</th>
                    <th className="px-5 py-3 font-normal">Q&amp;A</th>
                    <th className="px-5 py-3 font-normal">Survey rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="max-w-[220px] truncate px-5 py-3">
                        <Link
                          href={`/o/${orgSlug}/events/${r.id}/analytics`}
                          className="text-fg hover:text-signal-strong hover:underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-data text-fg-dim">{r.invited}</td>
                      <td className="px-5 py-3 font-data text-fg-dim">{pctOrDash(r.openRate)}</td>
                      <td className="px-5 py-3 font-data text-mint">{r.yes}</td>
                      <td className="px-5 py-3 font-data text-coral">{r.no}</td>
                      <td className="px-5 py-3 font-data text-ember">{r.maybe}</td>
                      <td className="px-5 py-3 font-data text-fg">{pctOrDash(r.rsvpConversion)}</td>
                      <td className="px-5 py-3 font-data text-fg-dim">{r.checkedIn}</td>
                      <td className="px-5 py-3 font-data text-fg">{pctOrDash(r.checkInRate)}</td>
                      <td className="px-5 py-3 font-data text-fg-dim">{pctOrDash(r.pollParticipation)}</td>
                      <td className="px-5 py-3 font-data text-fg-dim">
                        {r.questionsSubmitted}
                        <span className="text-fg-faint"> / {r.questionsAnswered} ans</span>
                      </td>
                      <td className="px-5 py-3 font-data text-fg-dim">{pctOrDash(r.surveyResponseRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <div className="mt-8 rounded-lg border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
              Your plan includes basic analytics: org-wide totals only. The
              per-event breakdown and CSV export come with full analytics on the
              Professional plan.{" "}
              {ctx.role === "owner" ? (
                <Link
                  href={`/o/${orgSlug}/billing`}
                  className="text-signal-strong hover:underline"
                >
                  Upgrade to unlock it.
                </Link>
              ) : (
                "Ask an owner to upgrade."
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
