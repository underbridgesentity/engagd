import Link from "next/link";
import {
  PolicyShell,
  PolicySection,
  PolicyParagraph,
  PolicyList,
  PolicyTemplateNote,
} from "../_policy";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PolicyShell title="Privacy Policy" updated="9 July 2026">
      <PolicyTemplateNote />

      <PolicySection heading="Who we are">
        <PolicyParagraph>
          Engagd is an event-management platform operated from Cape Town, South
          Africa. We help organisers invite guests, run live engagement during
          events, and follow up afterwards. This policy explains how we handle
          personal information when you use our website, dashboard, and the
          event microsites we host on an organiser&apos;s behalf.
        </PolicyParagraph>
        <PolicyParagraph>
          In this policy, &quot;we&quot;, &quot;us&quot;, and &quot;Engagd&quot;
          refer to the company operating the Engagd service. &quot;You&quot;
          refers to the organiser using our platform, and &quot;attendees&quot;
          refers to the guests an organiser invites or manages through Engagd.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="What data we collect">
        <PolicyParagraph>
          We collect different categories of information depending on how you
          interact with us:
        </PolicyParagraph>
        <PolicyList
          items={[
            <>
              <strong className="font-semibold text-fg">
                Organiser account data:
              </strong>{" "}
              your name, email address, password credentials, organisation
              name, billing details, and the settings you configure for your
              events.
            </>,
            <>
              <strong className="font-semibold text-fg">
                Attendee data:
              </strong>{" "}
              information that organisers import or that attendees provide
              through an RSVP form. This can include name, email address, phone
              number, dietary requirements, accessibility notes, and answers to
              custom questions the organiser chooses to ask.
            </>,
            <>
              <strong className="font-semibold text-fg">Payment data:</strong>{" "}
              card and payment details are handled by third-party payment
              processors. We never receive or store full card numbers. We keep
              only limited records such as a transaction reference and status.
            </>,
            <>
              <strong className="font-semibold text-fg">
                Usage and analytics data:
              </strong>{" "}
              device and browser information, pages visited, and aggregate
              engagement statistics that help us keep the service reliable and
              understand how features are used.
            </>,
          ]}
        />
      </PolicySection>

      <PolicySection heading="Lawful basis and POPIA alignment">
        <PolicyParagraph>
          We process personal information in line with the Protection of
          Personal Information Act, 2013 (POPIA). Depending on the activity, our
          lawful basis is the performance of our contract with you, your consent
          or an attendee&apos;s consent, compliance with a legal obligation, or
          our legitimate interests in operating and securing the service. Where
          we rely on consent, you or the relevant attendee may withdraw it at
          any time.
        </PolicyParagraph>
        <PolicyParagraph>
          For attendee data, the organiser is the responsible party (data
          controller) and Engagd acts as an operator (processor) that processes
          that data on the organiser&apos;s instructions. Organisers are
          responsible for having a valid lawful basis, such as consent, before
          importing or collecting attendee information.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="How we use data">
        <PolicyList
          items={[
            "To create and manage organiser accounts and provide the features you sign up for.",
            "To send invitations, reminders, confirmations, and follow-up messages on an organiser's behalf.",
            "To run live event features such as check-in, polls, and audience questions.",
            "To process subscription payments and, where enabled, to facilitate ticket sales through an organiser's own payment keys.",
            "To provide analytics and reporting to organisers about their events.",
            "To secure the service, prevent abuse, and meet our legal and accounting obligations.",
            "To respond to support requests and communicate important service updates.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Sharing and sub-processors">
        <PolicyParagraph>
          We do not sell personal information. We share it only with service
          providers who help us run Engagd, under agreements that require them
          to protect the data and use it only for the services they provide to
          us. Our key sub-processors include:
        </PolicyParagraph>
        <PolicyList
          items={[
            "Resend, for sending transactional and event email.",
            "Yoco and Paystack, as payment providers where organisers enable ticketing.",
            "Amazon Web Services (AWS), for hosting and storage in the af-south-1 (Cape Town) region.",
            "Realtime messaging and background job providers that power live features and scheduled sends.",
          ]}
        />
        <PolicyParagraph>
          We may also disclose information where required by law, to protect our
          rights, or as part of a business transfer such as a merger or
          acquisition, in which case we will notify affected parties as
          required.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Where your data is stored">
        <PolicyParagraph>
          Our primary infrastructure is hosted with AWS in the af-south-1 region
          in Cape Town, South Africa, so your data stays in South Africa by
          default. Some sub-processors, such as email delivery, may process
          limited data outside South Africa in order to provide their service.
          Where that happens, we take steps to ensure a comparable level of
          protection as required by POPIA.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Retention">
        <PolicyParagraph>
          We keep personal information for as long as it is needed to provide
          the service and to meet legal, accounting, and reporting obligations.
          Organiser account data is retained while the account is active and for
          a reasonable period afterwards. Attendee data is retained on behalf of
          the organiser and is deleted when the organiser deletes it, closes the
          event, or closes their account, subject to any records we must keep by
          law.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Security">
        <PolicyParagraph>
          We apply appropriate technical and organisational measures to protect
          personal information. Secrets and sensitive credentials are encrypted
          at rest, access is restricted on a need-to-know basis, and connections
          to the service are encrypted in transit. No system can be guaranteed
          to be completely secure, but we work to reduce risk and to respond
          promptly if an incident occurs, including notifying affected parties
          and the Information Regulator where the law requires it.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Your rights under POPIA">
        <PolicyParagraph>
          Subject to the conditions in POPIA, you have the right to:
        </PolicyParagraph>
        <PolicyList
          items={[
            "Access the personal information we hold about you.",
            "Request correction of information that is inaccurate or out of date.",
            "Request deletion of your information where there is no lawful reason to keep it.",
            "Object to certain processing of your information.",
            "Lodge a complaint with the Information Regulator of South Africa.",
          ]}
        />
        <PolicyParagraph>
          To exercise these rights, contact us using the details below. We may
          need to verify your identity before acting on a request.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Attendees">
        <PolicyParagraph>
          Attendees are usually not Engagd account holders. Their data is
          managed by the organiser who invited them, and the organiser decides
          what to collect and how long to keep it. If you are an attendee and
          want your information accessed, corrected, or removed, please contact
          the organiser of the event directly, as they control that data. If you
          are unable to reach the organiser, you may contact us and we will do
          our best to help route your request.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Cookies">
        <PolicyParagraph>
          We use cookies and similar technologies to keep you signed in, to run
          live event features, and to understand usage. You can read more in our{" "}
          <Link
            href="/cookies"
            className="font-semibold text-signal hover:text-signal-strong"
          >
            Cookie Policy
          </Link>
          .
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Children">
        <PolicyParagraph>
          Engagd is intended for use by organisers who are adults. We do not
          knowingly collect personal information directly from children. Where
          an event involves attendees under the age of 18, the organiser is
          responsible for obtaining consent from a parent or guardian as
          required by law.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Changes to this policy">
        <PolicyParagraph>
          We may update this policy from time to time as our service and legal
          obligations evolve. When we make material changes, we will update the
          date above and, where appropriate, notify you through the service or
          by email.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Contact us">
        <PolicyParagraph>
          For privacy questions or to exercise your rights, contact our
          Information Officer at{" "}
          <a
            href="mailto:privacy@engagd.co.za"
            className="font-semibold text-signal hover:text-signal-strong"
          >
            privacy@engagd.co.za
          </a>
          . You can also write to us at our offices in Cape Town, South Africa.
        </PolicyParagraph>
      </PolicySection>
    </PolicyShell>
  );
}
