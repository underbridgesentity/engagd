export type AnalyticsLevel = "basic" | "full";

export interface Entitlements {
  // null means unlimited.
  maxActiveEvents: number | null;
  maxAttendeesPerEvent: number | null;
  teamSeats: number | null;
  customDomain: boolean;
  paidTicketing: boolean;
  customBranding: boolean;
  analytics: AnalyticsLevel;
  replyToVerification: boolean;
}

export type PlanTier = "free" | "starter" | "professional" | "enterprise";

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  // Prices in cents ZAR. null means "Contact us".
  monthlyPriceCents: number | null;
  // Annual: pay for 10 months, get 12.
  annualPriceCents: number | null;
  entitlements: Entitlements;
}
