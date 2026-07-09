"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { buttonClasses, cx } from "@/components/ui";

type Billing = "monthly" | "annual";

// Serializable plan card data, computed server-side from PLANS so this
// client bundle never imports the entitlements module (which touches the db).
export type PlanCardData = {
  tier: string;
  name: string;
  featured: boolean;
  prices: Record<Billing, { headline: string; note: string }>;
  cta: { href: string; label: string };
  features: string[];
};

const BILLING_OPTIONS: { value: Billing; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

/**
 * Billing toggle plus the plan cards it controls. Both price sets are
 * rendered server-side (SSR includes monthly and annual spans); the toggle
 * only flips a data-billing attribute and the hidden class on the inactive
 * set, so no prices are computed on the client.
 */
export function PricingPlans({ plans }: { plans: PlanCardData[] }) {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div data-billing={billing}>
      <div className="flex items-center gap-4">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex rounded-full border border-line-strong bg-raised p-1"
        >
          {BILLING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={billing === opt.value}
              onClick={() => setBilling(opt.value)}
              className={cx(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                billing === opt.value
                  ? "bg-signal text-ink"
                  : "text-fg-dim hover:text-fg"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="font-data text-xs uppercase tracking-widest text-mint">
          2 months free
        </span>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={cx(
              "relative flex flex-col rounded-3xl border p-7",
              plan.featured
                ? "border-signal bg-signal/10 shadow-[var(--shadow-glow)]"
                : "border-line bg-raised"
            )}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-signal px-3 py-1 font-data text-xs font-bold uppercase tracking-widest text-ink">
                Most popular
              </span>
            )}
            <p className="text-sm font-bold uppercase tracking-widest text-fg-dim">
              {plan.name}
            </p>
            <div className="mt-5">
              {BILLING_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  data-price={opt.value}
                  className={opt.value === billing ? "block" : "hidden"}
                >
                  <span className="block text-4xl font-extrabold tracking-tight text-fg">
                    {plan.prices[opt.value].headline}
                  </span>
                  <span className="mt-2 block min-h-[2.5rem] text-sm text-fg-faint">
                    {plan.prices[opt.value].note}
                  </span>
                </span>
              ))}
            </div>
            <Link
              href={plan.cta.href}
              className={buttonClasses({
                variant: plan.featured ? "primary" : "secondary",
                pill: true,
                className: "mt-6 w-full",
              })}
            >
              {plan.cta.label}
            </Link>
            <ul className="mt-7 space-y-3">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-fg-dim"
                >
                  <Icon
                    name="check"
                    strokeWidth={2.5}
                    className="mt-0.5 shrink-0 text-base text-signal"
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
