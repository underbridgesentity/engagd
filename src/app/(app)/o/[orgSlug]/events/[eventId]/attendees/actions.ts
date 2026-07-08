"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { attendees } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

const addSchema = z.object({
  firstName: z.string().trim().max(100).optional().default(""),
  lastName: z.string().trim().max(100).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email")]),
  phone: z.string().trim().max(40).optional().default(""),
  plusOnes: z.coerce.number().int().min(0).max(20).default(0),
});

export type AddAttendeeState = { error?: string; ok?: boolean };

export async function addAttendee(
  orgSlug: string,
  eventId: string,
  _prev: AddAttendeeState,
  formData: FormData
): Promise<AddAttendeeState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const parsed = addSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  if (!data.firstName && !data.lastName && !data.email) {
    return { error: "Give the attendee at least a name or an email" };
  }

  if (data.email) {
    const [dupe] = await db
      .select({ id: attendees.id })
      .from(attendees)
      .where(and(eq(attendees.eventId, event.id), eq(attendees.email, data.email)));
    if (dupe) return { error: "An attendee with that email is already on the list" };
  }

  // Soft wall: the cap never blocks adding attendees, the banner warns instead.
  await db.insert(attendees).values({
    eventId: event.id,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    email: data.email || null,
    phone: data.phone || null,
    plusOnes: data.plusOnes,
    source: "manual",
  });

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "attendee.added",
    entityType: "event",
    entityId: event.id,
    detail: { email: data.email || undefined, source: "manual" },
  });

  revalidatePath(`/o/${orgSlug}/events/${event.id}/attendees`);
  return { ok: true };
}

export async function deleteAttendee(orgSlug: string, eventId: string, attendeeId: string) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  await db
    .delete(attendees)
    .where(and(eq(attendees.id, attendeeId), eq(attendees.eventId, event.id)));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "attendee.deleted",
    entityType: "event",
    entityId: event.id,
    detail: { attendeeId },
  });
  revalidatePath(`/o/${orgSlug}/events/${event.id}/attendees`);
}
