import Link from "next/link";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { EventStatusBadge } from "../_shared";
import { EventTabs } from "./_components/event-tabs";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug);
  const event = await requireOrgEvent(ctx, eventId);

  const base = `/o/${orgSlug}/events/${eventId}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/o/${orgSlug}/events`} className="text-sm text-fg-dim hover:text-fg">
          Back to events
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-fg">{event.name}</h1>
          <EventStatusBadge status={event.status} />
        </div>
      </div>
      <EventTabs base={base} />
      {children}
    </div>
  );
}
