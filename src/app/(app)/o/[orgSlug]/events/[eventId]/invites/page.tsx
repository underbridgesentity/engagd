import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailCampaigns } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "../../_shared";
import { cancelCampaign, createCampaign } from "./actions";
import { ComposeForm } from "./compose-form";

const statusTone: Record<string, "neutral" | "signal" | "mint" | "ember" | "coral"> = {
  draft: "neutral",
  scheduled: "ember",
  sending: "signal",
  sent: "mint",
  cancelled: "neutral",
  failed: "coral",
};

const audienceLabel: Record<string, string> = {
  all: "Everyone",
  non_responders: "Not yet responded",
  attending: "Attending",
  not_attending: "Not attending",
  maybe: "Maybe",
  waitlisted: "Waitlisted",
  checked_in: "Checked in",
  no_shows: "No-shows",
};

export default async function InvitesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const campaigns = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.eventId, event.id))
    .orderBy(desc(emailCampaigns.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-fg">Invitations and reminders</h2>
        <p className="mt-1 text-sm text-fg-dim">
          Email your guest list. Sends go to attendees with an email address only.
        </p>
      </div>

      <ComposeForm action={createCampaign.bind(null, orgSlug, event.id)} />

      <div className="space-y-3">
        <h3 className="font-display text-base text-fg">Campaign history</h3>
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            hint="Invitations and reminders you send or schedule will show up here."
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-line">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-raised text-left text-xs uppercase tracking-wider text-fg-faint">
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Audience</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 text-right font-medium">Recipients</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-b-0 hover:bg-raised">
                    <td className="px-4 py-3 font-medium text-fg">{c.subject}</td>
                    <td className="px-4 py-3 text-fg-dim">
                      {audienceLabel[c.audience] ?? c.audience}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[c.status] ?? "neutral"}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-fg-dim">
                      {c.status === "sent" && c.sentAt
                        ? `Sent ${formatDateTime(c.sentAt, event.timezone)}`
                        : c.scheduledFor
                          ? `Scheduled for ${formatDateTime(c.scheduledFor, event.timezone)}`
                          : formatDateTime(c.createdAt, event.timezone)}
                    </td>
                    <td className="px-4 py-3 text-right font-data text-fg-dim">
                      {c.recipientCount ?? ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === "scheduled" ? (
                        <form action={cancelCampaign.bind(null, orgSlug, event.id, c.id)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-1.5 text-xs text-coral transition-colors hover:bg-coral/20"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
