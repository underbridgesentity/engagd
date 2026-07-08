import Link from "next/link";
import { auth } from "@/auth";
import { requireOrg } from "@/lib/tenancy";
import { Badge } from "@/components/ui";
import { Logo } from "@/components/logo";
import { signOutAction } from "./actions";

const NAV = [
  { label: "Dashboard", path: "" },
  { label: "Events", path: "/events" },
  { label: "Analytics", path: "/analytics" },
  { label: "Team", path: "/team" },
  { label: "Billing", path: "/billing" },
  { label: "Settings", path: "/settings" },
];

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const session = await auth();
  const email = session?.user?.email ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-ink md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-line bg-ink-2 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <Link
            href={`/o/${orgSlug}`}
            className="flex items-baseline gap-0.5 text-fg"
            aria-label="Engagd dashboard"
          >
            <Logo className="h-5 w-auto" />
            <span className="font-display text-lg leading-none text-signal">.</span>
          </Link>
          <Badge tone={ctx.role === "owner" ? "signal" : "neutral"}>
            {ctx.role}
          </Badge>
        </div>
        <div className="px-5 pb-4">
          <p className="truncate font-display text-sm text-fg">
            {ctx.organisation.name}
          </p>
          <p className="truncate font-data text-xs text-fg-faint">{email}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={`/o/${orgSlug}${item.path}`}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-fg-dim transition-colors hover:bg-raised-2 hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden px-5 py-5 md:block">
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm text-fg-faint transition-colors hover:text-fg"
            >
              Sign out
            </button>
          </form>
        </div>
        <form action={signOutAction} className="px-5 pb-4 md:hidden">
          <button
            type="submit"
            className="text-sm text-fg-faint transition-colors hover:text-fg"
          >
            Sign out
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
