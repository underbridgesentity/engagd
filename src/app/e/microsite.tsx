import * as React from "react";
import type { EventRow } from "@/lib/rsvp";
import { Logo } from "@/components/logo";

// Shared building blocks for the public attendee surfaces (/e, /r, /join).
// Server components only; no client JS in this file.

type MicrositeConfig = EventRow["micrositeConfig"];

// Guard rails for organiser-supplied brand colors. Custom accents and
// backgrounds are only applied when we can parse them and they keep the
// page legible; anything unparseable falls back to the default theme.
function parseHex(value: string): [number, number, number] | null {
  const raw = value.trim().replace(/^#/, "");
  const hex =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.length === 6
        ? raw
        : null;
  if (!hex || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// Luminance of the default --ink (#0c0e13) from globals.css, used as the
// comparison background when no custom background color is set.
const DEFAULT_INK_LUMINANCE = relativeLuminance([12, 14, 19]);

// Minimum accent-vs-background contrast before we trust a custom accent.
const MIN_ACCENT_CONTRAST = 2.5;

export function MicrositeShell({
  config,
  children,
}: {
  config: MicrositeConfig;
  children: React.ReactNode;
}) {
  const vars: Record<string, string> = {};

  const customBg = config.backgroundColor
    ? parseHex(config.backgroundColor)
    : null;
  const bgLuminance = customBg
    ? relativeLuminance(customBg)
    : DEFAULT_INK_LUMINANCE;

  if (customBg && config.backgroundColor) {
    vars["--ink"] = config.backgroundColor;
    if (bgLuminance > 0.5) {
      // Light custom background: the default near-white text would vanish,
      // so flip the text stack to dark values.
      vars["--text"] = "#16130e";
      vars["--text-dim"] = "#45413a";
      vars["--text-faint"] = "#615c53";
    }
  }

  if (config.accentColor) {
    const accent = parseHex(config.accentColor);
    // Keep the default accent when the organiser's accent is unparseable or
    // would be unreadable against the page background.
    if (
      accent &&
      contrastRatio(relativeLuminance(accent), bgLuminance) >=
        MIN_ACCENT_CONTRAST
    ) {
      vars["--signal"] = config.accentColor;
      vars["--signal-strong"] = config.accentColor;
    }
  }

  return (
    <div
      style={vars as React.CSSProperties}
      className="min-h-dvh bg-ink text-fg"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-10 sm:px-6">
        <main id="main-content" className="flex-1">
          {children}
        </main>
        {config.hideEngagdBranding ? null : (
          <footer className="mt-12 flex items-center justify-center gap-1.5 border-t border-line pt-4">
            <span className="font-data text-xs text-fg-faint">Powered by</span>
            <Logo className="h-3 w-auto text-fg-faint" />
          </footer>
        )}
      </div>
    </div>
  );
}

export function EventLogo({ config }: { config: MicrositeConfig }) {
  if (!config.logoUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={config.logoUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className="mb-4 h-10 w-auto max-w-[160px] object-contain"
    />
  );
}

export function formatEventDate(
  date: Date | null,
  timezone: string
): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

export function formatEventTime(
  date: Date | null,
  timezone: string
): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

export function formatEventDateRange(event: {
  startsAt: Date | null;
  endsAt: Date | null;
  timezone: string;
}): string | null {
  const { startsAt, endsAt, timezone } = event;
  if (!startsAt) return null;
  const startDate = formatEventDate(startsAt, timezone);
  const startTime = formatEventTime(startsAt, timezone);
  if (!endsAt) return `${startDate}, ${startTime}`;
  const sameDay =
    formatEventDate(startsAt, timezone) === formatEventDate(endsAt, timezone);
  if (sameDay) {
    return `${startDate}, ${startTime} to ${formatEventTime(endsAt, timezone)}`;
  }
  return `${startDate}, ${startTime} to ${formatEventDate(endsAt, timezone)}, ${formatEventTime(endsAt, timezone)}`;
}

export function EventSummary({ event }: { event: EventRow }) {
  const when = formatEventDateRange(event);
  return (
    <div className="space-y-2">
      {when ? (
        <p className="font-data text-sm text-signal-strong">{when}</p>
      ) : null}
      {event.venueName ? (
        <p className="text-sm text-fg">
          {event.venueName}
          {event.venueAddress ? (
            <span className="block text-fg-dim">{event.venueAddress}</span>
          ) : null}
        </p>
      ) : event.venueAddress ? (
        <p className="text-sm text-fg-dim">{event.venueAddress}</p>
      ) : null}
    </div>
  );
}

export type ProgramItem = {
  id: string;
  title: string;
  description: string | null;
  speaker: string | null;
  location: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function ProgramTimeline({
  items,
  timezone,
}: {
  items: ProgramItem[];
  timezone: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="program-heading" className="mt-10">
      <h2 id="program-heading" className="text-lg text-fg">
        Programme
      </h2>
      <ol className="mt-4 space-y-0">
        {items.map((item, i) => {
          const start = formatEventTime(item.startsAt, timezone);
          const end = formatEventTime(item.endsAt, timezone);
          return (
            <li key={item.id} className="relative flex gap-4 pb-6">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-signal"
                />
                {i < items.length - 1 ? (
                  <span aria-hidden className="mt-1 w-px flex-1 bg-line" />
                ) : null}
              </div>
              <div className="min-w-0 pb-1">
                {start ? (
                  <p className="font-data text-xs text-fg-faint">
                    {start}
                    {end ? ` to ${end}` : ""}
                  </p>
                ) : null}
                <p className="mt-0.5 font-medium text-fg">{item.title}</p>
                {item.speaker ? (
                  <p className="text-sm text-fg-dim">{item.speaker}</p>
                ) : null}
                {item.location ? (
                  <p className="font-data text-xs text-fg-faint">
                    {item.location}
                  </p>
                ) : null}
                {item.description ? (
                  <p className="mt-1 text-sm text-fg-dim">{item.description}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function FriendlyNotFound({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center">
      <p className="font-display text-2xl text-fg">
        We could not find that event
      </p>
      <p className="mt-2 max-w-sm text-sm text-fg-dim">{message}</p>
      <a
        href="/join"
        className="mt-6 rounded-lg bg-signal px-5 py-3 text-sm font-medium text-ink"
      >
        Enter an event code
      </a>
    </div>
  );
}
