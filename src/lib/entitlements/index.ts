import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, events, memberships, organisations } from "@/db/schema";
import { PLANS } from "./plans";
import type { Entitlements } from "./types";

export { PLANS } from "./plans";
export type { Entitlements, PlanConfig, PlanTier } from "./types";

// Resolve effective entitlements: plan config plus per-org overrides.
// This is the only place tier logic lives. Feature code asks questions,
// it never inspects the tier.
export async function getEntitlements(
  organisationId: string
): Promise<Entitlements> {
  const [org] = await db
    .select({
      planTier: organisations.planTier,
      overrides: organisations.entitlementOverrides,
    })
    .from(organisations)
    .where(eq(organisations.id, organisationId));
  if (!org) throw new Error("Organisation not found");
  return { ...PLANS[org.planTier].entitlements, ...org.overrides };
}

export type ActiveEventGate =
  | { allowed: true }
  | { allowed: false; limit: number; current: number };

// Hard gate: activating an event past the cap is blocked.
export async function canActivateEvent(
  organisationId: string
): Promise<ActiveEventGate> {
  const ent = await getEntitlements(organisationId);
  if (ent.maxActiveEvents === null) return { allowed: true };
  const [row] = await db
    .select({ n: count() })
    .from(events)
    .where(
      and(
        eq(events.organisationId, organisationId),
        eq(events.status, "active")
      )
    );
  const current = row?.n ?? 0;
  return current < ent.maxActiveEvents
    ? { allowed: true }
    : { allowed: false, limit: ent.maxActiveEvents, current };
}

export type AttendeeCapState = {
  limit: number | null;
  current: number;
  // nearing: warn the organiser. over: soft wall, public link keeps working.
  nearing: boolean;
  over: boolean;
};

// Soft wall: never blocks a public RSVP, only informs organiser UI and
// flags the event so we can prompt an upgrade.
export async function attendeeCapState(
  organisationId: string,
  eventId: string
): Promise<AttendeeCapState> {
  const ent = await getEntitlements(organisationId);
  const [row] = await db
    .select({ n: count() })
    .from(attendees)
    .where(eq(attendees.eventId, eventId));
  const current = row?.n ?? 0;
  if (ent.maxAttendeesPerEvent === null)
    return { limit: null, current, nearing: false, over: false };
  return {
    limit: ent.maxAttendeesPerEvent,
    current,
    nearing: current >= ent.maxAttendeesPerEvent * 0.9,
    over: current >= ent.maxAttendeesPerEvent,
  };
}

export type SeatGate =
  | { allowed: true }
  | { allowed: false; limit: number; current: number };

// Persistent seats cover owner, admin, viewer. Check-in staff never count.
export async function canAddSeat(organisationId: string): Promise<SeatGate> {
  const ent = await getEntitlements(organisationId);
  if (ent.teamSeats === null) return { allowed: true };
  const [row] = await db
    .select({ n: count() })
    .from(memberships)
    .where(eq(memberships.organisationId, organisationId));
  const current = row?.n ?? 0;
  return current < ent.teamSeats
    ? { allowed: true }
    : { allowed: false, limit: ent.teamSeats, current };
}
