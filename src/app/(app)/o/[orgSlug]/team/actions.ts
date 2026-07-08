"use server";

import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { and, count, eq, gt, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { memberships, orgInvites, users } from "@/db/schema";
import { requireOrg, type OrgContext } from "@/lib/tenancy";
import { canAddSeat, getEntitlements } from "@/lib/entitlements";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const roleEnum = z.enum(["owner", "admin", "viewer"]);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function back(orgSlug: string, param: string): never {
  redirect(`/o/${orgSlug}/team?${param}`);
}

function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

async function ownerCount(organisationId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(memberships)
    .where(
      and(
        eq(memberships.organisationId, organisationId),
        eq(memberships.role, "owner")
      )
    );
  return row?.n ?? 0;
}

// Seat gate for creating an invite: the plan's canAddSeat must pass, and the
// combined total of current members plus pending unexpired invites must also
// fit under the seat limit. An invite being refreshed is excluded so a
// re-invite at the boundary does not block itself.
async function canAddInvite(
  organisationId: string,
  excludeInviteId?: string
): Promise<boolean> {
  const seat = await canAddSeat(organisationId);
  if (!seat.allowed) return false;
  const ent = await getEntitlements(organisationId);
  if (ent.teamSeats === null) return true;
  const pendingWhere = [
    eq(orgInvites.organisationId, organisationId),
    isNull(orgInvites.acceptedAt),
    gt(orgInvites.expiresAt, new Date()),
  ];
  if (excludeInviteId) pendingWhere.push(ne(orgInvites.id, excludeInviteId));
  const [membersRow] = await db
    .select({ n: count() })
    .from(memberships)
    .where(eq(memberships.organisationId, organisationId));
  const [pendingRow] = await db
    .select({ n: count() })
    .from(orgInvites)
    .where(and(...pendingWhere));
  return (membersRow?.n ?? 0) + (pendingRow?.n ?? 0) < ent.teamSeats;
}

async function sendInviteEmail(ctx: OrgContext, email: string, token: string) {
  const link = `${baseUrl()}/invite/${token}`;
  const orgName = ctx.organisation.name;
  await sendEmail({
    to: email,
    subject: `You are invited to ${orgName} on Engagd`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Join ${orgName} on Engagd</h2>
        <p>You have been invited to join <strong>${orgName}</strong> on Engagd, the event engagement platform.</p>
        <p><a href="${link}" style="display:inline-block;background:#5b8cff;color:#0b0e14;padding:10px 18px;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
        <p style="color:#667089;font-size:12px;">This invite expires in 7 days. Sign in with this email address (${email}) to accept. If you did not expect this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function inviteMember(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const parsed = z
    .object({ email: z.string().email(), role: roleEnum })
    .safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) back(orgSlug, "error=invalid-invite");
  const email = parsed.data.email.toLowerCase();

  // Only owners can grant ownership.
  if (parsed.data.role === "owner" && ctx.role !== "owner") {
    back(orgSlug, "error=owner-only");
  }

  // Already a member? No invite needed.
  const [existingMember] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.organisationId, ctx.organisationId),
        eq(users.email, email)
      )
    );
  if (existingMember) back(orgSlug, "error=already-member");

  // Re-inviting the same address refreshes the token and expiry.
  const [existingInvite] = await db
    .select()
    .from(orgInvites)
    .where(
      and(
        eq(orgInvites.organisationId, ctx.organisationId),
        eq(orgInvites.email, email)
      )
    );

  const allowed = await canAddInvite(ctx.organisationId, existingInvite?.id);
  if (!allowed) back(orgSlug, "error=seats-full");

  const token = createId();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  let inviteId: string;
  if (existingInvite) {
    await db
      .update(orgInvites)
      .set({
        token,
        expiresAt,
        acceptedAt: null,
        role: parsed.data.role,
        invitedByUserId: ctx.userId,
      })
      .where(eq(orgInvites.id, existingInvite.id));
    inviteId = existingInvite.id;
  } else {
    const [created] = await db
      .insert(orgInvites)
      .values({
        organisationId: ctx.organisationId,
        email,
        role: parsed.data.role,
        token,
        invitedByUserId: ctx.userId,
        expiresAt,
      })
      .returning({ id: orgInvites.id });
    inviteId = created.id;
  }

  await sendInviteEmail(ctx, email, token);
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "invite.created",
    entityType: "org_invite",
    entityId: inviteId,
    detail: { email, role: parsed.data.role, refreshed: Boolean(existingInvite) },
  });

  revalidatePath(`/o/${orgSlug}/team`);
  back(orgSlug, "ok=invited");
}

export async function resendInvite(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const parsed = z
    .object({ inviteId: z.string().min(1) })
    .safeParse({ inviteId: formData.get("inviteId") });
  if (!parsed.success) back(orgSlug, "error=invite-not-found");

  const [invite] = await db
    .select()
    .from(orgInvites)
    .where(
      and(
        eq(orgInvites.id, parsed.data.inviteId),
        eq(orgInvites.organisationId, ctx.organisationId)
      )
    );
  if (!invite || invite.acceptedAt) back(orgSlug, "error=invite-not-found");

  // Refresh token and expiry on resend. Seat gate still applies in case the
  // invite had expired and the org has since filled up.
  const allowed = await canAddInvite(ctx.organisationId, invite.id);
  if (!allowed) back(orgSlug, "error=seats-full");

  const token = createId();
  await db
    .update(orgInvites)
    .set({ token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
    .where(eq(orgInvites.id, invite.id));

  await sendInviteEmail(ctx, invite.email, token);
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "invite.created",
    entityType: "org_invite",
    entityId: invite.id,
    detail: { email: invite.email, role: invite.role, resend: true },
  });

  revalidatePath(`/o/${orgSlug}/team`);
  back(orgSlug, "ok=resent");
}

export async function revokeInvite(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const parsed = z
    .object({ inviteId: z.string().min(1) })
    .safeParse({ inviteId: formData.get("inviteId") });
  if (!parsed.success) back(orgSlug, "error=invite-not-found");

  const [invite] = await db
    .select()
    .from(orgInvites)
    .where(
      and(
        eq(orgInvites.id, parsed.data.inviteId),
        eq(orgInvites.organisationId, ctx.organisationId)
      )
    );
  if (!invite || invite.acceptedAt) back(orgSlug, "error=invite-not-found");

  // No revoked flag on the table: deleting the row invalidates the token.
  await db.delete(orgInvites).where(eq(orgInvites.id, invite.id));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "invite.revoked",
    entityType: "org_invite",
    entityId: invite.id,
    detail: { email: invite.email, role: invite.role },
  });

  revalidatePath(`/o/${orgSlug}/team`);
  back(orgSlug, "ok=revoked");
}

export async function changeRole(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "owner");

  const parsed = z
    .object({ membershipId: z.string().min(1), role: roleEnum })
    .safeParse({
      membershipId: formData.get("membershipId"),
      role: formData.get("role"),
    });
  if (!parsed.success) back(orgSlug, "error=invalid-role");

  const [member] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.id, parsed.data.membershipId),
        eq(memberships.organisationId, ctx.organisationId)
      )
    );
  if (!member) back(orgSlug, "error=not-found");
  if (member.role === parsed.data.role) back(orgSlug, "ok=unchanged");

  if (member.role === "owner" && parsed.data.role !== "owner") {
    const owners = await ownerCount(ctx.organisationId);
    if (owners <= 1) back(orgSlug, "error=last-owner");
  }

  await db
    .update(memberships)
    .set({ role: parsed.data.role })
    .where(eq(memberships.id, member.id));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "member.role_changed",
    entityType: "membership",
    entityId: member.id,
    detail: { from: member.role, to: parsed.data.role, memberUserId: member.userId },
  });

  revalidatePath(`/o/${orgSlug}/team`);
  back(orgSlug, "ok=role-changed");
}

export async function removeMember(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "owner");

  const parsed = z
    .object({ membershipId: z.string().min(1) })
    .safeParse({ membershipId: formData.get("membershipId") });
  if (!parsed.success) back(orgSlug, "error=invalid-remove");

  const [member] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.id, parsed.data.membershipId),
        eq(memberships.organisationId, ctx.organisationId)
      )
    );
  if (!member) back(orgSlug, "error=not-found");

  if (member.role === "owner") {
    const owners = await ownerCount(ctx.organisationId);
    if (owners <= 1) back(orgSlug, "error=last-owner");
  }

  await db.delete(memberships).where(eq(memberships.id, member.id));
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "member.removed",
    entityType: "membership",
    entityId: member.id,
    detail: { memberUserId: member.userId, role: member.role },
  });

  revalidatePath(`/o/${orgSlug}/team`);
  if (member.userId === ctx.userId) redirect("/home");
  back(orgSlug, "ok=removed");
}
