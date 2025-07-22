"use client";

import React, { useState } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { CheckCircle } from "lucide-react";

export const AnswerTooltip = ({
  correctAnswer,
}: {
  correctAnswer: string | null;
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-15, 15]),
    springConfig,
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-20, 20]),
    springConfig,
  );
  
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    x.set(event.clientX - rect.left - halfWidth);
  };

  if (!correctAnswer) return null;

  return (
    <div 
      className="relative mt-2 bg-green-50 p-2.5 rounded-lg border border-green-100 cursor-default hover:bg-green-100 transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <AnimatePresence mode="wait">
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 10,
              },
            }}
            exit={{ opacity: 0, y: 20, scale: 0.6 }}
            style={{
              translateX: translateX,
              rotate: rotate,
            }}
            className="absolute -top-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-md bg-black px-4 py-3 text-xs shadow-xl max-w-[280px] w-max"
          >
            <div className="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            <div className="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
            <div className="flex items-center text-xs text-emerald-400 mb-1">
              <CheckCircle className="w-3 h-3 mr-1" />
              Jawaban Benar:
            </div>
            <div className="relative z-30 text-sm font-medium text-white text-center break-words">
              {correctAnswer}
            </div>
            <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <p className="text-xs text-gray-500 mb-1 flex items-center">
        <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
        Jawaban Benar:
      </p>
      <p className="text-sm text-green-800 font-medium line-clamp-2">{correctAnswer}</p>
    </div>
  );
}; 