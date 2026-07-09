"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/logo";
import { Icon } from "@/components/icon";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While the mobile menu is open: lock scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      {/* Scrim behind the open mobile menu, tap to close. */}
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="pointer-events-auto fixed inset-0 -z-10 bg-ink/60 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <header
        className={`pointer-events-auto mx-auto flex max-w-5xl items-center justify-between rounded-2xl border px-4 transition-all duration-300 sm:px-5 ${
          scrolled || open
            ? "border-line-strong bg-ink/85 py-2.5 shadow-[var(--shadow-e2)] backdrop-blur-xl"
            : "border-transparent bg-transparent py-3.5"
        }`}
      >
        <Link
          href="/"
          className="text-3xl text-fg"
          aria-label="Engagd home"
          onClick={() => setOpen(false)}
        >
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`group relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active ? "text-fg" : "text-fg-dim hover:text-fg"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-signal transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
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
            className="group hidden items-center gap-1.5 rounded-full bg-signal px-5 py-2 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-signal-strong sm:inline-flex"
          >
            Get started
            <Icon name="arrowRight" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-fg md:hidden"
          >
            <Icon name={open ? "x" : "chevronDown"} className="text-lg" />
          </button>
        </div>
      </header>

      {open ? (
        <div
          id="mobile-menu"
          className="pointer-events-auto mx-auto mt-2 max-w-5xl rounded-2xl border border-line-strong bg-ink/95 p-3 shadow-[var(--shadow-e3)] backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col" aria-label="Primary">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className="rounded-xl px-4 py-3 text-base font-medium text-fg-dim hover:bg-raised hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 px-1 pb-1">
              <Link
                href="/login"
                className="flex-1 rounded-full border border-line-strong px-4 py-2.5 text-center text-sm font-semibold text-fg"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="flex-1 rounded-full bg-signal px-4 py-2.5 text-center text-sm font-bold text-ink"
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
