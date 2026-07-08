import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(entry: {
  organisationId: string;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    organisationId: entry.organisationId,
    userId: entry.userId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    detail: entry.detail ?? {},
  });
}
