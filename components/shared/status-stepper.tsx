import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  steps: string[];
  /** index of the current step; steps before are done */
  current: number;
  /** terminal failure (expired / cancelled / declined): current step is shown as a stop */
  failed?: string | null;
  className?: string;
};

export function StatusStepper({ steps, current, failed, className }: Props) {
  return (
    <ol className={cn("flex w-full items-center", className)} aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current || (i === current && !failed && i === steps.length - 1);
        const active = i === current && !done;
        const bad = !!failed && i === current;
        return (
          <li key={s} className={cn("flex items-center", i < steps.length - 1 && "flex-1")} aria-current={active ? "step" : undefined}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-xs font-semibold ring-2 transition-colors",
                  done && "bg-primary text-primary-foreground ring-primary",
                  active && "bg-surface text-primary ring-primary",
                  bad && "bg-clay text-white ring-clay",
                  !done && !active && !bad && "bg-muted text-muted-foreground ring-line",
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : bad ? "!" : i + 1}
              </span>
              <span className={cn("text-[11px] font-medium", bad ? "text-clay" : active || done ? "text-foreground" : "text-muted-foreground")}>
                {bad ? failed : s}
              </span>
            </div>
            {i < steps.length - 1 && <span className={cn("mx-1 mb-5 h-0.5 flex-1 rounded", i < current ? "bg-primary" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

export const OFFER_STEPS = ["Open", "Contacted", "Settled", "Delivered"];
export const offerStep = (status: string) => ({ OPEN: 0, CONTACTED: 1, SETTLED: 2, DELIVERED: 3 })[status] ?? 0;
export const NEED_STEPS = ["Open", "Contacted", "Settled", "Fulfilled"];
export const needStep = (status: string) => ({ OPEN: 0, CONTACTED: 1, SETTLED: 2, FULFILLED: 3 })[status] ?? 0;
