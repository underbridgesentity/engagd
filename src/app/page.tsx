import Link from "next/link";
import Image from "next/image";
import { PLANS } from "@/lib/entitlements";
import { Logo } from "@/components/logo";

function rands(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  })}`;
}

const LIFECYCLE = [
  {
    phase: "01 / Before",
    title: "Invitations that land",
    body: "Import your guest list, send branded invitations, and watch RSVPs arrive in real time. Plus-ones, dietary notes, and custom questions included.",
    accent: "text-signal-strong",
    ring: "border-signal/40",
    img: "/img/lifecycle-invite.jpg",
  },
  {
    phase: "02 / During",
    title: "A room that talks back",
    body: "QR check-in at the door, live polls on the big screen, and audience questions with upvoting. No app downloads, just a link.",
    accent: "text-ember",
    ring: "border-ember/40",
    img: "/img/lifecycle-engage.jpg",
  },
  {
    phase: "03 / After",
    title: "Close the loop",
    body: "Feedback surveys, photo galleries, and attendance analytics land in your inbox before the chairs are stacked.",
    accent: "text-mint",
    ring: "border-mint/40",
    img: "/img/lifecycle-followup.jpg",
  },
];

function planFeatures(tier: keyof typeof PLANS): string[] {
  const e = PLANS[tier].entitlements;
  const items: string[] = [];
  items.push(
    e.maxActiveEvents === null
      ? "Unlimited active events"
      : `${e.maxActiveEvents} active ${e.maxActiveEvents === 1 ? "event" : "events"}`
  );
  items.push(
    e.maxAttendeesPerEvent === null
      ? "Unlimited attendees per event"
      : `Up to ${e.maxAttendeesPerEvent.toLocaleString("en-ZA")} attendees per event`
  );
  items.push(
    e.teamSeats === null
      ? "Unlimited team seats"
      : `${e.teamSeats} team ${e.teamSeats === 1 ? "seat" : "seats"}`
  );
  items.push(e.analytics === "full" ? "Full analytics and exports" : "Basic analytics");
  if (e.customBranding) items.push("Custom branding");
  if (e.replyToVerification) items.push("Verified reply-to address");
  if (e.paidTicketing) items.push("Paid ticketing");
  if (e.customDomain) items.push("Custom email domain");
  return items;
}

const PLAN_ORDER = ["free", "starter", "professional", "enterprise"] as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-baseline gap-0.5 text-fg">
          <Logo className="h-6 w-auto" />
          <span className="font-display text-xl leading-none text-signal">.</span>
        </span>
        <nav className="flex items-center gap-6">
          <a href="#pricing" className="hidden text-sm text-fg-dim hover:text-fg sm:block">
            Pricing
          </a>
          <Link
            href="/login"
            className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-signal/10 blur-3xl"
        />
        <p className="font-data text-xs uppercase tracking-[0.3em] text-signal-strong">
          Invite. Engage. Follow up.
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.05] text-fg sm:text-6xl">
          The whole life of your event,
          <br />
          <span className="text-fg-dim">from first invite to final thank you.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-fg-dim">
          Engagd handles RSVPs, door check-in, live polls and Q&amp;A, then
          surveys and analytics once the lights come up. One link for your
          guests, one dashboard for you.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-signal px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            Start free, no card needed
          </Link>
          <a href="#lifecycle" className="text-sm text-fg-dim hover:text-fg">
            See how it works
          </a>
        </div>

        <div className="relative mt-14 overflow-hidden rounded-2xl border border-line-strong">
          <div className="relative aspect-[2/1]">
            <Image
              src="/img/hero.jpg"
              alt="A packed audience facing a lit stage at a live event"
              fill
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="object-cover"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent"
          />
        </div>
      </section>

      {/* Lifecycle */}
      <section id="lifecycle" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {LIFECYCLE.map((s) => (
            <div
              key={s.phase}
              className={`overflow-hidden rounded-[10px] border bg-raised ${s.ring}`}
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={s.img}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-raised via-raised/20 to-transparent"
                />
              </div>
              <div className="p-6">
              <p className={`font-data text-xs uppercase tracking-widest ${s.accent}`}>
                {s.phase}
              </p>
              <h2 className="mt-3 font-display text-xl text-fg">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-dim">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-28">
        <h2 className="font-display text-3xl text-fg">Pricing that scales with the guest list</h2>
        <p className="mt-2 text-fg-dim">
          Prices in South African rand. Pay annually and you pay for 10 months, get 12.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((tier) => {
            const plan = PLANS[tier];
            const highlight = tier === "professional";
            return (
              <div
                key={tier}
                className={`flex flex-col rounded-[10px] border p-6 ${
                  highlight
                    ? "border-signal/60 bg-raised-2 shadow-[0_0_40px_-12px_var(--signal)]"
                    : "border-line bg-raised"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-lg text-fg">{plan.name}</h3>
                  {highlight ? (
                    <span className="rounded-full border border-signal/30 bg-signal/15 px-2.5 py-0.5 font-data text-xs text-signal-strong">
                      Most popular
                    </span>
                  ) : null}
                </div>
                <div className="mt-4">
                  {plan.monthlyPriceCents === null ? (
                    <p className="font-display text-3xl text-fg">Contact us</p>
                  ) : plan.monthlyPriceCents === 0 ? (
                    <p className="font-display text-3xl text-fg">R0</p>
                  ) : (
                    <>
                      <p className="font-display text-3xl text-fg">
                        {rands(plan.monthlyPriceCents)}
                        <span className="text-sm font-normal text-fg-faint"> /month</span>
                      </p>
                      {plan.annualPriceCents !== null ? (
                        <p className="mt-1 font-data text-xs text-fg-dim">
                          or {rands(plan.annualPriceCents)} /year
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-fg-dim">
                  {planFeatures(tier).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-mint">+</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier === "enterprise" ? "/contact" : "/login"}
                  className={`mt-6 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
                    highlight
                      ? "bg-signal text-ink hover:bg-signal-strong"
                      : "border border-line-strong text-fg hover:border-signal/60"
                  }`}
                >
                  {tier === "enterprise" ? "Talk to us" : "Get started"}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 font-data text-xs text-fg-faint">
          Annual billing: pay for 10 months, get 12. Check-in staff never use a
          seat, they get event-scoped door access.
        </p>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-fg-faint">
          <span className="flex items-baseline gap-0.5 text-fg-dim">
            <Logo className="h-5 w-auto" />
            <span className="font-display leading-none text-signal">.</span>
          </span>
          <span>Made for events that people remember.</span>
        </div>
      </footer>
    </main>
  );
}
