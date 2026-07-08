import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm text-center">
        <span className="font-display text-xl text-fg">
          engagd<span className="text-signal">.</span>
        </span>
        <div className="mt-8 rounded-[10px] border border-line bg-raised p-8">
          <p className="font-display text-2xl text-fg">Check your email</p>
          <p className="mt-3 text-sm leading-relaxed text-fg-dim">
            We sent you a sign-in link. Open it on this device to continue. The
            link expires after 24 hours.
          </p>
          <p className="mt-4 font-data text-xs text-fg-faint">
            No email after a minute? Check spam, or{" "}
            <Link href="/login" className="text-signal-strong hover:underline">
              request a new link
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
