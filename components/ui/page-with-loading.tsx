"use client";

import { useEffect } from "react";
import { PageTransition } from "./page-transition";
import { useRouteLoading } from "@/hooks/use-route-loading";

interface PageWithLoadingProps {
  children: React.ReactNode;
  animation?: "fade" | "slide" | "zoom" | "slideUp" | "slideDown" | "scaleRotate" | "none";
  enableRouteLoading?: boolean;
  loadingDuration?: number;
  customLoadingMessage?: string;
  customLoadingVariant?: "default" | "quiz" | "game" | "minimal";
}

export function PageWithLoading({
  children,
  animation = "fade",
  enableRouteLoading = true, // Enabled by default for dummy loading
  loadingDuration = 600, // Consistent dummy loading duration
  customLoadingMessage,
  customLoadingVariant
}: PageWithLoadingProps) {
  // Always show dummy loading for better UX
  useRouteLoading({
    enabled: enableRouteLoading,
    duration: loadingDuration,
    ...(customLoadingMessage && { 
      messages: { ["/"]: customLoadingMessage } 
    }),
    ...(customLoadingVariant && { 
      variants: { ["/"]: customLoadingVariant } 
    })
  });

  return (
    <PageTransition 
      animation={animation}
      duration={0.3} // Reduced duration for smoother transitions
    >
      {children}
    </PageTransition>
  );
}

// Specialized components for different page types
export function QuizPageWithLoading({ children, ...props }: Omit<PageWithLoadingProps, 'customLoadingVariant'>) {
  return (
    <PageWithLoading 
      {...props}
      customLoadingVariant="quiz"
      animation="slideUp"
    >
      {children}
    </PageWithLoading>
  );
}

export function GamePageWithLoading({ children, ...props }: Omit<PageWithLoadingProps, 'customLoadingVariant'>) {
  return (
    <PageWithLoading 
      {...props}
      customLoadingVariant="game"
      animation="scaleRotate"
    >
      {children}
    </PageWithLoading>
  );
}

export function DashboardPageWithLoading({ children, ...props }: Omit<PageWithLoadingProps, 'customLoadingVariant'>) {
  return (
    <PageWithLoading 
      {...props}
      customLoadingVariant="default"
      animation="fade"
    >
      {children}
    </PageWithLoading>
  );
}
