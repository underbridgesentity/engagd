import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailDomains } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import {
  addSendingDomain,
  recheckSendingDomain,
  removeSendingDomain,
} from "./actions";

const ERROR_COPY: Record<string, string> = {
  "domain-locked": "Custom sending domains are not included in your plan.",
  "invalid-domain": "Enter a valid domain like mail.yourcompany.co.za.",
  "already-added": "That domain is already added.",
  "provider-failed": "The email provider could not process that request. Try again in a minute.",
  "not-found": "That domain no longer exists.",
};

const OK_COPY: Record<string, string> = {
  added: "Domain added. Create the DNS records below, then re-check.",
  checked: "Verification status refreshed.",
  removed: "Domain removed. Sends fall back to the platform domain.",
};

const RECORD_BADGE: Record<string, "mint" | "ember" | "coral" | "neutral"> = {
  verified: "mint",
  pending: "ember",
  failed: "coral",
  temporary_failure: "coral",
  not_started: "neutral",
};

const STATUS_BADGE: Record<string, { tone: "mint" | "ember" | "coral"; label: string }> = {
  verified: { tone: "mint", label: "verified" },
  pending: { tone: "ember", label: "pending verification" },
  failed: { tone: "coral", label: "verification failed" },
};

export default async function SendingDomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { orgSlug } = await params;
  const { error, ok } = await searchParams;
  const ctx = await requireOrg(orgSlug, "admin");
  const isOwner = ctx.role === "owner";

  const [ent, domains] = await Promise.all([
    getEntitlements(ctx.organisationId),
    db
      .select()
      .from(emailDomains)
      .where(eq(emailDomains.organisationId, ctx.organisationId))
      .orderBy(asc(emailDomains.createdAt)),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/o/${orgSlug}/settings`} className="text-sm text-fg-dim hover:text-fg">
        Back to settings
      </Link>
      <h1 className="mt-2 font-display text-2xl text-fg">Sending domain</h1>
      <p className="mt-1 text-sm text-fg-dim">
        Send event emails from your own domain instead of the Engagd platform
        domain.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {ERROR_COPY[error] ?? "Something went wrong. Try again."}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="mt-4 rounded-lg border border-mint/40 bg-mint/10 px-3 py-2 text-sm text-mint">
          {OK_COPY[ok] ?? "Done."}
        </p>
      ) : null}

      {!ent.customDomain ? (
        <Card className="mt-6">
          <h2 className="font-display text-lg text-fg">Custom domains are locked</h2>
          <p className="mt-2 text-sm text-fg-dim">
            Custom sending domains are available on Professional and above.
          </p>
          <div className="mt-4">
            {isOwner ? (
              <Link href={`/o/${orgSlug}/billing`} className="text-sm text-signal-strong hover:underline">
                Upgrade your plan
              </Link>
            ) : (
              <p className="text-sm text-fg-faint">Ask an owner to upgrade the plan.</p>
            )}
          </div>
        </Card>
      ) : (
        <>
          {domains.map((d) => {
            const badge = STATUS_BADGE[d.status] ?? STATUS_BADGE.pending;
            return (
              <Card key={d.id} className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <h2 className="truncate font-data text-lg text-fg">{d.domain}</h2>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={recheckSendingDomain.bind(null, orgSlug)}>
                      <input type="hidden" name="id" value={d.id} />
                      <Button type="submit" variant="secondary" className="px-3 py-1.5">
                        Re-check now
                      </Button>
                    </form>
                    <form action={removeSendingDomain.bind(null, orgSlug)}>
                      <input type="hidden" name="id" value={d.id} />
                      <Button type="submit" variant="danger" className="px-3 py-1.5">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>

                {d.status === "verified" ? (
                  <p className="mt-3 rounded-lg border border-mint/30 bg-mint/10 px-3 py-2 text-sm text-mint">
                    Verified. Ticket emails now send from events@{d.domain}.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-fg-dim">
                    Create these DNS records at your domain registrar, then use
                    Re-check now. Verification can take a few minutes after the
                    records propagate.
                  </p>
                )}

                {d.dnsRecords.length > 0 ? (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                    <table className="w-full text-left font-data text-xs">
                      <thead>
                        <tr className="border-b border-line text-fg-faint">
                          <th className="px-3 py-2 font-normal uppercase tracking-wider">Type</th>
                          <th className="px-3 py-2 font-normal uppercase tracking-wider">Name</th>
                          <th className="px-3 py-2 font-normal uppercase tracking-wider">Value</th>
                          <th className="px-3 py-2 font-normal uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {d.dnsRecords.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-fg">{r.type}</td>
                            <td className="max-w-48 select-all break-all px-3 py-2 text-fg">
                              {r.name}
                            </td>
                            <td className="max-w-72 select-all break-all px-3 py-2 text-fg-dim">
                              {r.value}
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={RECORD_BADGE[r.status ?? "not_started"] ?? "neutral"}>
                                {r.status ?? "not started"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {d.lastCheckedAt ? (
                  <p className="mt-3 font-data text-xs text-fg-faint">
                    Last checked{" "}
                    {new Intl.DateTimeFormat("en-ZA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(d.lastCheckedAt)}
                  </p>
                ) : null}
              </Card>
            );
          })}

          {domains.length === 0 ? (
            <Card className="mt-6">
              <h2 className="font-display text-lg text-fg">Add a sending domain</h2>
              <p className="mt-2 text-sm text-fg-dim">
                Use a domain you control, for example mail.yourcompany.co.za.
                We will give you the SPF and DKIM records to create.
              </p>
              <form
                action={addSendingDomain.bind(null, orgSlug)}
                className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    name="domain"
                    required
                    placeholder="mail.yourcompany.co.za"
                    autoComplete="off"
                  />
                </div>
                <Button type="submit">Add domain</Button>
              </form>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
