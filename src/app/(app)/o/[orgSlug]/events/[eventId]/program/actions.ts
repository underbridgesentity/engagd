"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { eventProgramItems } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

const itemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(2000).optional().default(""),
  speaker: z.string().trim().max(200).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  startsAt: z.string().optional().default(""),
  endsAt: z.string().optional().default(""),
});

export type ProgramActionState = { error?: string; ok?: boolean };

function parseItem(formData: FormData) {
  const parsed = itemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" } as const;
  }
  const start = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const end = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (start && isNaN(start.getTime())) return { error: "Invalid start time" } as const;
  if (end && isNaN(end.getTime())) return { error: "Invalid end time" } as const;
  if (start && end && end < start) return { error: "End must be after start" } as const;
  return { data: { ...parsed.data, startsAt: start, endsAt: end } } as const;
}

export async function createProgramItem(
  orgSlug: string,
  eventId: string,
  _prev: ProgramActionState,
  formData: FormData
): Promise<ProgramActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const result = parseItem(formData);
  if ("error" in result) return { error: result.error };

  const existing = await db
    .select({ sortOrder: eventProgramItems.sortOrder })
    .from(eventProgramItems)
    .where(eq(eventProgramItems.eventId, event.id));
  const nextSort = existing.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1;

  await db.insert(eventProgramItems).values({
    eventId: event.id,
    title: result.data.title,
    description: result.data.description || null,
    speaker: result.data.speaker || null,
    location: result.data.location || null,
    startsAt: result.data.startsAt,
    endsAt: result.data.endsAt,
    sortOrder: nextSort,
  });

  revalidatePath(`/o/${orgSlug}/events/${event.id}/program`);
  return { ok: true };
}

export async function updateProgramItem(
  orgSlug: string,
  eventId: string,
  itemId: string,
  _prev: ProgramActionState,
  formData: FormData
): Promise<ProgramActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const result = parseItem(formData);
  if ("error" in result) return { error: result.error };

  await db
    .update(eventProgramItems)
    .set({
      title: result.data.title,
      description: result.data.description || null,
      speaker: result.data.speaker || null,
      location: result.data.location || null,
      startsAt: result.data.startsAt,
      endsAt: result.data.endsAt,
    })
    .where(and(eq(eventProgramItems.id, itemId), eq(eventProgramItems.eventId, event.id)));

  revalidatePath(`/o/${orgSlug}/events/${event.id}/program`);
  return { ok: true };
}

export async function deleteProgramItem(orgSlug: string, eventId: string, itemId: string) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  await db
    .delete(eventProgramItems)
    .where(and(eq(eventProgramItems.id, itemId), eq(eventProgramItems.eventId, event.id)));
  revalidatePath(`/o/${orgSlug}/events/${event.id}/program`);
}

export async function moveProgramItem(
  orgSlug: string,
  eventId: string,
  itemId: string,
  direction: "up" | "down"
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const list = await db
    .select()
    .from(eventProgramItems)
    .where(eq(eventProgramItems.eventId, event.id))
    .orderBy(asc(eventProgramItems.sortOrder), asc(eventProgramItems.createdAt));
  const idx = list.findIndex((i) => i.id === itemId);
  if (idx < 0) return;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return;

  const reordered = [...list];
  [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
  await Promise.all(
    reordered.map((item, i) =>
      db
        .update(eventProgramItems)
        .set({ sortOrder: i })
        .where(and(eq(eventProgramItems.id, item.id), eq(eventProgramItems.eventId, event.id)))
    )
  );
  revalidatePath(`/o/${orgSlug}/events/${event.id}/program`);
}
