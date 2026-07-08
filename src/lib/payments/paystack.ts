import type {
  AdapterCredentials,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentAdapter,
  VerifyResult,
} from "./types";

const API = "https://api.paystack.co";

// Paystack adapter for split/marketplace cases via subaccounts. Not the
// default rail: Yoco bring-your-own-keys is. Secret key handling matches
// the Yoco adapter: decrypted server-side at call time only.
export class PaystackAdapter implements PaymentAdapter {
  constructor(private creds: AdapterCredentials) {
    if (!creds.secretKey) {
      throw new Error("Paystack secret key is not configured");
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.creds.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const email = input.metadata?.email;
    if (!email) throw new Error("Paystack requires the payer's email");
    const res = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        email,
        amount: input.amountCents,
        currency: input.currency,
        callback_url: input.successUrl,
        metadata: { ...input.metadata, paymentId: input.paymentId },
        ...(this.creds.subaccountCode
          ? { subaccount: this.creds.subaccountCode }
          : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Paystack initialize failed (${res.status})`);
    }
    const body = (await res.json()) as {
      data: { reference: string; authorization_url: string };
    };
    return {
      providerReference: body.data.reference,
      redirectUrl: body.data.authorization_url,
    };
  }

  async verifyPayment(providerReference: string): Promise<VerifyResult> {
    const res = await fetch(
      `${API}/transaction/verify/${encodeURIComponent(providerReference)}`,
      { headers: this.headers() }
    );
    if (!res.ok) {
      return { paid: false, amountCents: null, raw: { status: res.status } };
    }
    const body = (await res.json()) as {
      data?: { status?: string; amount?: number };
    };
    const paid = body.data?.status === "success";
    return { paid, amountCents: body.data?.amount ?? null, raw: body };
  }
}
