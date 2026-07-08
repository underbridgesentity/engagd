import { and, count, eq, inArray, ne } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";

// Either the pooled db handle or an open transaction. Seat accounting runs
// inside a transaction so the count-and-insert cannot race.
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
import { attendees, events, ticketTypes, tickets } from "@/db/schema";
import { orgReplyTo, sendEmail } from "@/lib/email";
import { orgFrom } from "@/lib/email/sender";

// Ticket issuance and delivery. Free tickets are issued directly after a
// yes RSVP; paid tickets are created pending at checkout and flipped to
// paid only after server-side payment verification.

export type IssueTicketResult =
  | { ok: true; ticketId: string; qrToken: string; alreadyIssued: boolean }
  | { ok: false; error: "sold_out" | "not_found" };

// Statuses that hold a seat against the ticket type quantity. Pending paid
// checkouts reserve their seat so an event cannot oversell while an
// attendee is mid-payment.
const SEAT_HOLDING: Array<
  (typeof tickets.$inferSelect)["paymentStatus"]
> = ["not_required", "pending", "paid"];

export async function issuedCountForType(
  ticketTypeId: string,
  tx: DbOrTx = db
): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.ticketTypeId, ticketTypeId),
        inArray(tickets.paymentStatus, SEAT_HOLDING)
      )
    );
  return row?.n ?? 0;
}

export async function issueTicket(
  eventId: string,
  attendeeId: string,
  ticketTypeId: string,
  opts: {
    paymentId?: string;
    paymentStatus?: (typeof tickets.$inferSelect)["paymentStatus"];
  } = {}
): Promise<IssueTicketResult> {
  // The whole check-and-insert runs in one transaction that first takes a
  // row lock on the ticket type. Concurrent issuances for the same type
  // serialize here, so the idempotency check and the quantity check both
  // see a consistent count and cannot oversell or double-issue.
  return db.transaction(async (tx) => {
    const [type] = await tx
      .select()
      .from(ticketTypes)
      .where(
        and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, eventId))
      )
      .for("update");
    if (!type) return { ok: false, error: "not_found" };

    // Idempotency: one ticket per attendee per event. If a live ticket
    // already exists, return it instead of double-issuing.
    const [existing] = await tx
      .select({ id: tickets.id, qrToken: tickets.qrToken })
      .from(tickets)
      .where(
        and(
          eq(tickets.eventId, eventId),
          eq(tickets.attendeeId, attendeeId),
          ne(tickets.paymentStatus, "failed")
        )
      )
      .limit(1);
    if (existing) {
      return {
        ok: true,
        ticketId: existing.id,
        qrToken: existing.qrToken,
        alreadyIssued: true,
      };
    }

    if (type.quantity !== null) {
      const issued = await issuedCountForType(ticketTypeId, tx);
      if (issued >= type.quantity) return { ok: false, error: "sold_out" };
    }

    const paymentStatus =
      opts.paymentStatus ?? (type.priceCents === 0 ? "not_required" : "pending");

    const [row] = await tx
      .insert(tickets)
      .values({
        eventId,
        attendeeId,
        ticketTypeId,
        paymentStatus,
        paymentId: opts.paymentId ?? null,
        issuedAt: paymentStatus === "pending" ? null : new Date(),
      })
      .returning({ id: tickets.id, qrToken: tickets.qrToken });
    return {
      ok: true,
      ticketId: row.id,
      qrToken: row.qrToken,
      alreadyIssued: false,
    };
  });
}

// Flip a pending paid ticket to paid once the provider has verified the
// payment. Sets issuedAt so the ticket becomes valid at the door.
export async function markTicketPaid(ticketId: string): Promise<void> {
  await db
    .update(tickets)
    .set({ paymentStatus: "paid", issuedAt: new Date() })
    .where(eq(tickets.id, ticketId));
}

function formatEventDate(
  startsAt: Date | null,
  timezone: string
): string | null {
  if (!startsAt) return null;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(startsAt);
}

export async function ticketQrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(qrToken, { width: 320, margin: 2 });
}

// Email the attendee their ticket with an embedded QR code of the ticket
// qrToken. Sends from the org's verified custom domain when one exists.
export async function sendTicketEmail(ticketId: string): Promise<void> {
  const [row] = await db
    .select({ ticket: tickets, attendee: attendees, event: events, type: ticketTypes })
    .from(tickets)
    .innerJoin(attendees, eq(attendees.id, tickets.attendeeId))
    .innerJoin(events, eq(events.id, tickets.eventId))
    .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .where(eq(tickets.id, ticketId));
  if (!row) throw new Error("Ticket not found");
  if (!row.attendee.email) throw new Error("Attendee has no email address");

  const [qrDataUrl, from, replyTo] = await Promise.all([
    ticketQrDataUrl(row.ticket.qrToken),
    orgFrom(row.event.organisationId),
    orgReplyTo(row.event.organisationId),
  ]);

  const when = formatEventDate(row.event.startsAt, row.event.timezone);
  const name = row.attendee.firstName ?? "there";
  const venue = [row.event.venueName, row.event.venueAddress]
    .filter(Boolean)
    .join(", ");

  await sendEmail({
    to: row.attendee.email,
    from,
    replyTo,
    subject: `Your ticket for ${row.event.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">${row.event.name}</h2>
        <p style="margin-top: 0; color: #667089;">Hi ${name}, here is your ticket.</p>
        <div style="border: 1px solid #e2e5ec; border-radius: 12px; padding: 20px; text-align: center;">
          <img src="${qrDataUrl}" alt="Ticket QR code" width="240" height="240" style="display: block; margin: 0 auto;" />
          <p style="font-size: 12px; color: #667089; margin-bottom: 0;">Show this code at the door.</p>
          <p style="font-family: monospace; font-size: 12px; color: #667089; margin-top: 4px;">${row.ticket.qrToken}</p>
        </div>
        <table style="width: 100%; margin-top: 16px; font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; color: #667089;">Ticket</td><td style="padding: 4px 0; text-align: right;">${row.type.name}</td></tr>
          ${when ? `<tr><td style="padding: 4px 0; color: #667089;">When</td><td style="padding: 4px 0; text-align: right;">${when}</td></tr>` : ""}
          ${venue ? `<tr><td style="padding: 4px 0; color: #667089;">Where</td><td style="padding: 4px 0; text-align: right;">${venue}</td></tr>` : ""}
        </table>
      </div>
    `,
  });
}
