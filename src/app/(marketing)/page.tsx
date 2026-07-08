import Link from "next/link";
import Image from "next/image";
import { PLANS } from "@/lib/entitlements";
import { Eyebrow } from "@/components/marketing";

function rands(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

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
      {/* Hero: the photograph is the background, not a card. */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/img/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/40"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-ink/60"
        />
        <div className="mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-6 py-24">
          <Eyebrow>Invite. Engage. Follow up.</Eyebrow>
          <h1 className="display-tight mt-6 max-w-4xl text-5xl text-fg sm:text-7xl lg:text-8xl">
            The whole life of your event, in{" "}
            <span className="text-signal">one link.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg text-fg-dim sm:text-xl">
            RSVPs, door check-in, live polls, and follow-up surveys. One
            dashboard for you, one link for your guests. No app, no account,
            no friction.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-signal px-7 py-3.5 text-base font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
            >
              Start free, no card needed
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-full border border-line-strong px-7 py-3.5 text-base font-semibold text-fg transition-colors hover:border-signal/60"
            >
              See how it works
            </Link>
          </div>
          <dl className="mt-16 flex flex-wrap gap-x-12 gap-y-6">
            {[
              ["3 in 1", "Invite, engage, follow up"],
              ["0", "Apps your guests install"],
              ["af-south-1", "Data stays in South Africa"],
            ].map(([stat, label]) => (
              <div key={label}>
                <dt className="text-3xl font-extrabold tracking-tight text-fg">
                  {stat}
                </dt>
                <dd className="mt-1 font-data text-xs uppercase tracking-widest text-fg-faint">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Lifecycle: image-backed panels, text sits inside the photograph. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
            One record. One microsite. Every stage of the day.
          </h2>
          <Link
            href="/how-it-works"
            className="shrink-0 text-sm font-semibold text-signal hover:text-signal-strong"
          >
            Walk through it →
          </Link>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PHASES.map((p) => (
            <Link
              key={p.n}
              href="/how-it-works"
              className="group relative isolate flex min-h-[440px] flex-col justify-end overflow-hidden rounded-3xl border border-line p-7"
            >
              <Image
                src={p.img}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 384px"
                className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/10"
              />
              <span className={`font-data text-sm font-medium ${p.accent}`}>
                {p.n} / {p.tag}
              </span>
              <h3 className="mt-3 text-2xl text-fg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-dim">{p.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Capabilities: loud typographic grid, no cards. */}
      <section className="border-y border-line bg-ink-2">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Eyebrow>Everything in the box</Eyebrow>
          <h2 className="mt-5 max-w-3xl text-balance text-4xl text-fg sm:text-5xl">
            Use the whole suite, or just the part you came for.
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-fg-dim">
            Already running RSVPs elsewhere? Import your list and use only the
            day-of tools, or only the follow-up. Every module works on its own.
          </p>
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
        </div>
      </section>

      {/* Pricing teaser. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
              Start free. Upgrade when the guest list grows.
            </h2>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-fg hover:border-signal/60"
          >
            Compare plans
          </Link>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["free", "starter", "professional", "enterprise"] as const).map(
            (tier) => {
              const plan = PLANS[tier];
              const featured = tier === "professional";
              return (
                <div
                  key={tier}
                  className={`rounded-2xl border p-6 ${
                    featured
                      ? "border-signal bg-signal/10"
                      : "border-line bg-raised"
                  }`}
                >
                  <p className="text-sm font-bold text-fg">{plan.name}</p>
                  <p className="mt-3 text-3xl font-extrabold tracking-tight text-fg">
                    {plan.monthlyPriceCents === null
                      ? "Let's talk"
                      : plan.monthlyPriceCents === 0
                        ? "R0"
                        : rands(plan.monthlyPriceCents)}
                  </p>
                  <p className="mt-1 font-data text-xs text-fg-faint">
                    {plan.monthlyPriceCents ? "per month" : " "}
                  </p>
                </div>
              );
            }
          )}
        </div>
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
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-ink/80"
        />
        <div className="mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="display-tight text-balance text-4xl text-fg sm:text-6xl">
            Your next event deserves a better run of show.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-fg-dim">
            Set up your first event in minutes. Free to start, no card needed.
          </p>
          <Link
            href="/login"
            className="mt-9 inline-block rounded-full bg-signal px-8 py-4 text-base font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
          >
            Get started free
          </Link>
        </div>
      </section>
    </>
  );
}
