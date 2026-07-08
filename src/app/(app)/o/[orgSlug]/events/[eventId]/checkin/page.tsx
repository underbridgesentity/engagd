import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { attendees, checkIns, checkInStaffAccess } from "@/db/schema";
import { attendeeDisplayName } from "@/lib/checkin";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { CheckinDashboard } from "./checkin-client";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const [
    [totals],
    [rsvpYes],
    [checkedIn],
    recentRows,
    staffRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(attendees)
      .where(eq(attendees.eventId, event.id)),
    db
      .select({ value: count() })
      .from(attendees)
      .where(
        and(
          eq(attendees.eventId, event.id),
          eq(attendees.rsvpStatus, "responded_yes")
        )
      ),
    db
      .select({ value: count() })
      .from(checkIns)
      .where(eq(checkIns.eventId, event.id)),
    db
      .select({ checkIn: checkIns, attendee: attendees })
      .from(checkIns)
      .innerJoin(attendees, eq(attendees.id, checkIns.attendeeId))
      .where(eq(checkIns.eventId, event.id))
      .orderBy(desc(checkIns.checkedInAt))
      .limit(20),
    db
      .select()
      .from(checkInStaffAccess)
      .where(
        and(
          eq(checkInStaffAccess.eventId, event.id),
          isNull(checkInStaffAccess.revokedAt)
        )
      )
      .orderBy(desc(checkInStaffAccess.createdAt)),
  ]);

  const recent = recentRows.map((r) => ({
    attendeeId: r.attendee.id,
    name: attendeeDisplayName(r.attendee),
    plusOnes: r.attendee.plusOnes,
    checkedInAt: r.checkIn.checkedInAt.toISOString(),
  }));

  const staff = staffRows.map((s) => ({
    id: s.id,
    label: s.label,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt?.toISOString() ?? null,
    expired: s.expiresAt ? s.expiresAt.getTime() < Date.now() : false,
  }));

  return (
    <CheckinDashboard
      orgSlug={orgSlug}
      eventId={event.id}
      stats={{
        checkedIn: checkedIn.value,
        rsvpYes: rsvpYes.value,
        total: totals.value,
      }}
      recent={recent}
      staff={staff}
    />
  );
}
