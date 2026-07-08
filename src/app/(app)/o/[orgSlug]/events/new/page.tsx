import Link from "next/link";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { createEvent } from "../actions";
import { EventForm } from "../_components/event-form";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const ent = await getEntitlements(ctx.organisationId);
  const boundCreate = createEvent.bind(null, orgSlug);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/o/${orgSlug}/events`} className="text-sm text-fg-dim hover:text-fg">
          Back to events
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg">Create event</h1>
        <p className="mt-1 text-sm text-fg-dim">
          Your event starts as a draft. Activate it when you are ready to invite guests.
        </p>
      </div>
      <EventForm
        action={boundCreate}
        orgSlug={orgSlug}
        paidTicketingAllowed={ent.paidTicketing}
        submitLabel="Create draft event"
        defaults={{
          name: "",
          slug: "",
          description: "",
          startsAt: "",
          endsAt: "",
          timezone: "Africa/Johannesburg",
          venueName: "",
          venueAddress: "",
          coverImageUrl: "",
          registrationType: "rsvp_only",
          allowPlusOnes: false,
          maxPlusOnes: 0,
          collectDietary: true,
        }}
      />
    </div>
  );
}
