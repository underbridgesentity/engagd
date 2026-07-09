import { redirect } from "next/navigation";
import { and, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";

export const metadata = {
  title: "Join an event",
  description: "Enter your event code to find your event.",
};

// Case-insensitive lookup of a short join code, limited to publicly
// visible events. On a miss the entered code is passed back via the
// redirect so the attendee does not have to retype it (it is a short
// event code, not personal data).
async function joinEvent(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "")
    .trim()
    .toLowerCase();
  if (code) {
    const [event] = await db
      .select({ slug: events.slug })
      .from(events)
      .where(
        and(
          sql`lower(${events.joinCode}) = ${code}`,
          inArray(events.status, ["active", "completed"])
        )
      )
      .limit(1);
    if (event) redirect(`/e/${event.slug}`);
  }
  redirect(`/join?notfound=1&code=${encodeURIComponent(code)}`);
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ notfound?: string; code?: string }>;
}) {
  const { notfound, code } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-fg">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <h1 className="text-center font-display text-3xl">Join an event</h1>
        <p className="mt-2 text-center text-sm text-fg-dim">
          Enter the short code shared by your event organiser.
        </p>

        <form action={joinEvent} className="mt-8 space-y-4">
          <div>
            <label htmlFor="code" className="sr-only">
              Event code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              defaultValue={code ?? ""}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              placeholder="EVENT CODE"
              aria-invalid={notfound ? true : undefined}
              aria-describedby={notfound ? "code-error" : undefined}
              className="w-full rounded-xl border border-line-strong bg-ink-2 px-4 py-4 text-center font-data text-2xl uppercase tracking-[0.25em] text-fg placeholder:text-fg-faint placeholder:tracking-[0.15em] focus:border-signal/70 focus:outline-none"
            />
            {notfound ? (
              <p id="code-error" role="alert" className="mt-2 text-center text-sm text-coral">
                We could not find an event with that code. Check it and try
                again.
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-signal px-4 py-4 text-base font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            Find my event
          </button>
        </form>
      </main>
      <footer className="border-t border-line py-4 text-center">
        <span className="font-data text-xs text-fg-faint">
          Powered by Engagd
        </span>
      </footer>
    </div>
  );
}
