import { Eyebrow } from "@/components/marketing";
import { slugify } from "@/lib/slug";

/**
 * Local presentational helpers for the legal policy pages (privacy, terms,
 * cookies). These keep the page files focused on copy while sharing one
 * readable prose layout, heading rhythm, and "Last updated" treatment.
 */

function TocLinks({ headings }: { headings: string[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {headings.map((heading) => (
        <li key={heading}>
          <a
            href={`#${slugify(heading)}`}
            className="text-sm text-fg-dim transition-colors hover:text-fg"
          >
            {heading}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function PolicyShell({
  title,
  updated,
  sections,
  children,
}: {
  title: string;
  updated: string;
  /**
   * Section headings, in order, for the in-page table of contents. Each entry
   * must match a PolicySection heading so the derived slug ids line up.
   */
  sections?: string[];
  children: React.ReactNode;
}) {
  const hasToc = Boolean(sections?.length);
  return (
    <section
      className={`mx-auto px-6 py-24 sm:py-28 ${
        hasToc ? "max-w-6xl" : "max-w-3xl"
      }`}
    >
      <div
        className={
          hasToc
            ? "lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16"
            : undefined
        }
      >
        <div className="max-w-3xl">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="display-tight mt-6 text-balance text-4xl text-fg sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 font-data text-xs uppercase tracking-widest text-fg-faint">
            Last updated: {updated}
          </p>
          {hasToc ? (
            <nav
              aria-label="On this page"
              className="mt-10 rounded-2xl border border-line bg-raised p-6 lg:hidden"
            >
              <p className="font-data text-xs uppercase tracking-widest text-fg-faint">
                On this page
              </p>
              <TocLinks headings={sections!} />
            </nav>
          ) : null}
          <div className="mt-12 space-y-12">{children}</div>
        </div>
        {hasToc ? (
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-24">
              <p className="font-data text-xs uppercase tracking-widest text-fg-faint">
                On this page
              </p>
              <div className="mt-1 border-l border-line pl-5">
                <TocLinks headings={sections!} />
              </div>
            </nav>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

export function PolicySection({
  heading,
  id,
  children,
}: {
  heading: string;
  /** Anchor id. Defaults to a slug of the heading so TOC links line up. */
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id ?? slugify(heading)} className="scroll-mt-24 space-y-4">
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
