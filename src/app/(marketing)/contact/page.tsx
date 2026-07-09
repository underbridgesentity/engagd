import Link from "next/link";
import Image from "next/image";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Eyebrow } from "@/components/marketing";
import { submitEnterpriseContact } from "./actions";

const ERROR_COPY: Record<string, string> = {
  name: "Tell us your name so we know who to reply to.",
  email: "Enter a valid work email address.",
  organisation: "Tell us which organisation this is for.",
  volume: "Pick your expected attendee volume.",
  message: "Add a short message, at least a sentence, so we can prepare.",
  form: "Something in the form did not look right. Check the fields and try again.",
};

// Errors named after a field render inline under that field via Field;
// anything else falls back to the alert at the top of the form.
const FIELD_KEYS = ["name", "email", "organisation", "volume", "message"];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
      <div>
        <Eyebrow>Enterprise</Eyebrow>
        <h1 className="display-tight mt-6 text-5xl text-fg sm:text-6xl">
          Let&apos;s talk about your events.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-fg-dim">
          Enterprise plans come with unlimited events, custom limits, and a
          human who answers. Tell us what you are planning and we will get back
          to you within one working day.
        </p>
        <div className="relative mt-8 overflow-hidden rounded-3xl border border-line lg:mt-10">
          <div className="relative aspect-[16/9] lg:aspect-[4/3]">
            <Image
              src="/img/contact.jpg"
              alt="An engaged audience at a conference"
              fill
              sizes="(max-width: 1024px) 100vw, 600px"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent"
            />
          </div>
        </div>
        <p className="mt-6 font-data text-xs text-fg-faint">
          Prefer email? Write to us directly at sales@engagd.co.za.
        </p>
      </div>

      <div>
        {sent ? (
          <div className="rounded-3xl border border-mint/40 bg-mint/10 p-8">
            <h2 className="text-2xl text-mint">Message sent</h2>
            <p className="mt-3 text-sm leading-relaxed text-fg-dim">
              Thanks for reaching out. Our team will reply to your work email
              shortly. In the meantime you can start on the free plan and we
              will lift the limits once we have spoken.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full border border-line-strong px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-signal/60"
            >
              Back to the site
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-raised p-8">
            {error && !FIELD_KEYS.includes(error) ? (
              <p
                role="alert"
                className="mb-6 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
              >
                {ERROR_COPY[error] ?? ERROR_COPY.form}
              </p>
            ) : null}
            <form action={submitEnterpriseContact} className="flex flex-col gap-5">
              <Field
                id="contact-name"
                label="Your name"
                error={error === "name" ? ERROR_COPY.name : undefined}
              >
                <Input name="name" required placeholder="Naledi Dlamini" />
              </Field>
              <Field
                id="contact-email"
                label="Work email"
                error={error === "email" ? ERROR_COPY.email : undefined}
              >
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="naledi@company.co.za"
                />
              </Field>
              <Field
                id="contact-org"
                label="Organisation"
                error={
                  error === "organisation" ? ERROR_COPY.organisation : undefined
                }
              >
                <Input
                  name="organisation"
                  required
                  placeholder="Company or venue name"
                />
              </Field>
              <Field
                id="contact-volume"
                label="Expected attendee volume"
                error={error === "volume" ? ERROR_COPY.volume : undefined}
              >
                <Select name="volume" required defaultValue="">
                  <option value="" disabled>
                    Pick a range
                  </option>
                  <option value="under-500">Under 500 per event</option>
                  <option value="500-2000">500 to 2,000 per event</option>
                  <option value="2000-10000">2,000 to 10,000 per event</option>
                  <option value="10000-plus">More than 10,000 per event</option>
                </Select>
              </Field>
              <Field
                id="contact-message"
                label="What are you planning?"
                error={error === "message" ? ERROR_COPY.message : undefined}
              >
                <Textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Conferences, AGMs, a festival series? Tell us about your events, timelines, and anything unusual."
                />
              </Field>
              <Button type="submit" pill size="lg" className="self-start">
                Send message
              </Button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
