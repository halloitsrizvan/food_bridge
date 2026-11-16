"use client";

import { formatLeft, URGENCY_COLOR, urgencyOf } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

type Props = {
  expiresAt: string;
  /** Window start (e.g. createdAt). Defaults to a 4h window ending at expiry. */
  startAt?: string;
  size?: number;
  stroke?: number;
  className?: string;
  showLabel?: boolean;
};

const MAX_WINDOW = 6 * 3_600_000;

/** Ring that drains smoothly; colour follows the urgency ramp and pulses under 20 minutes. */
export function CountdownRing({ expiresAt, startAt, size = 56, stroke = 5, className, showLabel = true }: Props) {
  const now = useNow();
  const end = new Date(expiresAt).getTime();
  const total = Math.min(MAX_WINDOW, Math.max(60_000, startAt ? end - new Date(startAt).getTime() : 4 * 3_600_000));
  const left = now ? end - now : total;
  const pct = Math.min(1, Math.max(0, left / total));
  const level = urgencyOf(left);
  const color = URGENCY_COLOR[level];
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const label = now ? formatLeft(left) : "…";
  const short = label.includes("h") ? label.split(" ")[0] : label;

  return (
    <div
      role="timer"
      aria-label={now ? `${label} left` : "Loading time left"}
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full tabular", level === "red" && left > 0 && "pulse-red", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke .6s" }}
        />
      </svg>
      {showLabel && (
        <span className="absolute font-semibold leading-none" style={{ color, fontSize: Math.max(10, size * 0.22) }}>
          {short}
        </span>
      )}
    </div>
  );
}

/** Large variant with caption, used on the claim screen. */
export function BigCountdown({ expiresAt, startAt, caption }: { expiresAt: string; startAt?: string; caption: string }) {
  const now = useNow();
  const left = now ? new Date(expiresAt).getTime() - now : 0;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <CountdownRing expiresAt={expiresAt} startAt={startAt} size={176} stroke={10} showLabel={false} />
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-3xl font-semibold tabular" style={{ color: URGENCY_COLOR[urgencyOf(left)] }}>
            {now ? formatLeft(left) : "…"}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}
