"use client";

// Client-side realtime subscription hook. Falls back to slow refresh-based
// polling only when no provider key is configured (local dev), so live
// features never depend on request-response polling in production.
import { useEffect } from "react";
import PusherJs from "pusher-js";

let pusherClient: PusherJs | null = null;

function client(): PusherJs | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;
  if (!pusherClient) {
    pusherClient = new PusherJs(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
    });
  }
  return pusherClient;
}

export function useRealtime(
  channelName: string,
  eventNames: string[],
  onEvent: () => void,
  fallbackIntervalMs = 5000
) {
  useEffect(() => {
    const c = client();
    if (c) {
      const channel = c.subscribe(channelName);
      for (const name of eventNames) channel.bind(name, onEvent);
      return () => {
        for (const name of eventNames) channel.unbind(name, onEvent);
        c.unsubscribe(channelName);
      };
    }
    const t = setInterval(onEvent, fallbackIntervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, eventNames.join(","), fallbackIntervalMs]);
}
