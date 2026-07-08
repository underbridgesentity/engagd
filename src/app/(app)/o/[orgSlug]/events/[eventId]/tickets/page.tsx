import Link from "next/link";
import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  attendees,
  paymentProviderConfigs,
  ticketTypes,
  tickets,
} from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { Badge, Button, Card, EmptyState, Input, Label } from "@/components/ui";
import { createTicketType, deleteTicketType, updateTicketType } from "./actions";

const ERROR_COPY: Record<string, string> = {
  "invalid-type": "Check the ticket type fields and try again.",
  "paid-locked": "Paid ticketing is not included in your plan.",
  "no-provider": "Set up a payment provider before adding paid prices.",
  "rsvp-only": "This event is RSVP only, so it has no tickets.",
  "type-not-found": "That ticket type no longer exists.",
  "type-has-tickets": "Tickets have already been issued for that type, so it cannot be deleted.",
};

const OK_COPY: Record<string, string> = {
  "type-created": "Ticket type created.",
  "type-updated": "Ticket type updated.",
  "type-deleted": "Ticket type deleted.",
};

function rands(cents: number): string {
  return cents === 0 ? "Free" : `R${(cents / 100).toFixed(2)}`;
}

const PAYMENT_BADGE: Record<
  string,
  { tone: "neutral" | "mint" | "ember" | "coral"; label: string }
> = {
  not_required: { tone: "neutral", label: "free" },
  pending: { tone: "ember", label: "pending" },
  paid: { tone: "mint", label: "paid" },
  refunded: { tone: "coral", label: "refunded" },
  failed: { tone: "coral", label: "failed" },
};

export default async function EventTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const { error, ok } = await searchParams;
  const ctx = await requireOrg(orgSlug);
  const event = await requireOrgEvent(ctx, eventId);
  const canEdit = ctx.role !== "viewer";

  if (event.registrationType === "rsvp_only") {
    return (
      <EmptyState
        title="This event is RSVP only"
        hint="Guests respond yes or no without tickets. Switch the registration type to free or paid tickets to start issuing them."
        action={
          <Link
            href={`/o/${orgSlug}/events/${eventId}/edit`}
            className="text-sm text-signal-strong hover:underline"
          >
            Edit event settings
          </Link>
        }
      />
    );
  }

  const [ent, providerConfig, types, seatCounts, issuedTickets] =
    await Promise.all([
      getEntitlements(ctx.organisationId),
      db
        .select({ id: paymentProviderConfigs.id })
        .from(paymentProviderConfigs)
        .where(
          and(
            eq(paymentProviderConfigs.organisationId, ctx.organisationId),
            isNull(paymentProviderConfigs.eventId)
          )
        )
        .limit(1),
      db
        .select()
        .from(ticketTypes)
        .where(eq(ticketTypes.eventId, eventId))
        .orderBy(asc(ticketTypes.sortOrder), asc(ticketTypes.createdAt)),
      db
        .select({ ticketTypeId: tickets.ticketTypeId, n: count() })
        .from(tickets)
        .where(
          and(
            eq(tickets.eventId, eventId),
            inArray(tickets.paymentStatus, ["not_required", "pending", "paid"])
          )
        )
        .groupBy(tickets.ticketTypeId),
      db
        .select({ ticket: tickets, attendee: attendees, type: ticketTypes })
        .from(tickets)
        .innerJoin(attendees, eq(attendees.id, tickets.attendeeId))
        .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
        .where(eq(tickets.eventId, eventId))
        .orderBy(desc(tickets.createdAt)),
    ]);

  const hasProvider = providerConfig.length > 0;
  const canAddPaid = ent.paidTicketing && hasProvider;
  const issuedByType = new Map(seatCounts.map((r) => [r.ticketTypeId, r.n]));

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {ERROR_COPY[error] ?? "Something went wrong. Try again."}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="rounded-lg border border-mint/40 bg-mint/10 px-3 py-2 text-sm text-mint">
          {OK_COPY[ok] ?? "Done."}
        </p>
      ) : null}

      {event.registrationType === "paid_ticket" && !canAddPaid ? (
        <div className="rounded-lg border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
          {!ent.paidTicketing ? (
            <>
              Paid ticketing is available on Professional and above.{" "}
              <Link href={`/o/${orgSlug}/billing`} className="text-signal-strong hover:underline">
                Upgrade your plan
              </Link>{" "}
              to sell tickets.
            </>
          ) : (
            <>
              No payment provider is configured yet.{" "}
              <Link
                href={`/o/${orgSlug}/settings/payments`}
                className="text-signal-strong hover:underline"
              >
                Set up payments
              </Link>{" "}
              to accept paid tickets.
            </>
          )}
        </div>
      ) : null}

      <Card>
        <h2 className="font-display text-lg text-fg">Ticket types</h2>
        {types.length === 0 ? (
          <p className="mt-3 text-sm text-fg-faint">
            No ticket types yet. Add one below so attendees can get tickets.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-line rounded-lg border border-line">
            {types.map((t) => {
              const issued = issuedByType.get(t.id) ?? 0;
              const remaining =
                t.quantity === null ? null : Math.max(0, t.quantity - issued);
              return (
                <div key={t.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="truncate text-sm text-fg">{t.name}</span>
                      <Badge tone={t.priceCents === 0 ? "neutral" : "signal"}>
                        {rands(t.priceCents)}
                      </Badge>
                      {remaining === 0 ? <Badge tone="coral">sold out</Badge> : null}
                    </div>
                    <span className="font-data text-xs text-fg-dim">
                      {issued} issued
                      {t.quantity !== null
                        ? ` of ${t.quantity} (${remaining} left)`
                        : " (unlimited)"}
                    </span>
                  </div>
                  {canEdit ? (
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <form
                        action={updateTicketType.bind(null, orgSlug, eventId)}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <input type="hidden" name="id" value={t.id} />
                        <div className="w-44">
                          <Label htmlFor={`name-${t.id}`}>Name</Label>
                          <Input id={`name-${t.id}`} name="name" required defaultValue={t.name} />
                        </div>
                        <div className="w-28">
                          <Label htmlFor={`price-${t.id}`}>Price (R)</Label>
                          <Input
                            id={`price-${t.id}`}
                            name="priceRands"
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={(t.priceCents / 100).toString()}
                          />
                        </div>
                        <div className="w-28">
                          <Label htmlFor={`qty-${t.id}`}>Quantity</Label>
                          <Input
                            id={`qty-${t.id}`}
                            name="quantity"
                            type="number"
                            min={1}
                            placeholder="Unlimited"
                            defaultValue={t.quantity ?? ""}
                          />
                        </div>
                        <div className="w-20">
                          <Label htmlFor={`sort-${t.id}`}>Sort</Label>
                          <Input
                            id={`sort-${t.id}`}
                            name="sortOrder"
                            type="number"
                            min={0}
                            defaultValue={t.sortOrder}
                          />
                        </div>
                        <Button type="submit" variant="secondary">
                          Save
                        </Button>
                      </form>
                      <form action={deleteTicketType.bind(null, orgSlug, eventId)}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" variant="danger">
                          Delete
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {canEdit ? (
          <form
            action={createTicketType.bind(null, orgSlug, eventId)}
            className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5"
          >
            <div className="w-44">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" name="name" required placeholder="General admission" />
            </div>
            <div className="w-28">
              <Label htmlFor="new-price">Price (R)</Label>
              <Input
                id="new-price"
                name="priceRands"
                type="number"
                min={0}
                step="0.01"
                defaultValue={0}
                disabled={event.registrationType === "free_ticket"}
              />
            </div>
            <div className="w-28">
              <Label htmlFor="new-qty">Quantity</Label>
              <Input id="new-qty" name="quantity" type="number" min={1} placeholder="Unlimited" />
            </div>
            <div className="w-20">
              <Label htmlFor="new-sort">Sort</Label>
              <Input id="new-sort" name="sortOrder" type="number" min={0} defaultValue={0} />
            </div>
            <Button type="submit">Add ticket type</Button>
          </form>
        ) : null}
        {event.registrationType === "free_ticket" ? (
          <p className="mt-3 font-data text-xs text-fg-faint">
            This is a free ticket event, so prices stay at R0. Switch to paid
            tickets in the event settings to charge for entry.
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-display text-lg text-fg">Issued tickets</h2>
        {issuedTickets.length === 0 ? (
          <p className="mt-3 text-sm text-fg-faint">No tickets issued yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-fg-faint">
                  <th className="py-2 pr-4 font-normal">Attendee</th>
                  <th className="py-2 pr-4 font-normal">Ticket type</th>
                  <th className="py-2 pr-4 font-normal">Payment</th>
                  <th className="py-2 font-normal">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {issuedTickets.map(({ ticket, attendee, type }) => {
                  const badge =
                    PAYMENT_BADGE[ticket.paymentStatus] ?? PAYMENT_BADGE.pending;
                  return (
                    <tr key={ticket.id}>
                      <td className="py-2.5 pr-4 text-fg">
                        {[attendee.firstName, attendee.lastName]
                          .filter(Boolean)
                          .join(" ") || attendee.email || "Unknown"}
                        {attendee.email ? (
                          <span className="ml-2 font-data text-xs text-fg-faint">
                            {attendee.email}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4 text-fg-dim">{type.name}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="py-2.5 font-data text-xs text-fg-dim">
                        {ticket.issuedAt
                          ? new Intl.DateTimeFormat("en-ZA", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(ticket.issuedAt)
                          : "awaiting payment"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
