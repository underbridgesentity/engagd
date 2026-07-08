import { Badge } from "@/components/ui";
import type { AttendeeCapState } from "@/lib/entitlements";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const statusTone: Record<string, "neutral" | "signal" | "mint" | "ember" | "coral"> = {
  draft: "neutral",
  active: "mint",
  completed: "signal",
  archived: "neutral",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export function EventStatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{statusLabel[status] ?? status}</Badge>;
}

const rsvpTone: Record<string, "neutral" | "signal" | "mint" | "ember" | "coral"> = {
  invited: "neutral",
  opened: "signal",
  responded_yes: "mint",
  responded_no: "coral",
  responded_maybe: "ember",
  waitlisted: "ember",
};

export const rsvpLabel: Record<string, string> = {
  invited: "Invited",
  opened: "Opened",
  responded_yes: "Yes",
  responded_no: "No",
  responded_maybe: "Maybe",
  waitlisted: "Waitlisted",
};

export function RsvpBadge({ status }: { status: string }) {
  return <Badge tone={rsvpTone[status] ?? "neutral"}>{rsvpLabel[status] ?? status}</Badge>;
}

const regTypeLabel: Record<string, string> = {
  rsvp_only: "RSVP only",
  free_ticket: "Free ticket",
  paid_ticket: "Paid ticket",
};

export function registrationTypeLabel(t: string) {
  return regTypeLabel[t] ?? t;
}

export function formatDateTime(d: Date | null, timezone: string) {
  if (!d) return "Not set";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(d);
}

// Soft-wall banner. Warns only, the public RSVP link is never blocked.
export function CapBanner({
  cap,
  orgSlug,
}: {
  cap: AttendeeCapState;
  orgSlug: string;
}) {
  if (cap.limit === null || (!cap.nearing && !cap.over)) return null;
  return (
    <div
      className={`rounded-[10px] border px-4 py-3 text-sm ${
        cap.over
          ? "border-coral/40 bg-coral/10 text-coral"
          : "border-ember/40 bg-ember/10 text-ember"
      }`}
      role="status"
    >
      <p className="font-medium">
        {cap.over
          ? `This event is over its attendee limit (${cap.current} of ${cap.limit}).`
          : `This event is nearing its attendee limit (${cap.current} of ${cap.limit}).`}
      </p>
      <p className="mt-1 text-fg-dim">
        The public RSVP link keeps working and nobody will be turned away. Upgrade your
        plan to raise the limit.{" "}
        <a href={`/o/${orgSlug}/billing`} className="text-signal-strong underline underline-offset-2">
          View plans
        </a>
      </p>
    </div>
  );
}
