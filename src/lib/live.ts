import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { audienceQuestions, pollOptions, polls, pollVotes } from "@/db/schema";

// Shared read models for the live polls and Q&A surfaces (organiser hub,
// presenter view, attendee page). Server-side only.

export type PollStatus = "draft" | "open" | "closed";

export type LiveOption = {
  id: string;
  label: string;
  sortOrder: number;
  votes: number;
};

export type LivePoll = {
  id: string;
  question: string;
  status: PollStatus;
  allowMultiple: boolean;
  createdAt: Date;
  totalVotes: number;
  voterCount: number;
  options: LiveOption[];
};

export async function getLivePolls(
  eventId: string,
  statuses?: PollStatus[]
): Promise<LivePoll[]> {
  const pollRows = await db
    .select()
    .from(polls)
    .where(eq(polls.eventId, eventId))
    .orderBy(desc(polls.createdAt));
  const filtered = statuses
    ? pollRows.filter((p) => statuses.includes(p.status))
    : pollRows;
  if (filtered.length === 0) return [];

  const pollIds = filtered.map((p) => p.id);
  const [optionRows, countRows, voterRows] = await Promise.all([
    db
      .select()
      .from(pollOptions)
      .where(inArray(pollOptions.pollId, pollIds))
      .orderBy(asc(pollOptions.sortOrder)),
    db
      .select({
        pollOptionId: pollVotes.pollOptionId,
        count: sql<number>`count(*)::int`,
      })
      .from(pollVotes)
      .where(inArray(pollVotes.pollId, pollIds))
      .groupBy(pollVotes.pollOptionId),
    db
      .select({
        pollId: pollVotes.pollId,
        voters: sql<number>`count(distinct ${pollVotes.voterFingerprint})::int`,
      })
      .from(pollVotes)
      .where(inArray(pollVotes.pollId, pollIds))
      .groupBy(pollVotes.pollId),
  ]);

  const countByOption = new Map(countRows.map((r) => [r.pollOptionId, r.count]));
  const votersByPoll = new Map(voterRows.map((r) => [r.pollId, r.voters]));

  return filtered.map((p) => {
    const options = optionRows
      .filter((o) => o.pollId === p.id)
      .map((o) => ({
        id: o.id,
        label: o.label,
        sortOrder: o.sortOrder,
        votes: countByOption.get(o.id) ?? 0,
      }));
    return {
      id: p.id,
      question: p.question,
      status: p.status,
      allowMultiple: p.allowMultiple,
      createdAt: p.createdAt,
      totalVotes: options.reduce((sum, o) => sum + o.votes, 0),
      voterCount: votersByPoll.get(p.id) ?? 0,
      options,
    };
  });
}

export type LiveQuestion = typeof audienceQuestions.$inferSelect;

export async function getLiveQuestions(
  eventId: string
): Promise<LiveQuestion[]> {
  return db
    .select()
    .from(audienceQuestions)
    .where(eq(audienceQuestions.eventId, eventId))
    .orderBy(desc(audienceQuestions.upvotes), desc(audienceQuestions.createdAt));
}

// The IDs of options a fingerprint has voted for, keyed by poll.
export async function getVotesByFingerprint(
  pollIds: string[],
  fingerprint: string | null
): Promise<Record<string, string[]>> {
  if (!fingerprint || pollIds.length === 0) return {};
  const rows = await db
    .select({ pollId: pollVotes.pollId, optionId: pollVotes.pollOptionId })
    .from(pollVotes)
    .where(
      and(
        inArray(pollVotes.pollId, pollIds),
        eq(pollVotes.voterFingerprint, fingerprint)
      )
    );
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.pollId] ??= []).push(r.optionId);
  return out;
}
