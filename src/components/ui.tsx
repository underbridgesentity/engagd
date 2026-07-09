import * as React from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-signal text-ink font-semibold shadow-[var(--shadow-e1)] hover:bg-signal-strong active:translate-y-px",
  secondary:
    "bg-raised-2 text-fg font-medium border border-line-strong hover:border-signal/60",
  ghost: "text-fg-dim font-medium hover:text-fg hover:bg-raised-2",
  danger: "bg-coral/15 text-coral font-semibold border border-coral/40 hover:bg-coral/25",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

// Shared class string so marketing links and app buttons render identically
// instead of hand-rolling pill styles everywhere.
export function buttonClasses(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  className?: string;
}) {
  const { variant = "primary", size = "md", pill = false, className } = opts ?? {};
  return cx(
    "inline-flex items-center justify-center gap-2 transition-[background-color,border-color,transform] duration-200 disabled:opacity-50 disabled:pointer-events-none",
    pill ? "rounded-full" : "rounded-xl",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  pill = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
}) {
  return (
    <button className={buttonClasses({ variant, size, pill, className })} {...props} />
  );
}

export function Card({
  interactive = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-line bg-raised p-5 shadow-[var(--shadow-e1)]",
        interactive &&
          "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-e2)]",
        className
      )}
      {...props}
    />
  );
}

const fieldBase =
  "w-full rounded-xl border bg-ink-2 px-3 py-2.5 text-sm text-fg placeholder:text-fg-faint transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function fieldTone(invalid?: boolean) {
  return invalid
    ? "border-coral/70 focus:border-coral"
    : "border-line focus:border-signal/70";
}

export function Input({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(fieldBase, fieldTone(invalid), className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cx(fieldBase, fieldTone(invalid), className)}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(fieldBase, fieldTone(invalid), className)}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx("mb-1.5 block text-sm font-medium text-fg-dim", className)}
      {...props}
    />
  );
}

// Field wires a label, an optional hint, and an error to a single control,
// injecting id / aria-invalid / aria-describedby so errors are announced.
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactElement;
  className?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  const control = React.cloneElement(
    children,
    {
      id,
      invalid: Boolean(error),
      "aria-describedby": describedBy,
    } as Record<string, unknown>
  );
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="mt-1 text-xs text-fg-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="mt-1 text-xs text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type BadgeTone = "neutral" | "signal" | "mint" | "ember" | "coral";

const badgeStyles: Record<BadgeTone, string> = {
  neutral: "bg-raised-2 text-fg-dim border-line",
  signal: "bg-signal/15 text-signal-strong border-signal/30",
  mint: "bg-mint/15 text-mint border-mint/30",
  ember: "bg-ember/15 text-ember border-ember/30",
  coral: "bg-coral/15 text-coral border-coral/30",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-data text-xs",
        badgeStyles[tone],
        className
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-raised/40 py-16 text-center">
      <p className="font-display text-lg font-semibold text-fg">{title}</p>
      <p className="max-w-sm text-sm text-fg-dim">{hint}</p>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-fg-faint">
        {label}
      </span>
      <span className="font-display text-3xl font-bold text-fg">{value}</span>
      {sub ? <span className="font-data text-xs text-fg-dim">{sub}</span> : null}
    </Card>
  );
}
