import Link from "next/link";
import { Logo, Wordmark } from "@/components/logo";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl" aria-label="Engagd home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-fg-dim transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-fg-dim transition-colors hover:text-fg sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-signal px-5 py-2 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact sales" },
      { href: "/contact", label: "Enterprise" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo className="h-6 w-auto text-fg" />
            <p className="mt-4 max-w-xs text-sm text-fg-dim">
              The whole life of your event, from first invite to final thank
              you.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-data text-xs uppercase tracking-widest text-fg-faint">
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-fg-dim transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-line pt-8 text-sm text-fg-faint sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Engagd. Made for events people remember.</p>
          <p className="font-data text-xs">Cape Town, South Africa</p>
        </div>
      </div>
    </footer>
  );
}

// Shared section eyebrow used across marketing pages.
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-data text-xs font-medium uppercase tracking-[0.3em] text-signal">
      {children}
    </p>
  );
}
