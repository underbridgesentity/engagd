import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { replyToVerifications } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import {
  addReplyTo,
  removeReplyTo,
  renameOrganisation,
  resendReplyTo,
} from "./actions";

const ERROR_COPY: Record<string, string> = {
  "invalid-name": "Organisation names need 2 to 80 characters.",
  "reply-to-locked": "Reply-to verification is not included in your plan.",
  "invalid-email": "Enter a valid email address.",
  "already-added": "That address is already added. Resend the verification instead.",
  "email-failed": "We could not send the verification email. Try again in a minute.",
  "not-found": "That reply-to address no longer exists.",
};

const OK_COPY: Record<string, string> = {
  renamed: "Organisation renamed.",
  unchanged: "No change needed.",
  "verification-sent": "Verification email sent. Ask the inbox owner to click the link.",
  "already-verified": "That address is already verified.",
  "reply-to-removed": "Reply-to address removed.",
};

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { orgSlug } = await params;
  const { error, ok } = await searchParams;
  const ctx = await requireOrg(orgSlug);
  const canEdit = ctx.role !== "viewer";
  const isOwner = ctx.role === "owner";

  const [ent, replyTos] = await Promise.all([
    getEntitlements(ctx.organisationId),
    db
      .select()
      .from(replyToVerifications)
      .where(eq(replyToVerifications.organisationId, ctx.organisationId))
      .orderBy(asc(replyToVerifications.createdAt)),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl text-fg">Settings</h1>
      <p className="mt-1 text-sm text-fg-dim">
        Organisation details and email configuration.
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

      <Card className="mt-6">
        <h2 className="font-display text-lg text-fg">Organisation name</h2>
        {canEdit ? (
          <form
            action={renameOrganisation.bind(null, orgSlug)}
            className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                defaultValue={ctx.organisation.name}
              />
            </div>
            <Button type="submit" variant="secondary">
              Rename
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-fg-dim">{ctx.organisation.name}</p>
        )}
        <p className="mt-3 font-data text-xs text-fg-faint">
          The URL slug ({ctx.organisation.slug}) stays the same so links keep working.
        </p>
      </Card>

      {ctx.role !== "viewer" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href={`/o/${orgSlug}/settings/payments`} className="block">
            <Card className="h-full transition-colors hover:border-signal/60">
              <h2 className="font-display text-lg text-fg">Payments</h2>
              <p className="mt-2 text-sm text-fg-dim">
                Connect a payment provider to sell tickets. Payouts go straight
                to your account.
              </p>
            </Card>
          </Link>
          <Link href={`/o/${orgSlug}/settings/domain`} className="block">
            <Card className="h-full transition-colors hover:border-signal/60">
              <h2 className="font-display text-lg text-fg">Sending domain</h2>
              <p className="mt-2 text-sm text-fg-dim">
                Send event emails from your own domain with SPF and DKIM.
              </p>
            </Card>
          </Link>
        </div>
      ) : null}

      <Card className="mt-6">
        <h2 className="font-display text-lg text-fg">Reply-to address</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-dim">
          Event emails send from the Engagd platform domain, but replies can go
          to your own inbox once the address is verified.
        </p>

        {!ent.replyToVerification ? (
          <div className="mt-4 rounded-lg border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
            Reply-to verification is available on Starter and above.{" "}
            {isOwner ? (
              <Link
                href={`/o/${orgSlug}/billing`}
                className="text-signal-strong hover:underline"
              >
                Upgrade your plan to use it.
              </Link>
            ) : (
              "Ask an owner to upgrade the plan to use it."
            )}
          </div>
        ) : (
          <>
            {replyTos.length > 0 ? (
              <div className="mt-4 divide-y divide-line rounded-lg border border-line">
                {replyTos.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="truncate font-data text-sm text-fg">
                        {r.email}
                      </span>
                      {r.verifiedAt ? (
                        <Badge tone="mint">verified</Badge>
                      ) : (
                        <Badge tone="ember">pending</Badge>
                      )}
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        {!r.verifiedAt ? (
                          <form action={resendReplyTo.bind(null, orgSlug)}>
                            <input type="hidden" name="id" value={r.id} />
                            <Button type="submit" variant="ghost" className="px-3 py-1.5">
                              Resend
                            </Button>
                          </form>
                        ) : null}
                        <form action={removeReplyTo.bind(null, orgSlug)}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" variant="danger" className="px-3 py-1.5">
                            Remove
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-fg-faint">
                No reply-to address yet. Replies currently go nowhere in
                particular.
              </p>
            )}

            {canEdit ? (
              <form
                action={addReplyTo.bind(null, orgSlug)}
                className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <Label htmlFor="reply-to-email">Add a reply-to email</Label>
                  <Input
                    id="reply-to-email"
                    name="email"
                    type="email"
                    required
                    placeholder="events@yourdomain.co.za"
                  />
                </div>
                <Button type="submit">Send verification</Button>
              </form>
            ) : null}
            <p className="mt-3 font-data text-xs text-fg-faint">
              We email the address a confirmation link. It only becomes active
              once the inbox owner clicks it.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
