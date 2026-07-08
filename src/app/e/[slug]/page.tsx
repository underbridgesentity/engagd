import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventProgramItems } from "@/db/schema";
import { getEventQuestions, getPublicEventBySlug } from "@/lib/rsvp";
import {
  EventLogo,
  EventSummary,
  MicrositeShell,
  ProgramTimeline,
} from "../microsite";
import { RsvpForm } from "../rsvp-form";
import { submitPublicRsvp } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  return {
    title: event ? event.name : "Event not found",
    description: event?.description?.slice(0, 160),
  };
}

export default async function EventMicrositePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const [program, questions] = await Promise.all([
    db
      .select()
      .from(eventProgramItems)
      .where(eq(eventProgramItems.eventId, event.id))
      .orderBy(
        asc(eventProgramItems.sortOrder),
        asc(eventProgramItems.startsAt)
      ),
    getEventQuestions(event.id),
  ]);

  const rsvpAction = submitPublicRsvp.bind(null, event.slug);
  const isCompleted = event.status === "completed";
  const rsvpOpen = event.status === "active" && event.publicRsvpEnabled;

  return (
    <MicrositeShell config={event.micrositeConfig}>
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt=""
          className="mt-4 aspect-[2/1] w-full rounded-[10px] border border-line object-cover"
        />
      ) : null}

      <header className="mt-8">
        <EventLogo config={event.micrositeConfig} />
        <h1 className="font-display text-3xl text-fg sm:text-4xl">
          {event.name}
        </h1>
        <div className="mt-3">
          <EventSummary event={event} />
        </div>
      </header>

      {event.description ? (
        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-fg-dim">
          {event.description}
        </p>
      ) : null}

      <ProgramTimeline items={program} timezone={event.timezone} />

      <section aria-labelledby="rsvp-heading" className="mt-10">
        {isCompleted ? (
          <div className="rounded-[10px] border border-line bg-raised p-5 text-center">
            <p className="font-display text-lg text-fg">This event has ended</p>
            <p className="mt-1 text-sm text-fg-dim">
              Thanks to everyone who came. Photos and highlights will appear
              here soon.
            </p>
          </div>
        ) : rsvpOpen ? (
          <div className="rounded-[10px] border border-line bg-raised p-5">
            <h2 id="rsvp-heading" className="text-xl text-fg">
              RSVP
            </h2>
            <p className="mb-5 mt-1 text-sm text-fg-dim">
              Let us know if you can make it.
            </p>
            <RsvpForm
              action={rsvpAction}
              variant="public"
              submitLabel="Send my RSVP"
              config={{
                allowPlusOnes: event.allowPlusOnes,
                maxPlusOnes: event.maxPlusOnes,
                collectDietary: event.collectDietary,
              }}
              questions={questions}
            />
          </div>
        ) : (
          <div className="rounded-[10px] border border-line bg-raised p-5 text-center">
            <p className="text-sm text-fg-dim">
              RSVPs are handled by invitation for this event. If you received
              an invitation, use your personal link to respond.
            </p>
          </div>
        )}
      </section>
    </MicrositeShell>
  );
}
