import { Variants } from "framer-motion";

// A staggered container whose children animate with a small delay between siblings.
export const stagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
      when: "beforeChildren",
    },
  },
};

export const itemUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 24 },
  },
};

export const itemFade: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

// Apple-style scale-up on hover for cards.
export const cardHover = {
  whileHover: { scale: 1.02, y: -4 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 400, damping: 26 },
};

// Tactile press feedback for buttons.
export const tap = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 600, damping: 22 },
};