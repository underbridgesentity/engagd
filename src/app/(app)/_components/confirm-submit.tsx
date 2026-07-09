"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";

// A submit button for destructive form actions. First click arms it and asks
// for confirmation inline; the second click actually submits. Arming times
// out after a few seconds so a stray click cannot linger as a landmine.
export function ConfirmSubmit({
  children,
  confirmLabel = "Confirm?",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <button
      {...props}
      type={armed ? "submit" : "button"}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
          timer.current = setTimeout(() => setArmed(false), 4000);
        }
      }}
      className={cx(
        className,
        armed &&
          "!bg-coral !text-ink !border-coral font-semibold"
      )}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
