import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/utils"
import {
  cardMotionHover,
  cardMotionStagger,
  cardMotionViewport,
  createCardMotionVariants,
} from "@/utils/cardMotion"

const cardVariants = cva(
  "rounded-[var(--q-radius-xl)] text-q-text transition-all duration-[var(--q-duration-normal)] ease-[var(--q-ease-standard)]",
  {
    variants: {
      variant: {
        default: "bg-q-surface border border-border-subtle shadow-[var(--q-shadow-card)]",
        glass: "bg-q-surface/90 backdrop-blur-sm border border-border-subtle shadow-[var(--q-shadow-card)]",
        elevated: "bg-q-surface-elevated border border-border-subtle shadow-[var(--q-shadow-floating-panel)]",
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] hover:border-q-border",
        glow: "hover:-translate-y-0.5 hover:border-q-accent/45 hover:shadow-[var(--q-shadow-floating-panel)]",
      }
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export interface MotionCardProps
  extends Omit<HTMLMotionProps<"div">, "ref">,
    VariantProps<typeof cardVariants> {
  motionDelay?: number
  motionPreset?: "card" | "none"
  staggerIndex?: number
  viewportMotion?: boolean
  hoverMotion?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, hover, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  (
    {
      className,
      variant,
      hover,
      motionDelay = 0,
      motionPreset = "card",
      staggerIndex = 0,
      viewportMotion = false,
      hoverMotion = false,
      variants,
      initial,
      animate,
      whileInView,
      viewport,
      whileHover,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion()
    const shouldAnimate = motionPreset !== "none" && !shouldReduceMotion
    const delay = motionDelay + staggerIndex * cardMotionStagger
    const animationProps: Partial<HTMLMotionProps<"div">> = shouldAnimate
      ? {
          initial: initial ?? "hidden",
          animate: viewportMotion ? animate : animate ?? "visible",
          whileInView: viewportMotion ? whileInView ?? "visible" : whileInView,
          viewport: viewportMotion ? viewport ?? cardMotionViewport : viewport,
          variants: variants ?? createCardMotionVariants(delay),
          whileHover: whileHover ?? (hoverMotion ? cardMotionHover : undefined),
        }
      : {
          initial: false,
          animate,
          whileInView,
          viewport,
          variants,
          whileHover,
        }

    return (
      <motion.div
        ref={ref}
        className={cn(cardVariants({ variant, hover, className }))}
        {...animationProps}
        {...props}
      />
    )
  }
)
MotionCard.displayName = "MotionCard"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-[var(--q-space-6)]", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-q-text-secondary", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-[var(--q-space-6)] pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-[var(--q-space-6)] pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, MotionCard, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
