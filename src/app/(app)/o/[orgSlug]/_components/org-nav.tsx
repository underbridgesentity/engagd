"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", path: "" },
  { label: "Events", path: "/events" },
  { label: "Analytics", path: "/analytics" },
  { label: "Team", path: "/team" },
  { label: "Billing", path: "/billing" },
  { label: "Settings", path: "/settings" },
];

export function OrgNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const base = `/o/${orgSlug}`;

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {NAV.map((item) => {
        const href = `${base}${item.path}`;
        const active =
          item.path === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-signal/15 text-signal-strong"
                : "text-fg-dim hover:bg-raised-2 hover:text-fg"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
