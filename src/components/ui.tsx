import * as React from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-signal text-ink font-medium hover:bg-signal-strong active:translate-y-px",
  secondary:
    "bg-raised-2 text-fg border border-line-strong hover:border-signal/60",
  ghost: "text-fg-dim hover:text-fg hover:bg-raised-2",
  danger: "bg-coral/15 text-coral border border-coral/40 hover:bg-coral/25",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none",
        buttonStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-[10px] border border-line bg-raised p-5",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-signal/70 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg focus:border-signal/70 focus:outline-none",
        className
      )}
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
      className={cx("mb-1.5 block text-sm text-fg-dim", className)}
      {...props}
    />
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-line-strong py-16 text-center">
      <p className="font-display text-lg text-fg">{title}</p>
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
      <span className="text-xs uppercase tracking-wider text-fg-faint">
        {label}
      </span>
      <span className="font-display text-3xl text-fg">{value}</span>
      {sub ? <span className="font-data text-xs text-fg-dim">{sub}</span> : null}
    </Card>
  );
}
