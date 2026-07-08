"use server";

import { count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { checkIns } from "@/db/schema";
import { performCheckIn, type CheckInResult } from "@/lib/checkin";
import {
  signStaffSession,
  staffCookieName,
  verifyPin,
} from "@/lib/staff-session";
import { loadStaffAccess, requireStaffAccess } from "./access";

// Staff routes never touch requireOrg: the only credential is the access
// token in the path plus the PIN-backed signed cookie.

export type PinState = { error?: string };

export async function verifyStaffPinAction(
  accessToken: string,
  _prev: PinState,
  formData: FormData
): Promise<PinState> {
  const row = await loadStaffAccess(accessToken);
  if (!row || row.closed)
    return { error: "This check-in link is no longer active." };

  const pin = String(formData.get("pin") ?? "").trim();
  if (!/^\d{4,8}$/.test(pin)) return { error: "Enter the numeric PIN." };
  if (!verifyPin(pin, row.access.pinHash))
    return { error: "That PIN is not correct." };

  const session = signStaffSession(row.access.id);
  const cookieStore = await cookies();
  cookieStore.set(staffCookieName(accessToken), session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/checkin/${accessToken}`,
    expires: session.expires,
  });
  return {};
}

export type StaffScanResult = CheckInResult | { status: "unauthorized" };

export async function staffScan(
  accessToken: string,
  scannedToken: string
): Promise<StaffScanResult> {
  const row = await requireStaffAccess(accessToken);
  if (!row) return { status: "unauthorized" };
  return performCheckIn({
    eventId: row.access.eventId,
    scannedToken,
    checkedInByStaffId: row.access.id,
  });
}

export async function staffCount(
  accessToken: string
): Promise<{ count: number } | { status: "unauthorized" }> {
  const row = await requireStaffAccess(accessToken);
  if (!row) return { status: "unauthorized" };
  const [result] = await db
    .select({ value: count() })
    .from(checkIns)
    .where(eq(checkIns.eventId, row.access.eventId));
  return { count: result.value };
}
