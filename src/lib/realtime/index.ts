// Realtime abstraction for live polls, Q&A, and check-in counts (Phase 2).
// The app publishes through this interface only, so the provider (Pusher,
// Ably, Supabase Realtime) is swappable behind it.

export interface RealtimePublisher {
  publish(channel: string, event: string, payload: unknown): Promise<void>;
}

class NoopPublisher implements RealtimePublisher {
  async publish() {
    // Phase 1: no live features are wired yet.
  }
}

export function eventChannel(eventId: string) {
  return `event-${eventId}`;
}

let publisher: RealtimePublisher = new NoopPublisher();

export function setRealtimePublisher(p: RealtimePublisher) {
  publisher = p;
}

export function realtime(): RealtimePublisher {
  return publisher;
}
