"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button, Card, EmptyState, Input, Label } from "@/components/ui";
import type { ProgramActionState } from "./actions";

export type ProgramItem = {
  id: string;
  title: string;
  description: string;
  speaker: string;
  location: string;
  startsAt: string; // datetime-local value or ""
  endsAt: string;
  startsAtDisplay: string;
  update: (prev: ProgramActionState, formData: FormData) => Promise<ProgramActionState>;
  remove: () => Promise<void>;
  moveUp: () => Promise<void>;
  moveDown: () => Promise<void>;
};

function ItemFields({ defaults }: { defaults?: Partial<ProgramItem> }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Title</Label>
        <Input name="title" required defaultValue={defaults?.title ?? ""} placeholder="Welcome address" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Starts</Label>
          <Input name="startsAt" type="datetime-local" defaultValue={defaults?.startsAt ?? ""} />
        </div>
        <div>
          <Label>Ends</Label>
          <Input name="endsAt" type="datetime-local" defaultValue={defaults?.endsAt ?? ""} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Speaker</Label>
          <Input name="speaker" defaultValue={defaults?.speaker ?? ""} placeholder="Dr Naledi Khumalo" />
        </div>
        <div>
          <Label>Location</Label>
          <Input name="location" defaultValue={defaults?.location ?? ""} placeholder="Main hall" />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none"
        />
      </div>
    </div>
  );
}

function EditForm({ item, onDone }: { item: ProgramItem; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ProgramActionState, formData: FormData) => {
      const result = await item.update(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    {} as ProgramActionState
  );
  return (
    <form action={formAction} className="space-y-3">
      <ItemFields defaults={item} />
      {state.error ? <p className="text-sm text-coral">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ProgramEditor({
  items,
  createAction,
}: {
  items: ProgramItem[];
  createAction: (prev: ProgramActionState, formData: FormData) => Promise<ProgramActionState>;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const addFormRef = React.useRef<HTMLFormElement>(null);
  const [createState, createFormAction, createPending] = useActionState(
    async (prev: ProgramActionState, formData: FormData) => {
      const result = await createAction(prev, formData);
      if (result.ok) {
        addFormRef.current?.reset();
        setShowAdd(false);
      }
      return result;
    },
    {} as ProgramActionState
  );

  return (
    <div className="space-y-4">
      {items.length === 0 && !showAdd ? (
        <EmptyState
          title="No program items yet"
          hint="Build the running order for the day: sessions, speakers, breaks and locations."
          action={<Button onClick={() => setShowAdd(true)}>Add an item</Button>}
        />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <Card key={item.id} className="space-y-2">
              {editingId === item.id ? (
                <EditForm item={item} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-data text-xs text-fg-faint">{item.startsAtDisplay}</p>
                    <p className="text-sm font-medium text-fg">{item.title}</p>
                    <p className="text-xs text-fg-dim">
                      {[item.speaker, item.location].filter(Boolean).join(" | ") || null}
                    </p>
                    {item.description ? (
                      <p className="mt-1 max-w-lg text-xs text-fg-faint">{item.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <form action={item.moveUp}>
                      <Button variant="ghost" type="submit" disabled={i === 0} className="px-2">
                        Up
                      </Button>
                    </form>
                    <form action={item.moveDown}>
                      <Button
                        variant="ghost"
                        type="submit"
                        disabled={i === items.length - 1}
                        className="px-2"
                      >
                        Down
                      </Button>
                    </form>
                    <Button variant="secondary" type="button" onClick={() => setEditingId(item.id)}>
                      Edit
                    </Button>
                    <form action={item.remove}>
                      <Button variant="danger" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showAdd ? (
        <Card className="space-y-3">
          <h3 className="font-display text-base text-fg">New program item</h3>
          <form ref={addFormRef} action={createFormAction} className="space-y-3">
            <ItemFields />
            {createState.error ? <p className="text-sm text-coral">{createState.error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={createPending}>
                {createPending ? "Adding..." : "Add item"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : items.length > 0 ? (
        <Button variant="secondary" onClick={() => setShowAdd(true)}>
          Add an item
        </Button>
      ) : null}
    </div>
  );
}
