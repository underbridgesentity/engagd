"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import type { StatusActionState } from "../actions";

const TRANSITIONS: Record<string, Array<{ to: string; label: string; variant: "primary" | "secondary" | "ghost" | "danger" }>> = {
  draft: [
    { to: "active", label: "Activate event", variant: "primary" },
    { to: "archived", label: "Archive", variant: "ghost" },
  ],
  active: [
    { to: "completed", label: "Mark completed", variant: "primary" },
    { to: "draft", label: "Back to draft", variant: "secondary" },
    { to: "archived", label: "Archive", variant: "ghost" },
  ],
  completed: [
    { to: "active", label: "Reactivate", variant: "secondary" },
    { to: "archived", label: "Archive", variant: "ghost" },
  ],
  archived: [{ to: "draft", label: "Restore to draft", variant: "secondary" }],
};

export function StatusActions({
  status,
  orgSlug,
  action,
}: {
  status: string;
  orgSlug: string;
  action: (prev: StatusActionState, formData: FormData) => Promise<StatusActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as StatusActionState);
  const options = TRANSITIONS[status] ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((opt) => (
          <form key={opt.to} action={formAction}>
            <input type="hidden" name="status" value={opt.to} />
            <Button type="submit" variant={opt.variant} disabled={pending}>
              {opt.label}
            </Button>
          </form>
        ))}
      </div>
      {state.blocked ? (
        <div className="rounded-[10px] border border-ember/40 bg-ember/10 px-4 py-3 text-sm">
          <p className="font-medium text-ember">
            You have {state.blocked.current} of {state.blocked.limit} active events on your plan.
          </p>
          <p className="mt-1 text-fg-dim">
            Complete or archive an active event, or upgrade to run more at once.{" "}
            <a
              href={`/o/${orgSlug}/billing`}
              className="text-signal-strong underline underline-offset-2"
            >
              View plans
            </a>
          </p>
        </div>
      ) : state.error ? (
        <p className="text-sm text-coral">{state.error}</p>
      ) : null}
    </div>
  );
}
