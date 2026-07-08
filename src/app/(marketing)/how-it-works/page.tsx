import Link from "next/link";
import Image from "next/image";
import { Eyebrow } from "@/components/marketing";
import { Reveal } from "@/components/motion";

export const metadata = { title: "How it works" };

const MODULES = [
  {
    n: "01",
    tag: "Before the day",
    title: "Invitations that actually land",
    body: "Spin up a branded microsite for your event in minutes. Bring your people in the way that suits you, then let the RSVPs manage themselves.",
    img: "/img/lifecycle-invite.jpg",
    accent: "text-signal",
    points: [
      "One clean link for the whole event, at engagd.co.za/e/your-event",
      "Import a guest list from CSV with full column mapping, add people by hand, or share a public RSVP link",
      "Custom questions, plus-ones, dietary and accessibility notes",
      "Reminders scheduled to non-responders, sent for you",
    ],
  },
  {
    n: "02",
    tag: "On the day",
    title: "A room that talks back",
    body: "Attendees join with a scan or a short code. No app to install, no account to make. You run the room from one screen.",
    img: "/img/lifecycle-engage.jpg",
    accent: "text-ember",
    points: [
      "Join by scanning a QR or typing a code at engagd.co.za/join",
      "Check people in with a phone camera and watch the headcount live",
      "Live polls on the big screen, results updating in real time",
      "Moderated audience Q&A with upvoting, straight from their phones",
    ],
  },
  {
    n: "03",
    tag: "After the lights come up",
    title: "Close the loop",
    body: "The same microsite carries the follow-up. Gather feedback, deliver the photos, and hand your boss the numbers.",
    img: "/img/lifecycle-followup.jpg",
    accent: "text-mint",
    points: [
      "Feedback surveys with results you can read at a glance",
      "Photo galleries delivered on the microsite and by email",
      "Thank-you and follow-up mailers to the segments that matter",
      "Analytics: open rates, RSVP conversion, check-in rate, participation",
    ],
  },
];

const STEPS = [
  {
    n: "1",
    title: "Create your event",
    body: "Name it, set the date and venue, pick RSVP-only, free tickets, or paid tickets.",
  },
  {
    n: "2",
    title: "Invite or import",
    body: "Bring your list in from CSV, add guests by hand, or share your public link.",
  },
  {
    n: "3",
    title: "Go live",
    body: "Open check-in, run polls and Q&A, then follow up with surveys and photos.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Full-bleed hero over a photograph. */}
      <section className="relative isolate -mt-20 overflow-hidden md:-mt-24">
        <Image
          src="/img/microsite-fallback.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/50"
        />
        <div className="mx-auto max-w-6xl px-6 pt-40 pb-28 lg:pt-48 lg:pb-36">
          <Eyebrow>How it works</Eyebrow>
          <h1 className="display-tight mt-6 max-w-3xl text-5xl text-fg sm:text-6xl lg:text-7xl">
            From the first invite to the final thank you.
          </h1>
          <p className="mt-7 max-w-xl text-lg text-fg-dim sm:text-xl">
            Three connected modules share one attendee record and one
            microsite. Use all three, or drop in for just the part you need.
          </p>
          <Link
            href="/login"
            className="mt-9 inline-block rounded-full bg-signal px-7 py-3.5 text-base font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
          >
            Start free
          </Link>
        </div>
      </section>

      {/* The three modules, alternating image and text. */}
      {MODULES.map((m, i) => (
        <section
          key={m.n}
          className={i % 2 === 1 ? "bg-ink-2 border-y border-line" : ""}
        >
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
            <Reveal className={i % 2 === 1 ? "lg:order-2" : ""}>
              <span
                className={`text-sm font-bold uppercase tracking-widest ${m.accent}`}
              >
                {m.n} / {m.tag}
              </span>
              <h2 className="mt-4 text-balance text-4xl text-fg sm:text-5xl">
                {m.title}
              </h2>
              <p className="mt-5 text-lg text-fg-dim">{m.body}</p>
              <ul className="mt-8 space-y-4">
                {m.points.map((p) => (
                  <li key={p} className="flex gap-3 text-fg">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-3xl border border-line ${
                i % 2 === 1 ? "lg:order-1" : ""
              }`}
            >
              <Image
                src={m.img}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent"
              />
            </div>
          </div>
        </section>
      ))}

      {/* Loud statement band. */}
      <section className="bg-signal">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="display-tight text-balance text-4xl text-ink sm:text-6xl">
            No app. No account. Just a link.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-ink/70">
            Attendees never sign up for anything. They tap a link, RSVP, scan
            in, and vote. That is what gets people through the door.
          </p>
        </div>
      </section>

      {/* Get set up in three steps. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Eyebrow>Get set up</Eyebrow>
        <h2 className="mt-5 max-w-2xl text-balance text-4xl text-fg sm:text-5xl">
          Live in three steps.
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal/15 text-2xl font-extrabold text-signal">
                {s.n}
              </span>
              <h3 className="mt-6 text-2xl text-fg">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-fg-dim">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA over a photograph. */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/img/hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-ink/85" />
        <div className="mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="display-tight text-balance text-4xl text-fg sm:text-6xl">
            Ready to run your next event on Engagd?
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-signal px-8 py-4 text-base font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-line-strong px-8 py-4 text-base font-semibold text-fg transition-colors hover:border-signal/60"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
