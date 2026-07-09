import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  memberships,
  organisations,
  subscriptionPayments,
  users,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { inngest } from "@/lib/jobs";
import { audit } from "@/lib/audit";
import { appBaseUrl } from "@/lib/url";

// Yoco checkouts are once-off, so renewals are manual: this daily job sends
// a reminder before the paid-through date, marks lapsed plans past_due with
// a grace period, and only then downgrades to Free. Orgs without a verified
// payment (comped accounts, enterprise deals set by hand) are never touched.
const REMINDER_DAYS = 7;
const GRACE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

async function ownerEmails(organisationId: string): Promise<string[]> {
  const rows = await db
    .select({ email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.organisationId, organisationId),
        eq(memberships.role, "owner")
      )
    );
  return rows.map((r) => r.email).filter(Boolean);
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export const billingRenewals = inngest.createFunction(
  {
    id: "billing-renewals",
    retries: 2,
    triggers: [{ cron: "TZ=Africa/Johannesburg 0 7 * * *" }],
  },
  async ({ step }) => {
    const summary = await step.run("process-renewals", async () => {
      const baseUrl = appBaseUrl();
      const now = new Date();
      let reminders = 0;
      let lapses = 0;
      let downgrades = 0;

      // Paid self-serve tiers only. Enterprise is sales-led and Free has
      // nothing to renew.
      const orgs = await db
        .select({
          id: organisations.id,
          slug: organisations.slug,
          name: organisations.name,
          planTier: organisations.planTier,
          billingStatus: organisations.billingStatus,
        })
        .from(organisations)
        .where(inArray(organisations.planTier, ["starter", "professional"]));

      for (const org of orgs) {
        const [payment] = await db
          .select()
          .from(subscriptionPayments)
          .where(
            and(
              eq(subscriptionPayments.organisationId, org.id),
              eq(subscriptionPayments.status, "succeeded"),
              isNotNull(subscriptionPayments.periodEndsAt)
            )
          )
          .orderBy(desc(subscriptionPayments.periodEndsAt))
          .limit(1);
        // No verified payment on record: comped or manually configured, so
        // renewal enforcement does not apply.
        if (!payment?.periodEndsAt) continue;

        const endsAt = payment.periodEndsAt;
        const renewUrl = `${baseUrl}/o/${org.slug}/billing`;
        const planName =
          org.planTier.charAt(0).toUpperCase() + org.planTier.slice(1);

        // 1. Upcoming renewal: remind once inside the reminder window.
        if (
          endsAt > now &&
          endsAt.getTime() - now.getTime() <= REMINDER_DAYS * DAY_MS &&
          !payment.renewalReminderSentAt
        ) {
          const emails = await ownerEmails(org.id);
          for (const to of emails) {
            await sendEmail({
              to,
              subject: `Your Engagd ${planName} plan renews soon`,
              html: `
                <p>Hi,</p>
                <p>The ${planName} plan for <strong>${org.name}</strong> is paid up until <strong>${fmtDate(endsAt)}</strong>.</p>
                <p>Renewals take a minute: pick your plan and pay securely online. If you do nothing, your account moves to the Free plan ${GRACE_DAYS} days after the paid-through date. Live invite links keep working either way.</p>
                <p><a href="${renewUrl}">Renew your plan</a></p>
                <p>The Engagd team</p>
              `,
            });
          }
          await db
            .update(subscriptionPayments)
            .set({ renewalReminderSentAt: now, updatedAt: now })
            .where(eq(subscriptionPayments.id, payment.id));
          await audit({
            organisationId: org.id,
            action: "billing.renewal_reminder_sent",
            entityType: "subscription_payment",
            entityId: payment.id,
            detail: { periodEndsAt: endsAt.toISOString() },
          });
          reminders++;
          continue;
        }

        // 2. Lapsed but inside the grace window: mark past_due, notify once.
        const graceEndsAt = new Date(endsAt.getTime() + GRACE_DAYS * DAY_MS);
        if (endsAt <= now && now < graceEndsAt) {
          if (org.billingStatus !== "past_due") {
            await db
              .update(organisations)
              .set({ billingStatus: "past_due", updatedAt: now })
              .where(eq(organisations.id, org.id));
          }
          if (!payment.lapseNoticeSentAt) {
            const emails = await ownerEmails(org.id);
            for (const to of emails) {
              await sendEmail({
                to,
                subject: `Your Engagd ${planName} plan has lapsed`,
                html: `
                  <p>Hi,</p>
                  <p>The ${planName} plan for <strong>${org.name}</strong> reached its paid-through date on ${fmtDate(endsAt)}.</p>
                  <p>Everything keeps working during a ${GRACE_DAYS} day grace period. Renew by <strong>${fmtDate(graceEndsAt)}</strong> to keep ${planName}; after that your account moves to the Free plan. Live invite links are never broken.</p>
                  <p><a href="${renewUrl}">Renew now</a></p>
                  <p>The Engagd team</p>
                `,
              });
            }
            await db
              .update(subscriptionPayments)
              .set({ lapseNoticeSentAt: now, updatedAt: now })
              .where(eq(subscriptionPayments.id, payment.id));
            await audit({
              organisationId: org.id,
              action: "billing.lapse_notice_sent",
              entityType: "subscription_payment",
              entityId: payment.id,
              detail: {
                periodEndsAt: endsAt.toISOString(),
                graceEndsAt: graceEndsAt.toISOString(),
              },
            });
            lapses++;
          }
          continue;
        }

        // 3. Grace period exhausted: downgrade to Free. Existing active
        // events keep running (caps only gate new activations), so nothing
        // dark-fails mid-event.
        if (now >= graceEndsAt) {
          await db
            .update(organisations)
            .set({
              planTier: "free",
              billingStatus: "active",
              updatedAt: now,
            })
            .where(eq(organisations.id, org.id));
          await audit({
            organisationId: org.id,
            action: "billing.plan_lapsed",
            entityType: "organisation",
            entityId: org.id,
            detail: {
              from: org.planTier,
              to: "free",
              periodEndsAt: endsAt.toISOString(),
              graceEndsAt: graceEndsAt.toISOString(),
            },
          });
          const emails = await ownerEmails(org.id);
          for (const to of emails) {
            await sendEmail({
              to,
              subject: `Your Engagd account is now on the Free plan`,
              html: `
                <p>Hi,</p>
                <p>The ${planName} plan for <strong>${org.name}</strong> was not renewed, so the account has moved to the Free plan. Your events and data are untouched, and anything already live keeps working.</p>
                <p>You can move back to ${planName} at any time and pick up where you left off.</p>
                <p><a href="${renewUrl}">Choose a plan</a></p>
                <p>The Engagd team</p>
              `,
            });
          }
          downgrades++;
        }
      }

      return { orgsChecked: orgs.length, reminders, lapses, downgrades };
    });

    return summary;
  }
);
