import type { Config } from "../logic/config";
import type { RagDoc } from "./types";

const doc = (id: string, label: string, keywords: string, text: string, href?: string): RagDoc => ({ id, kind: "knowledge", label, keywords, text, href });

/**
 * The website's own knowledge: how the platform works, its rules, and the numbers behind them.
 * Numbers come from the live config (set by the government console), never hard-coded.
 */
export function knowledgeDocs(cfg: Config): RagDoc[] {
  const p = cfg.points;
  return [
    doc(
      "about",
      "About FoodBridge",
      "what is foodbridge about purpose government network",
      "FoodBridge is a government-run network in Kozhikode that matches surplus food from restaurants, caterers, homes and event halls with the nearest safe, reachable charity, institution or family, before the food spoils. It is free for givers and receivers. Every handover is verified with a one-time code and a shareable certificate.",
      "/",
    ),
    doc(
      "roles",
      "Who can use FoodBridge",
      "roles giver taker receiver government admin account types sign up",
      "There are three kinds of account. Givers (restaurants, caterers, households, event hosts) post surplus food. Receivers, also called takers (charities, institutions, families), request food and post needs. Government administrators oversee impact, users, complaints and settings. Anyone can browse the public feed, but contacting a giver or posting needs a login.",
      "/signup",
    ),
    doc(
      "free",
      "Is it free?",
      "free cost fee price charge",
      "Yes. FoodBridge is run by the government and has no fees for givers or receivers.",
      "/#faq",
    ),
    doc(
      "post-food",
      "How to post surplus food (givers)",
      "post food donate give share surplus giver create offer",
      `A giver logs in, opens Post food, and enters the title, category (cooked, packaged or raw), veg or non-veg, number of meals, when it was cooked, and how long it can be collected. FoodBridge then works out how long it stays safe. The post appears in the live feed with a countdown and the nearest suitable receivers are alerted. A giver can also offer food directly against a receiver's open request. Posting needs a completed profile with a location.`,
      "/dashboard/post",
    ),
    doc(
      "request-food",
      "How to request food (receivers)",
      "request claim receive need food taker charity family how",
      `A receiver logs in, browses the feed or the Nearby map and contacts a giver about a post, which sends a claim. Receivers can also post a need (meals needed, diet, when) so givers can offer food to them. The giver then accepts or declines the claim. A reservation is held for ${cfg.holdMinutes} minutes, after which the food opens to others.`,
      "/dashboard/nearby",
    ),
    doc(
      "matching",
      "How matching works",
      "match matching nearest alert ranked distance trust radius escalate",
      `FoodBridge only alerts receivers who can reach the food before it spoils. A match counts only if travel time (about ${cfg.speedKmh} km/h) plus a ${cfg.bufferMin}-minute handover buffer fits inside the remaining safe window. Receivers are ranked by distance, remaining time, quantity, diet fit, trust and fairness (those who received less recently rank higher). The search radius starts at ${cfg.radiusSteps[0]} km and widens to ${cfg.radiusSteps[1]} km and then ${cfg.radiusSteps[2]} km as the window runs down. Unmatched food close to expiry raises a government alert.`,
      "/#how",
    ),
    doc(
      "safety-hours",
      "Food safety windows",
      "safe safety hours spoil expire cooked raw packaged how long",
      `Cooked food is treated as safe for ${cfg.safeHours.COOKED} hours from cooking and raw ingredients for ${cfg.safeHours.RAW} hours. Packaged food is safe until its printed expiry. A giver may choose a longer window, up to ${cfg.safeHoursMax.COOKED} hours for cooked and ${cfg.safeHoursMax.RAW} hours for raw. Receivers are alerted only if they can arrive in time with a safety buffer. Always discard food that smells unusual, was stored badly or looks unsafe.`,
      "/#faq",
    ),
    doc(
      "handover-otp",
      "Handover with a one-time code (OTP)",
      "handover otp code complete pickup verify confirm collect",
      "After the giver accepts a claim, both sides get the handover details and a 6-digit OTP is generated. The giver shows the code and the receiver enters it at pickup or delivery to complete the donation. A verification QR belongs to the finished donation certificate; it is not used to post food or to do the handover. Points follow once it is completed.",
      "/dashboard/claims",
    ),
    doc(
      "delivery",
      "Who delivers or collects",
      "deliver delivery pickup collect mode transport who",
      "Only the two parties themselves handle the food. A post is marked Will deliver (the giver brings it), Pickup (the receiver collects) or Pickup or deliver (either). FoodBridge has no delivery staff.",
      "/#faq",
    ),
    doc(
      "address-privacy",
      "Who sees my address?",
      "address privacy location contact phone private who sees",
      "Nobody sees your exact address until both sides have accepted. Before that, only your area (locality) and an approximate map position are shown. Contact details are shared only after a claim is accepted.",
      "/#faq",
    ),
    doc(
      "no-show",
      "What if someone does not show up?",
      "no show missed reservation expire hold complaint",
      `A reservation lasts ${cfg.holdMinutes} minutes. After that the food is open to others. You can also file a complaint, and repeated complaints suspend an account for review.`,
      "/#faq",
    ),
    doc(
      "points",
      "Points and rewards",
      "points reward score earn leaderboard certificate tier",
      `Givers earn ${p.base} points per completed handover plus 1 point per meal (up to ${p.mealCap}), and ${p.fastBonus} bonus points when the handover happens within ${p.fastWithinMin} minutes of acceptance. Receivers who confirm a handover earn ${p.takerConfirm} points. A good review adds a small bonus. The top givers appear on the leaderboard, and each completed donation gets a downloadable certificate with a verification QR code.`,
      "/dashboard",
    ),
    doc(
      "trust-complaints",
      "Trust, complaints and suspension",
      "trust score rating review complaint suspend suspension appeal report problem",
      `After a handover both sides can rate each other, which feeds a trust score used in matching. A complaint has a weight; when complaints within ${cfg.suspension.windowDays} days reach a weight of ${cfg.suspension.weightThreshold}, the account is suspended for review. A suspended account can still browse but cannot post, claim or review. The owner can submit an appeal, which a government administrator approves or rejects.`,
      "/dashboard",
    ),
    doc(
      "needs",
      "Posting a need (receivers)",
      "need request post need receiver ask food meals taker",
      "Receivers can post a need: a title, number of meals, diet, delivery mode and when it is needed by. Needs appear in the public feed under Food + requests, and givers can offer food to a receiver directly, which sends a private offer and a notification.",
      "/dashboard/needs/new",
    ),
    doc(
      "browse",
      "Browsing food and searching",
      "browse search filter feed explore categories veg non-veg nearest soonest",
      "The landing page shows live posts with countdowns. You can search by food name, filter by area, veg or non-veg, time left (under 1, 2 or 4 hours) and type (cooked, packaged, raw), and sort by nearest, soonest expiring or newest. Use my location shows the nearest food first.",
      "/#live",
    ),
    doc(
      "gov-console",
      "Government console",
      "government admin console overview users complaints config map export pdf",
      "Government administrators have an overview of live impact (meals delivered, kg saved, CO2 avoided, active posts, average minutes to match), a live map of posts and needs, user management with suspend and reinstate, complaint and appeal queues, a configuration page for the safety and points rules, and an Export as PDF report of the platform data.",
      "/gov",
    ),
    doc(
      "impact-method",
      "How impact is measured",
      "impact kg co2 meals saved measured calculate carbon",
      `Impact counts completed handovers. Each meal is estimated at ${cfg.impact.kgPerMeal} kg of food and each kg avoids about ${cfg.impact.co2PerKg} kg of CO2.`,
      "/",
    ),
    doc(
      "profile-settings",
      "Profile, language and appearance settings",
      "profile settings theme dark light font text size language malayalam hindi english appearance accessibility motion",
      "Every account has a Profile & settings page. It shows your details (and lets you edit your name and phone) and lets you change the language (English, Malayalam, Hindi), theme (light, dark or automatic), text font, text size and reduced motion. These choices are saved on your own device.",
      "/dashboard/profile",
    ),
    doc(
      "pwa-offline",
      "Install the app and use it offline",
      "install app pwa offline home screen phone no internet",
      "FoodBridge is an installable web app. Use your browser's Install app or Add to Home Screen option, or the Install button on the Profile page. Pages and data you have already opened are saved and still work offline; actions such as posting, claiming or chatting need a connection. Logging out clears the saved data.",
      "/dashboard/profile",
    ),
    doc(
      "ai-assistant",
      "The AI assistant",
      "assistant chatbot ai chat help language",
      "The chat assistant answers questions about how FoodBridge works and about what is currently listed, and replies in English, Malayalam or Hindi to match the selected language. It cannot post food or make claims for you and never needs your password or OTP.",
    ),
  ];
}
