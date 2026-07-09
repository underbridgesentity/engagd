"use client";

import * as React from "react";
import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { buttonClasses } from "@/components/ui";
import type { SurveyFormState } from "./actions";

// Shared client form for the anonymous and personalised public survey pages.
// Plain form fields posted to a server action; mirrors the RSVP form styling.

export type PublicSurveyQuestion = {
  id: string;
  label: string;
  fieldType: "text" | "textarea" | "select" | "multiselect" | "checkbox" | "number" | "date";
  required: boolean;
  options: string[];
};

const inputClass =
  "w-full rounded-lg border border-line bg-ink-2 px-3 py-3 text-base text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none";
const labelClass = "mb-1.5 block text-sm text-fg-dim";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-coral">
      {message}
    </p>
  );
}

function QuestionField({
  question,
  errors,
}: {
  question: PublicSurveyQuestion;
  errors: Record<string, string>;
}) {
  const name = `q_${question.id}`;
  const error = errors[name];
  const errorId = `${name}-error`;
  const requiredMark = question.required ? <span className="text-coral"> *</span> : null;

  switch (question.fieldType) {
    case "textarea":
      return (
        <div>
          <label htmlFor={name} className={labelClass}>
            {question.label}
            {requiredMark}
          </label>
          <textarea
            id={name}
            name={name}
            rows={3}
            required={question.required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <FieldError id={errorId} message={error} />
        </div>
      );
    case "select":
      return (
        <div>
          <label htmlFor={name} className={labelClass}>
            {question.label}
            {requiredMark}
          </label>
          <select
            id={name}
            name={name}
            required={question.required}
            defaultValue=""
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          >
            <option value="">Choose an option</option>
            {question.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <FieldError id={errorId} message={error} />
        </div>
      );
    case "multiselect":
      return (
        <fieldset>
          <legend className={labelClass}>
            {question.label}
            {requiredMark}
          </legend>
          <div className="space-y-2">
            {question.options.map((opt) => (
              <label
                key={opt}
                className="focus-card group flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-sm text-fg has-[:checked]:border-signal/70 has-[:checked]:bg-signal/10"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={opt}
                  className="sr-only"
                />
                <Icon
                  name="check"
                  className="invisible h-4 w-4 shrink-0 text-signal-strong group-has-[:checked]:visible"
                />
                {opt}
              </label>
            ))}
          </div>
          <FieldError id={errorId} message={error} />
        </fieldset>
      );
    case "checkbox":
      return (
        <div>
          <label className="focus-card group flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-sm text-fg has-[:checked]:border-signal/70 has-[:checked]:bg-signal/10">
            <input
              type="checkbox"
              name={name}
              required={question.required}
              aria-describedby={error ? errorId : undefined}
              className="sr-only"
            />
            <Icon
              name="check"
              className="invisible h-4 w-4 shrink-0 text-signal-strong group-has-[:checked]:visible"
            />
            <span>
              {question.label}
              {requiredMark}
            </span>
          </label>
          <FieldError id={errorId} message={error} />
        </div>
      );
    case "number":
      return (
        <div>
          <label htmlFor={name} className={labelClass}>
            {question.label}
            {requiredMark}
          </label>
          <input
            id={name}
            name={name}
            type="number"
            inputMode="numeric"
            required={question.required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <FieldError id={errorId} message={error} />
        </div>
      );
    case "date":
      return (
        <div>
          <label htmlFor={name} className={labelClass}>
            {question.label}
            {requiredMark}
          </label>
          <input
            id={name}
            name={name}
            type="date"
            required={question.required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <FieldError id={errorId} message={error} />
        </div>
      );
    default:
      return (
        <div>
          <label htmlFor={name} className={labelClass}>
            {question.label}
            {requiredMark}
          </label>
          <input
            id={name}
            name={name}
            type="text"
            required={question.required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <FieldError id={errorId} message={error} />
        </div>
      );
  }
}

export function SurveyForm({
  action,
  questions,
  personalised,
  eventSlug,
}: {
  action: (state: SurveyFormState, formData: FormData) => Promise<SurveyFormState>;
  questions: PublicSurveyQuestion[];
  personalised: boolean;
  eventSlug: string;
}) {
  const [state, formAction, pending] = useActionState<SurveyFormState, FormData>(action, {
    status: "idle",
  });
  const errors = state.status === "error" ? state.errors : {};

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-[10px] border border-mint/30 bg-mint/10 p-5 text-center"
      >
        <p className="font-display text-xl text-fg">Thank you</p>
        <p className="mt-2 text-sm text-fg-dim">
          Your feedback has been recorded.
          {personalised ? " You can revisit this link to update your answers." : ""}
        </p>
        <a
          href={`/e/${eventSlug}`}
          className={buttonClasses({
            variant: "secondary",
            size: "lg",
            className: "mt-4 min-h-11 w-full",
          })}
        >
          Back to the event
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" && state.formError ? (
        <p
          role="alert"
          className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2.5 text-sm text-coral"
        >
          {state.formError}
        </p>
      ) : null}

      {questions.map((q) => (
        <QuestionField key={q.id} question={q} errors={errors} />
      ))}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-signal px-4 py-3.5 text-base font-medium text-ink transition-colors hover:bg-signal-strong disabled:opacity-60"
      >
        {pending ? "Sending..." : "Submit feedback"}
      </button>
    </form>
  );
}
