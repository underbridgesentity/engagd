"use client";

import * as React from "react";
import { useActionState, useEffect, useState, useTransition } from "react";
import type { LivePoll } from "@/lib/live";
import {
  submitQuestion,
  submitVote,
  upvoteQuestion,
  type AttendeeActionState,
} from "./actions";

const idle: AttendeeActionState = {};

// Voting

export function PollVote({
  slug,
  poll,
  votedOptionIds,
}: {
  slug: string;
  poll: LivePoll;
  votedOptionIds: string[];
}) {
  const hasVoted = votedOptionIds.length > 0;
  const [state, formAction, pending] = useActionState(
    submitVote.bind(null, slug, poll.id),
    idle
  );
  const showResults = hasVoted || state.ok;

  return (
    <section className="rounded-[10px] border border-line bg-raised p-4">
      <h3 className="text-[17px] font-medium leading-snug text-fg">
        {poll.question}
      </h3>

      {showResults ? (
        <div className="mt-4 space-y-3">
          {poll.options.map((option) => {
            const pct =
              poll.totalVotes === 0
                ? 0
                : Math.round((option.votes / poll.totalVotes) * 100);
            const mine = votedOptionIds.includes(option.id);
            return (
              <div key={option.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={mine ? "text-signal-strong" : "text-fg"}>
                    {option.label}
                    {mine ? " · your pick" : ""}
                  </span>
                  <span className="shrink-0 font-data text-xs text-fg-dim">
                    {pct}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink-2">
                  <div
                    className={
                      "h-full rounded-full transition-[width] duration-500 ease-out " +
                      (mine ? "bg-signal-strong" : "bg-signal/60")
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="pt-1 font-data text-xs text-fg-faint">
            {poll.voterCount} {poll.voterCount === 1 ? "vote" : "votes"} so far.
            Thanks for voting.
          </p>
        </div>
      ) : (
        <form action={formAction} className="mt-4 space-y-2">
          {poll.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-[15px] text-fg transition-colors has-[:checked]:border-signal/70 has-[:checked]:bg-signal/10"
            >
              <input
                type={poll.allowMultiple ? "checkbox" : "radio"}
                name="option"
                value={option.id}
                required={!poll.allowMultiple}
                className="h-4 w-4 shrink-0 accent-[var(--signal)]"
              />
              {option.label}
            </label>
          ))}
          {poll.allowMultiple ? (
            <p className="font-data text-xs text-fg-faint">
              Pick as many as you like.
            </p>
          ) : null}
          {state.error ? (
            <p className="text-sm text-coral">{state.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-1 min-h-[44px] w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-signal-strong disabled:opacity-50"
          >
            {pending ? "Sending" : "Vote"}
          </button>
        </form>
      )}
    </section>
  );
}

// Q&A

export function QuestionForm({ slug }: { slug: string }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: AttendeeActionState, formData: FormData) => {
      const result = await submitQuestion(slug, prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        setSubmitted(true);
      }
      return result;
    },
    idle
  );

  return (
    <div className="rounded-[10px] border border-line bg-raised p-4">
      {submitted ? (
        <div className="text-center">
          <p className="text-[15px] font-medium text-mint">
            Your question is with the moderator
          </p>
          <p className="mt-1 text-sm text-fg-dim">
            It will appear below once it is approved.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-3 min-h-[44px] rounded-lg border border-line px-4 text-sm text-fg-dim hover:text-fg"
          >
            Ask another question
          </button>
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="space-y-3">
          <textarea
            name="text"
            rows={3}
            required
            minLength={3}
            maxLength={500}
            placeholder="Ask the speaker something"
            className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-[15px] text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none"
          />
          <input
            name="displayName"
            maxLength={80}
            placeholder="Your name (optional)"
            className="min-h-[44px] w-full rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-[15px] text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none"
          />
          {state.error ? (
            <p className="text-sm text-coral">{state.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="min-h-[44px] w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-signal-strong disabled:opacity-50"
          >
            {pending ? "Sending" : "Send question"}
          </button>
        </form>
      )}
    </div>
  );
}

export type PublicQuestionItem = {
  id: string;
  text: string;
  displayName: string | null;
  upvotes: number;
  status: "approved" | "answered";
};

function upvoteKey(eventId: string) {
  return `engagd_upvotes_${eventId}`;
}

export function QuestionList({
  slug,
  eventId,
  questions,
}: {
  slug: string;
  eventId: string;
  questions: PublicQuestionItem[];
}) {
  const [upvoted, setUpvoted] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(upvoteKey(eventId));
      if (raw) setUpvoted(JSON.parse(raw));
    } catch {
      // Ignore unavailable storage; upvote dedupe is best effort.
    }
  }, [eventId]);

  const upvote = (questionId: string) => {
    if (upvoted.includes(questionId)) return;
    const next = [...upvoted, questionId];
    setUpvoted(next);
    try {
      window.localStorage.setItem(upvoteKey(eventId), JSON.stringify(next));
    } catch {
      // Ignore.
    }
    startTransition(async () => {
      await upvoteQuestion(slug, questionId);
    });
  };

  if (questions.length === 0) {
    return (
      <p className="rounded-[10px] border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-dim">
        No questions on the board yet. Yours could be the first.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {questions.map((q) => {
        const mine = upvoted.includes(q.id);
        return (
          <li
            key={q.id}
            className="flex items-start gap-3 rounded-[10px] border border-line bg-raised p-3.5"
          >
            <button
              onClick={() => upvote(q.id)}
              disabled={mine}
              aria-label={mine ? "Upvoted" : `Upvote: ${q.text}`}
              className={
                "flex min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center rounded-lg border font-data text-sm transition-colors " +
                (mine
                  ? "border-signal/50 bg-signal/15 text-signal-strong"
                  : "border-line bg-ink-2 text-fg-dim hover:border-signal/50 hover:text-fg")
              }
            >
              <span aria-hidden>&#9650;</span>
              {q.upvotes}
            </button>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] leading-snug text-fg">{q.text}</p>
              <p className="mt-1 font-data text-xs text-fg-faint">
                {q.displayName?.trim() || "Anonymous"}
                {q.status === "answered" ? (
                  <span className="ml-2 text-mint">Answered</span>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
