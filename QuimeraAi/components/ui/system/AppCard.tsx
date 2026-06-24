import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils';
import {
  cardMotionHover,
  cardMotionStagger,
  cardMotionViewport,
  createCardMotionVariants,
} from '../../../utils/cardMotion';

export type AppCardVariant = 'default' | 'muted' | 'elevated' | 'interactive' | 'premium';

export interface AppCardProps extends Omit<HTMLMotionProps<'div'>, 'onClick'> {
  variant?: AppCardVariant;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  motionDelay?: number;
  motionPreset?: 'card' | 'none';
  staggerIndex?: number;
  viewportMotion?: boolean;
  hoverMotion?: boolean;
}

const variantClasses: Record<AppCardVariant, string> = {
  default: 'border border-border-subtle bg-q-surface text-q-text shadow-[var(--q-shadow-card)]',
  muted: 'border border-border-subtle bg-q-surface-overlay text-q-text',
  elevated: 'border border-border-subtle bg-q-surface-elevated text-q-text shadow-[var(--q-shadow-floating-panel)]',
  interactive: 'border border-border-subtle bg-q-surface text-q-text hover:-translate-y-0.5 hover:border-q-border hover:bg-q-surface-elevated hover:shadow-[var(--shadow-card-hover)]',
  premium: 'border border-q-accent/35 bg-q-surface-elevated text-q-text shadow-[var(--q-shadow-floating-panel)]',
};

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(function AppCard(
  {
    variant = 'default',
    className,
    children,
    onClick,
    onKeyDown,
    role,
    tabIndex,
    'aria-label': ariaLabel,
    motionDelay = 0,
    motionPreset = 'card',
    staggerIndex = 0,
    viewportMotion = false,
    hoverMotion,
    ...props
  },
  ref,
) {
  const isClickable = typeof onClick === 'function';
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = motionPreset !== 'none' && !shouldReduceMotion;
  const delay = motionDelay + staggerIndex * cardMotionStagger;
  const resolvedHoverMotion = hoverMotion ?? (variant === 'interactive' || isClickable);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);

    if (!isClickable || event.defaultPrevented) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={shouldAnimate ? 'hidden' : false}
      animate={shouldAnimate && !viewportMotion ? 'visible' : undefined}
      whileInView={shouldAnimate && viewportMotion ? 'visible' : undefined}
      viewport={shouldAnimate && viewportMotion ? cardMotionViewport : undefined}
      variants={shouldAnimate ? createCardMotionVariants(delay) : undefined}
      whileHover={shouldAnimate && resolvedHoverMotion ? cardMotionHover : undefined}
      role={role ?? (isClickable ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isClickable ? 0 : undefined)}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-[var(--q-radius-xl)] p-[var(--q-space-5)] transition-all duration-[var(--q-duration-normal)] ease-[var(--q-ease-standard)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-accent/30',
        variantClasses[variant],
        isClickable && 'cursor-pointer select-none',
        isClickable && variant !== 'interactive' && 'hover:-translate-y-0.5 hover:border-q-border hover:shadow-[var(--shadow-card-hover)]',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});

AppCard.displayName = 'AppCard';
