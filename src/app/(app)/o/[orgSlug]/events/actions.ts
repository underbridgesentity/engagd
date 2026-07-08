"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { slugify } from "./_shared";

const eventFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only"),
  description: z.string().trim().max(5000).optional().default(""),
  startsAt: z.string().optional().default(""),
  endsAt: z.string().optional().default(""),
  timezone: z.string().trim().min(1).default("Africa/Johannesburg"),
  venueName: z.string().trim().max(200).optional().default(""),
  venueAddress: z.string().trim().max(500).optional().default(""),
  coverImageUrl: z
    .union([z.literal(""), z.string().trim().url("Enter a valid URL")])
    .optional()
    .default(""),
  registrationType: z.enum(["rsvp_only", "free_ticket", "paid_ticket"]),
  allowPlusOnes: z.coerce.boolean().default(false),
  maxPlusOnes: z.coerce.number().int().min(0).max(20).default(0),
  collectDietary: z.coerce.boolean().default(false),
});

export type EventFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseDates(startsAt: string, endsAt: string): { startsAt: Date | null; endsAt: Date | null; error?: string } {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  if (start && isNaN(start.getTime())) return { startsAt: null, endsAt: null, error: "Invalid start date" };
  if (end && isNaN(end.getTime())) return { startsAt: null, endsAt: null, error: "Invalid end date" };
  if (start && end && end < start) return { startsAt: null, endsAt: null, error: "End must be after start" };
  return { startsAt: start, endsAt: end };
}

function parseEventForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return eventFields.safeParse({
    ...raw,
    allowPlusOnes: raw.allowPlusOnes === "on" || raw.allowPlusOnes === "true",
    collectDietary: raw.collectDietary === "on" || raw.collectDietary === "true",
  });
}

export async function createEvent(
  orgSlug: string,
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the highlighted fields", fieldErrors };
  }
  const data = parsed.data;

  if (data.registrationType === "paid_ticket") {
    const ent = await getEntitlements(ctx.organisationId);
    if (!ent.paidTicketing) {
      return {
        error: "Paid ticketing is not available on your current plan. Upgrade to enable it.",
        fieldErrors: { registrationType: "Not available on your plan" },
      };
    }
  }

  const dates = parseDates(data.startsAt, data.endsAt);
  if (dates.error) return { error: dates.error };

  // Slugs are globally unique; make it so with a numeric suffix if needed.
  let slug = slugify(data.slug) || slugify(data.name) || "event";
  const [taken] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
  if (taken) {
    let n = 2;
    for (;;) {
      const candidate = `${slug}-${n}`;
      const [hit] = await db.select({ id: events.id }).from(events).where(eq(events.slug, candidate));
      if (!hit) {
        slug = candidate;
        break;
      }
      n += 1;
      if (n > 500) return { error: "Could not find a free slug, try a different one" };
    }
  }

  const [created] = await db
    .insert(events)
    .values({
      organisationId: ctx.organisationId,
      name: data.name,
      slug,
      status: "draft",
      registrationType: data.registrationType,
      description: data.description || null,
      startsAt: dates.startsAt,
      endsAt: dates.endsAt,
      timezone: data.timezone,
      venueName: data.venueName || null,
      venueAddress: data.venueAddress || null,
      coverImageUrl: data.coverImageUrl || null,
      allowPlusOnes: data.allowPlusOnes,
      maxPlusOnes: data.allowPlusOnes ? data.maxPlusOnes : 0,
      collectDietary: data.collectDietary,
    })
    .returning({ id: events.id });

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "event.created",
    entityType: "event",
    entityId: created.id,
    detail: { name: data.name, slug },
  });

  redirect(`/o/${orgSlug}/events/${created.id}`);
}

export async function updateEvent(
  orgSlug: string,
  eventId: string,
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the highlighted fields", fieldErrors };
  }
  const data = parsed.data;

  if (data.registrationType === "paid_ticket" && event.registrationType !== "paid_ticket") {
    const ent = await getEntitlements(ctx.organisationId);
    if (!ent.paidTicketing) {
      return {
        error: "Paid ticketing is not available on your current plan. Upgrade to enable it.",
        fieldErrors: { registrationType: "Not available on your plan" },
      };
    }
  }

  const dates = parseDates(data.startsAt, data.endsAt);
  if (dates.error) return { error: dates.error };

  const slug = slugify(data.slug) || event.slug;
  if (slug !== event.slug) {
    const [taken] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.slug, slug), ne(events.id, event.id)));
    if (taken) return { error: "That slug is already in use", fieldErrors: { slug: "Already in use" } };
  }

  await db
    .update(events)
    .set({
      name: data.name,
      slug,
      registrationType: data.registrationType,
      description: data.description || null,
      startsAt: dates.startsAt,
      endsAt: dates.endsAt,
      timezone: data.timezone,
      venueName: data.venueName || null,
      venueAddress: data.venueAddress || null,
      coverImageUrl: data.coverImageUrl || null,
      allowPlusOnes: data.allowPlusOnes,
      maxPlusOnes: data.allowPlusOnes ? data.maxPlusOnes : 0,
      collectDietary: data.collectDietary,
    })
    .where(and(eq(events.id, event.id), eq(events.organisationId, ctx.organisationId)));

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "event.updated",
    entityType: "event",
    entityId: event.id,
    detail: { name: data.name, slug },
  });

  revalidatePath(`/o/${orgSlug}/events/${event.id}`);
  redirect(`/o/${orgSlug}/events/${event.id}`);
}
