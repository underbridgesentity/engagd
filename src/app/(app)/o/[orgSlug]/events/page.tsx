import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, events } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { EmptyState } from "@/components/ui";
import { EventStatusBadge, formatDateTime, registrationTypeLabel } from "./_shared";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);

  const rows = await db
    .select({
      event: events,
      attendeeCount: count(attendees.id),
    })
    .from(events)
    .leftJoin(attendees, eq(attendees.eventId, events.id))
    .where(eq(events.organisationId, ctx.organisationId))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg">Events</h1>
          <p className="mt-1 text-sm text-fg-dim">
            Everything your organisation is running, from draft to archive.
          </p>
        </div>
        <Link
          href={`/o/${orgSlug}/events/new`}
          className="inline-flex items-center rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
        >
          Create event
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No events yet"
          hint="Create your first event to invite guests, track RSVPs and run the door on the day."
          action={
            <Link
              href={`/o/${orgSlug}/events/new`}
              className="inline-flex items-center rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
            >
              Create event
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line bg-raised text-left text-xs uppercase tracking-wider text-fg-faint">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Starts</th>
                <th className="px-4 py-3 font-medium">Registration</th>
                <th className="px-4 py-3 text-right font-medium">Attendees</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, attendeeCount }) => (
                <tr
                  key={event.id}
                  className="border-b border-line last:border-b-0 transition-colors hover:bg-raised"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/o/${orgSlug}/events/${event.id}`}
                      className="font-medium text-fg hover:text-signal-strong"
                    >
                      {event.name}
                    </Link>
                    <div className="font-data text-xs text-fg-faint">/e/{event.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3 text-fg-dim">
                    {formatDateTime(event.startsAt, event.timezone)}
                  </td>
                  <td className="px-4 py-3 text-fg-dim">
                    {registrationTypeLabel(event.registrationType)}
                  </td>
                  <td className="px-4 py-3 text-right font-data text-fg">{attendeeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
