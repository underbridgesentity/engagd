import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, tickets } from "@/db/schema";
import { getPublicEventBySlug } from "@/lib/rsvp";
import { adapterForEvent } from "@/lib/payments";
import { markTicketPaid, sendTicketEmail, ticketQrDataUrl } from "@/lib/tickets";
import { MicrositeShell } from "../../../../microsite";

export const dynamic = "force-dynamic";

// Payment result page. The state query param from the provider redirect is
// NEVER trusted: every visit verifies the payment server-side against the
// provider API before anything is shown or issued.
export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; paymentId: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { slug, paymentId } = await params;
  const { state } = await searchParams;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.eventId, event.id)));
  if (!payment) notFound();

  let status: "paid" | "pending" | "failed";

  if (payment.status === "succeeded") {
    status = "paid";
  } else if (!payment.providerReference || payment.status === "failed") {
    status = "failed";
  } else {
    // Always verify with the provider, regardless of how we got here.
    let verified = false;
    try {
      const adapter = await adapterForEvent(event.organisationId, event.id);
      const result = await adapter.verifyPayment(payment.providerReference);
      if (result.paid) {
        if (
          result.amountCents === null ||
          result.amountCents !== payment.amountCents
        ) {
          // Paid, but the amount does not match (or the provider did not
          // report one, so we cannot confirm it). Never issue a ticket.
          await db
            .update(payments)
            .set({
              status: "failed",
              verificationResult: result.raw,
              verifiedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));
          status = "failed";
        } else {
          await db
            .update(payments)
            .set({
              status: "succeeded",
              verificationResult: result.raw,
              verifiedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));
          verified = true;
          status = "paid";
        }
      } else if (state === "cancel" || state === "failure") {
        // The provider confirms no payment and the attendee came back via
        // the cancel or failure redirect. Release the reservation so the
        // seat frees and they can start a fresh checkout. The state param
        // only ever releases a reservation here, it never grants a ticket.
        await db
          .update(payments)
          .set({ status: "failed", verifiedAt: new Date() })
          .where(eq(payments.id, payment.id));
        await db
          .update(tickets)
          .set({ paymentStatus: "failed" })
          .where(
            and(
              eq(tickets.paymentId, payment.id),
              eq(tickets.paymentStatus, "pending")
            )
          );
        status = "failed";
      } else {
        status = "pending";
      }
    } catch {
      status = "pending";
    }

    if (verified) {
      // Flip the reserved pending ticket to paid and email it.
      const [ticket] = await db
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.paymentId, payment.id));
      if (ticket) {
        await markTicketPaid(ticket.id);
        try {
          await sendTicketEmail(ticket.id);
        } catch {
          // Email is best effort; the ticket QR is shown on this page too.
        }
      }
    }
  }

  let ticketQr: string | null = null;
  if (status === "paid") {
    const [ticket] = await db
      .select({ qrToken: tickets.qrToken })
      .from(tickets)
      .where(eq(tickets.paymentId, payment.id));
    if (ticket) ticketQr = await ticketQrDataUrl(ticket.qrToken);
  }

  return (
    <MicrositeShell config={event.micrositeConfig}>
      <div className="mt-10">
        {status === "paid" ? (
          <div className="rounded-[10px] border border-mint/30 bg-mint/10 p-6 text-center">
            <p className="font-display text-2xl text-fg">Payment confirmed</p>
            <p className="mt-2 text-sm text-fg-dim">
              Your ticket for {event.name} is confirmed. A copy has been
              emailed to you.
            </p>
            {ticketQr ? (
              <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ticketQr} alt="Your ticket QR code" width={240} height={240} />
              </div>
            ) : null}
            <p className="mt-3 font-data text-xs text-fg-faint">
              Show this code at the door.
            </p>
          </div>
        ) : status === "pending" ? (
          <div className="rounded-[10px] border border-ember/40 bg-ember/10 p-6 text-center">
            <p className="font-display text-2xl text-fg">
              Payment not confirmed yet
            </p>
            <p className="mt-2 text-sm text-fg-dim">
              We could not confirm your payment with the provider yet. If you
              completed payment, it may take a moment to reflect.
            </p>
            <Link
              href={`/e/${slug}/pay/${payment.id}/result`}
              className="mt-5 inline-block rounded-lg bg-signal px-5 py-3 text-base font-medium text-ink"
            >
              Check again
            </Link>
          </div>
        ) : (
          <div className="rounded-[10px] border border-coral/40 bg-coral/10 p-6 text-center">
            <p className="font-display text-2xl text-fg">Payment failed</p>
            <p className="mt-2 text-sm text-fg-dim">
              The payment was not completed. No ticket has been issued and you
              can try again from the event page.
            </p>
            <Link
              href={`/e/${slug}`}
              className="mt-5 inline-block rounded-lg bg-signal px-5 py-3 text-base font-medium text-ink"
            >
              Back to the event
            </Link>
          </div>
        )}
        <p className="mt-6 text-center">
          <Link href={`/e/${slug}`} className="text-sm text-fg-dim hover:text-fg">
            Return to {event.name}
          </Link>
        </p>
      </div>
    </MicrositeShell>
  );
}
