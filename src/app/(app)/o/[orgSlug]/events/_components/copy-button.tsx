"use client";

import * as React from "react";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard unavailable: fall back to a prompt the user can copy from.
          window.prompt("Copy this link", value);
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-raised-2 px-3 py-1.5 text-xs text-fg-dim transition-colors hover:border-signal/60 hover:text-fg ${className ?? ""}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
