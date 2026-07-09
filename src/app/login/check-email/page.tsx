import Link from "next/link";
import { Wordmark } from "@/components/logo";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm text-center">
        <Wordmark className="text-xl" />
        <div className="mt-8 rounded-[10px] border border-line bg-raised p-8">
          <p className="font-display text-2xl text-fg">
            Check your email to continue
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-dim">
            We sent you a magic link. Open it on this device and you are in,
            whether this is your first visit or your hundredth. The link
            expires after 24 hours.
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
