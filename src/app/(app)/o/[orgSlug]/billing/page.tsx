import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, memberships, subscriptionPayments } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements, PLANS } from "@/lib/entitlements";
import { Badge, Button, Card } from "@/components/ui";
import { changePlan } from "./actions";

const PLAN_ORDER = ["free", "starter", "professional", "enterprise"] as const;

function rands(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function UsageBar({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number | null;
}) {
  const pct =
    limit === null ? 0 : Math.min(100, Math.round((current / Math.max(limit, 1)) * 100));
  const tone = pct >= 100 ? "bg-coral" : pct >= 80 ? "bg-ember" : "bg-signal";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-fg-dim">{label}</span>
        <span className="font-data text-xs text-fg-faint">
          {current} / {limit === null ? "unlimited" : limit}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised-2">
        {limit === null ? (
          <div className="h-full w-full bg-mint/30" />
        ) : (
          <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

const ERROR_COPY: Record<string, string> = {
  "invalid-plan": "That plan selection was not valid. Pick a plan below.",
  "enterprise-contact":
    "Enterprise is set up by our team. Email hello@engagd.co.za and we will get you sorted.",
  "payments-not-configured":
    "Payments are not configured yet. Plan changes that need payment are unavailable until they are.",
  "downgrade-blocked":
    "You are over the limits of that plan, so we cannot downgrade you yet.",
};

const STATUS_BADGE: Record<
  string,
  { tone: "neutral" | "signal" | "mint" | "ember" | "coral"; label: string }
> = {
  created: { tone: "neutral", label: "Created" },
  pending: { tone: "ember", label: "Pending" },
  succeeded: { tone: "mint", label: "Succeeded" },
  failed: { tone: "coral", label: "Failed" },
  refunded: { tone: "neutral", label: "Refunded" },
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    ok?: string;
    interval?: string;
    detail?: string;
  }>;
}) {
  const { orgSlug } = await params;
  const { error, ok, interval, detail } = await searchParams;
  const ctx = await requireOrg(orgSlug, "owner");
  const showAnnual = interval
    ? interval === "annual"
    : ctx.organisation.billingInterval === "annual";

  const [ent, [activeRow], [seatRow], history] = await Promise.all([
    getEntitlements(ctx.organisationId),
    db
      .select({ n: count() })
      .from(events)
      .where(
        and(
          eq(events.organisationId, ctx.organisationId),
          eq(events.status, "active")
        )
      ),
    db
      .select({ n: count() })
      .from(memberships)
      .where(eq(memberships.organisationId, ctx.organisationId)),
    db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.organisationId, ctx.organisationId))
      .orderBy(desc(subscriptionPayments.createdAt))
      .limit(20),
  ]);

  const currentPlan = PLANS[ctx.organisation.planTier];
  const periodEndsAt =
    history.find((p) => p.status === "succeeded")?.periodEndsAt ?? null;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl text-fg">Billing</h1>
      <p className="mt-1 text-sm text-fg-dim">
        Manage your plan and see how much of it you are using.
      </p>

      {error ? (
        <div role="alert" className="mt-4 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          <p>{ERROR_COPY[error] ?? "Something went wrong. Try again."}</p>
          {error === "downgrade-blocked" && detail ? <p className="mt-1">{detail}</p> : null}
        </div>
      ) : null}
      {ok === "plan-changed" ? (
        <p role="status" className="mt-4 rounded-lg border border-mint/40 bg-mint/10 px-3 py-2 text-sm text-mint">
          Plan updated. New limits apply immediately.
        </p>
      ) : null}
      {ok === "unchanged" ? (
        <p role="status" className="mt-4 rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg-dim">
          You are already on that plan and interval.
        </p>
      ) : null}

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-fg-faint">Current plan</p>
            <p className="mt-1 font-display text-2xl text-fg">{currentPlan.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge tone="signal">{ctx.organisation.billingInterval}</Badge>
            {periodEndsAt ? (
              <span className="font-data text-xs text-fg-faint">
                Paid through {formatDate(periodEndsAt)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <UsageBar
            label="Active events"
            current={activeRow?.n ?? 0}
            limit={ent.maxActiveEvents}
          />
          <UsageBar
            label="Team seats"
            current={seatRow?.n ?? 0}
            limit={ent.teamSeats}
          />
        </div>
      </Card>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-fg">Change plan</h2>
        <div className="flex rounded-lg border border-line bg-raised p-1 text-sm">
          <Link
            href={`/o/${orgSlug}/billing?interval=monthly`}
            className={`rounded-md px-3 py-1.5 ${
              !showAnnual ? "bg-raised-2 text-fg" : "text-fg-dim hover:text-fg"
            }`}
          >
            Monthly
          </Link>
          <Link
            href={`/o/${orgSlug}/billing?interval=annual`}
            className={`rounded-md px-3 py-1.5 ${
              showAnnual ? "bg-raised-2 text-fg" : "text-fg-dim hover:text-fg"
            }`}
          >
            Annual
          </Link>
        </div>
      </div>
      <p className="mt-2 font-data text-xs text-fg-faint">
        Annual billing: pay for 10 months, get 12. Paid plan changes go through
        a secure Paystack checkout and apply as soon as payment is confirmed.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent =
            tier === ctx.organisation.planTier &&
            (showAnnual ? "annual" : "monthly") === ctx.organisation.billingInterval;
          const price = showAnnual ? plan.annualPriceCents : plan.monthlyPriceCents;
          const e = plan.entitlements;
          return (
            <Card key={tier} className={isCurrent ? "border-signal/60" : undefined}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base text-fg">{plan.name}</h3>
                {isCurrent ? <Badge tone="signal">Current</Badge> : null}
              </div>
              <p className="mt-3 font-display text-xl text-fg">
                {price === null ? (
                  "Contact us"
                ) : price === 0 ? (
                  "R0"
                ) : (
                  <>
                    {rands(price)}
                    <span className="text-xs font-normal text-fg-faint">
                      {showAnnual ? " /year" : " /month"}
                    </span>
                  </>
                )}
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-fg-dim">
                <li>
                  {e.maxActiveEvents === null
                    ? "Unlimited active events"
                    : `${e.maxActiveEvents} active event${e.maxActiveEvents === 1 ? "" : "s"}`}
                </li>
                <li>
                  {e.maxAttendeesPerEvent === null
                    ? "Unlimited attendees"
                    : `${e.maxAttendeesPerEvent.toLocaleString("en-ZA")} attendees per event`}
                </li>
                <li>
                  {e.teamSeats === null
                    ? "Unlimited seats"
                    : `${e.teamSeats} seat${e.teamSeats === 1 ? "" : "s"}`}
                </li>
                <li>{e.analytics === "full" ? "Full analytics" : "Basic analytics"}</li>
              </ul>
              {tier === "enterprise" ? (
                <a
                  href="/contact"
                  className="mt-4 block rounded-lg border border-line-strong px-3 py-1.5 text-center text-sm text-fg hover:border-signal/60"
                >
                  Contact us
                </a>
              ) : isCurrent ? (
                <p className="mt-4 text-center font-data text-xs text-fg-faint">
                  Your plan
                </p>
              ) : (
                <form action={changePlan.bind(null, orgSlug)} className="mt-4">
                  <input type="hidden" name="tier" value={tier} />
                  <input
                    type="hidden"
                    name="interval"
                    value={showAnnual ? "annual" : "monthly"}
                  />
                  <Button type="submit" variant="secondary" className="w-full">
                    Change plan
                  </Button>
                </form>
              )}
            </Card>
          );
        })}
      </div>

      <h2 className="mt-10 font-display text-lg text-fg">Billing history</h2>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-fg-dim">
          No subscription payments yet. Upgrading to a paid plan will show
          payments here.
        </p>
      ) : (
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-fg-faint">
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Plan</th>
                <th className="px-4 py-3 font-normal">Interval</th>
                <th className="px-4 py-3 font-normal">Amount</th>
                <th className="px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? {
                  tone: "neutral" as const,
                  label: p.status,
                };
                return (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-data text-xs text-fg-dim">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-fg">{PLANS[p.planTier].name}</td>
                    <td className="px-4 py-3 text-fg-dim">{p.billingInterval}</td>
                    <td className="px-4 py-3 font-data text-fg">
                      {rands(p.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
