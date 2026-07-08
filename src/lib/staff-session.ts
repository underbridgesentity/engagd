import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Signed, short-lived cookie for check-in staff sessions. Staff have no user
// account: after they enter the door PIN once, we set a cookie scoped to the
// access token so they are not re-prompted on every scan.

const DEFAULT_TTL_HOURS = 6;

function secret(): string {
  const raw = process.env.AUTH_SECRET;
  if (!raw) throw new Error("AUTH_SECRET is not set");
  return raw;
}

function hmac(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function staffCookieName(accessToken: string) {
  // Only a token prefix in the cookie name: enough to scope per-door without
  // repeating the full capability token.
  return `engagd_staff_${accessToken.slice(0, 8)}`;
}

export function staffSessionTtlHours(): number {
  const parsed = Number(process.env.CHECKIN_STAFF_SESSION_HOURS);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 24
    ? parsed
    : DEFAULT_TTL_HOURS;
}

// Value format: staffAccessId.expiresEpochMs.signature
export function signStaffSession(staffAccessId: string): {
  value: string;
  expires: Date;
} {
  const expires = new Date(Date.now() + staffSessionTtlHours() * 3600_000);
  const payload = `${staffAccessId}.${expires.getTime()}`;
  return { value: `${payload}.${hmac(payload)}`, expires };
}

export function verifyStaffSession(
  value: string | undefined,
  expectedStaffAccessId: string
): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [staffAccessId, expiresMs, sig] = parts;
  if (staffAccessId !== expectedStaffAccessId) return false;
  if (!Number.isFinite(Number(expiresMs)) || Number(expiresMs) < Date.now())
    return false;
  const expected = hmac(`${staffAccessId}.${expiresMs}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// PIN hashing: scrypt with a per-record salt. Stored as salt.hash (base64url).
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, 32);
  return `${salt.toString("base64url")}.${derived.toString("base64url")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(".");
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const derived = scryptSync(pin, salt, expected.length);
  return timingSafeEqual(derived, expected);
}

export function generatePin(): string {
  // 6 digits, leading zeros allowed.
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}
