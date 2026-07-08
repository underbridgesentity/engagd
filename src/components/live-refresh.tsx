"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "@/lib/realtime/client";

// Invisible client component: subscribes to the event channel and refreshes
// the surrounding server component tree whenever polls or questions change.
// Event name strings are duplicated from RT in @/lib/realtime because that
// module pulls the server-side Pusher SDK into the bundle.
const LIVE_EVENTS = ["poll-updated", "question-updated"];

export function LiveRefresh({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const eventNames = useMemo(() => LIVE_EVENTS, []);
  const onEvent = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);
  useRealtime(`event-${eventId}`, eventNames, onEvent);
  return null;
}
