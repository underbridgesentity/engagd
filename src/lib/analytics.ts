import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendees,
  audienceQuestions,
  checkIns,
  events,
  invitations,
  polls,
  pollVotes,
  surveys,
  surveyResponses,
} from "@/db/schema";

export type EventAnalyticsRow = {
  id: string;
  name: string;
  status: "draft" | "active" | "completed" | "archived";
  invited: number;
  sent: number;
  opened: number;
  yes: number;
  no: number;
  maybe: number;
  waitlisted: number;
  // Attendees with an email on file: the denominator for survey response rate.
  withEmail: number;
};

// Day-of and follow-up engagement counts for one event.
export type EventEngagementRow = {
  checkedIn: number;
  pollCount: number;
  pollVotes: number;
  pollVoters: number;
  questionsSubmitted: number;
  questionsApproved: number;
  questionsAnswered: number;
  questionUpvotes: number;
  surveyCount: number;
  surveyResponses: number;
};

// Derived rates are 0..1, or null when the denominator is zero.
export type EventAnalyticsFullRow = EventAnalyticsRow &
  EventEngagementRow & {
    openRate: number | null;
    rsvpConversion: number | null;
    checkInRate: number | null;
    pollParticipation: number | null;
    surveyResponseRate: number | null;
  };

export function rate(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

// Per-event funnel counts for one organisation. Distinct counts guard against
// the row multiplication from the double left join.
export async function orgAnalytics(
  organisationId: string,
  eventId?: string
): Promise<EventAnalyticsRow[]> {
  const where = eventId
    ? and(eq(events.organisationId, organisationId), eq(events.id, eventId))
    : eq(events.organisationId, organisationId);
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      status: events.status,
      invited: sql<number>`count(distinct ${attendees.id})`,
      yes: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'responded_yes')`,
      no: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'responded_no')`,
      maybe: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'responded_maybe')`,
      waitlisted: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.rsvpStatus} = 'waitlisted')`,
      withEmail: sql<number>`count(distinct ${attendees.id}) filter (where ${attendees.email} is not null)`,
      sent: sql<number>`count(distinct ${invitations.id}) filter (where ${invitations.sentAt} is not null)`,
      opened: sql<number>`count(distinct ${invitations.id}) filter (where ${invitations.openedAt} is not null)`,
    })
    .from(events)
    .leftJoin(attendees, eq(attendees.eventId, events.id))
    .leftJoin(invitations, eq(invitations.eventId, events.id))
    .where(where)
    .groupBy(events.id, events.name, events.status)
    .orderBy(desc(events.createdAt));
  return rows.map((r) => ({
    ...r,
    invited: Number(r.invited),
    sent: Number(r.sent),
    opened: Number(r.opened),
    yes: Number(r.yes),
    no: Number(r.no),
    maybe: Number(r.maybe),
    waitlisted: Number(r.waitlisted),
    withEmail: Number(r.withEmail),
  }));
}

const EMPTY_ENGAGEMENT: EventEngagementRow = {
  checkedIn: 0,
  pollCount: 0,
  pollVotes: 0,
  pollVoters: 0,
  questionsSubmitted: 0,
  questionsApproved: 0,
  questionsAnswered: 0,
  questionUpvotes: 0,
  surveyCount: 0,
  surveyResponses: 0,
};

// Engagement counts per event in four grouped queries, each scoped to the
// organisation by joining through events. Returned keyed by event id.
async function orgEngagement(
  organisationId: string,
  eventId?: string
): Promise<Map<string, EventEngagementRow>> {
  const org = eq(events.organisationId, organisationId);
  const scoped = () => (eventId ? and(org, eq(events.id, eventId)) : org);

  const [checkInRows, pollRows, qaRows, surveyRows] = await Promise.all([
    db
      .select({
        eventId: checkIns.eventId,
        checkedIn: sql<number>`count(*)`,
      })
      .from(checkIns)
      .innerJoin(events, eq(events.id, checkIns.eventId))
      .where(scoped())
      .groupBy(checkIns.eventId),
    db
      .select({
        eventId: polls.eventId,
        pollCount: sql<number>`count(distinct ${polls.id})`,
        pollVotes: sql<number>`count(${pollVotes.id})`,
        pollVoters: sql<number>`count(distinct ${pollVotes.voterFingerprint})`,
      })
      .from(polls)
      .innerJoin(events, eq(events.id, polls.eventId))
      .leftJoin(pollVotes, eq(pollVotes.pollId, polls.id))
      .where(scoped())
      .groupBy(polls.eventId),
    db
      .select({
        eventId: audienceQuestions.eventId,
        questionsSubmitted: sql<number>`count(*)`,
        questionsApproved: sql<number>`count(*) filter (where ${audienceQuestions.status} in ('approved', 'answered'))`,
        questionsAnswered: sql<number>`count(*) filter (where ${audienceQuestions.status} = 'answered')`,
        questionUpvotes: sql<number>`coalesce(sum(${audienceQuestions.upvotes}), 0)`,
      })
      .from(audienceQuestions)
      .innerJoin(events, eq(events.id, audienceQuestions.eventId))
      .where(scoped())
      .groupBy(audienceQuestions.eventId),
    db
      .select({
        eventId: surveys.eventId,
        surveyCount: sql<number>`count(distinct ${surveys.id})`,
        surveyResponses: sql<number>`count(${surveyResponses.id})`,
      })
      .from(surveys)
      .innerJoin(events, eq(events.id, surveys.eventId))
      .leftJoin(surveyResponses, eq(surveyResponses.surveyId, surveys.id))
      .where(scoped())
      .groupBy(surveys.eventId),
  ]);

  const map = new Map<string, EventEngagementRow>();
  const get = (id: string): EventEngagementRow => {
    const existing = map.get(id);
    if (existing) return existing;
    const fresh = { ...EMPTY_ENGAGEMENT };
    map.set(id, fresh);
    return fresh;
  };
  for (const r of checkInRows) {
    get(r.eventId).checkedIn = Number(r.checkedIn);
  }
  for (const r of pollRows) {
    const e = get(r.eventId);
    e.pollCount = Number(r.pollCount);
    e.pollVotes = Number(r.pollVotes);
    e.pollVoters = Number(r.pollVoters);
  }
  for (const r of qaRows) {
    const e = get(r.eventId);
    e.questionsSubmitted = Number(r.questionsSubmitted);
    e.questionsApproved = Number(r.questionsApproved);
    e.questionsAnswered = Number(r.questionsAnswered);
    e.questionUpvotes = Number(r.questionUpvotes);
  }
  for (const r of surveyRows) {
    const e = get(r.eventId);
    e.surveyCount = Number(r.surveyCount);
    e.surveyResponses = Number(r.surveyResponses);
  }
  return map;
}

function withRates(
  funnel: EventAnalyticsRow,
  engagement: EventEngagementRow
): EventAnalyticsFullRow {
  return {
    ...funnel,
    ...engagement,
    openRate: rate(funnel.opened, funnel.sent),
    rsvpConversion: rate(funnel.yes, funnel.invited),
    // Checked in over confirmed yes RSVPs.
    checkInRate: rate(engagement.checkedIn, funnel.yes),
    // Distinct poll voters over checked-in attendees.
    pollParticipation: rate(engagement.pollVoters, engagement.checkedIn),
    // Survey responses over attendees reachable by email.
    surveyResponseRate: rate(engagement.surveyResponses, funnel.withEmail),
  };
}

// Full per-event analytics: funnel plus engagement plus derived rates.
export async function orgAnalyticsFull(
  organisationId: string
): Promise<EventAnalyticsFullRow[]> {
  const [funnel, engagement] = await Promise.all([
    orgAnalytics(organisationId),
    orgEngagement(organisationId),
  ]);
  return funnel.map((f) =>
    withRates(f, engagement.get(f.id) ?? EMPTY_ENGAGEMENT)
  );
}

// Single event, still org-scoped so cross-tenant access is impossible.
export async function eventAnalyticsFull(
  organisationId: string,
  eventId: string
): Promise<EventAnalyticsFullRow | null> {
  const [funnel, engagement] = await Promise.all([
    orgAnalytics(organisationId, eventId),
    orgEngagement(organisationId, eventId),
  ]);
  const f = funnel[0];
  if (!f) return null;
  return withRates(f, engagement.get(f.id) ?? EMPTY_ENGAGEMENT);
}
