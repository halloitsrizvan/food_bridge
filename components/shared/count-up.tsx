"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/** Animated number for impact counters. Writes straight to the DOM (no per-frame renders); skipped with prefers-reduced-motion. */
export function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(0, value, { duration: 1.4, ease: "easeOut", onUpdate: (v) => (el.textContent = fmt(v)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce, decimals]);

  return (
    <span ref={ref} className={className}>
      {fmt(value)}
    </span>
  );
}
