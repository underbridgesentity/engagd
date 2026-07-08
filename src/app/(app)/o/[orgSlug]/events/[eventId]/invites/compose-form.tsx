"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import type { ComposeState } from "./actions";

const AUDIENCES = [
  {
    value: "non_responders",
    label: "Not yet responded (includes anyone not yet invited)",
  },
  { value: "all", label: "Everyone with an email" },
  { value: "attending", label: "Attending (responded yes)" },
  { value: "maybe", label: "Responded maybe" },
  { value: "waitlisted", label: "Waitlisted" },
];

export function ComposeForm({
  action,
}: {
  action: (prev: ComposeState, formData: FormData) => Promise<ComposeState>;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [sendMode, setSendMode] = React.useState<"now" | "schedule">("now");
  const [state, formAction, pending] = useActionState(
    async (prev: ComposeState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        setSendMode("now");
      }
      return result;
    },
    {} as ComposeState
  );

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-fg">Compose invitation</h3>
        <p className="mt-1 text-sm text-fg-dim">
          Each guest gets their own personal RSVP link appended to your message.
        </p>
      </div>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" required placeholder="You are invited" />
        </div>
        <div>
          <Label htmlFor="intro">Message</Label>
          <Textarea
            id="intro"
            name="intro"
            rows={6}
            required
            placeholder="We would love to see you there. Here is everything you need to know..."
          />
        </div>
        <div>
          <Label htmlFor="audience">Audience</Label>
          <Select id="audience" name="audience" defaultValue="non_responders">
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Delivery</Label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="radio"
                name="sendMode"
                value="now"
                checked={sendMode === "now"}
                onChange={() => setSendMode("now")}
                className="accent-[var(--signal)]"
              />
              Send now
            </label>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="radio"
                name="sendMode"
                value="schedule"
                checked={sendMode === "schedule"}
                onChange={() => setSendMode("schedule")}
                className="accent-[var(--signal)]"
              />
              Schedule
            </label>
          </div>
          {sendMode === "schedule" ? (
            <div className="max-w-xs">
              <Label htmlFor="scheduledAt">Send at</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
            </div>
          ) : null}
        </div>
        {state.error ? <p className="text-sm text-coral">{state.error}</p> : null}
        {state.ok ? <p className="text-sm text-mint">Campaign created.</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Working..." : sendMode === "now" ? "Send now" : "Schedule send"}
        </Button>
      </form>
    </Card>
  );
}
