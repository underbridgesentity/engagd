import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, memberships, organisations, subscriptionPayments } from "@/db/schema";
import { PLANS } from "@/lib/entitlements";
import type { PlanTier } from "@/lib/entitlements";
import { audit } from "@/lib/audit";
import { YocoAdapter } from "@/lib/payments/yoco";
import { PaystackAdapter } from "@/lib/payments/paystack";
import type { PaymentAdapter } from "@/lib/payments/types";

export type BillingIntervalValue = "monthly" | "annual";
type PlatformProvider = "yoco" | "paystack";

// Thrown when no platform payment key is configured. The billing UI turns
// this into "Payments are not configured yet".
export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Payments are not configured yet");
    this.name = "PaymentsNotConfiguredError";
  }
}

// Platform billing uses Engagd's own payment account, configured by
// environment keys. This is deliberately separate from organiser
// bring-your-own-keys ticket payments (adapterForEvent); never mix the two.
// Yoco is preferred when both are configured: subscription money settles
// straight to the bank account linked to the Yoco account.
function platformProvider(): PlatformProvider {
  if (process.env.PLATFORM_YOCO_SECRET_KEY) return "yoco";
  if (process.env.PLATFORM_PAYSTACK_SECRET_KEY) return "paystack";
  throw new PaymentsNotConfiguredError();
}

function platformAdapter(provider: PlatformProvider): PaymentAdapter {
  if (provider === "yoco") {
    const key = process.env.PLATFORM_YOCO_SECRET_KEY;
    if (!key) throw new PaymentsNotConfiguredError();
    return new YocoAdapter({ secretKey: key });
  }
  const key = process.env.PLATFORM_PAYSTACK_SECRET_KEY;
  if (!key) throw new PaymentsNotConfiguredError();
  return new PaystackAdapter({ secretKey: key });
}

export function paymentsConfigured(): boolean {
  return Boolean(
    process.env.PLATFORM_YOCO_SECRET_KEY ||
      process.env.PLATFORM_PAYSTACK_SECRET_KEY
  );
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

// Creates a subscription payment record and a hosted checkout for it with
// the platform provider. Returns the URL to redirect the org owner to.
// Payment truth is never taken from the redirect: verifySubscriptionPayment
// does the real check against the provider API.
export async function startSubscriptionCheckout(
  orgId: string,
  tier: PlanTier,
  interval: BillingIntervalValue,
  ownerEmail: string,
  baseUrl: string
): Promise<CheckoutStart> {
  const provider = platformProvider();
  const adapter = platformAdapter(provider);
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
      provider,
      amountCents,
      currency: "ZAR",
      status: "created",
    })
    .returning({ id: subscriptionPayments.id });

  const callbackUrl = `${baseUrl}/o/${org.slug}/billing/result/${payment.id}`;

  try {
    const checkout = await adapter.createCheckout({
      amountCents,
      currency: "ZAR",
      paymentId: payment.id,
      successUrl: callbackUrl,
      cancelUrl: callbackUrl,
      failureUrl: callbackUrl,
      metadata: {
        email: ownerEmail,
        subscriptionPaymentId: payment.id,
        organisationId: orgId,
        planTier: tier,
        billingInterval: interval,
      },
    });

    await db
      .update(subscriptionPayments)
      .set({
        providerReference: checkout.providerReference,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, payment.id));

    return {
      subscriptionPaymentId: payment.id,
      authorizationUrl: checkout.redirectUrl,
    };
  } catch (err) {
    await db
      .update(subscriptionPayments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(subscriptionPayments.id, payment.id));
    throw err;
  }
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
  const monthsToAdd = interval === "annual" ? 12 : 1;
  const end = new Date(from);
  const targetMonth = end.getMonth() + monthsToAdd;
  end.setMonth(targetMonth);
  // Guard against JS month rollover: adding a month to Jan 31 would land on
  // Mar 3, skipping February and granting extra days. If the day slipped,
  // clamp back to the last day of the intended month.
  if (end.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    end.setDate(0);
  }
  return end;
}

// Provider-reported states that mean the checkout is dead and will never
// complete, as opposed to still-pending.
function isTerminalFailure(raw: unknown): boolean {
  const record = raw as {
    status?: string;
    data?: { status?: string };
  } | null;
  const status = record?.data?.status ?? record?.status;
  return (
    status === "failed" ||
    status === "abandoned" ||
    status === "expired" ||
    status === "cancelled"
  );
}

// Verifies a subscription payment against the provider it was created with
// (the only source of truth) and, on success, applies the plan change to
// the organisation. Idempotent: an already-succeeded payment short-circuits
// without any provider call or re-application.
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

  const adapter = platformAdapter(payment.provider);
  let result: Awaited<ReturnType<PaymentAdapter["verifyPayment"]>>;
  try {
    result = await adapter.verifyPayment(payment.providerReference);
  } catch {
    return { status: "pending" };
  }

  if (!result.paid) {
    if (isTerminalFailure(result.raw)) {
      await db
        .update(subscriptionPayments)
        .set({
          status: "failed",
          verificationResult: result.raw,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPayments.id, payment.id));
      return { status: "failed" };
    }
    return { status: "pending" };
  }

  // Amount must match exactly; a mismatch is treated as failed, never applied.
  if (result.amountCents !== payment.amountCents) {
    await db
      .update(subscriptionPayments)
      .set({
        status: "failed",
        verificationResult: result.raw,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, payment.id));
    await audit({
      organisationId: payment.organisationId,
      action: "billing.payment_amount_mismatch",
      entityType: "subscription_payment",
      entityId: payment.id,
      detail: { expected: payment.amountCents, got: result.amountCents },
    });
    return { status: "failed" };
  }

  const now = new Date();
  const endsAt = periodEnd(now, payment.billingInterval);

  await db
    .update(subscriptionPayments)
    .set({
      status: "succeeded",
      verificationResult: result.raw,
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
      via: `${payment.provider}_verified`,
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
