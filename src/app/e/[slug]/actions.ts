"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { attendees, payments, ticketTypes, tickets } from "@/db/schema";
import {
  getEventQuestions,
  getPublicEventBySlug,
  parseRsvpForm,
  upsertPublicRsvp,
  type RsvpFormState,
} from "@/lib/rsvp";
import { adapterForEvent } from "@/lib/payments";
import { issueTicket, issuedCountForType, sendTicketEmail } from "@/lib/tickets";
import { appBaseUrl as baseUrl } from "@/lib/url";

// Public microsite RSVP submission. Scoped purely by the event slug; there
// is no session on attendee surfaces. Never blocked by attendee caps.
export async function submitPublicRsvp(
  slug: string,
  _prev: RsvpFormState,
  formData: FormData
): Promise<RsvpFormState> {
  const event = await getPublicEventBySlug(slug);
  if (!event || event.status !== "active" || !event.publicRsvpEnabled) {
    return {
      status: "error",
      errors: {},
      formError: "RSVPs are not open for this event.",
    };
  }

  const questions = await getEventQuestions(event.id);
  const parsed = parseRsvpForm(
    formData,
    {
      allowPlusOnes: event.allowPlusOnes,
      maxPlusOnes: event.maxPlusOnes,
      collectDietary: event.collectDietary,
    },
    questions
  );
  if (parsed.errors) {
    return {
      status: "error",
      errors: parsed.errors,
      formError: "Please fix the highlighted fields.",
    };
  }

  try {
    const qrToken = await upsertPublicRsvp(event.id, parsed.data);

    // Free ticket events: a yes RSVP gets a ticket for the default (first)
    // ticket type automatically, emailed to the attendee. Failures here
    // never break the RSVP itself.
    if (
      event.registrationType === "free_ticket" &&
      parsed.data.choice === "yes"
    ) {
      try {
        const [attendee] = await db
          .select({ id: attendees.id })
          .from(attendees)
          .where(eq(attendees.qrToken, qrToken));
        const [defaultType] = await db
          .select({ id: ticketTypes.id })
          .from(ticketTypes)
          .where(eq(ticketTypes.eventId, event.id))
          .orderBy(asc(ticketTypes.sortOrder), asc(ticketTypes.createdAt))
          .limit(1);
        if (attendee && defaultType) {
          const issued = await issueTicket(
            event.id,
            attendee.id,
            defaultType.id
          );
          if (issued.ok && !issued.alreadyIssued) {
            await sendTicketEmail(issued.ticketId);
          }
        }
      } catch {
        // Ticket issuance is best effort at RSVP time; organisers can
        // re-issue from the dashboard if needed.
      }
    } else if (
      event.registrationType === "free_ticket" &&
      parsed.data.choice !== "yes"
    ) {
      // The attendee changed away from yes. Void any free ticket they were
      // issued so it no longer scans at the door or holds a seat. Best
      // effort: never break the RSVP save itself.
      try {
        const [attendee] = await db
          .select({ id: attendees.id })
          .from(attendees)
          .where(eq(attendees.qrToken, qrToken));
        if (attendee) {
          await db
            .update(tickets)
            .set({ paymentStatus: "failed" })
            .where(
              and(
                eq(tickets.attendeeId, attendee.id),
                eq(tickets.eventId, event.id),
                eq(tickets.paymentStatus, "not_required")
              )
            );
        }
      } catch {
        // Non-fatal: organisers can void the ticket from the dashboard.
      }
    }

    return { status: "success", qrToken };
  } catch {
    return {
      status: "error",
      errors: {},
      formError: "Something went wrong saving your RSVP. Please try again.",
    };
  }
}

// Paid ticket checkout, accountless. The attendee is identified by the
// qrToken minted when their RSVP was saved. Creates a payments row, asks
// the org's payment provider for a hosted checkout, and redirects there.
// Truth about the payment only ever comes from verifyPayment on the result
// page, never from the redirect.
export async function startTicketCheckout(
  slug: string,
  formData: FormData
): Promise<void> {
  const event = await getPublicEventBySlug(slug);
  if (!event || event.status !== "active") redirect(`/e/${slug}?pay=closed`);
  if (event.registrationType !== "paid_ticket")
    redirect(`/e/${slug}?pay=closed`);

  const qrToken = String(formData.get("qrToken") ?? "");
  const ticketTypeId = String(formData.get("ticketTypeId") ?? "");

  const [attendee] = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(
      and(eq(attendees.qrToken, qrToken), eq(attendees.eventId, event.id))
    );
  if (!attendee) redirect(`/e/${slug}?pay=invalid`);

  const [type] = await db
    .select()
    .from(ticketTypes)
    .where(
      and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, event.id))
    );
  if (!type || type.priceCents <= 0) redirect(`/e/${slug}?pay=invalid`);

  // One live ticket per attendee per event.
  const [existingTicket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(
      and(
        eq(tickets.eventId, event.id),
        eq(tickets.attendeeId, attendee.id),
        ne(tickets.paymentStatus, "failed")
      )
    )
    .limit(1);
  if (existingTicket) redirect(`/e/${slug}?pay=already`);

  if (type.quantity !== null) {
    const issued = await issuedCountForType(type.id);
    if (issued >= type.quantity) redirect(`/e/${slug}?pay=soldout`);
  }

  const [payment] = await db
    .insert(payments)
    .values({
      organisationId: event.organisationId,
      eventId: event.id,
      attendeeId: attendee.id,
      provider: "yoco",
      amountCents: type.priceCents,
      currency: type.currency,
      status: "created",
    })
    .returning({ id: payments.id });

  // Reserve the seat with a pending ticket linked to this payment. It only
  // becomes valid once the payment is verified server-side.
  const reserved = await issueTicket(event.id, attendee.id, type.id, {
    paymentId: payment.id,
    paymentStatus: "pending",
  });
  if (!reserved.ok) {
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, payment.id));
    redirect(`/e/${slug}?pay=soldout`);
  }

  const resultUrl = (state: string) =>
    `${baseUrl()}/e/${slug}/pay/${payment.id}/result?state=${state}`;

  let redirectUrl: string;
  try {
    const adapter = await adapterForEvent(event.organisationId, event.id);
    const checkout = await adapter.createCheckout({
      amountCents: type.priceCents,
      currency: type.currency,
      paymentId: payment.id,
      successUrl: resultUrl("success"),
      cancelUrl: resultUrl("cancel"),
      failureUrl: resultUrl("failure"),
      metadata: { eventId: event.id, ticketTypeId: type.id },
    });
    await db
      .update(payments)
      .set({ providerReference: checkout.providerReference, status: "pending" })
      .where(eq(payments.id, payment.id));
    redirectUrl = checkout.redirectUrl;
  } catch {
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, payment.id));
    await db
      .update(tickets)
      .set({ paymentStatus: "failed" })
      .where(eq(tickets.paymentId, payment.id));
    redirect(`/e/${slug}?pay=error`);
  }

  redirect(redirectUrl);
}
