"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** 1-5 star picker (radio group). `value` 0 = nothing chosen yet. */
export function StarRating({ value, onChange, label = "Rating", className }: { value: number; onChange: (n: number) => void; label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="grid size-11 place-items-center rounded-full hover:bg-muted"
          >
            <Star className={cn("size-7 transition-colors", n <= value ? "fill-saffron text-saffron" : "text-line")} />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {WORDS[value] ?? ""}
      </span>
    </div>
  );
}
