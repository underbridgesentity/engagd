import {
  PolicyShell,
  PolicySection,
  PolicyParagraph,
  PolicyList,
  PolicyTemplateNote,
} from "../_policy";

export const metadata = { title: "Cookie Policy" };

const COOKIES = [
  {
    name: "engagd_session",
    purpose: "Keeps an organiser signed in to the dashboard.",
    duration: "Session / 30 days",
  },
  {
    name: "engagd_csrf",
    purpose: "Protects form submissions against cross-site request forgery.",
    duration: "Session",
  },
  {
    name: "vote_fingerprint",
    purpose:
      "Anonymous identifier that stops the same person voting twice in a live poll.",
    duration: "24 hours",
  },
  {
    name: "checkin_staff",
    purpose: "Keeps check-in staff signed in on the door device during an event.",
    duration: "12 hours",
  },
  {
    name: "engagd_prefs",
    purpose: "Remembers preferences such as your last-used organisation.",
    duration: "1 year",
  },
  {
    name: "_analytics_id",
    purpose: "Aggregate, privacy-friendly usage analytics for the dashboard.",
    duration: "1 year",
  },
];

// TOC entries. Each must match a PolicySection heading below exactly so the
// derived anchor ids line up.
const SECTIONS = [
  "What cookies are",
  "The categories we use",
  "Attendee-facing surfaces are kept minimal",
  "Example cookies",
  "How to control cookies",
  "Third-party cookies",
  "Changes to this policy",
];

export default function CookiesPage() {
  return (
    <PolicyShell
      title="Cookie Policy"
      updated="9 July 2026"
      sections={SECTIONS}
    >
      <PolicyTemplateNote />

      <PolicySection heading="What cookies are">
        <PolicyParagraph>
          Cookies are small text files that a website stores on your device.
          They let a site remember things between page loads and visits, such as
          whether you are signed in. We also use similar technologies like local
          storage. In this policy, &quot;cookies&quot; refers to all of these.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="The categories we use">
        <PolicyList
          items={[
            <>
              <strong className="font-semibold text-fg">
                Strictly necessary:
              </strong>{" "}
              required for the service to work. These include session and
              authentication cookies for organiser sign-in, the anonymous
              fingerprint that keeps attendee voting fair, and the session
              cookie that keeps check-in staff signed in at the door. These
              cannot be switched off without breaking core features.
            </>,
            <>
              <strong className="font-semibold text-fg">Preferences:</strong>{" "}
              remember choices you make, such as your last-used organisation, so
              the dashboard feels consistent between visits.
            </>,
            <>
              <strong className="font-semibold text-fg">Analytics:</strong>{" "}
              help us understand how the dashboard is used so we can improve it.
              We keep this aggregated and privacy-friendly.
            </>,
          ]}
        />
      </PolicySection>

      <PolicySection heading="Attendee-facing surfaces are kept minimal">
        <PolicyParagraph>
          On the pages your guests see, such as RSVP forms, live polls, and
          check-in, we keep cookies to a minimum and use only what is needed to
          make the experience work and fair. Guests do not need an account to
          take part.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Example cookies">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong">
                <th className="px-5 py-3 font-data text-xs uppercase tracking-widest text-fg-faint">
                  Name
                </th>
                <th className="px-5 py-3 font-data text-xs uppercase tracking-widest text-fg-faint">
                  Purpose
                </th>
                <th className="px-5 py-3 font-data text-xs uppercase tracking-widest text-fg-faint">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr
                  key={c.name}
                  className="border-b border-line last:border-b-0 align-top"
                >
                  <td className="px-5 py-4">
                    <span className="font-data text-sm text-fg">{c.name}</span>
                  </td>
                  <td className="px-5 py-4 leading-relaxed text-fg-dim">
                    {c.purpose}
                  </td>
                  <td className="px-5 py-4 text-fg-dim">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PolicyParagraph>
          The names and durations above are examples that may change as we
          improve the service.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="How to control cookies">
        <PolicyParagraph>
          You can manage or delete cookies through your browser settings, and
          set most browsers to warn you before a cookie is stored. Blocking
          strictly necessary cookies will stop you from signing in and will
          break parts of the service. Guidance is available in the help pages of
          Chrome, Safari, Firefox, and Edge.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Third-party cookies">
        <PolicyParagraph>
          Some cookies may be set by the third-party services we rely on, such
          as our hosting, email, and payment providers, when their features load
          as part of the service. Those providers process data under their own
          policies. We work to keep third-party cookies limited to what the
          service needs.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Changes to this policy">
        <PolicyParagraph>
          We may update this Cookie Policy as our use of cookies changes. When we
          make material changes, we will update the date above. For more on how
          we handle personal information generally, please see our Privacy
          Policy.
        </PolicyParagraph>
      </PolicySection>
    </PolicyShell>
  );
}
