"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";
import { Badge, Button, Card, Input, Label, StatTile } from "@/components/ui";
import type { CheckInResult } from "@/lib/checkin";
import { eventChannel, RT } from "@/lib/realtime";
import { useRealtime } from "@/lib/realtime/client";
import {
  createStaffAccess,
  manualCheckIn,
  revokeStaffAccess,
  scanCheckIn,
  searchAttendees,
  undoCheckIn,
  type AttendeeSearchHit,
  type CreateStaffState,
} from "./actions";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CheckInResultCard({ result }: { result: CheckInResult }) {
  if (result.status === "checked_in") {
    return (
      <div
        role="status"
        className="rounded-[10px] border border-mint/40 bg-mint/10 p-4"
      >
        <p className="font-display text-lg text-mint">Checked in</p>
        <p className="text-fg">{result.name}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {result.plusOnes > 0 ? (
            <Badge tone="mint">+{result.plusOnes} guests</Badge>
          ) : null}
          {result.hasDietaryNotes ? (
            <Badge tone="ember">Dietary notes on file</Badge>
          ) : null}
        </div>
      </div>
    );
  }
  if (result.status === "already_checked_in") {
    return (
      <div
        role="status"
        className="rounded-[10px] border border-ember/40 bg-ember/10 p-4"
      >
        <p className="font-display text-lg text-ember">Already checked in</p>
        <p className="text-fg">{result.name}</p>
        <p className="font-data text-xs text-fg-dim">
          First checked in at {formatTime(result.checkedInAt)}
        </p>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="rounded-[10px] border border-coral/40 bg-coral/10 p-4"
    >
      <p className="font-display text-lg text-coral">Not found</p>
      <p className="text-sm text-fg-dim">
        That code does not match any attendee or ticket for this event.
      </p>
    </div>
  );
}

export function CheckinDashboard({
  orgSlug,
  eventId,
  stats,
  recent,
  staff,
}: {
  orgSlug: string;
  eventId: string;
  stats: { checkedIn: number; rsvpYes: number; total: number };
  recent: Array<{
    attendeeId: string;
    name: string;
    plusOnes: number;
    checkedInAt: string;
  }>;
  staff: Array<{
    id: string;
    label: string;
    createdAt: string;
    expiresAt: string | null;
    expired: boolean;
  }>;
}) {
  const router = useRouter();
  const rtEvents = useMemo(() => [RT.checkInUpdated], []);
  useRealtime(eventChannel(eventId), rtEvents, () => router.refresh());

  const showedPct =
    stats.rsvpYes > 0 ? Math.round((stats.checkedIn / stats.rsvpYes) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Checked in"
          value={stats.checkedIn}
          sub={`of ${stats.total} attendees`}
        />
        <StatTile
          label="RSVP yes"
          value={stats.rsvpYes}
          sub="expected at the door"
        />
        <StatTile
          label="Showed vs RSVP"
          value={`${showedPct}%`}
          sub={`${stats.checkedIn} of ${stats.rsvpYes} confirmed`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ScannerPanel orgSlug={orgSlug} eventId={eventId} />
        <div className="space-y-6">
          <ManualCheckin orgSlug={orgSlug} eventId={eventId} />
          <RecentCheckins recent={recent} />
        </div>
      </div>

      <StaffAccessPanel orgSlug={orgSlug} eventId={eventId} staff={staff} />
    </div>
  );
}

function ScannerPanel({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlightRef = useRef(false);

  function handleDecode(text: string) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    startTransition(async () => {
      try {
        setResult(await scanCheckIn(orgSlug, eventId, text));
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-fg">Scan tickets</h2>
        <p className="text-sm text-fg-dim">
          Point the camera at an attendee QR code. Each scan checks in
          instantly.
        </p>
      </div>
      <QrScanner onDecode={handleDecode} paused={pending} />
      {result ? <CheckInResultCard result={result} /> : null}
    </Card>
  );
}

function ManualCheckin({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AttendeeSearchHit[]>([]);
  const [searching, startSearch] = useTransition();
  const [acting, startAction] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        setHits(await searchAttendees(orgSlug, eventId, value));
      });
    }, 300);
  }

  function refreshHits() {
    startSearch(async () => {
      setHits(await searchAttendees(orgSlug, eventId, query));
    });
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-display text-lg text-fg">Manual check-in</h2>
        <p className="text-sm text-fg-dim">
          Find an attendee by name or email when their QR is not to hand.
        </p>
      </div>
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search name or email"
        aria-label="Search attendees"
      />
      {searching ? <p className="text-xs text-fg-faint">Searching...</p> : null}
      <ul className="divide-y divide-line">
        {hits.map((hit) => (
          <li key={hit.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{hit.name}</p>
              <p className="truncate font-data text-xs text-fg-dim">
                {hit.email ?? "No email"}
                {hit.plusOnes > 0 ? ` · +${hit.plusOnes}` : ""}
              </p>
            </div>
            {hit.checkedIn ? (
              <>
                <Badge tone="mint">Checked in</Badge>
                <Button
                  variant="ghost"
                  disabled={acting}
                  onClick={() =>
                    startAction(async () => {
                      await undoCheckIn(orgSlug, eventId, hit.id);
                      refreshHits();
                    })
                  }
                >
                  Undo
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                disabled={acting}
                onClick={() =>
                  startAction(async () => {
                    await manualCheckIn(orgSlug, eventId, hit.id);
                    refreshHits();
                  })
                }
              >
                Check in
              </Button>
            )}
          </li>
        ))}
        {query.trim().length >= 2 && !searching && hits.length === 0 ? (
          <li className="py-2.5 text-sm text-fg-dim">No matches.</li>
        ) : null}
      </ul>
    </Card>
  );
}

function RecentCheckins({
  recent,
}: {
  recent: Array<{
    attendeeId: string;
    name: string;
    plusOnes: number;
    checkedInAt: string;
  }>;
}) {
  return (
    <Card>
      <h2 className="font-display text-lg text-fg">Recent check-ins</h2>
      {recent.length === 0 ? (
        <p className="mt-2 text-sm text-fg-dim">
          No one has checked in yet. Scans will appear here live.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {recent.map((r) => (
            <li
              key={r.attendeeId}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="truncate text-sm text-fg">
                {r.name}
                {r.plusOnes > 0 ? (
                  <span className="text-fg-dim"> (+{r.plusOnes})</span>
                ) : null}
              </span>
              <span className="font-data text-xs text-fg-dim">
                {formatTime(r.checkedInAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StaffAccessPanel({
  orgSlug,
  eventId,
  staff,
}: {
  orgSlug: string;
  eventId: string;
  staff: Array<{
    id: string;
    label: string;
    createdAt: string;
    expiresAt: string | null;
    expired: boolean;
  }>;
}) {
  const boundCreate = createStaffAccess.bind(null, orgSlug, eventId);
  const [state, formAction, creating] = useActionState<
    CreateStaffState,
    FormData
  >(boundCreate, {});
  const [revoking, startRevoke] = useTransition();
  const [copied, setCopied] = useState(false);

  const createdUrl =
    state.created && typeof window !== "undefined"
      ? `${window.location.origin}${state.created.url}`
      : state.created?.url;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-fg">Door staff access</h2>
        <p className="max-w-2xl text-sm text-fg-dim">
          Give temporary door staff a scan-only link plus a PIN. Links are
          scoped to this event only, staff see nothing else, and they are free:
          no account needed and no seat consumed. Revoke or expire access any
          time.
        </p>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="min-w-48">
          <Label htmlFor="staff-label">Label</Label>
          <Input
            id="staff-label"
            name="label"
            placeholder='e.g. "Door 1"'
            required
            maxLength={60}
          />
        </div>
        <div>
          <Label htmlFor="staff-expiry">Expires (optional)</Label>
          <Input id="staff-expiry" name="expiresAt" type="datetime-local" />
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? "Creating..." : "Create staff access"}
        </Button>
      </form>
      {state.error ? <p className="text-sm text-coral">{state.error}</p> : null}

      {state.created ? (
        <div className="rounded-[10px] border border-signal/40 bg-signal/10 p-4">
          <p className="font-display text-fg">
            {state.created.label} created. Save these now.
          </p>
          <p className="mt-1 text-sm text-fg-dim">
            The PIN is shown once and cannot be recovered. Share the link and
            PIN with your door staff separately.
          </p>
          <div className="mt-3 space-y-1 font-data text-sm">
            <p className="text-fg">
              Link: <span className="break-all text-signal-strong">{createdUrl}</span>
            </p>
            <p className="text-fg">
              PIN: <span className="text-ember">{state.created.pin}</span>
            </p>
          </div>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              void navigator.clipboard
                .writeText(`${createdUrl}\nPIN: ${state.created?.pin}`)
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
            }}
          >
            {copied ? "Copied" : "Copy link and PIN"}
          </Button>
        </div>
      ) : null}

      {staff.length === 0 ? (
        <p className="text-sm text-fg-dim">No active staff access yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-fg">{s.label}</p>
                <p className="font-data text-xs text-fg-dim">
                  Created {new Date(s.createdAt).toLocaleDateString()}
                  {s.expiresAt
                    ? ` · expires ${new Date(s.expiresAt).toLocaleString()}`
                    : " · no expiry"}
                </p>
              </div>
              {s.expired ? <Badge tone="ember">Expired</Badge> : null}
              <Button
                variant="danger"
                disabled={revoking}
                onClick={() =>
                  startRevoke(async () => {
                    await revokeStaffAccess(orgSlug, eventId, s.id);
                  })
                }
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
