import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendees, events, invitations } from "@/db/schema";

export type EventAnalyticsRow = {
  id: string;
  name: string;
  status: "draft" | "active" | "completed" | "archived";
  invited: number;
  sent: number;
  opened: number;
  yes: number;
  no: number;
  maybe: number;
  waitlisted: number;
};

// Per-event funnel counts for one organisation. Distinct counts guard against
// the row multiplication from the double left join.
export async function orgAnalytics(
  organisationId: string
): Promise<EventAnalyticsRow[]> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      status: events.status,
      invited: sql<number>`count(distinct ${attendees.id})`,
      yes: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'responded_yes')`,
      no: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'responded_no')`,
      maybe: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'responded_maybe')`,
      waitlisted: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'waitlisted')`,
      sent: sql<number>`count(distinct ${invitations.id}) filter (where ${invitations.sentAt} is not null)`,
      opened: sql<number>`count(distinct ${invitations.id}) filter (where ${invitations.openedAt} is not null)`,
    })
    .from(events)
    .leftJoin(attendees, eq(attendees.eventId, events.id))
    .leftJoin(invitations, eq(invitations.eventId, events.id))
    .where(eq(events.organisationId, organisationId))
    .groupBy(events.id, events.name, events.status)
    .orderBy(desc(events.createdAt));
  return rows.map((r) => ({
    ...r,
    invited: Number(r.invited),
    sent: Number(r.sent),
    opened: Number(r.opened),
    yes: Number(r.yes),
    no: Number(r.no),
    maybe: Number(r.maybe),
    waitlisted: Number(r.waitlisted),
  }));
}
