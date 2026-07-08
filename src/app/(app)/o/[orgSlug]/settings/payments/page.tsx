import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { paymentProviderConfigs } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { removePaymentConfig, savePaymentConfig } from "./actions";

const ERROR_COPY: Record<string, string> = {
  "paid-locked": "Paid ticketing is not included in your plan.",
  "invalid-keys":
    "Check the keys: the public key starts with pk_live_ or pk_test_ and the secret key with sk_live_ or sk_test_.",
  "not-configured": "There is no payment configuration to remove.",
};

const OK_COPY: Record<string, string> = {
  saved: "Payment provider saved. Secret keys are stored encrypted.",
  removed: "Payment configuration removed.",
};

export default async function PaymentSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { orgSlug } = await params;
  const { error, ok } = await searchParams;
  // Owner and admin only. Viewers are bounced by the role gate.
  const ctx = await requireOrg(orgSlug, "admin");
  const isOwner = ctx.role === "owner";

  const [ent, [config]] = await Promise.all([
    getEntitlements(ctx.organisationId),
    db
      .select({
        id: paymentProviderConfigs.id,
        provider: paymentProviderConfigs.provider,
        publicKey: paymentProviderConfigs.publicKey,
        hasSecret: paymentProviderConfigs.encryptedSecret,
        updatedAt: paymentProviderConfigs.updatedAt,
      })
      .from(paymentProviderConfigs)
      .where(
        and(
          eq(paymentProviderConfigs.organisationId, ctx.organisationId),
          isNull(paymentProviderConfigs.eventId)
        )
      )
      .limit(1),
  ]);

  const configured = Boolean(config?.hasSecret);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/o/${orgSlug}/settings`} className="text-sm text-fg-dim hover:text-fg">
        Back to settings
      </Link>
      <h1 className="mt-2 font-display text-2xl text-fg">Payments</h1>
      <p className="mt-1 text-sm text-fg-dim">
        Connect your own payment provider to sell tickets. Payouts go directly
        to your provider account.
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

      {!ent.paidTicketing ? (
        <Card className="mt-6">
          <h2 className="font-display text-lg text-fg">Paid ticketing is locked</h2>
          <p className="mt-2 text-sm text-fg-dim">
            Selling tickets is available on Professional and above.
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
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-fg">Payment provider</h2>
            {configured ? (
              <Badge tone="mint">Configured</Badge>
            ) : (
              <Badge tone="ember">Not configured</Badge>
            )}
          </div>

          {configured ? (
            <div className="mt-4 rounded-lg border border-line bg-ink-2 px-4 py-3">
              <p className="text-sm text-fg">
                Yoco is connected.
                {config?.publicKey ? (
                  <span className="ml-2 font-data text-xs text-fg-dim">
                    {config.publicKey}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 font-data text-xs text-fg-faint">
                The secret key is stored encrypted and is never shown again.
                Save new keys below to replace it.
              </p>
            </div>
          ) : null}

          <form
            action={savePaymentConfig.bind(null, orgSlug)}
            className="mt-5 space-y-4"
          >
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select id="provider" name="provider" defaultValue="yoco">
                <option value="yoco">Yoco</option>
                <option value="paystack" disabled>
                  Paystack (coming soon)
                </option>
              </Select>
            </div>
            <div>
              <Label htmlFor="publicKey">Yoco public key</Label>
              <Input
                id="publicKey"
                name="publicKey"
                required
                placeholder="pk_live_..."
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="secretKey">Yoco secret key</Label>
              <Input
                id="secretKey"
                name="secretKey"
                type="password"
                required
                placeholder="sk_live_..."
                autoComplete="off"
              />
              <p className="mt-1.5 font-data text-xs text-fg-faint">
                Encrypted before it is stored. Only used server-side to create
                and verify checkouts.
              </p>
            </div>
            <Button type="submit">
              {configured ? "Replace keys" : "Save configuration"}
            </Button>
          </form>

          {configured ? (
            <form
              action={removePaymentConfig.bind(null, orgSlug)}
              className="mt-5 border-t border-line pt-5"
            >
              <Button type="submit" variant="danger">
                Remove payment configuration
              </Button>
              <p className="mt-2 font-data text-xs text-fg-faint">
                Removing the configuration stops new paid checkouts. Existing
                payments are unaffected.
              </p>
            </form>
          ) : null}
        </Card>
      )}
    </div>
  );
}
