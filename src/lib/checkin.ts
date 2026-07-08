import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, checkIns, tickets } from "@/db/schema";
import { eventChannel, realtime, RT } from "@/lib/realtime";

export type CheckInResult =
  | {
      status: "checked_in";
      attendeeId: string;
      name: string;
      plusOnes: number;
      hasDietaryNotes: boolean;
    }
  | {
      status: "already_checked_in";
      attendeeId: string;
      name: string;
      checkedInAt: string;
    }
  | { status: "not_found" };

export function attendeeDisplayName(a: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
  return name || a.email || "Unnamed attendee";
}

// Resolve a scanned QR payload to an attendee for this event. The payload is
// either the attendee's own qrToken or a ticket qrToken (joined to attendee).
async function resolveAttendee(eventId: string, scannedToken: string) {
  const token = scannedToken.trim();
  if (!token) return null;

  const [byAttendee] = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.eventId, eventId), eq(attendees.qrToken, token)));
  if (byAttendee) return byAttendee;

  const [byTicket] = await db
    .select({ attendee: attendees })
    .from(tickets)
    .innerJoin(attendees, eq(attendees.id, tickets.attendeeId))
    .where(and(eq(tickets.eventId, eventId), eq(tickets.qrToken, token)));
  return byTicket?.attendee ?? null;
}

// Core check-in used by both the organiser dashboard and door staff. Exactly
// one of checkedInByUserId / checkedInByStaffId should be set.
export async function performCheckIn(params: {
  eventId: string;
  scannedToken: string;
  checkedInByUserId?: string;
  checkedInByStaffId?: string;
}): Promise<CheckInResult> {
  const attendee = await resolveAttendee(params.eventId, params.scannedToken);
  if (!attendee) return { status: "not_found" };
  return checkInAttendee({ ...params, attendee });
}

export async function checkInAttendee(params: {
  eventId: string;
  attendee: typeof attendees.$inferSelect;
  checkedInByUserId?: string;
  checkedInByStaffId?: string;
}): Promise<CheckInResult> {
  const { eventId, attendee } = params;
  const inserted = await db
    .insert(checkIns)
    .values({
      eventId,
      attendeeId: attendee.id,
      checkedInByUserId: params.checkedInByUserId ?? null,
      checkedInByStaffId: params.checkedInByStaffId ?? null,
    })
    .onConflictDoNothing({
      target: [checkIns.eventId, checkIns.attendeeId],
    })
    .returning({ id: checkIns.id });

  const name = attendeeDisplayName(attendee);

  if (inserted.length === 0) {
    // Unique (eventId, attendeeId) index hit: already checked in.
    const [existing] = await db
      .select({ checkedInAt: checkIns.checkedInAt })
      .from(checkIns)
      .where(
        and(eq(checkIns.eventId, eventId), eq(checkIns.attendeeId, attendee.id))
      );
    return {
      status: "already_checked_in",
      attendeeId: attendee.id,
      name,
      checkedInAt: (existing?.checkedInAt ?? new Date()).toISOString(),
    };
  }

  await realtime().publish(eventChannel(eventId), RT.checkInUpdated, {});

  return {
    status: "checked_in",
    attendeeId: attendee.id,
    name,
    plusOnes: attendee.plusOnes,
    hasDietaryNotes: Boolean(attendee.dietaryNotes?.trim()),
  };
}
