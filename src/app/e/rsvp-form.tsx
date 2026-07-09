"use client";

import * as React from "react";
import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { buttonClasses } from "@/components/ui";
import type {
  CustomAnswerValue,
  PublicQuestion,
  RsvpChoice,
  RsvpFormConfig,
  RsvpFormState,
} from "@/lib/rsvp";

// One form for both the public microsite and the personal RSVP page.
// Plain form fields submitted to a server action; the only interactive
// state is the plus-ones stepper and the pending flag.

export type RsvpDefaults = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  choice?: RsvpChoice | null;
  plusOnes?: number;
  dietaryNotes?: string;
  accessibilityNotes?: string;
  customAnswers?: Record<string, CustomAnswerValue>;
};

const CHOICES: Array<{ value: RsvpChoice; label: string; hint: string }> = [
  { value: "yes", label: "Yes", hint: "I will be there" },
  { value: "maybe", label: "Maybe", hint: "Not sure yet" },
  { value: "no", label: "No", hint: "I cannot make it" },
];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-coral">
      {message}
    </p>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-ink-2 px-3 py-3 text-base text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none";
const labelClass = "mb-1.5 block text-sm text-fg-dim";

function TextField({
  name,
  label,
  errors,
  required,
  type = "text",
  defaultValue,
  autoComplete,
  inputMode,
}: {
  name: string;
  label: string;
  errors: Record<string, string>;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text" | "decimal";
}) {
  const error = errors[name];
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required ? <span className="text-coral"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function CustomQuestionField({
  question,
  errors,
  defaultValue,
}: {
  question: PublicQuestion;
  errors: Record<string, string>;
  defaultValue?: CustomAnswerValue;
}) {
  const name = `q_${question.id}`;
  const error = errors[name];
  const errorId = `${name}-error`;
  const requiredMark = question.required ? (
    <span className="text-coral"> *</span>
  ) : null;

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
            defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
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
            defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
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
    case "multiselect": {
      const selected = Array.isArray(defaultValue) ? defaultValue : [];
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
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-sm text-fg has-[:checked]:border-signal/70 has-[:checked]:bg-signal/10"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={opt}
                  defaultChecked={selected.includes(opt)}
                  className="h-4 w-4 accent-[var(--signal)]"
                />
                {opt}
              </label>
            ))}
          </div>
          <FieldError id={errorId} message={error} />
        </fieldset>
      );
    }
    case "checkbox":
      return (
        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-sm text-fg has-[:checked]:border-signal/70 has-[:checked]:bg-signal/10">
            <input
              type="checkbox"
              name={name}
              required={question.required}
              defaultChecked={defaultValue === true}
              aria-describedby={error ? errorId : undefined}
              className="h-4 w-4 accent-[var(--signal)]"
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
            defaultValue={
              typeof defaultValue === "number" ? String(defaultValue) : ""
            }
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
            defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
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
            defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <FieldError id={errorId} message={error} />
        </div>
      );
  }
}

function PlusOnesStepper({
  max,
  defaultValue,
  error,
}: {
  max: number;
  defaultValue: number;
  error?: string;
}) {
  const [count, setCount] = useState(
    Math.min(Math.max(defaultValue, 0), max)
  );
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-raised-2 text-lg text-fg disabled:opacity-40";
  return (
    <div>
      <span className={labelClass}>Plus ones (up to {max})</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Fewer plus ones"
          onClick={() => setCount((c) => Math.max(0, c - 1))}
          disabled={count === 0}
          className={btn}
        >
          &minus;
        </button>
        <span className="w-8 text-center font-data text-lg text-fg">
          {count}
        </span>
        <button
          type="button"
          aria-label="More plus ones"
          onClick={() => setCount((c) => Math.min(max, c + 1))}
          disabled={count >= max}
          className={btn}
        >
          +
        </button>
        <input type="hidden" name="plusOnes" value={count} />
      </div>
      <FieldError id="plusOnes-error" message={error} />
    </div>
  );
}

// Copies the absolute personal link and swaps to a "Copied" state briefly
// so the attendee gets feedback without a raw URL on screen.
function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            new URL(path, window.location.origin).toString()
          );
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard unavailable (permissions, insecure context); the
          // entry pass button above still gets them to the same page.
        }
      }}
      className={buttonClasses({
        variant: "secondary",
        size: "lg",
        className: "mt-2 min-h-11 w-full",
      })}
    >
      <Icon name={copied ? "check" : "copy"} />
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

// Paid ticket selection shown after a successful yes RSVP on paid events.
export type TicketOfferType = {
  id: string;
  name: string;
  priceLabel: string;
  soldOut: boolean;
};

export function RsvpForm({
  action,
  config,
  questions,
  defaults = {},
  submitLabel,
  variant,
  successNote,
  ticketTypes,
  checkoutAction,
}: {
  action: (state: RsvpFormState, formData: FormData) => Promise<RsvpFormState>;
  config: RsvpFormConfig;
  questions: PublicQuestion[];
  defaults?: RsvpDefaults;
  submitLabel: string;
  // public: first-time RSVP from the microsite. personal: updating an
  // existing RSVP from the /r/[token] page.
  variant: "public" | "personal";
  // Extra line shown in the success state, for example a free ticket note.
  successNote?: string;
  // When present (paid ticket events), the success state offers ticket
  // selection and posts to the checkout server action.
  ticketTypes?: TicketOfferType[];
  checkoutAction?: (formData: FormData) => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState<RsvpFormState, FormData>(
    action,
    { status: "idle" }
  );
  const [chosen, setChosen] = useState<RsvpChoice | null>(
    defaults.choice ?? null
  );
  const errors = state.status === "error" ? state.errors : {};

  if (state.status === "success") {
    const personalLink = `/r/${state.qrToken}`;
    const offerTickets =
      variant === "public" &&
      chosen === "yes" &&
      checkoutAction &&
      ticketTypes &&
      ticketTypes.length > 0;
    return (
      <div
        role="status"
        className="rounded-[10px] border border-mint/30 bg-mint/10 p-5 text-center"
      >
        <p className="font-display text-xl text-fg">
          {variant === "public" ? "You are on the list" : "RSVP updated"}
        </p>
        <p className="mt-2 text-sm text-fg-dim">
          {variant === "public"
            ? "Thanks for responding. Your entry pass is where you check in and update your RSVP."
            : "Your changes have been saved."}
        </p>
        {successNote && chosen === "yes" ? (
          <p className="mt-2 text-sm font-medium text-fg">{successNote}</p>
        ) : null}
        {offerTickets ? (
          <form
            action={checkoutAction}
            className="mt-5 rounded-lg border border-line bg-ink-2 p-4 text-left"
          >
            <p className="font-display text-lg text-fg">Choose your ticket</p>
            <p className="mt-1 text-sm text-fg-dim">
              You will be redirected to a secure payment page.
            </p>
            <input type="hidden" name="qrToken" value={state.qrToken} />
            <div className="mt-3 space-y-2">
              {ticketTypes.map((t) => (
                <label
                  key={t.id}
                  className={`focus-card group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg has-[:checked]:border-signal has-[:checked]:bg-signal/10 ${
                    t.soldOut ? "opacity-50" : "cursor-pointer"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="ticketTypeId"
                      value={t.id}
                      required
                      disabled={t.soldOut}
                      className="sr-only"
                    />
                    <Icon
                      name="check"
                      className="invisible h-4 w-4 shrink-0 text-signal-strong group-has-[:checked]:visible"
                    />
                    {t.name}
                    {t.soldOut ? (
                      <span className="text-xs text-coral">Sold out</span>
                    ) : null}
                  </span>
                  <span className="font-data">{t.priceLabel}</span>
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-signal px-4 py-3 text-base font-medium text-ink transition-colors hover:bg-signal-strong"
            >
              Continue to payment
            </button>
          </form>
        ) : null}
        <a
          href={personalLink}
          className={buttonClasses({
            size: "lg",
            className: "mt-4 min-h-11 w-full",
          })}
        >
          {variant === "public" ? "Open my entry pass" : "View my RSVP"}
          <Icon name="arrowRight" />
        </a>
        {variant === "public" ? <CopyLinkButton path={personalLink} /> : null}
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

      <fieldset aria-describedby={errors.choice ? "choice-error" : undefined}>
        <legend className={labelClass}>
          Will you be attending?<span className="text-coral"> *</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {CHOICES.map((c) => (
            <label
              key={c.value}
              className="focus-card group relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-line bg-ink-2 px-2 py-3 text-center has-[:checked]:border-signal has-[:checked]:bg-signal/15"
            >
              <input
                type="radio"
                name="choice"
                value={c.value}
                required
                defaultChecked={defaults.choice === c.value}
                onChange={() => setChosen(c.value)}
                className="sr-only"
              />
              <Icon
                name="check"
                className="invisible absolute right-1.5 top-1.5 h-4 w-4 text-signal-strong group-has-[:checked]:visible"
              />
              <span className="font-medium text-fg">{c.label}</span>
              <span className="text-xs text-fg-faint">{c.hint}</span>
            </label>
          ))}
        </div>
        <FieldError id="choice-error" message={errors.choice} />
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          name="firstName"
          label="First name"
          required
          errors={errors}
          defaultValue={defaults.firstName}
          autoComplete="given-name"
        />
        <TextField
          name="lastName"
          label="Last name"
          required
          errors={errors}
          defaultValue={defaults.lastName}
          autoComplete="family-name"
        />
      </div>
      <TextField
        name="email"
        label="Email"
        required
        type="email"
        errors={errors}
        defaultValue={defaults.email}
        autoComplete="email"
        inputMode="email"
      />
      <TextField
        name="phone"
        label="Phone (optional)"
        type="tel"
        errors={errors}
        defaultValue={defaults.phone}
        autoComplete="tel"
        inputMode="tel"
      />

      {config.allowPlusOnes && config.maxPlusOnes > 0 ? (
        <PlusOnesStepper
          max={config.maxPlusOnes}
          defaultValue={defaults.plusOnes ?? 0}
          error={errors.plusOnes}
        />
      ) : null}

      {config.collectDietary ? (
        <>
          <div>
            <label htmlFor="dietaryNotes" className={labelClass}>
              Dietary requirements (optional)
            </label>
            <textarea
              id="dietaryNotes"
              name="dietaryNotes"
              rows={2}
              defaultValue={defaults.dietaryNotes}
              placeholder="Allergies, vegetarian, halal, and so on"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="accessibilityNotes" className={labelClass}>
              Accessibility needs (optional)
            </label>
            <textarea
              id="accessibilityNotes"
              name="accessibilityNotes"
              rows={2}
              defaultValue={defaults.accessibilityNotes}
              placeholder="Anything that helps us accommodate you"
              className={inputClass}
            />
          </div>
        </>
      ) : null}

      {questions.map((q) => (
        <CustomQuestionField
          key={q.id}
          question={q}
          errors={errors}
          defaultValue={defaults.customAnswers?.[q.id]}
        />
      ))}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-signal px-4 py-3.5 text-base font-medium text-ink transition-colors hover:bg-signal-strong disabled:opacity-60"
      >
        {pending ? "Sending..." : submitLabel}
      </button>
    </form>
  );
}
