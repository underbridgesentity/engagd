import Link from "next/link";
import Image from "next/image";
import { PLANS } from "@/lib/entitlements";
import { Eyebrow } from "@/components/marketing";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icon";
import { buttonClasses } from "@/components/ui";

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

const RIBBON = [
  "Conferences",
  "Product launches",
  "Weddings",
  "AGMs",
  "Festivals",
  "Workshops",
  "Gala dinners",
  "Summits",
];

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

const VALUE = [
  {
    title: "No app, no account",
    body: "Attendees tap a link, RSVP, scan in, and vote. Nothing to install, nothing to sign up for. That is what gets people through the door.",
  },
  {
    title: "One record, three stages",
    body: "Invitations, live engagement, and follow-up all share one attendee record and one microsite, so nothing is retyped or lost between stages.",
  },
  {
    title: "Use only what you need",
    body: "Already running RSVPs elsewhere? Import your list and use just the day-of tools, or just the follow-up. Every module works on its own.",
  },
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

const FAQ = [
  {
    q: "Do attendees need to download an app or make an account?",
    a: "Never. Attendees get a link, and everything happens in the browser: RSVP, check-in QR, live polls, surveys. No install, no login.",
  },
  {
    q: "Can I use only one part of Engagd?",
    a: "Yes. Import an existing guest list and use only the day-of engagement tools, or only the post-event follow-up. Each module stands on its own.",
  },
  {
    q: "What counts as an active event?",
    a: "An event that is accepting RSVPs, running live, or inside its post-event window. Your plan sets how many you can run at once, and this is the main thing you upgrade on.",
  },
  {
    q: "What happens to a live invite link if I hit my plan limit?",
    a: "It keeps working. The attendee cap is a soft wall: we warn you and prompt an upgrade, but we never break a link people are already using.",
  },
  {
    q: "Do door staff use up a paid seat?",
    a: "No. Check-in staff get event-scoped access with a PIN, so you can put six people on the door for one event without paying for six seats.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Split hero: headline in the left column, photo contained on the right
          so the image never has to sit behind text and frame a face at once. */}
      <section className="relative isolate -mt-20 overflow-hidden md:-mt-24">
        <div aria-hidden className="glow-top absolute inset-x-0 top-0 -z-10 h-[520px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-40">
          <div>
            <Eyebrow>Invite. Engage. Follow up.</Eyebrow>
            <h1 className="display-tight mt-6 text-[clamp(2.9rem,6.2vw,5.25rem)] text-fg">
              The whole life of your event, in{" "}
              <span className="text-signal">one link.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg text-fg-dim sm:text-xl">
              RSVPs, door check-in, live polls, and follow-up surveys. One
              dashboard for you, one link for your guests. No app, no account,
              no friction.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className={buttonClasses({ size: "lg", pill: true })}>
                Start free, no card needed
                <Icon name="arrowRight" />
              </Link>
              <Link
                href="/how-it-works"
                className={buttonClasses({ variant: "secondary", size: "lg", pill: true })}
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-line-strong shadow-[var(--shadow-e3)]">
              <Image
                src="/img/hero.jpg"
                alt="An engaged audience at a conference"
                fill
                priority
                quality={90}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent"
              />
            </div>
            {/* Floating proof chip for a designed, product-forward feel. */}
            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-line-strong bg-raised/95 px-5 py-4 shadow-[var(--shadow-e2)] backdrop-blur sm:block">
              <p className="font-display text-2xl font-bold text-fg">RSVP to recap</p>
              <p className="mt-0.5 text-sm text-fg-dim">one link, start to finish</p>
            </div>
          </div>
        </div>
      </section>

      {/* Angled ribbon: a committed block of brand blue, deliberately static. */}
      <div className="relative overflow-hidden py-6">
        <div className="-rotate-[2.2deg] scale-105 border-y border-signal-strong/40 bg-signal">
          <div className="flex items-center justify-center gap-5 overflow-hidden py-3.5 sm:gap-8">
            {RIBBON.map((item) => (
              <span
                key={item}
                className="flex shrink-0 items-center gap-5 whitespace-nowrap font-display text-base font-bold uppercase tracking-tight text-ink sm:gap-8 sm:text-xl"
              >
                {item}
                <Icon name="spark" className="text-ink/50" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* See it in action: show the real product, not just stock crowds. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <Eyebrow>See it in action</Eyebrow>
          <h2 className="mt-6 max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
            One dashboard for you. One clean page for your guests.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <figure className="overflow-hidden rounded-2xl border border-line-strong bg-raised shadow-[var(--shadow-e2)]">
              <Image
                src="/img/product-dashboard.png"
                alt="The Engagd organiser dashboard showing an event overview"
                width={1600}
                height={1000}
                sizes="(max-width: 1024px) 100vw, 720px"
                className="w-full"
              />
              <figcaption className="border-t border-line px-5 py-3 text-sm text-fg-dim">
                Organiser dashboard: RSVPs, check-in, and analytics at a glance.
              </figcaption>
            </figure>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={100}>
            <figure className="overflow-hidden rounded-2xl border border-line-strong bg-raised shadow-[var(--shadow-e2)]">
              <Image
                src="/img/product-microsite.png"
                alt="An Engagd attendee microsite on a phone"
                width={900}
                height={1400}
                sizes="(max-width: 1024px) 100vw, 460px"
                className="w-full"
              />
              <figcaption className="border-t border-line px-5 py-3 text-sm text-fg-dim">
                Attendee microsite: RSVP in seconds, no account.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* Lifecycle: text sits inside the photographs. */}
      <section className="border-t border-line bg-ink-2">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
              Every stage of the day, in one place.
            </h2>
            <Link
              href="/how-it-works"
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-signal hover:text-signal-strong"
            >
              Walk through it
              <Icon name="arrowRight" className="transition-transform group-hover:translate-x-0.5" />
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
                    quality={85}
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
                  <h3 className="mt-3 text-2xl font-bold text-fg">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-dim">{p.body}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Value props, honest differentiators rather than invented logos. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-8 md:grid-cols-3">
          {VALUE.map((v, i) => (
            <Reveal key={v.title} delay={i * 90}>
              <div className="h-full border-t-2 border-signal pt-6">
                <h3 className="text-2xl font-bold text-fg">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-fg-dim">{v.body}</p>
              </div>
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
              The whole suite, or just the part you came for.
            </h2>
          </Reveal>
          <Reveal>
            <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-3 border-b border-line py-3 text-lg font-medium text-fg"
                >
                  <Icon name="check" className="shrink-0 text-signal" />
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Pricing teaser with a real at-a-glance comparison. */}
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
            className={buttonClasses({ variant: "secondary", pill: true })}
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
                        ? "border-signal bg-signal/10 shadow-[var(--shadow-glow)]"
                        : "border-line bg-raised shadow-[var(--shadow-e1)]"
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
                        <li key={h} className="flex gap-2.5 text-sm text-fg-dim">
                          <Icon name="check" className="mt-0.5 shrink-0 text-signal" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={cta.href}
                      className={buttonClasses({
                        variant: featured ? "primary" : "secondary",
                        pill: true,
                        className: "mt-7",
                      })}
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

      {/* FAQ, objection handling. */}
      <section className="border-t border-line bg-ink-2">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <Eyebrow>Questions</Eyebrow>
            <h2 className="mt-6 text-balance text-4xl text-fg sm:text-5xl">
              The things people ask first.
            </h2>
            <p className="mt-5 text-fg-dim">
              Still unsure?{" "}
              <Link href="/contact" className="font-semibold text-signal hover:text-signal-strong">
                Talk to us
              </Link>
              .
            </p>
          </Reveal>
          <Reveal>
            <dl className="divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <div key={item.q} className="py-6">
                  <dt className="text-lg font-bold text-fg">{item.q}</dt>
                  <dd className="mt-2 leading-relaxed text-fg-dim">{item.a}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA over a photograph, with a directional scrim so the image
          reads instead of being smothered by a flat fill. */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/img/event-cover-default.jpg"
          alt=""
          fill
          quality={85}
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/85 to-ink/45"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 to-transparent"
        />
        <div className="mx-auto max-w-3xl px-6 py-32">
          <Reveal>
            <h2 className="display-tight text-balance text-[clamp(2.5rem,5vw,4.5rem)] text-fg">
              Your next event deserves a better run of show.
            </h2>
            <p className="mt-6 max-w-xl text-lg text-fg-dim">
              Set up your first event in minutes. Free to start, no card needed.
            </p>
            <Link
              href="/login"
              className={buttonClasses({ size: "lg", pill: true, className: "mt-9" })}
            >
              Get started free
              <Icon name="arrowRight" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
