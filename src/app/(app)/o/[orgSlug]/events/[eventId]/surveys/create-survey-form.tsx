"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import type { SurveyActionState } from "./actions";

export function CreateSurveyForm({
  action,
}: {
  action: (prev: SurveyActionState, formData: FormData) => Promise<SurveyActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as SurveyActionState);
  return (
    <Card className="space-y-3">
      <h3 className="font-display text-base text-fg">New survey</h3>
      <form action={formAction} className="space-y-3">
        <div>
          <Label>Survey title</Label>
          <Input name="title" required placeholder="Post-event feedback" maxLength={200} />
        </div>
        {state.error ? <p className="text-sm text-coral">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create survey"}
        </Button>
      </form>
    </Card>
  );
}
