"use client";

import * as React from "react";
import { useActionState } from "react";
import { Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";
import type { SurveyActionState } from "../actions";

export type SurveyQuestionItem = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  options: string[];
  update: (prev: SurveyActionState, formData: FormData) => Promise<SurveyActionState>;
  remove: () => Promise<void>;
  moveUp: () => Promise<void>;
  moveDown: () => Promise<void>;
};

const FIELD_TYPES: Array<{ value: string; label: string }> = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown (single choice)" },
  { value: "multiselect", label: "Multiple choice" },
  { value: "checkbox", label: "Checkbox" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

const fieldTypeLabel = (v: string) => FIELD_TYPES.find((t) => t.value === v)?.label ?? v;
const isSelectType = (v: string) => v === "select" || v === "multiselect";

function QuestionFields({ defaults }: { defaults?: Partial<SurveyQuestionItem> }) {
  const [fieldType, setFieldType] = React.useState(defaults?.fieldType ?? "text");
  return (
    <div className="space-y-3">
      <div>
        <Label>Question label</Label>
        <Input
          name="label"
          required
          defaultValue={defaults?.label ?? ""}
          placeholder="How would you rate the event?"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Field type</Label>
          <Select name="fieldType" value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              name="required"
              defaultChecked={defaults?.required ?? false}
              className="accent-[var(--signal)]"
            />
            Required
          </label>
        </div>
      </div>
      {isSelectType(fieldType) ? (
        <div>
          <Label>Options, one per line</Label>
          <textarea
            name="options"
            rows={4}
            defaultValue={(defaults?.options ?? []).join("\n")}
            placeholder={"Excellent\nGood\nAverage\nPoor"}
            className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none"
          />
        </div>
      ) : null}
    </div>
  );
}

function EditForm({ question, onDone }: { question: SurveyQuestionItem; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: SurveyActionState, formData: FormData) => {
      const result = await question.update(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    {} as SurveyActionState
  );
  return (
    <form action={formAction} className="space-y-3">
      <QuestionFields defaults={question} />
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

export function SurveyQuestionsEditor({
  questions,
  createAction,
}: {
  questions: SurveyQuestionItem[];
  createAction: (prev: SurveyActionState, formData: FormData) => Promise<SurveyActionState>;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const addFormRef = React.useRef<HTMLFormElement>(null);
  const [createState, createFormAction, createPending] = useActionState(
    async (prev: SurveyActionState, formData: FormData) => {
      const result = await createAction(prev, formData);
      if (result.ok) {
        addFormRef.current?.reset();
        setShowAdd(false);
      }
      return result;
    },
    {} as SurveyActionState
  );

  return (
    <div className="space-y-4">
      {questions.length === 0 && !showAdd ? (
        <EmptyState
          title="No questions yet"
          hint="Add questions attendees answer in this survey, like an overall rating or open feedback."
          action={<Button onClick={() => setShowAdd(true)}>Add a question</Button>}
        />
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <Card key={q.id} className="space-y-2">
              {editingId === q.id ? (
                <EditForm question={q} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{q.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge>{fieldTypeLabel(q.fieldType)}</Badge>
                      {q.required ? <Badge tone="ember">Required</Badge> : null}
                      {isSelectType(q.fieldType) ? (
                        <span className="text-xs text-fg-faint">
                          {q.options.length} option{q.options.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <form action={q.moveUp}>
                      <Button variant="ghost" type="submit" disabled={i === 0} className="px-2">
                        Up
                      </Button>
                    </form>
                    <form action={q.moveDown}>
                      <Button
                        variant="ghost"
                        type="submit"
                        disabled={i === questions.length - 1}
                        className="px-2"
                      >
                        Down
                      </Button>
                    </form>
                    <Button variant="secondary" type="button" onClick={() => setEditingId(q.id)}>
                      Edit
                    </Button>
                    <form action={q.remove}>
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
          <h3 className="font-display text-base text-fg">New question</h3>
          <form ref={addFormRef} action={createFormAction} className="space-y-3">
            <QuestionFields />
            {createState.error ? <p className="text-sm text-coral">{createState.error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={createPending}>
                {createPending ? "Adding..." : "Add question"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : questions.length > 0 ? (
        <Button variant="secondary" onClick={() => setShowAdd(true)}>
          Add a question
        </Button>
      ) : null}
    </div>
  );
}
