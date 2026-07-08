"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { emailDomains } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { audit } from "@/lib/audit";
import { resend } from "@/lib/email";

function back(orgSlug: string, param: string): never {
  redirect(`/o/${orgSlug}/settings/domain?${param}`);
}

const domainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
      "invalid domain"
    ),
});

type ResendRecord = {
  record?: string;
  type?: string;
  name?: string;
  value?: string;
  status?: string;
};

function mapRecords(records: ResendRecord[] | undefined | null) {
  return (records ?? []).map((r) => ({
    type: r.type ?? r.record ?? "TXT",
    name: r.name ?? "",
    value: r.value ?? "",
    status: r.status ?? "not_started",
  }));
}

function mapStatus(
  status: string | undefined
): "pending" | "verified" | "failed" {
  if (status === "verified") return "verified";
  if (status === "failed" || status === "temporary_failure") return "failed";
  return "pending";
}

export async function addSendingDomain(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const ent = await getEntitlements(ctx.organisationId);
  if (!ent.customDomain) back(orgSlug, "error=domain-locked");

  const parsed = domainSchema.safeParse({ domain: formData.get("domain") });
  if (!parsed.success) back(orgSlug, "error=invalid-domain");
  const domain = parsed.data.domain;

  const [existing] = await db
    .select({ id: emailDomains.id })
    .from(emailDomains)
    .where(
      and(
        eq(emailDomains.organisationId, ctx.organisationId),
        eq(emailDomains.domain, domain)
      )
    );
  if (existing) back(orgSlug, "error=already-added");

  let resendDomainId: string;
  let dnsRecords: ReturnType<typeof mapRecords>;
  try {
    const { data, error } = await resend().domains.create({ name: domain });
    if (error || !data) throw new Error(error?.message ?? "create failed");
    resendDomainId = data.id;
    dnsRecords = mapRecords(
      (data as { records?: ResendRecord[] }).records
    );
  } catch {
    back(orgSlug, "error=provider-failed");
  }

  const [row] = await db
    .insert(emailDomains)
    .values({
      organisationId: ctx.organisationId,
      domain,
      resendDomainId,
      status: "pending",
      dnsRecords,
    })
    .returning({ id: emailDomains.id });

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "email_domain.added",
    entityType: "email_domain",
    entityId: row.id,
    detail: { domain },
  });

  revalidatePath(`/o/${orgSlug}/settings/domain`);
  back(orgSlug, "ok=added");
}

export async function recheckSendingDomain(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const ent = await getEntitlements(ctx.organisationId);
  if (!ent.customDomain) back(orgSlug, "error=domain-locked");

  const id = String(formData.get("id") ?? "");
  const [row] = await db
    .select()
    .from(emailDomains)
    .where(
      and(
        eq(emailDomains.id, id),
        eq(emailDomains.organisationId, ctx.organisationId)
      )
    );
  if (!row || !row.resendDomainId) back(orgSlug, "error=not-found");

  try {
    // Ask Resend to re-run verification, then read back the fresh state.
    await resend().domains.verify(row.resendDomainId);
    const { data, error } = await resend().domains.get(row.resendDomainId);
    if (error || !data) throw new Error(error?.message ?? "get failed");
    const fresh = data as {
      status?: string;
      records?: ResendRecord[];
    };
    await db
      .update(emailDomains)
      .set({
        status: mapStatus(fresh.status),
        dnsRecords: mapRecords(fresh.records),
        lastCheckedAt: new Date(),
      })
      .where(eq(emailDomains.id, row.id));
  } catch {
    back(orgSlug, "error=provider-failed");
  }

  revalidatePath(`/o/${orgSlug}/settings/domain`);
  back(orgSlug, "ok=checked");
}

export async function removeSendingDomain(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "admin");

  const id = String(formData.get("id") ?? "");
  const [row] = await db
    .select()
    .from(emailDomains)
    .where(
      and(
        eq(emailDomains.id, id),
        eq(emailDomains.organisationId, ctx.organisationId)
      )
    );
  if (!row) back(orgSlug, "error=not-found");

  if (row.resendDomainId) {
    try {
      await resend().domains.remove(row.resendDomainId);
    } catch {
      // If Resend removal fails we still detach it locally; sends fall back
      // to the platform domain either way.
    }
  }

  await db.delete(emailDomains).where(eq(emailDomains.id, row.id));

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "email_domain.removed",
    entityType: "email_domain",
    entityId: row.id,
    detail: { domain: row.domain },
  });

  revalidatePath(`/o/${orgSlug}/settings/domain`);
  back(orgSlug, "ok=removed");
}
