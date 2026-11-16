"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/** Animated number for impact counters. Skips animation with prefers-reduced-motion. */
export function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.4, ease: "easeOut", onUpdate: (v) => setShown(v) });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return <span className={className}>{shown.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
