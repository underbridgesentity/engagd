import Link from "next/link";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { EventStatusBadge } from "../_shared";

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
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/attendees`, label: "Attendees" },
    { href: `${base}/invites`, label: "Invites" },
    { href: `${base}/tickets`, label: "Tickets" },
    { href: `${base}/questions`, label: "Questions" },
    { href: `${base}/program`, label: "Program" },
    { href: `${base}/live`, label: "Live" },
    { href: `${base}/checkin`, label: "Check-in" },
    { href: `${base}/edit`, label: "Edit" },
  ];

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
      <nav className="flex gap-1 overflow-x-auto border-b border-line pb-px">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap rounded-t-lg px-3 py-2 text-sm text-fg-dim transition-colors hover:bg-raised hover:text-fg"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
