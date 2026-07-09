import Link from "next/link";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendees, events, invitations } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { Badge, Card, EmptyState, StatTile } from "@/components/ui";

const STATUS_TONE = {
  draft: "neutral",
  active: "mint",
  completed: "signal",
  archived: "ember",
} as const;

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const canCreate = ctx.role !== "viewer";

  const [activeRow] = await db
    .select({ n: count() })
    .from(events)
    .where(
      and(
        eq(events.organisationId, ctx.organisationId),
        eq(events.status, "active")
      )
    );

  const [attendeeRow] = await db
    .select({
      total: count(),
      yes: sql<number>`count(*) filter (where ${attendees.rsvpStatus} = 'responded_yes')`,
      responded: sql<number>`count(*) filter (where ${attendees.rsvpStatus} in ('responded_yes', 'responded_no', 'responded_maybe'))`,
    })
    .from(attendees)
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(events.organisationId, ctx.organisationId));

  const [inviteRow] = await db
    .select({ n: count() })
    .from(invitations)
    .innerJoin(events, eq(events.id, invitations.eventId))
    .where(
      and(
        eq(events.organisationId, ctx.organisationId),
        isNotNull(invitations.sentAt)
      )
    );

  const recentEvents = await db
    .select({
      id: events.id,
      name: events.name,
      status: events.status,
      startsAt: events.startsAt,
    })
    .from(events)
    .where(eq(events.organisationId, ctx.organisationId))
    .orderBy(desc(events.createdAt))
    .limit(8);

  const attendeeCounts =
    recentEvents.length > 0
      ? await db
          .select({ eventId: attendees.eventId, n: count() })
          .from(attendees)
          .where(
            inArray(
              attendees.eventId,
              recentEvents.map((e) => e.id)
            )
          )
          .groupBy(attendees.eventId)
      : [];
  const countByEvent = new Map(attendeeCounts.map((r) => [r.eventId, r.n]));

  const total = attendeeRow?.total ?? 0;
  const yes = Number(attendeeRow?.yes ?? 0);
  const yesRate = total > 0 ? `${Math.round((yes / total) * 100)}%` : "0%";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-dim">
            What is happening across {ctx.organisation.name}.
          </p>
        </div>
        {canCreate ? (
          <Link
            href={`/o/${orgSlug}/events/new`}
            className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            New event
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active events" value={activeRow?.n ?? 0} />
        <StatTile label="Total attendees" value={total.toLocaleString("en-ZA")} />
        <StatTile
          label="RSVP yes rate"
          value={yesRate}
          sub={`${yes.toLocaleString("en-ZA")} said yes`}
        />
        <StatTile label="Invites sent" value={(inviteRow?.n ?? 0).toLocaleString("en-ZA")} />
      </div>

      <h2 className="mt-10 font-display text-lg text-fg">Recent events</h2>
      {recentEvents.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No events yet"
            hint={
              canCreate
                ? "Create your first event to start collecting RSVPs. Invites, check-in, and live engagement all hang off it."
                : "Nothing here yet. An admin or owner can create the first event."
            }
            action={
              canCreate ? (
                <Link
                  href={`/o/${orgSlug}/events/new`}
                  className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
                >
                  Create an event
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <Card className="mt-4 divide-y divide-line p-0">
          {recentEvents.map((e) => (
            <Link
              key={e.id}
              href={`/o/${orgSlug}/events/${e.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-raised-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{e.name}</p>
                <p className="font-data text-xs text-fg-faint">
                  {e.startsAt
                    ? new Date(e.startsAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "No date set"}
                  {" · "}
                  {(countByEvent.get(e.id) ?? 0).toLocaleString("en-ZA")} attendees
                </p>
              </div>
              <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
