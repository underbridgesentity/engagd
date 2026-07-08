import { Resend } from "resend";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { replyToVerifications } from "@/db/schema";

const globalForResend = globalThis as unknown as { resend?: Resend };
export const resend =
  globalForResend.resend ?? new Resend(process.env.RESEND_API_KEY);
if (process.env.NODE_ENV !== "production") globalForResend.resend = resend;

export const PLATFORM_FROM =
  process.env.EMAIL_FROM ?? "Engagd <events@mail.engagd.co.za>";

// Resolve the reply-to for an organisation: a verified reply-to address if
// one exists, otherwise none. Sending always goes from the authenticated
// platform domain until a custom domain is verified (Phase 2).
export async function orgReplyTo(
  organisationId: string
): Promise<string | undefined> {
  const [row] = await db
    .select({ email: replyToVerifications.email })
    .from(replyToVerifications)
    .where(
      and(
        eq(replyToVerifications.organisationId, organisationId),
        isNotNull(replyToVerifications.verifiedAt)
      )
    )
    .limit(1);
  return row?.email;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;
}) {
  const { data, error } = await resend.emails.send({
    from: opts.from ?? PLATFORM_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data;
}
