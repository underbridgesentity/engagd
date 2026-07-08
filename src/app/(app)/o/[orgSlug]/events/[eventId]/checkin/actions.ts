"use server";

import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { attendees, checkIns, checkInStaffAccess } from "@/db/schema";
import { audit } from "@/lib/audit";
import {
  attendeeDisplayName,
  checkInAttendee,
  performCheckIn,
  type CheckInResult,
} from "@/lib/checkin";
import { eventChannel, realtime, RT } from "@/lib/realtime";
import { generatePin, hashPin } from "@/lib/staff-session";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

function checkinPath(orgSlug: string, eventId: string) {
  return `/o/${orgSlug}/events/${eventId}/checkin`;
}

// Scanner on the organiser dashboard.
export async function scanCheckIn(
  orgSlug: string,
  eventId: string,
  scannedToken: string
): Promise<CheckInResult> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const result = await performCheckIn({
    eventId: event.id,
    scannedToken,
    checkedInByUserId: ctx.userId,
  });
  if (result.status === "checked_in") {
    revalidatePath(checkinPath(orgSlug, eventId));
  }
  return result;
}

// Manual check-in from the attendee search list.
export async function manualCheckIn(
  orgSlug: string,
  eventId: string,
  attendeeId: string
): Promise<CheckInResult> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const [attendee] = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.id, attendeeId), eq(attendees.eventId, event.id)));
  if (!attendee) return { status: "not_found" };

  const result = await checkInAttendee({
    eventId: event.id,
    attendee,
    checkedInByUserId: ctx.userId,
  });
  if (result.status === "checked_in") {
    await audit({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      action: "checkin.manual",
      entityType: "attendee",
      entityId: attendee.id,
      detail: { eventId: event.id },
    });
    revalidatePath(checkinPath(orgSlug, eventId));
  }
  return result;
}

export async function undoCheckIn(
  orgSlug: string,
  eventId: string,
  attendeeId: string
): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const deleted = await db
    .delete(checkIns)
    .where(
      and(eq(checkIns.eventId, event.id), eq(checkIns.attendeeId, attendeeId))
    )
    .returning({ id: checkIns.id });
  if (deleted.length > 0) {
    await audit({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      action: "checkin.undone",
      entityType: "attendee",
      entityId: attendeeId,
      detail: { eventId: event.id },
    });
    await realtime().publish(eventChannel(event.id), RT.checkInUpdated, {});
    revalidatePath(checkinPath(orgSlug, eventId));
  }
  return { ok: deleted.length > 0 };
}

export type AttendeeSearchHit = {
  id: string;
  name: string;
  email: string | null;
  plusOnes: number;
  checkedIn: boolean;
};

export async function searchAttendees(
  orgSlug: string,
  eventId: string,
  query: string
): Promise<AttendeeSearchHit[]> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q}%`;
  const rows = await db
    .select({ attendee: attendees, checkInId: checkIns.id })
    .from(attendees)
    .leftJoin(
      checkIns,
      and(
        eq(checkIns.attendeeId, attendees.id),
        eq(checkIns.eventId, attendees.eventId)
      )
    )
    .where(
      and(
        eq(attendees.eventId, event.id),
        or(
          ilike(attendees.firstName, pattern),
          ilike(attendees.lastName, pattern),
          ilike(attendees.email, pattern)
        )
      )
    )
    .limit(12);
  return rows.map((r) => ({
    id: r.attendee.id,
    name: attendeeDisplayName(r.attendee),
    email: r.attendee.email,
    plusOnes: r.attendee.plusOnes,
    checkedIn: r.checkInId !== null,
  }));
}

// Staff access management

const createStaffSchema = z.object({
  label: z.string().trim().min(1, "Give this access a label").max(60),
  expiresAt: z.string().trim().optional().default(""),
});

export type CreateStaffState = {
  error?: string;
  created?: { label: string; pin: string; url: string };
};

export async function createStaffAccess(
  orgSlug: string,
  eventId: string,
  _prev: CreateStaffState,
  formData: FormData
): Promise<CreateStaffState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const parsed = createStaffSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let expiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    expiresAt = new Date(parsed.data.expiresAt);
    if (Number.isNaN(expiresAt.getTime()))
      return { error: "Invalid expiry date" };
    if (expiresAt.getTime() <= Date.now())
      return { error: "Expiry must be in the future" };
  }

  const pin = generatePin();
  const [row] = await db
    .insert(checkInStaffAccess)
    .values({
      organisationId: ctx.organisationId,
      eventId: event.id,
      label: parsed.data.label,
      pinHash: hashPin(pin),
      expiresAt,
      createdByUserId: ctx.userId,
    })
    .returning();

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "checkin.staff_access_created",
    entityType: "check_in_staff_access",
    entityId: row.id,
    detail: { eventId: event.id, label: row.label },
  });

  revalidatePath(checkinPath(orgSlug, eventId));
  return {
    created: {
      label: row.label,
      pin,
      url: `/checkin/${row.accessToken}`,
    },
  };
}

export async function revokeStaffAccess(
  orgSlug: string,
  eventId: string,
  staffAccessId: string
): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const updated = await db
    .update(checkInStaffAccess)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(checkInStaffAccess.id, staffAccessId),
        eq(checkInStaffAccess.eventId, event.id),
        isNull(checkInStaffAccess.revokedAt)
      )
    )
    .returning({ id: checkInStaffAccess.id, label: checkInStaffAccess.label });
  const row = updated[0];
  if (row) {
    await audit({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      action: "checkin.staff_access_revoked",
      entityType: "check_in_staff_access",
      entityId: row.id,
      detail: { eventId: event.id, label: row.label },
    });
    revalidatePath(checkinPath(orgSlug, eventId));
  }
  return { ok: Boolean(row) };
}
