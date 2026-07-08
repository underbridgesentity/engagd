import { cookies } from "next/headers";
import { createId } from "@paralleldrive/cuid2";

// Anonymous voter fingerprint for accountless attendee surfaces. A random
// opaque id stored in a long-lived httpOnly cookie; no PII, not linkable to
// a user account. Setting the cookie is only allowed in a server action or
// route handler, so pages must use readFingerprint.

const COOKIE_NAME = "engagd_fp";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function readFingerprint(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

// Read-or-set. Call from server actions only (cookie writes are not
// permitted during page render).
export async function getOrSetFingerprint(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const fp = createId();
  store.set(COOKIE_NAME, fp, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return fp;
}
