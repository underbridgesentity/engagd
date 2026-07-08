import type {
  AdapterCredentials,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentAdapter,
  VerifyResult,
} from "./types";

const API = "https://payments.yoco.com/api";

// Bring-your-own-keys Yoco adapter. The organiser's secret key is decrypted
// server-side just before these calls and never leaves the server.
export class YocoAdapter implements PaymentAdapter {
  constructor(private creds: AdapterCredentials) {
    if (!creds.secretKey) throw new Error("Yoco secret key is not configured");
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.creds.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (input.amountCents < 200) {
      throw new Error("Yoco requires a minimum transaction of R2");
    }
    const res = await fetch(`${API}/checkouts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        amount: input.amountCents,
        currency: input.currency,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        failureUrl: input.failureUrl,
        metadata: { ...input.metadata, paymentId: input.paymentId },
      }),
    });
    if (!res.ok) {
      throw new Error(`Yoco checkout creation failed (${res.status})`);
    }
    const data = (await res.json()) as { id: string; redirectUrl: string };
    return { providerReference: data.id, redirectUrl: data.redirectUrl };
  }

  async verifyPayment(providerReference: string): Promise<VerifyResult> {
    const res = await fetch(`${API}/checkouts/${providerReference}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      return { paid: false, amountCents: null, raw: { status: res.status } };
    }
    const data = (await res.json()) as {
      status?: string;
      amount?: number;
      paymentId?: string | null;
    };
    // A checkout is paid only when the provider says so.
    const paid = data.status === "completed" && Boolean(data.paymentId);
    return { paid, amountCents: data.amount ?? null, raw: data };
  }
}
