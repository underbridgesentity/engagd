import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { paymentProviderConfigs } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { YocoAdapter } from "./yoco";
import { PaystackAdapter } from "./paystack";
import type { PaymentAdapter } from "./types";

export type { PaymentAdapter, VerifyResult } from "./types";

// Resolve the payment adapter for an event: an event-specific config wins,
// otherwise the organisation default. Secrets are decrypted here, used for
// the duration of the call, and never returned to callers or the client.
export async function adapterForEvent(
  organisationId: string,
  eventId: string
): Promise<PaymentAdapter> {
  const configs = await db
    .select()
    .from(paymentProviderConfigs)
    .where(
      and(
        eq(paymentProviderConfigs.organisationId, organisationId),
        or(
          eq(paymentProviderConfigs.eventId, eventId),
          isNull(paymentProviderConfigs.eventId)
        )
      )
    );
  const config =
    configs.find((c) => c.eventId === eventId) ??
    configs.find((c) => c.eventId === null);
  if (!config) throw new Error("No payment provider is configured");

  const secretKey = config.encryptedSecret
    ? decryptSecret(config.encryptedSecret)
    : null;

  switch (config.provider) {
    case "yoco":
      return new YocoAdapter({ publicKey: config.publicKey, secretKey });
    case "paystack":
      return new PaystackAdapter({
        publicKey: config.publicKey,
        secretKey,
        subaccountCode: config.subaccountCode,
      });
    default:
      throw new Error(`Unknown payment provider: ${config.provider}`);
  }
}
