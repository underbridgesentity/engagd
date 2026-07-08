export interface CreateCheckoutInput {
  // Amount in cents, ZAR.
  amountCents: number;
  currency: string;
  // Our internal payment id, echoed back by the provider for reconciliation.
  paymentId: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutResult {
  // Provider-side checkout reference, stored as payments.providerReference.
  providerReference: string;
  // Where to send the attendee to pay.
  redirectUrl: string;
}

export interface VerifyResult {
  // True only when the provider API confirms the payment succeeded.
  // The success redirect is never trusted as proof.
  paid: boolean;
  amountCents: number | null;
  raw: unknown;
}

// Every provider implements this. Adapters receive decrypted credentials
// at call time and never persist them anywhere.
export interface PaymentAdapter {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyPayment(providerReference: string): Promise<VerifyResult>;
}

export interface AdapterCredentials {
  publicKey?: string | null;
  secretKey?: string | null;
  subaccountCode?: string | null;
}
