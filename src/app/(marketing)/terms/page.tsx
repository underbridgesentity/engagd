import {
  PolicyShell,
  PolicySection,
  PolicyParagraph,
  PolicyList,
  PolicyTemplateNote,
} from "../_policy";

export const metadata = { title: "Terms of Service" };

// TOC entries. Each must match a PolicySection heading below exactly so the
// derived anchor ids line up.
const SECTIONS = [
  "Acceptance of these terms",
  "Description of the service",
  "Accounts and organisation ownership",
  "Acceptable use",
  "Organiser responsibilities",
  "Subscriptions, plans, and billing",
  "Payments and ticketing",
  "Intellectual property",
  "Third-party services",
  "Disclaimers and limitation of liability",
  "Indemnity",
  "Suspension and termination",
  "Governing law",
  "Changes to these terms",
  "Contact us",
];

export default function TermsPage() {
  return (
    <PolicyShell
      title="Terms of Service"
      updated="9 July 2026"
      sections={SECTIONS}
    >
      <PolicyTemplateNote />

      <PolicySection heading="Acceptance of these terms">
        <PolicyParagraph>
          These Terms of Service govern your access to and use of the Engagd
          platform, operated from Cape Town, South Africa. By creating an
          account, or by accessing or using the service, you agree to be bound
          by these terms. If you are using Engagd on behalf of an organisation,
          you confirm that you have authority to bind that organisation to these
          terms.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Description of the service">
        <PolicyParagraph>
          Engagd is a software platform that helps organisers manage the full
          life of an event: sending invitations and collecting RSVPs, running
          check-in and live engagement such as polls and audience questions, and
          following up with surveys, galleries, and analytics. We provide the
          software and hosting; you provide the events and the content.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Accounts and organisation ownership">
        <PolicyParagraph>
          You are responsible for keeping your account credentials secure and
          for all activity that happens under your account. An organisation
          workspace is owned by the organiser account that creates it. Team
          members you invite act under that organisation, and the organisation
          owner is responsible for managing their access. Please tell us
          promptly if you suspect any unauthorised use of your account.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Acceptable use">
        <PolicyParagraph>You agree not to use Engagd to:</PolicyParagraph>
        <PolicyList
          items={[
            "Store, send, or promote illegal, harmful, or infringing content.",
            "Send spam or unsolicited messages, or contact people who have not consented to hear from you.",
            "Disregard an attendee's request to stop receiving communications.",
            "Attempt to breach, probe, or disrupt the security or integrity of the service.",
            "Misrepresent your identity or use the service to defraud others.",
          ]}
        />
        <PolicyParagraph>
          You must respect attendee consent for all communications you send
          through Engagd and comply with applicable laws, including POPIA and
          electronic-communications rules.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Organiser responsibilities">
        <PolicyParagraph>
          As an organiser you are the responsible party (data controller) for
          the attendee data you import or collect. You confirm that you have a
          lawful basis, such as consent, to import contacts and to contact them
          about your event. You are responsible for the accuracy of your content
          and for honouring the promises you make to your attendees, including
          how you handle their personal information.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Subscriptions, plans, and billing">
        <PolicyParagraph>
          Engagd is offered on subscription plans that may be billed monthly or
          annually. Each plan sets limits such as the number of active events
          and a soft cap on attendees. Paid subscriptions renew automatically at
          the end of each billing period unless you cancel before the renewal
          date.
        </PolicyParagraph>
        <PolicyParagraph>
          You can cancel at any time from your billing settings. Cancellation
          takes effect at the end of the current billing period, and unless the
          law requires otherwise, fees already paid are not refunded. If you
          exceed a plan limit, we may ask you to upgrade in order to keep using
          the affected features.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Payments and ticketing">
        <PolicyParagraph>
          Where you sell tickets, you bring your own payment keys from providers
          such as Yoco or Paystack. Ticket transactions are between you and your
          attendees, processed through your own payment account. Engagd is not a
          party to those transactions and does not hold, receive, or disburse
          attendee funds. Payouts, refunds, and chargebacks for tickets are
          handled by your payment provider under your agreement with them.
        </PolicyParagraph>
        <PolicyParagraph>
          Engagd&apos;s revenue comes from subscription fees for the platform,
          not from a share of your ticket sales.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Intellectual property">
        <PolicyParagraph>
          Engagd, including its software, design, and branding, is owned by us
          and our licensors and is protected by intellectual property laws. We
          grant you a limited, non-exclusive, non-transferable right to use the
          service during your subscription. You retain ownership of the content
          and data you upload, and you grant us the permissions we need to host
          and process it in order to provide the service.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Third-party services">
        <PolicyParagraph>
          The service integrates with third-party providers, including email,
          payment, hosting, and analytics services. Your use of those
          integrations may be subject to the third party&apos;s own terms, and
          we are not responsible for their acts or omissions. If a third-party
          service becomes unavailable, some features may be affected.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Disclaimers and limitation of liability">
        <PolicyParagraph>
          The service is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis, without warranties of any kind except those
          that cannot be excluded by law. To the maximum extent permitted by
          law, Engagd is not liable for any indirect, incidental, or
          consequential loss, and our total liability arising out of or relating
          to the service is limited to the fees you paid to us in the twelve
          months before the event giving rise to the claim.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Indemnity">
        <PolicyParagraph>
          You agree to indemnify and hold Engagd harmless from claims, damages,
          and costs arising out of your use of the service, your content, your
          events, or your breach of these terms or of any law, including claims
          brought by your attendees relating to how you collected or used their
          personal information.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Suspension and termination">
        <PolicyParagraph>
          You may stop using the service and close your account at any time. We
          may suspend or terminate access if you breach these terms, fail to pay
          fees, or use the service in a way that risks harm to others or to the
          platform. Where practical and lawful, we will give you notice and an
          opportunity to fix the problem. On termination, your right to use the
          service ends, and we will handle your data as described in our Privacy
          Policy.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Governing law">
        <PolicyParagraph>
          These terms are governed by the laws of the Republic of South Africa,
          and you agree to the jurisdiction of the South African courts for any
          dispute arising out of or relating to the service.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Changes to these terms">
        <PolicyParagraph>
          We may update these terms from time to time. When we make material
          changes, we will update the date above and, where appropriate, notify
          you. Your continued use of the service after changes take effect means
          you accept the updated terms.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection heading="Contact us">
        <PolicyParagraph>
          Questions about these terms can be sent to{" "}
          <a
            href="mailto:legal@engagd.co.za"
            className="font-semibold text-signal hover:text-signal-strong"
          >
            legal@engagd.co.za
          </a>
          .
        </PolicyParagraph>
      </PolicySection>
    </PolicyShell>
  );
}
