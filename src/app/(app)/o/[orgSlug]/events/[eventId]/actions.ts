"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { audit } from "@/lib/audit";
import { canActivateEvent } from "@/lib/entitlements";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";

const statusSchema = z.enum(["draft", "active", "completed", "archived"]);

export type StatusActionState = {
  error?: string;
  blocked?: { limit: number; current: number };
};

// Which transitions the UI allows. Anything else is rejected.
const ALLOWED: Record<string, string[]> = {
  draft: ["active", "archived"],
  active: ["completed", "draft", "archived"],
  completed: ["archived", "active"],
  archived: ["draft"],
};

export async function setEventStatus(
  orgSlug: string,
  eventId: string,
  _prev: StatusActionState,
  formData: FormData
): Promise<StatusActionState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const parsed = statusSchema.safeParse(formData.get("status"));
  if (!parsed.success) return { error: "Invalid status" };
  const next = parsed.data;

  if (next === event.status) return {};
  if (!ALLOWED[event.status]?.includes(next)) {
    return { error: `Cannot move a ${event.status} event to ${next}` };
  }

  // Hard gate: activation is blocked past the active-event cap.
  if (next === "active") {
    const gate = await canActivateEvent(ctx.organisationId);
    if (!gate.allowed) {
      return {
        error: "Active event limit reached",
        blocked: { limit: gate.limit, current: gate.current },
      };
    }
  }

  await db
    .update(events)
    .set({ status: next })
    .where(and(eq(events.id, event.id), eq(events.organisationId, ctx.organisationId)));

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: `event.status.${next}`,
    entityType: "event",
    entityId: event.id,
    detail: { from: event.status, to: next },
  });

  revalidatePath(`/o/${orgSlug}/events/${event.id}`);
  revalidatePath(`/o/${orgSlug}/events`);
  return {};
}
