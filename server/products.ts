/**
 * Stripe product and price configuration
 * Define subscription tiers and pricing here
 */

export const PRODUCTS = {
  PRO_MONTHLY: {
    name: "Linklytics Pro",
    description: "Unlimited links, advanced analytics, and AI-powered insights",
    priceId: process.env.NODE_ENV === "production" 
      ? "price_live_pro_monthly" // Replace with actual live price ID after Stripe setup
      : "price_test_pro_monthly", // Replace with actual test price ID after Stripe setup
    amount: 900, // $9.00 in cents
    currency: "usd",
    interval: "month",
  },
} as const;

export const SUBSCRIPTION_FEATURES = {
  FREE: {
    maxLinks: 5,
    analytics: true,
    qrCodes: true,
    passwordProtection: true,
    expirationDates: true,
    aiInsights: false,
    apiAccess: false,
  },
  PRO: {
    maxLinks: null, // unlimited
    analytics: true,
    qrCodes: true,
    passwordProtection: true,
    expirationDates: true,
    aiInsights: true,
    apiAccess: true,
  },
} as const;
