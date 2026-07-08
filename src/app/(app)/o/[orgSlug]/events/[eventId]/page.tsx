import Link from "next/link";
import Image from "next/image";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { attendeeCapState } from "@/lib/entitlements";
import { Card, StatTile } from "@/components/ui";
import { APP_URL, CapBanner, formatDateTime, registrationTypeLabel } from "../_shared";
import { CopyButton } from "../_components/copy-button";
import { StatusActions } from "./_components/status-actions";
import { setEventStatus } from "./actions";

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug);
  const event = await requireOrgEvent(ctx, eventId);

  const [statusRows, cap] = await Promise.all([
    db
      .select({ status: attendees.rsvpStatus, n: count() })
      .from(attendees)
      .where(eq(attendees.eventId, event.id))
      .groupBy(attendees.rsvpStatus),
    attendeeCapState(ctx.organisationId, event.id),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.n]));
  const total = statusRows.reduce((sum, r) => sum + r.n, 0);
  const micrositeUrl = `${APP_URL}/e/${event.slug}`;
  const boundStatusAction = setEventStatus.bind(null, orgSlug, event.id);

  return (
    <div className="space-y-6">
      <CapBanner cap={cap} orgSlug={orgSlug} />

      <div className="relative overflow-hidden rounded-[10px] border border-line">
        <div className="relative aspect-[3/1]">
          <Image
            src={event.coverImageUrl ?? "/img/event-cover-default.jpg"}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
            unoptimized={Boolean(event.coverImageUrl)}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Invited" value={byStatus.invited ?? 0} />
        <StatTile label="Opened" value={byStatus.opened ?? 0} />
        <StatTile label="Yes" value={byStatus.responded_yes ?? 0} />
        <StatTile label="No" value={byStatus.responded_no ?? 0} />
        <StatTile label="Maybe" value={byStatus.responded_maybe ?? 0} />
        <StatTile label="Waitlisted" value={byStatus.waitlisted ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-display text-lg text-fg">Event details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-faint">Starts</dt>
              <dd className="text-fg-dim">{formatDateTime(event.startsAt, event.timezone)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-faint">Ends</dt>
              <dd className="text-fg-dim">{formatDateTime(event.endsAt, event.timezone)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-faint">Timezone</dt>
              <dd className="font-data text-fg-dim">{event.timezone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-faint">Venue</dt>
              <dd className="text-right text-fg-dim">
                {event.venueName ?? "Not set"}
                {event.venueAddress ? (
                  <span className="block text-xs text-fg-faint">{event.venueAddress}</span>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-faint">Registration</dt>
              <dd className="text-fg-dim">{registrationTypeLabel(event.registrationType)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-faint">Plus-ones</dt>
              <dd className="text-fg-dim">
                {event.allowPlusOnes ? `Up to ${event.maxPlusOnes} per guest` : "Off"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-faint">Total attendees</dt>
              <dd className="font-data text-fg">{total}</dd>
            </div>
          </dl>
          <Link
            href={`/o/${orgSlug}/events/${event.id}/edit`}
            className="inline-block text-sm text-signal-strong hover:underline"
          >
            Edit details
          </Link>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="font-display text-lg text-fg">Public microsite</h2>
            <p className="text-sm text-fg-dim">
              Guests RSVP through this link. Share it anywhere.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-ink-2 px-3 py-2 font-data text-xs text-fg-dim">
                {micrositeUrl}
              </code>
              <CopyButton value={micrositeUrl} />
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-lg text-fg">Status</h2>
            <p className="text-sm text-fg-dim">
              {event.status === "draft"
                ? "Draft events are not visible to guests. Activate to open the microsite."
                : event.status === "active"
                  ? "This event is live and accepting RSVPs."
                  : event.status === "completed"
                    ? "This event has wrapped up."
                    : "Archived events are hidden from guests and your dashboard defaults."}
            </p>
            <StatusActions status={event.status} orgSlug={orgSlug} action={boundStatusAction} />
          </Card>
        </div>
      </div>
    </div>
  );
}
