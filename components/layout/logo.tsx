import { cn } from "@/lib/utils";

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary shadow-soft" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 13h18a0 0 0 0 1 0 0 9 9 0 0 1-18 0z" />
          <path d="M8 9c0-2 1.5-2.5 1.5-4.5M13 9c0-2 1.5-2.5 1.5-4.5" stroke="#F2A33A" />
        </svg>
      </span>
      <span className={cn("font-display text-xl font-semibold tracking-tight", light ? "text-white" : "text-deep")}>FoodBridge</span>
    </span>
  );
}
