import { cn } from "@/lib/utils";

/** Half-circle gauge, 0..100. */
export function TrustGauge({ score, size = 120, className }: { score: number; size?: number; className?: string }) {
  const r = 46;
  const c = Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = score >= 80 ? "var(--urgent-safe)" : score >= 60 ? "var(--urgent-amber)" : score >= 40 ? "var(--urgent-orange)" : "var(--urgent-red)";
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size * 0.62 }} role="img" aria-label={`Trust score ${score} out of 100`}>
      <svg viewBox="0 0 120 70" width={size} height={size * 0.62} aria-hidden>
        <path d="M14 62 A46 46 0 0 1 106 62" fill="none" stroke="var(--line)" strokeWidth="10" strokeLinecap="round" />
        <path d="M14 62 A46 46 0 0 1 106 62" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="font-display text-2xl font-semibold tabular">{score}</span>
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Trust</span>
      </div>
    </div>
  );
}
