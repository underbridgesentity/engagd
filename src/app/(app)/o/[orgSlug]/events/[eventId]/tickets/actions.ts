"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { paymentProviderConfigs, ticketTypes, tickets } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { audit } from "@/lib/audit";

function back(orgSlug: string, eventId: string, param: string): never {
  redirect(`/o/${orgSlug}/events/${eventId}/tickets?${param}`);
}

const typeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  // Price entered in Rands, may include cents (for example 150 or 149.50).
  priceRands: z.coerce.number().min(0).max(1000000),
  quantity: z.union([z.literal(""), z.coerce.number().int().min(1).max(1000000)]),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

async function orgHasPaymentConfig(organisationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: paymentProviderConfigs.id })
    .from(paymentProviderConfigs)
    .where(
      and(
        eq(paymentProviderConfigs.organisationId, organisationId),
        isNull(paymentProviderConfigs.eventId)
      )
    )
    .limit(1);
  return Boolean(row);
}

async function parseAndGatePrice(
  orgSlug: string,
  eventId: string,
  organisationId: string,
  formData: FormData
) {
  const parsed = typeSchema.safeParse({
    name: formData.get("name"),
    priceRands: formData.get("priceRands") || 0,
    quantity: String(formData.get("quantity") ?? "").trim(),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) back(orgSlug, eventId, "error=invalid-type");

  const priceCents = Math.round(parsed.data.priceRands * 100);
  if (priceCents > 0) {
    const ent = await getEntitlements(organisationId);
    if (!ent.paidTicketing) back(orgSlug, eventId, "error=paid-locked");
    if (!(await orgHasPaymentConfig(organisationId)))
      back(orgSlug, eventId, "error=no-provider");
  }
  return {
    name: parsed.data.name,
    priceCents,
    quantity: parsed.data.quantity === "" ? null : parsed.data.quantity,
    sortOrder: parsed.data.sortOrder,
  };
}

export async function createTicketType(
  orgSlug: string,
  eventId: string,
  formData: FormData
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  if (event.registrationType === "rsvp_only")
    back(orgSlug, eventId, "error=rsvp-only");

  const values = await parseAndGatePrice(
    orgSlug,
    eventId,
    ctx.organisationId,
    formData
  );

  await db.insert(ticketTypes).values({ eventId, ...values });
  revalidatePath(`/o/${orgSlug}/events/${eventId}/tickets`);
  back(orgSlug, eventId, "ok=type-created");
}

export async function updateTicketType(
  orgSlug: string,
  eventId: string,
  formData: FormData
) {
  const ctx = await requireOrg(orgSlug, "admin");
  await requireOrgEvent(ctx, eventId);

  const id = String(formData.get("id") ?? "");
  const [existing] = await db
    .select()
    .from(ticketTypes)
    .where(and(eq(ticketTypes.id, id), eq(ticketTypes.eventId, eventId)));
  if (!existing) back(orgSlug, eventId, "error=type-not-found");

  const values = await parseAndGatePrice(
    orgSlug,
    eventId,
    ctx.organisationId,
    formData
  );

  await db.update(ticketTypes).set(values).where(eq(ticketTypes.id, id));
  revalidatePath(`/o/${orgSlug}/events/${eventId}/tickets`);
  back(orgSlug, eventId, "ok=type-updated");
}

export async function deleteTicketType(
  orgSlug: string,
  eventId: string,
  formData: FormData
) {
  const ctx = await requireOrg(orgSlug, "admin");
  await requireOrgEvent(ctx, eventId);

  const id = String(formData.get("id") ?? "");
  const [existing] = await db
    .select({ id: ticketTypes.id, name: ticketTypes.name })
    .from(ticketTypes)
    .where(and(eq(ticketTypes.id, id), eq(ticketTypes.eventId, eventId)));
  if (!existing) back(orgSlug, eventId, "error=type-not-found");

  // Never delete a type that has tickets: history and door scans depend on it.
  const [issued] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.ticketTypeId, id))
    .limit(1);
  if (issued) back(orgSlug, eventId, "error=type-has-tickets");

  await db.delete(ticketTypes).where(eq(ticketTypes.id, id));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "ticket_type.deleted",
    entityType: "ticket_type",
    entityId: id,
    detail: { name: existing.name, eventId },
  });
  revalidatePath(`/o/${orgSlug}/events/${eventId}/tickets`);
  back(orgSlug, eventId, "ok=type-deleted");
}
