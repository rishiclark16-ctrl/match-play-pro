// Animation variants for consistent motion across the app
import { Variants } from 'framer-motion';

// Page transition variants
export const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.2
    }
  }
};

// Stagger children animation
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// Card hover effect
export const cardHover: Variants = {
  rest: { 
    scale: 1,
    y: 0,
    transition: { duration: 0.2 }
  },
  hover: { 
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// Pop in animation for modals/sheets
export const popIn: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    y: 20
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 }
  }
};

// Slide up animation
export const slideUp: Variants = {
  initial: { 
    opacity: 0, 
    y: 40 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// Fade in animation
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Scale spring animation
export const scaleSpring: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200
    }
  },
  exit: { 
    scale: 0.8, 
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

// Winner celebration
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
      damping: 12,
      stiffness: 150,
      delay: 0.1
    }
  }
};

// Pulse animation for active states
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
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
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Button press animation
export const buttonPress = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02 }
};

// List item variants for staggered lists
export const listItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -20 
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  })
};

// Accordion animation
export const accordionVariants: Variants = {
  closed: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.2 }
  },
  open: { 
    height: "auto", 
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

// Number change animation
export const numberChange: Variants = {
  initial: { y: -20, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: { y: 20, opacity: 0, transition: { duration: 0.15 } }
};
