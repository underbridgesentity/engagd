import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { attendees, events } from "@/db/schema";
import { getEventQuestions, markOpened } from "@/lib/rsvp";
import {
  EventLogo,
  EventSummary,
  MicrositeShell,
} from "../../e/microsite";
import { RsvpForm } from "../../e/rsvp-form";
import { updatePersonalRsvp } from "./actions";

export const metadata = { title: "Your RSVP" };

const STATUS_COPY: Record<
  string,
  { label: string; tone: string }
> = {
  invited: { label: "Awaiting your response", tone: "text-ember" },
  opened: { label: "Awaiting your response", tone: "text-ember" },
  responded_yes: { label: "You are attending", tone: "text-mint" },
  responded_no: { label: "You are not attending", tone: "text-coral" },
  responded_maybe: { label: "You might attend", tone: "text-ember" },
  waitlisted: { label: "You are on the waitlist", tone: "text-ember" },
};

export default async function PersonalRsvpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [attendee] = await db
    .select()
    .from(attendees)
    .where(eq(attendees.qrToken, token))
    .limit(1);
  if (!attendee) notFound();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, attendee.eventId))
    .limit(1);
  if (!event || (event.status !== "active" && event.status !== "completed")) {
    notFound();
  }

  // First visit of an invited attendee counts as having opened the invite.
  if (attendee.rsvpStatus === "invited") {
    await markOpened(attendee.id);
  }

  const questions = await getEventQuestions(event.id);
  const qrDataUrl = await QRCode.toDataURL(attendee.qrToken, {
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0e14", light: "#ffffff" },
  });

  const status = STATUS_COPY[attendee.rsvpStatus] ?? STATUS_COPY.invited;
  const hasResponded = attendee.rsvpStatus.startsWith("responded_");
  const choice = attendee.rsvpStatus === "responded_yes"
    ? ("yes" as const)
    : attendee.rsvpStatus === "responded_no"
      ? ("no" as const)
      : attendee.rsvpStatus === "responded_maybe"
        ? ("maybe" as const)
        : null;
  const isCompleted = event.status === "completed";
  const updateAction = updatePersonalRsvp.bind(null, token);
  const fullName = [attendee.firstName, attendee.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <MicrositeShell config={event.micrositeConfig}>
      <header className="mt-8">
        <EventLogo config={event.micrositeConfig} />
        <p className="font-data text-xs uppercase tracking-wider text-fg-faint">
          Your RSVP{fullName ? ` for ${fullName}` : ""}
        </p>
        <h1 className="mt-1 font-display text-3xl text-fg">{event.name}</h1>
        <div className="mt-3">
          <EventSummary event={event} />
        </div>
        <p className={`mt-3 text-sm font-medium ${status.tone}`}>
          {status.label}
          {choice === "yes" && attendee.plusOnes > 0
            ? `, plus ${attendee.plusOnes} guest${attendee.plusOnes === 1 ? "" : "s"}`
            : ""}
        </p>
      </header>

      <section aria-labelledby="qr-heading" className="mt-8">
        <div className="rounded-[10px] border border-line bg-raised p-5 text-center">
          <h2 id="qr-heading" className="text-lg text-fg">
            Your entry pass
          </h2>
          <p className="mt-1 text-sm text-fg-dim">
            This QR code will be scanned at the door to check you in. Keep
            this page handy on the day.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Your check-in QR code"
            className="mx-auto mt-4 w-full max-w-[240px] rounded-lg bg-white p-2"
          />
          <p className="mt-3 font-data text-xs text-fg-faint">
            Save this page link to come back to your RSVP any time.
          </p>
        </div>
      </section>

      <section aria-labelledby="update-heading" className="mt-8">
        {isCompleted ? (
          <div className="rounded-[10px] border border-line bg-raised p-5 text-center">
            <p className="font-display text-lg text-fg">This event has ended</p>
            <p className="mt-1 text-sm text-fg-dim">
              RSVP changes are closed. Thanks for being part of it.
            </p>
          </div>
        ) : (
          <div className="rounded-[10px] border border-line bg-raised p-5">
            <h2 id="update-heading" className="text-xl text-fg">
              {hasResponded ? "Update your RSVP" : "Respond to your invitation"}
            </h2>
            <p className="mb-5 mt-1 text-sm text-fg-dim">
              {hasResponded
                ? "Change your response, guests, or notes below."
                : "Let the organisers know if you can make it."}
            </p>
            <RsvpForm
              action={updateAction}
              variant="personal"
              submitLabel={hasResponded ? "Update my RSVP" : "Send my RSVP"}
              config={{
                allowPlusOnes: event.allowPlusOnes,
                maxPlusOnes: event.maxPlusOnes,
                collectDietary: event.collectDietary,
              }}
              questions={questions}
              defaults={{
                firstName: attendee.firstName ?? undefined,
                lastName: attendee.lastName ?? undefined,
                email: attendee.email ?? undefined,
                phone: attendee.phone ?? undefined,
                choice,
                plusOnes: attendee.plusOnes,
                dietaryNotes: attendee.dietaryNotes ?? undefined,
                accessibilityNotes: attendee.accessibilityNotes ?? undefined,
                customAnswers: attendee.customAnswers,
              }}
            />
          </div>
        )}
      </section>
    </MicrositeShell>
  );
}
