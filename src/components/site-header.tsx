"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/logo";

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

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      <header
        className={`pointer-events-auto mx-auto flex max-w-5xl items-center justify-between rounded-2xl border px-4 transition-all duration-300 sm:px-5 ${
          scrolled || open
            ? "border-line-strong bg-ink/85 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
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

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
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
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-fg md:hidden"
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute left-0 block h-0.5 w-4 rounded bg-fg transition-all ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 block h-0.5 w-4 rounded bg-fg transition-opacity ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-4 rounded bg-fg transition-all ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      {open ? (
        <div className="pointer-events-auto mx-auto mt-2 max-w-5xl rounded-2xl border border-line-strong bg-ink/95 p-3 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl px-4 py-3 text-base font-medium text-fg-dim hover:bg-raised hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 px-1">
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
