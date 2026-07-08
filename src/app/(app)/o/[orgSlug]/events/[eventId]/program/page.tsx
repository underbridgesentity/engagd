import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventProgramItems } from "@/db/schema";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { formatDateTime } from "../../_shared";
import {
  createProgramItem,
  deleteProgramItem,
  moveProgramItem,
  updateProgramItem,
} from "./actions";
import { ProgramEditor } from "./program-editor";

function toInputValue(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const rows = await db
    .select()
    .from(eventProgramItems)
    .where(eq(eventProgramItems.eventId, event.id))
    .orderBy(asc(eventProgramItems.sortOrder), asc(eventProgramItems.createdAt));

  const items = rows.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    speaker: item.speaker ?? "",
    location: item.location ?? "",
    startsAt: toInputValue(item.startsAt),
    endsAt: toInputValue(item.endsAt),
    startsAtDisplay: item.startsAt
      ? formatDateTime(item.startsAt, event.timezone)
      : "Time to be confirmed",
    update: updateProgramItem.bind(null, orgSlug, event.id, item.id),
    remove: deleteProgramItem.bind(null, orgSlug, event.id, item.id),
    moveUp: moveProgramItem.bind(null, orgSlug, event.id, item.id, "up"),
    moveDown: moveProgramItem.bind(null, orgSlug, event.id, item.id, "down"),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-fg">Program</h2>
        <p className="mt-1 text-sm text-fg-dim">
          The running order shown on the event microsite. Times display in {event.timezone}.
        </p>
      </div>
      <ProgramEditor
        items={items}
        createAction={createProgramItem.bind(null, orgSlug, event.id)}
      />
    </div>
  );
}
