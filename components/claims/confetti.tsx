"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const COLORS = ["#088178", "#F2A33A", "#C8553D", "#2F6F8F", "#E0A21B"];

/** One-shot confetti burst (delivery complete only). Renders nothing with reduced motion. */
export function Confetti() {
  const reduce = useReducedMotion();
  const [bits] = useState(() =>
    Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 2.2 + Math.random() * 1.6,
      rot: (Math.random() - 0.5) * 900,
      color: COLORS[i % COLORS.length],
      w: 6 + Math.random() * 6,
    })),
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute top-0 block rounded-[2px]"
          style={{ left: `${b.x}%`, width: b.w, height: b.w * 1.6, background: b.color }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: "105vh", opacity: [1, 1, 0.8], rotate: b.rot }}
          transition={{ duration: b.dur, delay: b.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
