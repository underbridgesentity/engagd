"use server";

import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { canAddSeat } from "@/lib/entitlements";
import { audit } from "@/lib/audit";

const roleEnum = z.enum(["owner", "admin", "viewer"]);

function back(orgSlug: string, param: string): never {
  redirect(`/o/${orgSlug}/team?${param}`);
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

  const seat = await canAddSeat(ctx.organisationId);
  if (!seat.allowed) back(orgSlug, "error=seats-full");

  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    [user] = await db.insert(users).values({ email }).returning();
  }

  const [existing] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.organisationId, ctx.organisationId),
        eq(memberships.userId, user.id)
      )
    );
  if (existing) back(orgSlug, "error=already-member");

  await db.insert(memberships).values({
    organisationId: ctx.organisationId,
    userId: user.id,
    role: parsed.data.role,
  });
  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "member.invited",
    entityType: "membership",
    entityId: user.id,
    detail: { email, role: parsed.data.role },
  });

  revalidatePath(`/o/${orgSlug}/team`);
  back(orgSlug, "ok=invited");
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
