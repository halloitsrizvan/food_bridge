// All user-facing copy lives here so a Malayalam (ml) file can be dropped in next to it.
export const en = {
  brand: "FoodBridge",
  tagline: "Government verified",
  landing: {
    headline: "Good food should find a plate, not a bin.",
    sub: "A government-run network that matches surplus food from restaurants, caterers and homes with the nearest safe, reachable charity, institution or family, before it spoils.",
    ctaGive: "I have surplus food",
    ctaNeed: "I need food",
    liveTitle: "Live near you",
    liveSub: "Fresh posts, ticking down. Claim before the clock runs out.",
    how: "How it works",
    trust: "Trust, tiers and recognition",
    impact: "Impact so far",
    faq: "Questions",
  },
  counters: { meals: "meals saved", kg: "kg of food", co2: "kg CO₂ avoided", active: "live posts" },
  gate: { loginToClaim: "Log in to contact this giver", loginToPost: "Log in to share food" },
  states: { error: "We could not load this. Check your connection and try again.", retry: "Try again" },
} as const;

export const t = en;
