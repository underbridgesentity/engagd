import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, memberships, organisations, subscriptionPayments } from "@/db/schema";
import { PLANS } from "@/lib/entitlements";
import type { PlanTier } from "@/lib/entitlements";
import { audit } from "@/lib/audit";

const PAYSTACK_API = "https://api.paystack.co";

export type BillingIntervalValue = "monthly" | "annual";

// Thrown when Engagd's platform Paystack key is missing. The billing UI
// turns this into "Payments are not configured yet".
export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Payments are not configured yet");
    this.name = "PaymentsNotConfiguredError";
  }
}

// Platform billing uses Engagd's own Paystack key from the environment.
// This is deliberately separate from organiser bring-your-own-keys ticket
// payments (adapterForEvent); never mix the two.
function platformSecretKey(): string {
  const key = process.env.PLATFORM_PAYSTACK_SECRET_KEY;
  if (!key) throw new PaymentsNotConfiguredError();
  return key;
}

export function paymentsConfigured(): boolean {
  return Boolean(process.env.PLATFORM_PAYSTACK_SECRET_KEY);
}

function priceFor(tier: PlanTier, interval: BillingIntervalValue): number {
  const plan = PLANS[tier];
  const cents =
    interval === "annual" ? plan.annualPriceCents : plan.monthlyPriceCents;
  if (cents === null) {
    throw new Error(`Plan ${tier} has no self-serve price`);
  }
  if (cents <= 0) {
    throw new Error(`Plan ${tier} is free and needs no checkout`);
  }
  return cents;
}

export interface CheckoutStart {
  subscriptionPaymentId: string;
  authorizationUrl: string;
}

// Creates a subscription payment record and a Paystack checkout for it.
// Returns the URL to redirect the org owner to. Payment truth is never
// taken from the redirect: verifySubscriptionPayment does the real check.
export async function startSubscriptionCheckout(
  orgId: string,
  tier: PlanTier,
  interval: BillingIntervalValue,
  ownerEmail: string,
  baseUrl: string
): Promise<CheckoutStart> {
  const secretKey = platformSecretKey();
  const amountCents = priceFor(tier, interval);

  const [org] = await db
    .select({ slug: organisations.slug })
    .from(organisations)
    .where(eq(organisations.id, orgId));
  if (!org) throw new Error("Organisation not found");

  const [payment] = await db
    .insert(subscriptionPayments)
    .values({
      organisationId: orgId,
      planTier: tier,
      billingInterval: interval,
      provider: "paystack",
      amountCents,
      currency: "ZAR",
      status: "created",
    })
    .returning({ id: subscriptionPayments.id });

  const callbackUrl = `${baseUrl}/o/${org.slug}/billing/result/${payment.id}`;
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: ownerEmail,
      amount: amountCents,
      currency: "ZAR",
      callback_url: callbackUrl,
      metadata: {
        subscriptionPaymentId: payment.id,
        organisationId: orgId,
        planTier: tier,
        billingInterval: interval,
      },
    }),
  });
  if (!res.ok) {
    await db
      .update(subscriptionPayments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(subscriptionPayments.id, payment.id));
    throw new Error(`Paystack initialize failed (${res.status})`);
  }
  const body = (await res.json()) as {
    data: { reference: string; authorization_url: string };
  };

  await db
    .update(subscriptionPayments)
    .set({
      providerReference: body.data.reference,
      status: "pending",
      updatedAt: new Date(),
    })
    .where(eq(subscriptionPayments.id, payment.id));

  return {
    subscriptionPaymentId: payment.id,
    authorizationUrl: body.data.authorization_url,
  };
}

export type VerifyOutcome =
  | {
      status: "succeeded";
      planTier: PlanTier;
      billingInterval: BillingIntervalValue;
      periodEndsAt: Date;
    }
  | { status: "pending" }
  | { status: "failed" };

function periodEnd(from: Date, interval: BillingIntervalValue): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + (interval === "annual" ? 12 : 1));
  return end;
}

// Verifies a subscription payment against Paystack (the only source of
// truth) and, on success, applies the plan change to the organisation.
// Idempotent: an already-succeeded payment short-circuits without any
// provider call or re-application.
export async function verifySubscriptionPayment(
  subscriptionPaymentId: string
): Promise<VerifyOutcome> {
  const [payment] = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.id, subscriptionPaymentId));
  if (!payment) throw new Error("Subscription payment not found");

  if (payment.status === "succeeded") {
    return {
      status: "succeeded",
      planTier: payment.planTier,
      billingInterval: payment.billingInterval,
      periodEndsAt: payment.periodEndsAt ?? periodEnd(new Date(), payment.billingInterval),
    };
  }
  if (payment.status === "failed") return { status: "failed" };
  if (!payment.providerReference) return { status: "pending" };

  const secretKey = platformSecretKey();
  const res = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(payment.providerReference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  if (!res.ok) return { status: "pending" };
  const body = (await res.json()) as {
    data?: { status?: string; amount?: number };
  };

  const providerStatus = body.data?.status;
  if (providerStatus === "failed" || providerStatus === "abandoned") {
    await db
      .update(subscriptionPayments)
      .set({
        status: "failed",
        verificationResult: body,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, payment.id));
    return { status: "failed" };
  }
  if (providerStatus !== "success") return { status: "pending" };

  // Amount must match exactly; a mismatch is treated as failed, never applied.
  if (body.data?.amount !== payment.amountCents) {
    await db
      .update(subscriptionPayments)
      .set({
        status: "failed",
        verificationResult: body,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, payment.id));
    await audit({
      organisationId: payment.organisationId,
      action: "billing.payment_amount_mismatch",
      entityType: "subscription_payment",
      entityId: payment.id,
      detail: { expected: payment.amountCents, got: body.data?.amount ?? null },
    });
    return { status: "failed" };
  }

  const now = new Date();
  const endsAt = periodEnd(now, payment.billingInterval);

  await db
    .update(subscriptionPayments)
    .set({
      status: "succeeded",
      verificationResult: body,
      verifiedAt: now,
      periodEndsAt: endsAt,
      updatedAt: now,
    })
    .where(eq(subscriptionPayments.id, payment.id));

  const [org] = await db
    .select({
      planTier: organisations.planTier,
      billingInterval: organisations.billingInterval,
    })
    .from(organisations)
    .where(eq(organisations.id, payment.organisationId));

  await db
    .update(organisations)
    .set({
      planTier: payment.planTier,
      billingInterval: payment.billingInterval,
      billingStatus: "active",
      updatedAt: now,
    })
    .where(eq(organisations.id, payment.organisationId));

  await audit({
    organisationId: payment.organisationId,
    action: "billing.plan_changed",
    entityType: "organisation",
    entityId: payment.organisationId,
    detail: {
      from: org ? { tier: org.planTier, interval: org.billingInterval } : null,
      to: { tier: payment.planTier, interval: payment.billingInterval },
      subscriptionPaymentId: payment.id,
      amountCents: payment.amountCents,
      periodEndsAt: endsAt.toISOString(),
      via: "paystack_verified",
    },
  });

  return {
    status: "succeeded",
    planTier: payment.planTier,
    billingInterval: payment.billingInterval,
    periodEndsAt: endsAt,
  };
}

export type DowngradeCheck =
  | { ok: true }
  | { ok: false; problems: string[] };

// Checks current usage against the target tier's entitlements before a
// downgrade. Returns specific, actionable problems when over the limits.
export async function checkDowngrade(
  organisationId: string,
  target: PlanTier
): Promise<DowngradeCheck> {
  const ent = PLANS[target].entitlements;
  const [[activeRow], [seatRow]] = await Promise.all([
    db
      .select({ n: count() })
      .from(events)
      .where(
        and(
          eq(events.organisationId, organisationId),
          eq(events.status, "active")
        )
      ),
    db
      .select({ n: count() })
      .from(memberships)
      .where(eq(memberships.organisationId, organisationId)),
  ]);
  const activeEvents = activeRow?.n ?? 0;
  const seats = seatRow?.n ?? 0;

  const problems: string[] = [];
  if (ent.maxActiveEvents !== null && activeEvents > ent.maxActiveEvents) {
    const over = activeEvents - ent.maxActiveEvents;
    problems.push(
      `Archive ${over} event${over === 1 ? "" : "s"} first (${PLANS[target].name} allows ${ent.maxActiveEvents} active, you have ${activeEvents}).`
    );
  }
  if (ent.teamSeats !== null && seats > ent.teamSeats) {
    const over = seats - ent.teamSeats;
    problems.push(
      `Remove ${over} team member${over === 1 ? "" : "s"} first (${PLANS[target].name} allows ${ent.teamSeats} seat${ent.teamSeats === 1 ? "" : "s"}, you have ${seats}).`
    );
  }
  return problems.length ? { ok: false, problems } : { ok: true };
}

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

export function isDowngrade(from: PlanTier, to: PlanTier): boolean {
  return PLAN_RANK[to] < PLAN_RANK[from];
}
