// Single source for site-wide SEO values.
const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;

/** Absolute site origin: NEXT_PUBLIC_APP_URL, else the Vercel production domain, else localhost. */
export const SITE_URL = fromEnv || fromVercel || "http://localhost:3000";
export const SITE_NAME = "FoodBridge";
export const SITE_TITLE = "FoodBridge: surplus food finds a plate";
export const SITE_DESCRIPTION =
  "A government-run network in Kozhikode that matches surplus food from restaurants, caterers and homes with nearby charities, institutions and families before it spoils. Free, safe and verified with a one-time code.";
export const SITE_KEYWORDS = [
  "surplus food",
  "food donation",
  "food waste",
  "Kozhikode",
  "Kerala",
  "donate food",
  "charity food",
  "leftover food",
  "food bank",
  "FoodBridge",
];
