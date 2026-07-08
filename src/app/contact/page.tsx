import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { submitEnterpriseContact } from "./actions";

const ERROR_COPY: Record<string, string> = {
  name: "Tell us your name so we know who to reply to.",
  email: "Enter a valid work email address.",
  organisation: "Tell us which organisation this is for.",
  volume: "Pick your expected attendee volume.",
  message: "Add a short message, at least a sentence, so we can prepare.",
  form: "Something in the form did not look right. Check the fields and try again.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="min-h-screen bg-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl" aria-label="Engagd home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/#pricing" className="hidden text-sm text-fg-dim hover:text-fg sm:block">
            Pricing
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-2xl px-6 pb-28 pt-12 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[560px] -translate-x-1/2 rounded-full bg-signal/10 blur-3xl"
        />
        <p className="font-data text-xs uppercase tracking-[0.3em] text-signal-strong">
          Enterprise
        </p>
        <h1 className="mt-5 font-display text-4xl leading-[1.05] text-fg">
          Let&apos;s talk about your events.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-fg-dim">
          Enterprise plans come with unlimited events, custom limits, and a
          human who answers. Tell us a little about what you are planning and
          we will get back to you within one working day.
        </p>

        {sent ? (
          <div className="mt-10 rounded-[10px] border border-mint/40 bg-mint/10 p-8">
            <h2 className="font-display text-xl text-mint">Message sent</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-dim">
              Thanks for reaching out. Our team will reply to your work email
              shortly. In the meantime you can start on the free plan and we
              will lift the limits once we have spoken.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg border border-line-strong px-4 py-2 text-sm text-fg transition-colors hover:border-signal/60"
            >
              Back to the site
            </Link>
          </div>
        ) : (
          <div className="mt-10 rounded-[10px] border border-line bg-raised p-8">
            {error ? (
              <p
                role="alert"
                className="mb-6 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
              >
                {ERROR_COPY[error] ?? ERROR_COPY.form}
              </p>
            ) : null}
            <form action={submitEnterpriseContact} className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact-name">Your name</Label>
                  <Input
                    id="contact-name"
                    name="name"
                    required
                    placeholder="Naledi Dlamini"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Work email</Label>
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    placeholder="naledi@company.co.za"
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact-org">Organisation</Label>
                  <Input
                    id="contact-org"
                    name="organisation"
                    required
                    placeholder="Company or venue name"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-volume">Expected attendee volume</Label>
                  <Select id="contact-volume" name="volume" required defaultValue="">
                    <option value="" disabled>
                      Pick a range
                    </option>
                    <option value="under-500">Under 500 per event</option>
                    <option value="500-2000">500 to 2,000 per event</option>
                    <option value="2000-10000">2,000 to 10,000 per event</option>
                    <option value="10000-plus">More than 10,000 per event</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="contact-message">What are you planning?</Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Conferences, AGMs, a festival series? Tell us about your events, timelines, and anything unusual."
                />
              </div>
              <Button type="submit" className="self-start px-6 py-3">
                Send message
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 font-data text-xs text-fg-faint">
          Prefer email? Write to us directly at sales@engagd.co.za.
        </p>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-fg-faint">
          <Wordmark className="text-fg-dim" />
          <span>Made for events that people remember.</span>
        </div>
      </footer>
    </main>
  );
}
