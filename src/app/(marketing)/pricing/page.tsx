import Link from "next/link";
import { PLANS } from "@/lib/entitlements";
import type { Entitlements, PlanTier } from "@/lib/entitlements";
import { Eyebrow } from "@/components/marketing";

export const metadata = { title: "Pricing" };

type Billing = "monthly" | "annual";

const TIERS: PlanTier[] = ["free", "starter", "professional", "enterprise"];

function rands(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function limit(value: number | null): string {
  return value === null ? "Unlimited" : value.toLocaleString("en-ZA");
}

// Turn a tier's entitlements into human-readable feature bullets.
function planFeatures(ent: Entitlements): string[] {
  const bullets: string[] = [
    `${limit(ent.maxActiveEvents)} active event${ent.maxActiveEvents === 1 ? "" : "s"} at a time`,
    `${limit(ent.maxAttendeesPerEvent)} attendees per event`,
    `${limit(ent.teamSeats)} team seat${ent.teamSeats === 1 ? "" : "s"}`,
    ent.analytics === "full"
      ? "Full analytics and exports"
      : "Basic attendance analytics",
  ];
  if (ent.customBranding) bullets.push("Custom event branding");
  if (ent.replyToVerification) bullets.push("Verified reply-to address");
  if (ent.paidTicketing) bullets.push("Paid ticketing");
  if (ent.customDomain) bullets.push("Your own sending domain");
  return bullets;
}

// Per-tier CTA. Free/Starter/Professional route to signup, Enterprise to sales.
function cta(tier: PlanTier): { href: string; label: string } {
  if (tier === "enterprise") return { href: "/contact", label: "Contact sales" };
  if (tier === "free") return { href: "/login", label: "Start free" };
  return { href: "/login", label: `Choose ${PLANS[tier].name}` };
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="mt-0.5 h-5 w-5 shrink-0 text-signal"
    >
      <path
        d="M4 10.5l3.5 3.5L16 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function priceBlock(tier: PlanTier, billing: Billing) {
  const plan = PLANS[tier];
  if (plan.monthlyPriceCents === null || plan.annualPriceCents === null) {
    return { headline: "Let's talk", note: "Custom pricing, built to fit." };
  }
  if (plan.monthlyPriceCents === 0) {
    return { headline: "R0", note: "Free forever. No card needed." };
  }
  if (billing === "annual") {
    const perMonth = Math.round(plan.annualPriceCents / 12);
    return {
      headline: rands(perMonth),
      note: `per month, billed ${rands(plan.annualPriceCents)} annually`,
    };
  }
  return { headline: rands(plan.monthlyPriceCents), note: "per month, billed monthly" };
}

const COMPARISON: {
  label: string;
  value: (ent: Entitlements) => string;
}[] = [
  { label: "Active events", value: (e) => limit(e.maxActiveEvents) },
  { label: "Attendees per event", value: (e) => limit(e.maxAttendeesPerEvent) },
  { label: "Team seats", value: (e) => limit(e.teamSeats) },
  {
    label: "Analytics",
    value: (e) => (e.analytics === "full" ? "Full" : "Basic"),
  },
  { label: "Custom branding", value: (e) => (e.customBranding ? "Yes" : "No") },
  {
    label: "Verified reply-to",
    value: (e) => (e.replyToVerification ? "Yes" : "No"),
  },
  { label: "Paid ticketing", value: (e) => (e.paidTicketing ? "Yes" : "No") },
  { label: "Custom domain", value: (e) => (e.customDomain ? "Yes" : "No") },
];

const FAQS = [
  {
    q: "Can I use just one module?",
    a: "Yes. Every part of Engagd works on its own. Import a guest list and run only the day-of tools, or drop in for follow-up surveys and photos. You are never forced to use the whole suite to get value from one piece.",
  },
  {
    q: "What counts as an active event?",
    a: "An event that is live and collecting RSVPs or checking guests in. Active events are the headline lever on every plan, and the cap is a hard limit. Archive an event you are done with and that slot frees up for the next one.",
  },
  {
    q: "Do attendees need an account?",
    a: "Never. Guests RSVP, check in, vote in polls, and answer surveys from a single link, no app and no signup. The attendee cap is a soft wall too, so a live invite link keeps working even if you cross it. We just nudge you to upgrade.",
  },
  {
    q: "Do check-in staff use a paid seat?",
    a: "No. Team seats cover the people who build and manage events, owners, admins, and viewers. Door staff scanning tickets on the night never count against your seat limit, so bring as many hands as you need.",
  },
  {
    q: "Can I switch plans?",
    a: "Any time, in both directions. Upgrade the moment the guest list outgrows your plan, or move back down between events. Annual billing gives you two months free, and you can start on Free with no card to see how it fits.",
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const { billing: billingParam } = await searchParams;
  const billing: Billing = billingParam === "annual" ? "annual" : "monthly";

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-12 sm:pt-28">
        <Eyebrow>Pricing</Eyebrow>
        <h1 className="display-tight mt-6 max-w-4xl text-5xl text-fg sm:text-6xl lg:text-7xl">
          Priced for the guest list, not the{" "}
          <span className="text-signal">finance meeting.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg text-fg-dim sm:text-xl">
          Start free and pay only when the room gets bigger. Every plan is the
          full suite, from first invite to final thank you. No modules to unlock,
          no surprises.
        </p>

        {/* Billing toggle */}
        <div className="mt-10 flex items-center gap-4">
          <div className="inline-flex rounded-full border border-line-strong bg-raised p-1">
            <Link
              href="/pricing"
              scroll={false}
              aria-pressed={billing === "monthly"}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                billing === "monthly"
                  ? "bg-signal text-ink"
                  : "text-fg-dim hover:text-fg"
              }`}
            >
              Monthly
            </Link>
            <Link
              href="/pricing?billing=annual"
              scroll={false}
              aria-pressed={billing === "annual"}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                billing === "annual"
                  ? "bg-signal text-ink"
                  : "text-fg-dim hover:text-fg"
              }`}
            >
              Annual
            </Link>
          </div>
          <span className="font-data text-xs uppercase tracking-widest text-mint">
            2 months free
          </span>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const plan = PLANS[tier];
            const featured = tier === "professional";
            const price = priceBlock(tier, billing);
            const action = cta(tier);
            return (
              <div
                key={tier}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  featured
                    ? "border-signal bg-signal/10"
                    : "border-line bg-raised"
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-signal px-3 py-1 font-data text-xs font-bold uppercase tracking-widest text-ink">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-bold uppercase tracking-widest text-fg-dim">
                  {plan.name}
                </p>
                <p className="mt-5 text-4xl font-extrabold tracking-tight text-fg">
                  {price.headline}
                </p>
                <p className="mt-2 min-h-[2.5rem] text-sm text-fg-faint">
                  {price.note}
                </p>
                <Link
                  href={action.href}
                  className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-bold transition-transform hover:-translate-y-0.5 ${
                    featured
                      ? "bg-signal text-ink hover:bg-signal-strong"
                      : "border border-line-strong text-fg hover:border-signal/60"
                  }`}
                >
                  {action.label}
                </Link>
                <ul className="mt-7 space-y-3">
                  {planFeatures(plan.entitlements).map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-fg-dim"
                    >
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Eyebrow>Compare</Eyebrow>
        <h2 className="mt-5 max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
          Every number, side by side.
        </h2>
        <div className="mt-10 overflow-x-auto rounded-3xl border border-line">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="p-5 font-data text-xs uppercase tracking-widest text-fg-faint">
                  Feature
                </th>
                {TIERS.map((tier) => (
                  <th
                    key={tier}
                    className={`p-5 text-sm font-bold ${
                      tier === "professional" ? "text-signal" : "text-fg"
                    }`}
                  >
                    {PLANS[tier].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-line last:border-0"
                >
                  <th className="p-5 text-sm font-medium text-fg-dim">
                    {row.label}
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier}
                      className={`p-5 text-sm ${
                        tier === "professional"
                          ? "bg-signal/5 font-semibold text-fg"
                          : "text-fg-dim"
                      }`}
                    >
                      {row.value(PLANS[tier].entitlements)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-line bg-ink-2">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-5 max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
            The things people ask before signing up.
          </h2>
          <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {FAQS.map((item) => (
              <div key={item.q}>
                <dt className="text-lg font-bold text-fg">{item.q}</dt>
                <dd className="mt-3 text-base leading-relaxed text-fg-dim">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center">
        <h2 className="display-tight text-balance text-4xl text-fg sm:text-6xl">
          Try it on your next event, free.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-fg-dim">
          Set up your first event in minutes and only pay when the guest list
          grows. No card needed to start.
        </p>
        <Link
          href="/login"
          className="mt-9 inline-block rounded-full bg-signal px-8 py-4 text-base font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
        >
          Get started free
        </Link>
      </section>
    </>
  );
}
