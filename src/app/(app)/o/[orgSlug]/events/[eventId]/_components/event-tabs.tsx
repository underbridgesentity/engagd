"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function EventTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/attendees`, label: "Attendees" },
    { href: `${base}/invites`, label: "Invites" },
    { href: `${base}/tickets`, label: "Tickets" },
    { href: `${base}/questions`, label: "Questions" },
    { href: `${base}/program`, label: "Program" },
    { href: `${base}/live`, label: "Live" },
    { href: `${base}/checkin`, label: "Check-in" },
    { href: `${base}/photos`, label: "Photos" },
    { href: `${base}/surveys`, label: "Surveys" },
    { href: `${base}/edit`, label: "Edit" },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line pb-px">
      {tabs.map((tab) => {
        const active =
          tab.href === base
            ? pathname === base
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-signal text-fg"
                : "border-transparent text-fg-dim hover:bg-raised hover:text-fg"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
