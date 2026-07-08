import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customQuestions } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { attendeeCapState } from "@/lib/entitlements";
import { CapBanner } from "../../../_shared";
import { importAttendees } from "./actions";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const [questions, cap] = await Promise.all([
    db
      .select({ id: customQuestions.id, label: customQuestions.label })
      .from(customQuestions)
      .where(eq(customQuestions.eventId, event.id))
      .orderBy(asc(customQuestions.sortOrder)),
    attendeeCapState(ctx.organisationId, event.id),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-fg">Import attendees</h2>
        <p className="mt-1 text-sm text-fg-dim">
          Bring in a guest list from a spreadsheet. Duplicates by email are skipped automatically.
        </p>
      </div>
      <CapBanner cap={cap} orgSlug={orgSlug} />
      <ImportWizard
        attendeesHref={`/o/${orgSlug}/events/${event.id}/attendees`}
        customQuestions={questions}
        importAction={importAttendees.bind(null, orgSlug, event.id)}
      />
    </div>
  );
}
