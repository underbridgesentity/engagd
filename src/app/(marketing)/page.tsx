import Link from "next/link";
import Image from "next/image";
import { PLANS } from "@/lib/entitlements";
import { Eyebrow } from "@/components/marketing";
import { Reveal, Parallax } from "@/components/motion";

function rands(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function planHighlights(tier: keyof typeof PLANS): string[] {
  const e = PLANS[tier].entitlements;
  const out: string[] = [];
  out.push(
    e.maxActiveEvents === null
      ? "Unlimited active events"
      : `${e.maxActiveEvents} active event${e.maxActiveEvents === 1 ? "" : "s"}`
  );
  out.push(
    e.maxAttendeesPerEvent === null
      ? "Unlimited attendees"
      : `${e.maxAttendeesPerEvent.toLocaleString("en-ZA")} attendees / event`
  );
  out.push(
    e.teamSeats === null
      ? "Custom team seats"
      : `${e.teamSeats} team seat${e.teamSeats === 1 ? "" : "s"}`
  );
  out.push(e.analytics === "full" ? "Full analytics and export" : "Basic analytics");
  if (e.customBranding) out.push("Custom branding");
  if (e.paidTicketing) out.push("Paid ticketing");
  if (e.customDomain) out.push("Own sending domain");
  return out;
}

const PLAN_CTA: Record<keyof typeof PLANS, { href: string; label: string }> = {
  free: { href: "/login", label: "Start free" },
  starter: { href: "/login", label: "Choose Starter" },
  professional: { href: "/login", label: "Choose Professional" },
  enterprise: { href: "/contact", label: "Contact sales" },
};

const PHASES = [
  {
    n: "01",
    tag: "Before",
    title: "Invitations that land",
    body: "Import a guest list, brand a microsite, and watch RSVPs roll in live.",
    img: "/img/lifecycle-invite.jpg",
    accent: "text-signal",
  },
  {
    n: "02",
    tag: "During",
    title: "A room that talks back",
    body: "QR check-in, live polls, and audience Q&A. No app, just a link.",
    img: "/img/lifecycle-engage.jpg",
    accent: "text-ember",
  },
  {
    n: "03",
    tag: "After",
    title: "Close the loop",
    body: "Surveys, photo galleries, and the analytics your boss wants to see.",
    img: "/img/lifecycle-followup.jpg",
    accent: "text-mint",
  },
];

const MARQUEE = [
  "Conferences",
  "Product launches",
  "Weddings",
  "AGMs",
  "Festivals",
  "Workshops",
  "Gala dinners",
  "Meetups",
  "Summits",
  "Award nights",
];

const CAPABILITIES = [
  "CSV import with column mapping",
  "Branded event microsites",
  "Custom RSVP questions",
  "QR and short-code check-in",
  "Live polls on the big screen",
  "Moderated audience Q&A",
  "Free and paid ticketing",
  "Post-event surveys",
  "Photo galleries",
  "Attendance analytics",
  "Scheduled reminders",
  "Your own sending domain",
];

export default function HomePage() {
  return (
    <>
      {/* Hero: the photograph is the background, gently parallaxed. */}
      <section className="relative isolate -mt-20 flex min-h-[78vh] flex-col justify-center overflow-hidden md:-mt-24">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Parallax speed={0.18} className="absolute inset-[-12%]">
            <Image
              src="/img/hero.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </Parallax>
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-ink/70"
        />
        <div className="mx-auto w-full max-w-6xl px-6 pt-28 pb-16">
          <Eyebrow>Invite. Engage. Follow up.</Eyebrow>
          <h1 className="display-tight mt-6 max-w-3xl text-4xl text-fg sm:text-5xl lg:text-6xl">
            The whole life of your event, in{" "}
            <span className="text-signal">one link.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-fg-dim sm:text-xl">
            RSVPs, door check-in, live polls, and follow-up surveys. One
            dashboard for you, one link for your guests. No app, no account,
            no friction.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-signal px-7 py-3.5 text-base font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
            >
              Start free, no card needed
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-full border border-line-strong bg-ink/40 px-7 py-3.5 text-base font-semibold text-fg backdrop-blur transition-colors hover:border-signal/60"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Moving ticker of what people run on Engagd. */}
      <div className="marquee overflow-hidden border-y border-line bg-ink-2 py-5">
        <div className="marquee-track flex w-max items-center gap-10 pl-10">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-10 text-xl font-semibold text-fg-dim"
            >
              {item}
              <span aria-hidden className="text-signal">
                ✦
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Lifecycle: text sits inside the photographs. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
            One record. One microsite. Every stage of the day.
          </h2>
          <Link
            href="/how-it-works"
            className="shrink-0 text-sm font-bold text-signal hover:text-signal-strong"
          >
            Walk through it →
          </Link>
        </Reveal>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PHASES.map((p, i) => (
            <Reveal key={p.n} delay={i * 90}>
              <Link
                href="/how-it-works"
                className="group relative isolate flex min-h-[460px] flex-col justify-end overflow-hidden rounded-3xl border border-line p-7"
              >
                <Image
                  src={p.img}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 384px"
                  className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/10"
                />
                <span className={`text-sm font-bold uppercase tracking-widest ${p.accent}`}>
                  {p.n} / {p.tag}
                </span>
                <h3 className="mt-3 text-3xl text-fg">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-dim">
                  {p.body}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Capabilities: loud typographic grid, no cards. */}
      <section className="border-y border-line bg-ink-2">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <Eyebrow>Everything in the box</Eyebrow>
            <h2 className="mt-6 max-w-3xl text-balance text-4xl text-fg sm:text-5xl">
              Use the whole suite, or just the part you came for.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-fg-dim">
              Already running RSVPs elsewhere? Import your list and use only the
              day-of tools, or only the follow-up. Every module works on its
              own.
            </p>
          </Reveal>
          <Reveal>
            <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-3 border-b border-line py-3 text-lg font-medium text-fg"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Pricing teaser. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-6 max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
              Start free. Upgrade when the guest list grows.
            </h2>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-fg hover:border-signal/60"
          >
            Compare plans
          </Link>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["free", "starter", "professional", "enterprise"] as const).map(
            (tier, i) => {
              const plan = PLANS[tier];
              const featured = tier === "professional";
              const cta = PLAN_CTA[tier];
              return (
                <Reveal key={tier} delay={i * 80}>
                  <div
                    className={`relative flex h-full flex-col rounded-2xl border p-6 ${
                      featured
                        ? "border-signal bg-signal/10"
                        : "border-line bg-raised"
                    }`}
                  >
                    {featured ? (
                      <span className="absolute -top-3 left-6 rounded-full bg-signal px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                        Most popular
                      </span>
                    ) : null}
                    <p className="text-sm font-bold uppercase tracking-wide text-fg-dim">
                      {plan.name}
                    </p>
                    <p className="mt-3 font-display text-4xl font-extrabold tracking-tight text-fg">
                      {plan.monthlyPriceCents === null
                        ? "Let's talk"
                        : plan.monthlyPriceCents === 0
                          ? "R0"
                          : rands(plan.monthlyPriceCents)}
                    </p>
                    <p className="mt-1 text-xs text-fg-faint">
                      {plan.monthlyPriceCents ? "per month" : "custom pricing"}
                    </p>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {planHighlights(tier).map((h) => (
                        <li
                          key={h}
                          className="flex gap-2.5 text-sm text-fg-dim"
                        >
                          <span
                            aria-hidden
                            className="mt-0.5 font-bold text-signal"
                          >
                            ✓
                          </span>
                          {h}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={cta.href}
                      className={`mt-7 rounded-full px-5 py-2.5 text-center text-sm font-bold transition-transform hover:-translate-y-0.5 ${
                        featured
                          ? "bg-signal text-ink hover:bg-signal-strong"
                          : "border border-line-strong text-fg hover:border-signal/60"
                      }`}
                    >
                      {cta.label}
                    </Link>
                  </div>
                </Reveal>
              );
            }
          )}
        </div>
        <p className="mt-6 text-sm text-fg-faint">
          Annual billing gets you two months free. See the{" "}
          <Link href="/pricing" className="font-semibold text-signal hover:text-signal-strong">
            full feature comparison
          </Link>
          .
        </p>
      </section>

      {/* Closing CTA over a photograph. */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/img/event-cover-default.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-ink/85" />
        <div className="mx-auto max-w-4xl px-6 py-32 text-center">
          <Reveal>
            <h2 className="display-tight text-balance text-4xl text-fg sm:text-5xl">
              Your next event deserves a better{" "}
              <span className="text-signal">run of show.</span>
            </h2>
            <p className="mx-auto mt-7 max-w-xl text-lg text-fg-dim">
              Set up your first event in minutes. Free to start, no card needed.
            </p>
            <Link
              href="/login"
              className="mt-9 inline-block rounded-full bg-signal px-8 py-4 text-base font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
            >
              Get started free
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
