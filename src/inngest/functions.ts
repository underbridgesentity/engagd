import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { attendees, checkIns, emailCampaigns, events, invitations } from "@/db/schema";
import { orgReplyTo, sendEmail } from "@/lib/email";
import { inngest } from "@/lib/jobs";
import { appBaseUrl } from "@/lib/url";

const APP_URL = appBaseUrl();

type AttendeeRow = typeof attendees.$inferSelect;

// Slim event shape used inside steps. Inngest jsonifies step results, so
// dates cross the boundary as ISO strings and are rebuilt here.
type EventInfo = {
  id: string;
  organisationId: string;
  name: string;
  timezone: string;
  startsAt: Date | null;
  venueName: string | null;
};

function toEventInfo(row: {
  id: string;
  organisationId: string;
  name: string;
  timezone: string;
  startsAt: Date | string | null;
  venueName: string | null;
}): EventInfo {
  return {
    id: row.id,
    organisationId: row.organisationId,
    name: row.name,
    timezone: row.timezone,
    startsAt: row.startsAt ? new Date(row.startsAt) : null,
    venueName: row.venueName,
  };
}

// Personal RSVP link: opaque token in the path, never PII in query strings.
function rsvpLink(qrToken: string) {
  return `${APP_URL}/r/${qrToken}`;
}

function trackingPixel(invitationId: string) {
  return `<img src="${APP_URL}/api/t/${invitationId}" width="1" height="1" alt="" style="display:block;" />`;
}

function buildEmailHtml(opts: {
  bodyHtml: string;
  event: EventInfo;
  attendee: AttendeeRow;
  invitationId: string;
}) {
  const { bodyHtml, event, attendee, invitationId } = opts;
  const greetingName = attendee.firstName ? ` ${attendee.firstName}` : "";
  const when = event.startsAt
    ? new Intl.DateTimeFormat("en-ZA", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: event.timezone,
      }).format(event.startsAt)
    : null;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1c2333;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;">
        <p style="margin:0 0 16px 0;">Hi${greetingName},</p>
        ${bodyHtml}
        <div style="margin:24px 0;padding:16px;background:#f4f5f7;border-radius:8px;">
          <p style="margin:0;font-weight:bold;">${event.name}</p>
          ${when ? `<p style="margin:4px 0 0 0;">${when}</p>` : ""}
          ${event.venueName ? `<p style="margin:4px 0 0 0;">${event.venueName}</p>` : ""}
        </div>
        <p style="margin:24px 0;">
          <a href="${rsvpLink(attendee.qrToken)}"
             style="display:inline-block;background:#5b8cff;color:#0b0e14;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;">
            Respond to this invitation
          </a>
        </p>
        <p style="margin:0;font-size:12px;color:#667089;">
          This link is personal to you, please do not forward it.
        </p>
      </div>
      ${trackingPixel(invitationId)}
    </div>
  </body>
</html>`;
}

// Resolve the audience to attendees who can actually receive email.
async function resolveAudience(eventId: string, audience: string): Promise<AttendeeRow[]> {
  const base = and(eq(attendees.eventId, eventId), isNotNull(attendees.email));
  switch (audience) {
    case "all":
      return db.select().from(attendees).where(base);
    case "non_responders":
      return db
        .select()
        .from(attendees)
        .where(and(base, inArray(attendees.rsvpStatus, ["invited", "opened"])));
    case "attending":
      return db.select().from(attendees).where(and(base, eq(attendees.rsvpStatus, "responded_yes")));
    case "not_attending":
      return db.select().from(attendees).where(and(base, eq(attendees.rsvpStatus, "responded_no")));
    case "maybe":
      return db
        .select()
        .from(attendees)
        .where(and(base, eq(attendees.rsvpStatus, "responded_maybe")));
    case "waitlisted":
      return db.select().from(attendees).where(and(base, eq(attendees.rsvpStatus, "waitlisted")));
    case "checked_in": {
      // Anyone with a check-in row for this event, regardless of RSVP state.
      const checkedInIds = db
        .select({ id: checkIns.attendeeId })
        .from(checkIns)
        .where(eq(checkIns.eventId, eventId));
      return db
        .select()
        .from(attendees)
        .where(and(base, inArray(attendees.id, checkedInIds)));
    }
    case "no_shows": {
      // Said yes but never checked in.
      const checkedInIds = db
        .select({ id: checkIns.attendeeId })
        .from(checkIns)
        .where(eq(checkIns.eventId, eventId));
      return db
        .select()
        .from(attendees)
        .where(
          and(
            base,
            eq(attendees.rsvpStatus, "responded_yes"),
            notInArray(attendees.id, checkedInIds)
          )
        );
    }
    default:
      return [];
  }
}

async function sendToAttendee(opts: {
  attendee: AttendeeRow;
  event: EventInfo;
  subject: string;
  bodyHtml: string;
  replyTo?: string;
}) {
  const { attendee, event, subject, bodyHtml, replyTo } = opts;
  if (!attendee.email) return { sent: false as const };

  const [invitation] = await db
    .insert(invitations)
    .values({ attendeeId: attendee.id, eventId: event.id, channel: "email" })
    .returning({ id: invitations.id });

  const result = await sendEmail({
    to: attendee.email,
    subject,
    html: buildEmailHtml({ bodyHtml, event, attendee, invitationId: invitation.id }),
    replyTo,
  });

  await db
    .update(invitations)
    .set({ sentAt: new Date(), providerMessageId: result?.id ?? null })
    .where(eq(invitations.id, invitation.id));

  return { sent: true as const };
}

export const sendCampaign = inngest.createFunction(
  { id: "campaign-send", retries: 3, triggers: [{ event: "campaign/scheduled" }] },
  async ({ event: trigger, step }) => {
    const campaignId = trigger.data.campaignId as string;

    const campaign = await step.run("load-campaign", async () => {
      const [row] = await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, campaignId));
      return row ?? null;
    });
    if (!campaign) return { skipped: "campaign not found" };
    if (campaign.status !== "scheduled") return { skipped: `status is ${campaign.status}` };

    // Respect the scheduled time, then re-check in case it was cancelled
    // while we slept.
    if (campaign.scheduledFor && new Date(campaign.scheduledFor).getTime() > Date.now()) {
      await step.sleepUntil("wait-for-schedule", new Date(campaign.scheduledFor));
      const stillScheduled = await step.run("recheck-status", async () => {
        const [row] = await db
          .select({ status: emailCampaigns.status })
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, campaignId));
        return row?.status === "scheduled";
      });
      if (!stillScheduled) return { skipped: "cancelled while waiting" };
    }

    const recipients = await step.run("mark-sending-and-resolve", async () => {
      await db
        .update(emailCampaigns)
        .set({ status: "sending" })
        .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.status, "scheduled")));
      const list = await resolveAudience(campaign.eventId, campaign.audience);
      return list.map((a) => a.id);
    });

    const eventRaw = await step.run("load-event", async () => {
      const [row] = await db.select().from(events).where(eq(events.id, campaign.eventId));
      return row ?? null;
    });
    const eventInfo = eventRaw ? toEventInfo(eventRaw) : null;
    if (!eventInfo) {
      await step.run("mark-failed", async () => {
        await db
          .update(emailCampaigns)
          .set({ status: "failed" })
          .where(eq(emailCampaigns.id, campaignId));
      });
      return { error: "event not found" };
    }

    const replyTo = await step.run("resolve-reply-to", () =>
      orgReplyTo(campaign.organisationId)
    );

    let sentCount = 0;
    for (const attendeeId of recipients) {
      const ok = await step.run(`send-${attendeeId}`, async () => {
        const [attendee] = await db.select().from(attendees).where(eq(attendees.id, attendeeId));
        if (!attendee?.email) return false;
        try {
          const res = await sendToAttendee({
            attendee,
            event: eventInfo,
            subject: campaign.subject,
            bodyHtml: campaign.bodyHtml,
            replyTo: replyTo ?? undefined,
          });
          return res.sent;
        } catch {
          // One bad address must not sink the whole campaign.
          return false;
        }
      });
      if (ok) sentCount += 1;
    }

    await step.run("mark-sent", async () => {
      await db
        .update(emailCampaigns)
        .set({ status: "sent", sentAt: new Date(), recipientCount: sentCount })
        .where(eq(emailCampaigns.id, campaignId));
    });

    return { sent: sentCount, resolved: recipients.length };
  }
);

export const sendSingleInvitation = inngest.createFunction(
  { id: "invitation-send", retries: 3, triggers: [{ event: "invitation/send" }] },
  async ({ event: trigger, step }) => {
    const { attendeeId, eventId } = trigger.data as { attendeeId: string; eventId: string };

    const result = await step.run("send", async () => {
      const [attendee] = await db
        .select()
        .from(attendees)
        .where(and(eq(attendees.id, attendeeId), eq(attendees.eventId, eventId)));
      if (!attendee?.email) return { sent: false, reason: "no email" };
      const [eventRow] = await db.select().from(events).where(eq(events.id, eventId));
      if (!eventRow) return { sent: false, reason: "event not found" };

      const replyTo = await orgReplyTo(eventRow.organisationId);
      await sendToAttendee({
        attendee,
        event: toEventInfo(eventRow),
        subject: `You are invited: ${eventRow.name}`,
        bodyHtml: `<p style="margin:0 0 16px 0;">You are invited to ${eventRow.name}. We would love to have you there.</p>`,
        replyTo,
      });
      return { sent: true };
    });

    return result;
  }
);

export const functions = [sendCampaign, sendSingleInvitation];
