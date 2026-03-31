import { motion } from 'framer-motion';

export function SwingAnimation() {
  // A simple looping stick-figure golf swing using SVG paths
  // The golfer does: address → backswing → downswing → follow-through → address
  // Using Framer Motion keyframes on the club/arms path

  return (
    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        {/* Body - static */}
        {/* Head */}
        <circle cx="18" cy="7" r="3" fill="white" opacity="0.9"/>
        {/* Torso */}
        <line x1="18" y1="10" x2="18" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
        {/* Legs */}
        <line x1="18" y1="22" x2="14" y2="30" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
        <line x1="18" y1="22" x2="22" y2="30" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>

        {/* Animated arms + club - the swing arc */}
        <motion.g
          style={{ transformOrigin: '18px 14px' }}
          animate={{ rotate: [-40, 50, -40] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
            times: [0, 0.45, 1],
          }}
        >
          {/* Arms */}
          <line x1="18" y1="14" x2="26" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
          {/* Club shaft */}
          <line x1="26" y1="18" x2="32" y2="26" stroke="#F0EE3A" strokeWidth="1.4" strokeLinecap="round"/>
          {/* Club head */}
          <circle cx="32" cy="27" r="1.5" fill="#F0EE3A"/>
        </motion.g>
      </svg>
    </div>
  );
}
