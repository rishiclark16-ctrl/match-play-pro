import { useEffect, useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Counts up from 0 to `value` once the element enters the viewport.
 * `decimals = 0` rounds; `> 0` uses toFixed.
 */
export function CountUp({
  value, className, prefix = '', suffix = '', decimals = 0,
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const spring = useSpring(0, { mass: 0.8, stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );

  useEffect(() => {
    if (inView) spring.set(value);
  }, [inView, value, spring]);

  useEffect(() => {
    return display.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v}${suffix}`;
    });
  }, [display, prefix, suffix]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}0{suffix}
    </span>
  );
}

/**
 * Animated circular progress ring filling to value/max once in view.
 */
export function RingProgress({
  value, max, size = 120, strokeWidth = 10, color = '#F0EE3A',
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(max, 1), 1);

  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const dashoffset = useTransform(spring, (v) => circumference * (1 - v));

  useEffect(() => {
    if (inView) spring.set(pct);
  }, [inView, pct, spring]);

  return (
    <svg ref={ref} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: dashoffset }}
      />
    </svg>
  );
}

/**
 * Animated horizontal bar that fills to value/max when in view.
 */
export function StatBar({
  value, max, color, delay = 0,
}: {
  value: number;
  max: number;
  color: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;

  return (
    <div ref={ref} className="h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : { width: 0 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
