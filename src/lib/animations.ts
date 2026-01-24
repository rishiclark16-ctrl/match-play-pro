// Animation variants for consistent motion across the app
// "Precision Tech" aesthetic - tight, responsive, professional
import { Variants } from 'framer-motion';

// Page transition variants - snappier
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.99
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1] // Custom ease for premium feel
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15
    }
  }
};

// Stagger children animation - faster stagger
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.32, 0.72, 0, 1]
    }
  }
};

// Card hover effect - subtle, professional
export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: { duration: 0.15 }
  },
  hover: {
    scale: 1.015,
    y: -2,
    transition: { duration: 0.15 }
  },
  tap: {
    scale: 0.985,
    transition: { duration: 0.08 }
  }
};

// Pop in animation for modals/sheets - tighter spring
export const popIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.92,
    y: 16
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 28,
      stiffness: 400
    }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.12 }
  }
};

// Slide up animation - faster
export const slideUp: Variants = {
  initial: {
    opacity: 0,
    y: 24
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.32, 0.72, 0, 1]
    }
  }
};

// Fade in animation - quick
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

// Scale spring animation - snappy
export const scaleSpring: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 350
    }
  },
  exit: {
    scale: 0.85,
    opacity: 0,
    transition: { duration: 0.1 }
  }
};

// Winner celebration - slightly tighter
export const winnerCelebration: Variants = {
  initial: {
    scale: 0,
    rotate: -180,
    opacity: 0
  },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 14,
      stiffness: 180,
      delay: 0.08
    }
  }
};

// Pulse animation for active states
export const pulse = {
  animate: {
    scale: [1, 1.04, 1],
    opacity: [1, 0.85, 1],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Shimmer loading effect
export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Button press animation - instant feedback
export const buttonPress = {
  tap: { scale: 0.975 },
  hover: { scale: 1.015 }
};

// List item variants for staggered lists - faster
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -12
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1]
    }
  })
};

// Accordion animation - snappy
export const accordionVariants: Variants = {
  closed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.15 }
  },
  open: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.2 }
  }
};

// Number change animation - instant
export const numberChange: Variants = {
  initial: { y: -16, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 28 }
  },
  exit: { y: 16, opacity: 0, transition: { duration: 0.1 } }
};

// Score celebration animation for birdies/eagles
export const scoreCelebration: Variants = {
  initial: { scale: 1 },
  celebrate: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.4,
      ease: [0.32, 0.72, 0, 1]
    }
  }
};

// Quick tap feedback
export const quickTap: Variants = {
  tap: {
    scale: 0.97,
    transition: { duration: 0.05 }
  }
};
