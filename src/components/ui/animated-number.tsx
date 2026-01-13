import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({ value, className, duration = 0.5 }: AnimatedNumberProps) {
  const spring = useSpring(value, { 
    mass: 0.8, 
    stiffness: 75, 
    damping: 15,
    duration: duration * 1000
  });
  
  const display = useTransform(spring, (current) => Math.round(current));
  
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={cn("tabular-nums", className)}>
      <MotionNumber motionValue={display} />
    </motion.span>
  );
}

function MotionNumber({ motionValue }: { motionValue: MotionValue<number> }) {
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = String(latest);
      }
    });
    return unsubscribe;
  }, [motionValue]);
  
  return <span ref={ref} />;
}

// Simpler version for relative to par display
interface AnimatedRelativeProps {
  value: number;
  className?: string;
}

export function AnimatedRelative({ value, className }: AnimatedRelativeProps) {
  const prefix = value > 0 ? '+' : value === 0 ? 'E' : '';
  const displayValue = value === 0 ? '' : Math.abs(value).toString();
  
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("tabular-nums", className)}
    >
      {prefix}{displayValue}
    </motion.span>
  );
}
