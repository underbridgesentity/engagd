import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { currentUserOrgs } from "@/lib/tenancy";
import { Button, Input, Label } from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { createOrganisation } from "./actions";

const ERROR_COPY: Record<string, string> = {
  "too-short": "Give your organisation a name of at least 2 characters.",
  "too-long": "Keep the name under 80 characters.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const orgs = await currentUserOrgs(session.user.id);
  if (orgs.length > 0) redirect(`/o/${orgs[0].org.slug}`);
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-md">
        <Wordmark className="text-xl" />
        <h1 className="mt-8 font-display text-3xl text-fg">
          Name your organisation
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-dim">
          This is the workspace your events live in. Use your company, team, or
          brand name. You can rename it later in settings.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
          >
            {ERROR_COPY[error] ?? "Could not create the organisation. Try again."}
          </p>
        ) : null}

        <form action={createOrganisation} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="name">Organisation name</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="Underbridge Events"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full">
            Create organisation
          </Button>
        </form>
        <p className="mt-4 font-data text-xs text-fg-faint">
          You start on the Free plan: 1 active event, 100 attendees, 1 seat.
          Upgrade whenever you outgrow it.
        </p>
      </div>
    </main>
  );
}
