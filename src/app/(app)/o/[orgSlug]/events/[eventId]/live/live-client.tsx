"use client";

import * as React from "react";
import { useActionState, useState, useTransition } from "react";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { LivePoll, LiveQuestion } from "@/lib/live";
import {
  createPoll,
  deletePoll,
  setPollStatus,
  setQuestionStatus,
  type LiveActionState,
  type ModerationStatus,
} from "./actions";

const idle: LiveActionState = {};

function percent(votes: number, total: number) {
  return total === 0 ? 0 : Math.round((votes / total) * 100);
}

// Poll management

export function CreatePollForm({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: LiveActionState, formData: FormData) => {
      const result = await createPoll(orgSlug, eventId, prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    idle
  );

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        New poll
      </Button>
    );
  }

  return (
    <Card>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="poll-question">Question</Label>
          <Input
            id="poll-question"
            name="question"
            maxLength={300}
            required
            placeholder="What should we cover next?"
          />
        </div>
        <div>
          <Label htmlFor="poll-options">Options, one per line</Label>
          <Textarea
            id="poll-options"
            name="options"
            rows={4}
            required
            placeholder={"Option A\nOption B"}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-fg-dim">
          <input
            type="checkbox"
            name="allowMultiple"
            className="h-4 w-4 accent-[var(--signal)]"
          />
          Allow multiple selections
        </label>
        {state.error ? (
          <p className="text-sm text-coral">{state.error}</p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating" : "Create poll"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

const pollStatusTone = {
  draft: "neutral",
  open: "mint",
  closed: "ember",
} as const;

export function PollCard({
  orgSlug,
  eventId,
  poll,
}: {
  orgSlug: string;
  eventId: string;
  poll: LivePoll;
}) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<LiveActionState>) =>
    startTransition(async () => {
      await fn();
    });

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-fg">{poll.question}</p>
          <p className="mt-1 font-data text-xs text-fg-faint">
            {poll.voterCount} {poll.voterCount === 1 ? "voter" : "voters"}
            {poll.allowMultiple ? " · multiple selections" : ""}
          </p>
        </div>
        <Badge tone={pollStatusTone[poll.status]}>{poll.status}</Badge>
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const pct = percent(option.votes, poll.totalVotes);
          return (
            <div key={option.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-fg">{option.label}</span>
                <span className="shrink-0 font-data text-xs text-fg-dim">
                  {option.votes} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-2">
                <div
                  className="h-full rounded-full bg-signal transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {poll.status !== "open" ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(() => setPollStatus(orgSlug, eventId, poll.id, "open"))
            }
          >
            {poll.status === "draft" ? "Open poll" : "Reopen"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(() => setPollStatus(orgSlug, eventId, poll.id, "closed"))
            }
          >
            Close poll
          </Button>
        )}
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Delete this poll and all its votes?")) {
              run(() => deletePoll(orgSlug, eventId, poll.id));
            }
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

// Q&A moderation

const questionTone = {
  pending: "ember",
  approved: "mint",
  answered: "signal",
  dismissed: "neutral",
} as const;

const FILTERS: Array<{ value: ModerationStatus | "all"; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "answered", label: "Answered" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

export function QuestionModeration({
  orgSlug,
  eventId,
  questions,
}: {
  orgSlug: string;
  eventId: string;
  questions: LiveQuestion[];
}) {
  const [filter, setFilter] = useState<ModerationStatus | "all">("pending");
  const [pending, startTransition] = useTransition();

  const counts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});
  const visible =
    filter === "all" ? questions : questions.filter((q) => q.status === filter);

  const moderate = (id: string, status: ModerationStatus) =>
    startTransition(async () => {
      await setQuestionStatus(orgSlug, eventId, id, status);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter questions">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={
              "rounded-full border px-3 py-1.5 text-sm transition-colors " +
              (filter === f.value
                ? "border-signal/50 bg-signal/15 text-signal-strong"
                : "border-line text-fg-dim hover:text-fg")
            }
          >
            {f.label}
            {f.value !== "all" && counts[f.value] ? (
              <span className="ml-1.5 font-data text-xs">{counts[f.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line-strong py-10 text-center text-sm text-fg-dim">
          {filter === "pending"
            ? "No questions waiting for review."
            : "Nothing here yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((q) => (
            <li key={q.id}>
              <Card className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] text-fg">{q.text}</p>
                  <Badge tone={questionTone[q.status]}>{q.status}</Badge>
                </div>
                <p className="font-data text-xs text-fg-faint">
                  {q.displayName?.trim() || "Anonymous"} · {q.upvotes}{" "}
                  {q.upvotes === 1 ? "upvote" : "upvotes"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {q.status !== "approved" ? (
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() => moderate(q.id, "approved")}
                    >
                      Approve
                    </Button>
                  ) : null}
                  {q.status === "approved" ? (
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() => moderate(q.id, "answered")}
                    >
                      Mark answered
                    </Button>
                  ) : null}
                  {q.status !== "dismissed" ? (
                    <Button
                      variant="ghost"
                      disabled={pending}
                      onClick={() => moderate(q.id, "dismissed")}
                    >
                      Dismiss
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      disabled={pending}
                      onClick={() => moderate(q.id, "pending")}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
