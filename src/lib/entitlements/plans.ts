import type { PlanConfig, PlanTier } from "./types";

// Single source of truth for plan entitlements. Every gate in the app reads
// from this config via getEntitlements. Tune numbers here, never in feature code.
export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    entitlements: {
      maxActiveEvents: 1,
      maxAttendeesPerEvent: 100,
      teamSeats: 1,
      customDomain: false,
      paidTicketing: false,
      customBranding: false,
      analytics: "basic",
      replyToVerification: false,
    },
  },
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyPriceCents: 29900,
    annualPriceCents: 299000,
    entitlements: {
      maxActiveEvents: 2,
      maxAttendeesPerEvent: 500,
      teamSeats: 2,
      customDomain: false,
      paidTicketing: false,
      customBranding: true,
      analytics: "basic",
      replyToVerification: true,
    },
  },
  professional: {
    tier: "professional",
    name: "Professional",
    monthlyPriceCents: 89900,
    annualPriceCents: 899000,
    entitlements: {
      maxActiveEvents: 10,
      maxAttendeesPerEvent: 2000,
      teamSeats: 5,
      customDomain: true,
      paidTicketing: true,
      customBranding: true,
      analytics: "full",
      replyToVerification: true,
    },
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPriceCents: null,
    annualPriceCents: null,
    entitlements: {
      maxActiveEvents: null,
      maxAttendeesPerEvent: null,
      teamSeats: null,
      customDomain: true,
      paidTicketing: true,
      customBranding: true,
      analytics: "full",
      replyToVerification: true,
    },
  },
};
