import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { checkInStaffAccess, events } from "@/db/schema";
import { staffCookieName, verifyStaffSession } from "@/lib/staff-session";

// Server-only helpers (deliberately NOT server actions: they return the
// pinHash row and must never be callable from the client).

export async function loadStaffAccess(accessToken: string) {
  const [row] = await db
    .select({ access: checkInStaffAccess, event: events })
    .from(checkInStaffAccess)
    .innerJoin(events, eq(events.id, checkInStaffAccess.eventId))
    .where(eq(checkInStaffAccess.accessToken, accessToken));
  if (!row) return null;
  const closed =
    row.access.revokedAt !== null ||
    (row.access.expiresAt !== null &&
      row.access.expiresAt.getTime() < Date.now());
  return { ...row, closed };
}

export async function hasValidStaffCookie(
  accessToken: string,
  staffAccessId: string
) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(staffCookieName(accessToken))?.value;
  return verifyStaffSession(cookie, staffAccessId);
}

export async function requireStaffAccess(accessToken: string) {
  const row = await loadStaffAccess(accessToken);
  if (!row || row.closed) return null;
  if (!(await hasValidStaffCookie(accessToken, row.access.id))) return null;
  return row;
}
