import Link from "next/link";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { updateEvent } from "../../actions";
import { EventForm } from "../../_components/event-form";

// Inverse of new Date("YYYY-MM-DDTHH:mm") on the server, so values round-trip.
function toInputValue(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const ent = await getEntitlements(ctx.organisationId);
  const boundUpdate = updateEvent.bind(null, orgSlug, event.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/o/${orgSlug}/events/${event.id}`} className="text-sm text-fg-dim hover:text-fg">
          Back to {event.name}
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg">Edit event</h1>
      </div>
      <EventForm
        action={boundUpdate}
        orgSlug={orgSlug}
        paidTicketingAllowed={ent.paidTicketing || event.registrationType === "paid_ticket"}
        submitLabel="Save changes"
        defaults={{
          name: event.name,
          slug: event.slug,
          description: event.description ?? "",
          startsAt: toInputValue(event.startsAt),
          endsAt: toInputValue(event.endsAt),
          timezone: event.timezone,
          venueName: event.venueName ?? "",
          venueAddress: event.venueAddress ?? "",
          coverImageUrl: event.coverImageUrl ?? "",
          registrationType: event.registrationType,
          allowPlusOnes: event.allowPlusOnes,
          maxPlusOnes: event.maxPlusOnes,
          collectDietary: event.collectDietary,
        }}
      />
    </div>
  );
}
