import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, memberships, organisations } from "@/db/schema";

export type Role = "owner" | "admin" | "viewer";

// Role capability map. Check-in staff never pass through here: they use
// event-scoped access tokens, not sessions.
const ROLE_RANK: Record<Role, number> = { viewer: 0, admin: 1, owner: 2 };

export interface OrgContext {
  userId: string;
  organisationId: string;
  role: Role;
  organisation: typeof organisations.$inferSelect;
}

// The single chokepoint for organiser-side authorization. Every dashboard
// page and server action resolves its org context through this.
export async function requireOrg(
  orgSlug: string,
  minRole: Role = "viewer"
): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const rows = await db
    .select({ org: organisations, membership: memberships })
    .from(organisations)
    .innerJoin(
      memberships,
      and(
        eq(memberships.organisationId, organisations.id),
        eq(memberships.userId, session.user.id)
      )
    )
    .where(eq(organisations.slug, orgSlug));
  const row = rows[0];
  if (!row) redirect("/");
  const role = row.membership.role as Role;
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) redirect(`/o/${orgSlug}`);
  return {
    userId: session.user.id,
    organisationId: row.org.id,
    role,
    organisation: row.org,
  };
}

// Fetch an event only if it belongs to the given organisation. All event
// subresources go through this so cross-tenant access is impossible.
export async function requireOrgEvent(ctx: OrgContext, eventId: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.organisationId, ctx.organisationId))
    );
  if (!event) throw new Error("Event not found");
  return event;
}

export async function currentUserOrgs(userId: string) {
  return db
    .select({ org: organisations, role: memberships.role })
    .from(memberships)
    .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
    .where(eq(memberships.userId, userId));
}
