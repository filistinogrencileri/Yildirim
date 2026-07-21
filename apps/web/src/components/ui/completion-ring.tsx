'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export function CompletionRing({ value, size = 112 }: { value: number; size?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const r = 52;
  const c = 2 * Math.PI * r;
  const target = c * (1 - value / 100);
  return (
    <svg ref={ref} viewBox="0 0 120 120" style={{ width: size, height: size }} className="-rotate-90">
      <defs>
        <linearGradient id="completionRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#FFC94D" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(31,42,92,0.08)" strokeWidth="9" />
      <motion.circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="url(#completionRingGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: reduced ? target : c }}
        animate={{ strokeDashoffset: inView ? target : c }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
