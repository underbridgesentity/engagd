// Realtime abstraction for live polls, Q&A, and check-in counts.
// The app publishes through this interface only, so the provider (Pusher,
// Ably, Supabase Realtime) is swappable behind it.
import Pusher from "pusher";

export interface RealtimePublisher {
  publish(channel: string, event: string, payload: unknown): Promise<void>;
}

class NoopPublisher implements RealtimePublisher {
  async publish() {
    // Used when no realtime provider is configured (local dev without keys).
  }
}

class PusherPublisher implements RealtimePublisher {
  private client: Pusher;
  constructor() {
    this.client = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      useTLS: true,
    });
  }
  async publish(channel: string, event: string, payload: unknown) {
    await this.client.trigger(channel, event, payload);
  }
}

export function eventChannel(eventId: string) {
  return `event-${eventId}`;
}

// Realtime event names used across modules.
export const RT = {
  pollUpdated: "poll-updated",
  questionUpdated: "question-updated",
  checkInUpdated: "check-in-updated",
} as const;

let publisher: RealtimePublisher | null = null;

export function realtime(): RealtimePublisher {
  if (!publisher) {
    publisher = process.env.PUSHER_APP_ID
      ? new PusherPublisher()
      : new NoopPublisher();
  }
  return publisher;
}
