"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";
import { Button, Card, Input } from "@/components/ui";
import { eventChannel, RT } from "@/lib/realtime";
import { useRealtime } from "@/lib/realtime/client";
import {
  staffCount,
  staffScan,
  verifyStaffPinAction,
  type PinState,
  type StaffScanResult,
} from "./actions";

export function PinGate({
  token,
  eventName,
}: {
  token: string;
  eventName: string;
}) {
  const router = useRouter();
  const bound = verifyStaffPinAction.bind(null, token);
  const [state, formAction, pending] = useActionState<PinState, FormData>(
    async (prev, formData) => {
      const result = await bound(prev, formData);
      if (!result.error) router.refresh();
      return result;
    },
    {}
  );

  return (
    <Card className="space-y-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-fg-faint">
          Door check-in
        </p>
        <h1 className="mt-1 font-display text-xl text-fg">{eventName}</h1>
        <p className="mt-2 text-sm text-fg-dim">
          Enter the PIN the organiser gave you to start scanning.
        </p>
      </div>
      <form action={formAction} className="space-y-3">
        <Input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={8}
          placeholder="PIN"
          aria-label="Door PIN"
          className="text-center font-data text-2xl tracking-[0.4em]"
          required
          autoFocus
        />
        {state.error ? (
          <p className="text-center text-sm text-coral">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking..." : "Unlock scanner"}
        </Button>
      </form>
    </Card>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StaffScanner({
  token,
  eventId,
  eventName,
  label,
  initialCount,
}: {
  token: string;
  eventId: string;
  eventName: string;
  label: string;
  initialCount: number;
}) {
  const router = useRouter();
  const [result, setResult] = useState<StaffScanResult | null>(null);
  const [countValue, setCountValue] = useState(initialCount);
  const [manualCode, setManualCode] = useState("");
  const [pending, startTransition] = useTransition();
  const inFlightRef = useRef(false);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rtEvents = useMemo(() => [RT.checkInUpdated], []);
  useRealtime(eventChannel(eventId), rtEvents, () => {
    void staffCount(token).then((r) => {
      if ("count" in r) setCountValue(r.count);
    });
  });

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  function submitCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed || inFlightRef.current) return;
    inFlightRef.current = true;
    startTransition(async () => {
      try {
        const r = await staffScan(token, trimmed);
        if (r.status === "unauthorized") {
          // Cookie or token lapsed mid-shift: bounce back to the PIN gate.
          router.refresh();
          return;
        }
        setResult(r);
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(() => setResult(null), 6000);
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-fg-faint">
            {label}
          </p>
          <h1 className="truncate font-display text-xl text-fg">{eventName}</h1>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-fg">{countValue}</p>
          <p className="text-xs text-fg-dim">checked in</p>
        </div>
      </div>

      <QrScanner onDecode={submitCode} paused={pending} />

      <div aria-live="polite">
        {pending ? (
          <div className="rounded-[10px] border border-line bg-raised p-4 text-center text-sm text-fg-dim">
            Checking...
          </div>
        ) : result && result.status === "checked_in" ? (
          <div className="rounded-[10px] border border-mint/50 bg-mint/10 p-4 text-center">
            <p className="font-display text-2xl text-mint">Welcome</p>
            <p className="text-lg text-fg">{result.name}</p>
            {result.plusOnes > 0 ? (
              <p className="text-sm text-mint">+{result.plusOnes} guests</p>
            ) : null}
            {result.hasDietaryNotes ? (
              <p className="text-xs text-ember">Dietary notes on file</p>
            ) : null}
          </div>
        ) : result && result.status === "already_checked_in" ? (
          <div className="rounded-[10px] border border-ember/50 bg-ember/10 p-4 text-center">
            <p className="font-display text-2xl text-ember">
              Already checked in
            </p>
            <p className="text-lg text-fg">{result.name}</p>
            <p className="font-data text-xs text-fg-dim">
              First scanned at {formatTime(result.checkedInAt)}
            </p>
          </div>
        ) : result && result.status === "not_found" ? (
          <div className="rounded-[10px] border border-coral/50 bg-coral/10 p-4 text-center">
            <p className="font-display text-2xl text-coral">Not found</p>
            <p className="text-sm text-fg-dim">
              This code is not valid for this event. Send the guest to the
              organiser desk.
            </p>
          </div>
        ) : (
          <div className="rounded-[10px] border border-line bg-raised p-4 text-center text-sm text-fg-dim">
            Ready to scan
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitCode(manualCode);
          setManualCode("");
        }}
        className="flex gap-2"
      >
        <Input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Type code manually"
          aria-label="Manual ticket code"
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          Check
        </Button>
      </form>
    </div>
  );
}
