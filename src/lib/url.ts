// Single source of truth for the app's public origin, used to build links in
// emails, invites, and payment redirects. Keeping this in one place stops
// call sites from disagreeing (some previously honoured NEXTAUTH_URL/AUTH_URL
// and some did not, so the same link could differ by where it was built).
export function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}
