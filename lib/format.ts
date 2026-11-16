export const CATEGORY_LABEL = { COOKED: "Cooked food", PACKAGED: "Packaged", RAW: "Raw ingredients" } as const;
export const DIET_LABEL = { VEG: "Veg", NON_VEG: "Non-veg", BOTH: "Veg & non-veg" } as const;
export const MODE_LABEL = { GIVER_DELIVERS: "Will deliver", TAKER_PICKS_UP: "Pickup", EITHER: "Pickup or deliver" } as const;
export const KIND_LABEL: Record<string, string> = {
  RESTAURANT: "Restaurant",
  CATERER: "Caterer",
  HOUSEHOLD: "Household",
  EVENT: "Event host",
  INSTITUTION: "Institution",
  CHARITY: "Charity",
  HOUSE: "Family",
};

/** "1h 40m", "12m", "45s", "expired" */
export function formatLeft(ms: number): string {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function urgencyOf(msLeft: number): "safe" | "amber" | "orange" | "red" {
  const min = msLeft / 60_000;
  if (min < 20) return "red";
  if (min < 60) return "orange";
  if (min < 120) return "amber";
  return "safe";
}

export const URGENCY_COLOR = {
  safe: "var(--urgent-safe)",
  amber: "var(--urgent-amber)",
  orange: "var(--urgent-orange)",
  red: "var(--urgent-red)",
} as const;

/** Value for <input type="datetime-local"> in the user's timezone. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const timeAgo = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
};
