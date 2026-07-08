import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailDomains, organisations } from "@/db/schema";
import { PLATFORM_FROM } from "@/lib/email";

// Resolve the from address for organisation-branded sends. When the org has
// a verified custom sending domain, mail goes out as
// "Org Name <events@customdomain>". Otherwise the platform from is used.
// Reply-to handling is separate and unchanged (see orgReplyTo).
export async function orgFrom(organisationId: string): Promise<string> {
  const [row] = await db
    .select({
      domain: emailDomains.domain,
      orgName: organisations.name,
    })
    .from(emailDomains)
    .innerJoin(organisations, eq(organisations.id, emailDomains.organisationId))
    .where(
      and(
        eq(emailDomains.organisationId, organisationId),
        eq(emailDomains.status, "verified")
      )
    )
    .limit(1);
  if (!row) return PLATFORM_FROM;
  // Strip characters that could break the RFC 5322 display name.
  const displayName = row.orgName.replace(/[<>"\r\n]/g, "").trim() || "Events";
  return `${displayName} <events@${row.domain}>`;
}
