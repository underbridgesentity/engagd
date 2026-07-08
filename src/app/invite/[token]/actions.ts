"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { memberships, organisations, orgInvites } from "@/db/schema";
import { canAddSeat } from "@/lib/entitlements";
import { audit } from "@/lib/audit";

// Accept an invite. This is a POST-only server action, never a page render,
// so a prefetch or link preload can never silently consume a seat. It
// re-validates everything server-side before mutating.
export async function acceptInvite(token: string): Promise<void> {
  const [row] = await db
    .select({ invite: orgInvites, org: organisations })
    .from(orgInvites)
    .innerJoin(organisations, eq(organisations.id, orgInvites.organisationId))
    .where(eq(orgInvites.token, token));
  if (!row) redirect(`/invite/${token}`);

  const { invite, org } = row;
  if (invite.acceptedAt) redirect(`/o/${org.slug}`);
  if (invite.expiresAt <= new Date()) redirect(`/invite/${token}`);

  const session = await auth();
  if (!session?.user?.email || !session.user.id) redirect("/login");
  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    redirect(`/invite/${token}`);
  }

  const userId = session.user.id;
  const [existingMembership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.organisationId, invite.organisationId),
        eq(memberships.userId, userId)
      )
    );

  if (!existingMembership) {
    const seat = await canAddSeat(invite.organisationId);
    if (!seat.allowed) redirect(`/invite/${token}?error=no-seats`);
    await db.insert(memberships).values({
      organisationId: invite.organisationId,
      userId,
      role: invite.role,
    });
  }

  await db
    .update(orgInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(orgInvites.id, invite.id));
  await audit({
    organisationId: invite.organisationId,
    userId,
    action: "invite.accepted",
    entityType: "org_invite",
    entityId: invite.id,
    detail: {
      email: invite.email,
      role: invite.role,
      alreadyMember: Boolean(existingMembership),
    },
  });

  redirect(`/o/${org.slug}`);
}
