"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import type { AddAttendeeState } from "./actions";

export function AddAttendeeForm({
  action,
}: {
  action: (prev: AddAttendeeState, formData: FormData) => Promise<AddAttendeeState>;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: AddAttendeeState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    {} as AddAttendeeState
  );

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Add attendee
      </Button>
    );
  }

  return (
    <Card className="space-y-3">
      <h3 className="font-display text-base text-fg">Add attendee manually</h3>
      <form ref={formRef} action={formAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>First name</Label>
            <Input name="firstName" placeholder="Thandi" />
          </div>
          <div>
            <Label>Last name</Label>
            <Input name="lastName" placeholder="Nkosi" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label>Email</Label>
            <Input name="email" type="email" placeholder="thandi@example.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" placeholder="+27 82 000 0000" />
          </div>
        </div>
        <div className="max-w-[8rem]">
          <Label>Plus-ones</Label>
          <Input name="plusOnes" type="number" min={0} max={20} defaultValue={0} />
        </div>
        {state.error ? <p className="text-sm text-coral">{state.error}</p> : null}
        {state.ok ? <p className="text-sm text-mint">Attendee added.</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add attendee"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </form>
    </Card>
  );
}
