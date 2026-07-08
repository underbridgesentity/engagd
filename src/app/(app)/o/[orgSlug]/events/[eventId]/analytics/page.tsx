import Link from "next/link";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { eventAnalyticsFull } from "@/lib/analytics";
import { Card, StatTile } from "@/components/ui";

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
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

export default async function EventAnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug);
  const event = await requireOrgEvent(ctx, eventId);
  const ent = await getEntitlements(ctx.organisationId);

  if (ent.analytics !== "full") {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl text-fg">Event analytics</h1>
        <div className="rounded-lg border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
          Per-event analytics come with full analytics on the Professional
          plan. Your plan includes org-wide totals on the{" "}
          <Link
            href={`/o/${orgSlug}/analytics`}
            className="text-signal-strong hover:underline"
          >
            analytics page
          </Link>
          .{" "}
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
      </div>
    );
  }

  const row = await eventAnalyticsFull(ctx.organisationId, event.id);
  if (!row) return null;
  const max = Math.max(row.invited, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-fg">{event.name}</h1>
          <p className="mt-1 text-sm text-fg-dim">
            The full funnel and engagement picture for this event.
          </p>
        </div>
        <Link
          href={`/o/${orgSlug}/analytics`}
          className="text-sm text-signal-strong hover:underline"
        >
          All events
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Open rate"
          value={pct(row.opened, row.sent)}
          sub={`${row.opened.toLocaleString("en-ZA")} of ${row.sent.toLocaleString("en-ZA")} emails opened`}
        />
        <StatTile
          label="RSVP conversion"
          value={pct(row.yes, row.invited)}
          sub={`${row.yes.toLocaleString("en-ZA")} yes of ${row.invited.toLocaleString("en-ZA")} invited`}
        />
        <StatTile
          label="Waitlisted"
          value={row.waitlisted.toLocaleString("en-ZA")}
        />
      </div>

      <Card>
        <h2 className="font-display text-lg text-fg">Funnel</h2>
        <div className="mt-5 space-y-3">
          <FunnelBar label="Invited" value={row.invited} max={max} tone="bg-signal/60" />
          <FunnelBar label="Opened" value={row.opened} max={max} tone="bg-signal" />
          <FunnelBar label="Yes" value={row.yes} max={max} tone="bg-mint" />
          <FunnelBar label="Maybe" value={row.maybe} max={max} tone="bg-ember" />
          <FunnelBar label="No" value={row.no} max={max} tone="bg-coral" />
          <FunnelBar label="Waitlisted" value={row.waitlisted} max={max} tone="bg-fg-faint" />
        </div>
      </Card>

      <div>
        <h2 className="font-display text-lg text-fg">Day of</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <RateTile
            label="Check-in rate"
            part={row.checkedIn}
            whole={row.yes}
            sub={`${row.checkedIn.toLocaleString("en-ZA")} checked in of ${row.yes.toLocaleString("en-ZA")} confirmed`}
            tone="bg-mint"
          />
          <RateTile
            label="Poll participation"
            part={row.pollVoters}
            whole={row.checkedIn}
            sub={`${row.pollVoters.toLocaleString("en-ZA")} voters, ${row.pollVotes.toLocaleString("en-ZA")} votes across ${row.pollCount.toLocaleString("en-ZA")} polls`}
            tone="bg-signal"
          />
          <Card className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-fg-faint">
              Q&amp;A activity
            </span>
            <span className="font-display text-3xl text-fg">
              {row.questionsSubmitted.toLocaleString("en-ZA")}
            </span>
            <span className="font-data text-xs text-fg-dim">
              {row.questionsApproved.toLocaleString("en-ZA")} approved,{" "}
              {row.questionsAnswered.toLocaleString("en-ZA")} answered,{" "}
              {row.questionUpvotes.toLocaleString("en-ZA")} upvotes
            </span>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg text-fg">Follow-up</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <RateTile
            label="Survey response rate"
            part={row.surveyResponses}
            whole={row.withEmail}
            sub={`${row.surveyResponses.toLocaleString("en-ZA")} responses from ${row.withEmail.toLocaleString("en-ZA")} attendees with email`}
            tone="bg-ember"
          />
          <StatTile
            label="Surveys"
            value={row.surveyCount.toLocaleString("en-ZA")}
          />
          <StatTile
            label="Responses"
            value={row.surveyResponses.toLocaleString("en-ZA")}
          />
        </div>
      </div>
    </div>
  );
}
