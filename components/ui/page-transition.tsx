import { motion } from "framer-motion";
import { ReactNode } from "react";

// Tipe animasi yang tersedia
export type AnimationType = "fade" | "slide" | "zoom" | "none";

interface PageTransitionProps {
  children: ReactNode;
  animation?: AnimationType;
  duration?: number;
}

const animations = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
  },
  zoom: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

export function PageTransition({
  children,
  animation = "fade",
  duration = 0.3,
}: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={animations[animation]}
      transition={{
        duration,
        ease: "easeInOut",
      }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
} 