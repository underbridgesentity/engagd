import { Eyebrow } from "@/components/marketing";

/**
 * Local presentational helpers for the legal policy pages (privacy, terms,
 * cookies). These keep the page files focused on copy while sharing one
 * readable prose layout, heading rhythm, and "Last updated" treatment.
 */

export function PolicyShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 sm:py-28">
      <Eyebrow>Legal</Eyebrow>
      <h1 className="display-tight mt-6 text-balance text-4xl text-fg sm:text-5xl">
        {title}
      </h1>
      <p className="mt-6 font-data text-xs uppercase tracking-widest text-fg-faint">
        Last updated: {updated}
      </p>
      <div className="mt-12 space-y-12">{children}</div>
    </section>
  );
}

export function PolicySection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl text-fg">{heading}</h2>
      {children}
    </section>
  );
}

export function PolicyParagraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base leading-relaxed text-fg-dim">{children}</p>
  );
}

export function PolicyList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 text-base leading-relaxed text-fg-dim"
        >
          <span
            aria-hidden
            className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A short italic notice flagging that the copy is a reviewable template. */
export function PolicyTemplateNote() {
  return (
    <p className="rounded-2xl border border-line bg-raised px-5 py-4 text-sm italic leading-relaxed text-fg-dim">
      This document is a template provided for convenience. It must be reviewed
      and adapted by qualified legal counsel before you rely on it or publish it
      to your customers.
    </p>
  );
}
