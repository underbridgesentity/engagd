"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { attendees } from "@/db/schema";
import { audit } from "@/lib/audit";
import { attendeeCapState } from "@/lib/entitlements";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

const rowSchema = z.object({
  firstName: z.string().trim().max(100).optional().default(""),
  lastName: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().toLowerCase().max(320).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  customAnswers: z.record(z.string(), z.string()).optional().default({}),
});

const payloadSchema = z.array(rowSchema).min(1, "No rows to import").max(5000, "Import is limited to 5000 rows at a time");

export type ImportResult = {
  error?: string;
  inserted?: number;
  skipped?: number;
  capWarning?: { limit: number; current: number } | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function importAttendees(
  orgSlug: string,
  eventId: string,
  rawRows: unknown
): Promise<ImportResult> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const parsed = payloadSchema.safeParse(rawRows);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid import payload" };

  // Clean rows: drop empties, drop malformed emails, dedupe within the file.
  const seen = new Set<string>();
  let skipped = 0;
  const values: Array<typeof attendees.$inferInsert> = [];
  for (const row of parsed.data) {
    const email = row.email && EMAIL_RE.test(row.email) ? row.email : "";
    if (!email && !row.firstName && !row.lastName) {
      skipped += 1;
      continue;
    }
    if (email) {
      if (seen.has(email)) {
        skipped += 1;
        continue;
      }
      seen.add(email);
    }
    values.push({
      eventId: event.id,
      firstName: row.firstName || null,
      lastName: row.lastName || null,
      email: email || null,
      phone: row.phone || null,
      customAnswers: row.customAnswers,
      source: "import",
    });
  }

  if (values.length === 0) {
    return { error: "No usable rows found. Each row needs a name or a valid email.", skipped };
  }

  // Existing attendees with the same email are skipped, never overwritten.
  const insertedRows = await db
    .insert(attendees)
    .values(values)
    .onConflictDoNothing({ target: [attendees.eventId, attendees.email] })
    .returning({ id: attendees.id });

  const inserted = insertedRows.length;
  skipped += values.length - inserted;

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "attendees.imported",
    entityType: "event",
    entityId: event.id,
    detail: { inserted, skipped },
  });

  // Soft wall only: report the cap, never roll back the insert.
  const cap = await attendeeCapState(ctx.organisationId, event.id);
  revalidatePath(`/o/${orgSlug}/events/${event.id}/attendees`);
  return {
    inserted,
    skipped,
    capWarning: cap.limit !== null && (cap.over || cap.nearing)
      ? { limit: cap.limit, current: cap.current }
      : null,
  };
}
