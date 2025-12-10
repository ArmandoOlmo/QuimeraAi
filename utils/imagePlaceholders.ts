/**
 * Image Placeholders Utility
 * Helpers for detecting pending images and determining aspect ratios
 */

export type ImageAspectRatio = 'auto' | '1:1' | '16:9' | '4:3' | '3:4';

/**
 * Checks if an image URL is pending (empty or undefined)
 */
export const isPendingImage = (url: string | undefined | null): boolean => {
  return !url || url === '' || url.trim() === '';
};

/**
 * Determines the appropriate aspect ratio based on the image path
 * @param path - The dot notation path to the image (e.g., 'hero.imageUrl', 'team.items.0.imageUrl')
 */
export const getAspectRatioForPath = (path: string): ImageAspectRatio => {
  // Avatars are always square
  if (path.includes('avatar')) return '1:1';
  
  // Team photos are portrait orientation
  if (path.includes('team')) return '3:4';
  
  // Hero and slideshow are widescreen
  if (path.includes('hero') || path.includes('slideshow')) return '16:9';
  
  // Features, portfolio, and menu are standard landscape
  if (path.includes('features') || path.includes('portfolio') || path.includes('menu')) return '4:3';
  
  // Default to standard landscape
  return '4:3';
};

/**
 * Gets the section name from an image path
 * @param path - The dot notation path to the image
 */
export const getSectionFromPath = (path: string): string => {
  const section = path.split('.')[0];
  return section.charAt(0).toUpperCase() + section.slice(1);
};

/**
 * Converts aspect ratio string to CSS-compatible value
 * @param ratio - Aspect ratio in format 'W:H'
 */
export const aspectRatioToCss = (ratio: ImageAspectRatio): string => {
  return ratio.replace(':', '/');
};
















