/**
 * Animation Utilities
 * Helper functions and constants for component animations
 */

import { AnimationType } from '../types';

/**
 * Maps animation types to their corresponding CSS classes
 */
export const animationClasses: Record<AnimationType, string> = {
  'none': '',
  'fade-in': 'animate-fade-in',
  'fade-in-up': 'animate-fade-in-up',
  'fade-in-down': 'animate-fade-in-down',
  'slide-up': 'animate-slide-up',
  'slide-down': 'animate-slide-down',
  'scale-in': 'animate-scale-in',
  'bounce-in': 'animate-bounce-in',
};

/**
 * Gets the animation class for a given animation type
 * @param animationType - The type of animation
 * @param enabled - Whether animations are enabled
 * @returns The CSS class string for the animation
 */
export const getAnimationClass = (
  animationType: AnimationType = 'fade-in-up',
  enabled: boolean = true
): string => {
  if (!enabled) return '';
  return animationClasses[animationType];
};

/**
 * Calculates animation delay for staggered animations
 * @param index - The index of the item
 * @param baseDelay - Base delay in seconds (default: 0.2)
 * @returns The delay string in format "Xs"
 */
export const getAnimationDelay = (index: number, baseDelay: number = 0.2): string => {
  return `${(index + 1) * baseDelay}s`;
};



