import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button, Input, Label } from "@/components/ui";
import { signInWithEmail, signInWithGoogle } from "./actions";

const ERROR_COPY: Record<string, string> = {
  "invalid-email": "That does not look like a valid email address. Try again.",
  Verification: "That sign-in link expired or was already used. Request a new one.",
  Default: "Something went wrong signing you in. Try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/home");
  const { error } = await searchParams;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl text-fg">
          engagd<span className="text-signal">.</span>
        </Link>
        <h1 className="mt-8 font-display text-2xl text-fg">Sign in</h1>
        <p className="mt-2 text-sm text-fg-dim">
          We will email you a magic link. No passwords to remember.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
          >
            {ERROR_COPY[error] ?? ERROR_COPY.Default}
          </p>
        ) : null}

        <form action={signInWithEmail} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.co.za"
            />
          </div>
          <Button type="submit" className="w-full">
            Email me a sign-in link
          </Button>
        </form>

        {googleEnabled ? (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-fg-faint">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <form action={signInWithGoogle}>
              <Button type="submit" variant="secondary" className="w-full">
                Continue with Google
              </Button>
            </form>
          </>
        ) : null}
      </div>
    </main>
  );
}
