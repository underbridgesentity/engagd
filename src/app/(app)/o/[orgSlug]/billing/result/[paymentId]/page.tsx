import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { subscriptionPayments } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { PLANS } from "@/lib/entitlements";
import {
  PaymentsNotConfiguredError,
  verifySubscriptionPayment,
  type VerifyOutcome,
} from "@/lib/billing";
import { Badge, Card } from "@/components/ui";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function rands(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

// Payment result page. The provider redirect lands here, but nothing on
// this page trusts redirect params: we always verify server-side against
// the provider before showing success.
export default async function BillingResultPage({
  params,
}: {
  params: Promise<{ orgSlug: string; paymentId: string }>;
}) {
  const { orgSlug, paymentId } = await params;
  const ctx = await requireOrg(orgSlug, "owner");

  const [payment] = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.id, paymentId));
  if (!payment || payment.organisationId !== ctx.organisationId) notFound();

  let outcome: VerifyOutcome;
  let notConfigured = false;
  try {
    outcome = await verifySubscriptionPayment(paymentId);
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) {
      notConfigured = true;
      outcome = { status: "pending" };
    } else {
      throw err;
    }
  }

  const plan = PLANS[payment.planTier];

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-fg">Payment result</h1>

      {notConfigured ? (
        <Card className="mt-6 border-coral/40">
          <p className="text-sm text-coral">Payments are not configured yet.</p>
          <p className="mt-2 text-sm text-fg-dim">
            We could not verify this payment because payment collection is not
            set up on this server. Contact support if you were charged.
          </p>
        </Card>
      ) : outcome.status === "succeeded" ? (
        <Card className="mt-6 border-mint/40">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg text-fg">Payment received</p>
            <Badge tone="mint">Succeeded</Badge>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-dim">Plan</dt>
              <dd className="text-fg">
                {plan.name} ({payment.billingInterval})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-dim">Amount</dt>
              <dd className="font-data text-fg">{rands(payment.amountCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-dim">Paid through</dt>
              <dd className="text-fg">{formatDate(outcome.periodEndsAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-fg-dim">
            Your new limits apply immediately.
          </p>
        </Card>
      ) : outcome.status === "failed" ? (
        <Card className="mt-6 border-coral/40">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg text-fg">Payment failed</p>
            <Badge tone="coral">Failed</Badge>
          </div>
          <p className="mt-3 text-sm text-fg-dim">
            The payment for {plan.name} ({payment.billingInterval}) did not go
            through. Your plan has not changed. You can start a new checkout
            from the billing page.
          </p>
        </Card>
      ) : (
        <Card className="mt-6 border-ember/40">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg text-fg">Payment pending</p>
            <Badge tone="ember">Pending</Badge>
          </div>
          <p className="mt-3 text-sm text-fg-dim">
            We have not seen a confirmed payment from the provider yet. If you
            just paid, give it a moment and check again.
          </p>
          <Link
            href={`/o/${orgSlug}/billing/result/${paymentId}`}
            className="mt-4 inline-block rounded-lg border border-line-strong px-4 py-2 text-sm text-fg hover:border-signal/60"
          >
            Check again
          </Link>
        </Card>
      )}

      <p className="mt-6 text-sm">
        <Link href={`/o/${orgSlug}/billing`} className="text-signal hover:underline">
          Back to billing
        </Link>
      </p>
    </div>
  );
}
