import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { checkIns } from "@/db/schema";
import { hasValidStaffCookie, loadStaffAccess } from "./access";
import { PinGate, StaffScanner } from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffCheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await loadStaffAccess(token);

  // Unknown, revoked, or expired tokens all get the same closed state: no
  // hint about whether the link ever existed.
  if (!row || row.closed) {
    return (
      <Shell>
        <div className="space-y-3 text-center">
          <h1 className="font-display text-2xl text-fg">
            This check-in link is closed
          </h1>
          <p className="text-sm text-fg-dim">
            The link may have expired or been revoked by the event organiser.
            Ask the organiser for a new link if you still need door access.
          </p>
        </div>
      </Shell>
    );
  }

  const authed = await hasValidStaffCookie(token, row.access.id);
  if (!authed) {
    return (
      <Shell>
        <PinGate token={token} eventName={row.event.name} />
      </Shell>
    );
  }

  const [checked] = await db
    .select({ value: count() })
    .from(checkIns)
    .where(eq(checkIns.eventId, row.access.eventId));

  return (
    <Shell>
      <StaffScanner
        token={token}
        eventId={row.access.eventId}
        eventName={row.event.name}
        label={row.access.label}
        initialCount={checked.value}
      />
    </Shell>
  );
}

// Deliberately bare: staff get the scanner and nothing else. No app nav, no
// links out to any other data.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      {children}
    </main>
  );
}
