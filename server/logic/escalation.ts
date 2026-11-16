import type { Config } from "./config";

/** Radius grows 3 -> 6 km at 50% of the window, -> 10 km at 75%, while no claim is active. */
export function radiusFor(fraction: number, cfg: Pick<Config, "radiusSteps" | "escalateAt">): number {
  if (fraction >= cfg.escalateAt[1]) return cfg.radiusSteps[2];
  if (fraction >= cfg.escalateAt[0]) return cfg.radiusSteps[1];
  return cfg.radiusSteps[0];
}

export const levelFor = (fraction: number, cfg: Pick<Config, "escalateAt">): 0 | 1 | 2 =>
  fraction >= cfg.escalateAt[1] ? 2 : fraction >= cfg.escalateAt[0] ? 1 : 0;

export const needsGovAlert = (fraction: number, alreadyAlerted: boolean, cfg: Pick<Config, "govAlertAt">) =>
  !alreadyAlerted && fraction >= cfg.govAlertAt;

/** Urgency ramp used by the UI: >2h green, 1-2h amber, <1h orange, <20m red. */
export function urgency(minLeft: number): "safe" | "amber" | "orange" | "red" {
  if (minLeft < 20) return "red";
  if (minLeft < 60) return "orange";
  if (minLeft < 120) return "amber";
  return "safe";
}
