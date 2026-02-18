'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function AnimatedTreeLogo({ size = 80 }: { size?: number }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGrown(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      {/* Trunk */}
      <motion.path
        d="M50 95 L50 55"
        stroke="#5D4E37"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />

      {/* Main branches */}
      <motion.path
        d="M50 55 L30 35"
        stroke="#5D4E37"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />
      <motion.path
        d="M50 55 L70 35"
        stroke="#5D4E37"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      />
      <motion.path
        d="M50 65 L35 50"
        stroke="#5D4E37"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      />
      <motion.path
        d="M50 65 L65 50"
        stroke="#5D4E37"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.85 }}
      />

      {/* Leaves / nodes */}
      {[
        { cx: 30, cy: 35, delay: 0.7, color: '#A8C090' },
        { cx: 70, cy: 35, delay: 0.8, color: '#8B9D77' },
        { cx: 35, cy: 50, delay: 0.9, color: '#A8C090' },
        { cx: 65, cy: 50, delay: 0.95, color: '#C4D4A5' },
        { cx: 50, cy: 55, delay: 0.85, color: '#5D4E37' },
        { cx: 20, cy: 22, delay: 1.1, color: '#C4D4A5' },
        { cx: 40, cy: 22, delay: 1.15, color: '#A8C090' },
        { cx: 60, cy: 22, delay: 1.2, color: '#8B9D77' },
        { cx: 80, cy: 22, delay: 1.25, color: '#C4D4A5' },
      ].map((leaf, i) => (
        <motion.circle
          key={i}
          cx={leaf.cx}
          cy={leaf.cy}
          r="8"
          fill={leaf.color}
          initial={{ scale: 0, opacity: 0 }}
          animate={grown ? { scale: 1, opacity: 1 } : {}}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 15,
            delay: leaf.delay,
          }}
        />
      ))}

      {/* Sub-branches to top leaves */}
      <motion.path
        d="M30 35 L20 22"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.95 }}
      />
      <motion.path
        d="M30 35 L40 22"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.97 }}
      />
      <motion.path
        d="M70 35 L60 22"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 1.0 }}
      />
      <motion.path
        d="M70 35 L80 22"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 1.02 }}
      />

      {/* Root lines */}
      <motion.path
        d="M50 95 L42 100"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
      <motion.path
        d="M50 95 L58 100"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grown ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      />
    </motion.svg>
  );
}
