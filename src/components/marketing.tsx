import Link from "next/link";
import { Logo } from "@/components/logo";

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
          <p className="font-data text-xs">Johannesburg, South Africa</p>
        </div>
      </div>
    </footer>
  );
}

// Shared section eyebrow: a plain small-caps accent label, no decoration.
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">
      {children}
    </p>
  );
}
