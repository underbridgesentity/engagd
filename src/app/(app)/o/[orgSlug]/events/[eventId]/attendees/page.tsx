import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, rsvpStatus } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { attendeeCapState } from "@/lib/entitlements";
import { Card, EmptyState } from "@/components/ui";
import { APP_URL, CapBanner, RsvpBadge, rsvpLabel } from "../../_shared";
import { CopyButton } from "../../_components/copy-button";
import { AddAttendeeForm } from "./add-attendee-form";
import { addAttendee, deleteAttendee } from "./actions";

const STATUSES = rsvpStatus.enumValues;

const sourceLabel: Record<string, string> = {
  email: "Email",
  manual: "Manual",
  public_link: "Public link",
  import: "Import",
};

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const { status } = await searchParams;
  const ctx = await requireOrg(orgSlug);
  const event = await requireOrgEvent(ctx, eventId);

  const filter = STATUSES.includes(status as (typeof STATUSES)[number])
    ? (status as (typeof STATUSES)[number])
    : undefined;

  const [rows, cap] = await Promise.all([
    db
      .select()
      .from(attendees)
      .where(
        filter
          ? and(eq(attendees.eventId, event.id), eq(attendees.rsvpStatus, filter))
          : eq(attendees.eventId, event.id)
      )
      .orderBy(desc(attendees.createdAt)),
    attendeeCapState(ctx.organisationId, event.id),
  ]);

  const base = `/o/${orgSlug}/events/${event.id}/attendees`;
  const micrositeUrl = `${APP_URL}/e/${event.slug}`;

  return (
    <div className="space-y-5">
      <CapBanner cap={cap} orgSlug={orgSlug} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-fg">Attendees</h2>
          <p className="mt-1 text-sm text-fg-dim">
            {cap.current} attendee{cap.current === 1 ? "" : "s"} on the list
            {cap.limit !== null ? ` of ${cap.limit} on your plan` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${base}/import`}
            className="inline-flex items-center rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            Import CSV
          </Link>
        </div>
      </div>

      <Card className="space-y-2">
        <h3 className="font-display text-base text-fg">Share the RSVP link</h3>
        <p className="text-sm text-fg-dim">
          Anyone with this link can RSVP. It always keeps working, even past plan limits.
        </p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-ink-2 px-3 py-2 font-data text-xs text-fg-dim">
            {micrositeUrl}
          </code>
          <CopyButton value={micrositeUrl} />
        </div>
      </Card>

      <AddAttendeeForm action={addAttendee.bind(null, orgSlug, event.id)} />

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={base}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            !filter
              ? "border-signal/50 bg-signal/15 text-signal-strong"
              : "border-line text-fg-dim hover:border-line-strong hover:text-fg"
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`${base}?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === s
                ? "border-signal/50 bg-signal/15 text-signal-strong"
                : "border-line text-fg-dim hover:border-line-strong hover:text-fg"
            }`}
          >
            {rsvpLabel[s]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={filter ? "Nobody with this status" : "No attendees yet"}
          hint={
            filter
              ? "Try a different filter or clear it to see the full list."
              : "Add attendees manually, import a CSV, or share the public RSVP link."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-line bg-raised text-left text-xs uppercase tracking-wider text-fg-faint">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Plus-ones</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const name = [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unnamed guest";
                const rsvpLink = `${APP_URL}/r/${a.qrToken}`;
                return (
                  <tr key={a.id} className="border-b border-line last:border-b-0 hover:bg-raised">
                    <td className="px-4 py-3 font-medium text-fg">{name}</td>
                    <td className="px-4 py-3 text-fg-dim">{a.email ?? ""}</td>
                    <td className="px-4 py-3 text-fg-dim">{a.phone ?? ""}</td>
                    <td className="px-4 py-3">
                      <RsvpBadge status={a.rsvpStatus} />
                    </td>
                    <td className="px-4 py-3 text-right font-data text-fg-dim">{a.plusOnes}</td>
                    <td className="px-4 py-3 text-fg-dim">{sourceLabel[a.source] ?? a.source}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <CopyButton value={rsvpLink} label="Copy RSVP link" />
                        <form action={deleteAttendee.bind(null, orgSlug, event.id, a.id)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-1.5 text-xs text-coral transition-colors hover:bg-coral/20"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
