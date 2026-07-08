# Engagd

All-in-one event lifecycle and engagement platform: invitations and RSVPs, live day-of engagement, and post-event follow-up. Organisers get a dashboard; attendees stay accountless throughout (invite link, RSVP page, QR at the door).

## Stack

- Next.js (App Router, TypeScript) on Vercel
- PostgreSQL via Drizzle ORM (serverless-friendly pooling, prepared statements off)
- Auth.js: email magic link (Resend) plus optional Google OAuth, organiser accounts only
- Resend for transactional and campaign email
- Inngest for scheduled sends and reminders (behind src/lib/jobs)
- Realtime abstraction in src/lib/realtime (Phase 2 wires a provider)
- Payment provider abstraction (Phase 2: Yoco primary, Paystack optional)

## Local development

1. `cp .env.example .env.local` and fill in values. Minimum for local dev: `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `ENCRYPTION_KEY`.
2. Create the database: `createdb engagd`
3. Apply migrations: `npx drizzle-kit migrate`
4. Optionally seed: `npx tsx scripts/seed.ts`
5. `npm run dev`

## Architecture notes

- Multi-tenancy: every record belongs to an organisation. All organiser-side reads and writes resolve through `requireOrg` / `requireOrgEvent` in `src/lib/tenancy.ts`. There is no cross-tenant access path.
- Entitlements: plan limits live in `src/lib/entitlements/plans.ts` only. Feature code calls `getEntitlements`, `canActivateEvent` (hard gate), `attendeeCapState` (soft wall, never blocks public RSVP links), and `canAddSeat`. Per-org overrides support enterprise custom limits.
- Roles: owner, admin, viewer are seat-consuming memberships. Check-in staff use event-scoped access records (`check_in_staff_access`) and never consume seats.
- Attendee identity is an opaque `qrToken` used in personal links (`/r/{token}`) and door QR codes. No PII in query strings.
- Payment secrets are AES-256-GCM encrypted at rest (`src/lib/crypto.ts`), server-side only. Payments are verified server-side, never trusted from redirects.

## Phases (all built)

- Phase 1: full schema, tenancy, auth, entitlements, Module A (events, microsite, CSV import, invitations, reminders), reply-to verification, billing scaffolding, analytics skeleton.
- Phase 2: live polls, Q&A, check-in scanner with event-scoped staff access, free and paid ticketing, Yoco adapter with server-side verification, custom sending domains.
- Phase 3: surveys, post-event mailers, photo delivery via S3 signed URLs, full engagement analytics, Paystack adapter.
