/**
 * OptimizedImage Component
 * 
 * A performance-optimized image component with:
 * - Native lazy loading
 * - Async decoding
 * - Placeholder support while loading
 * - Proper width/height to prevent layout shift
 * - Priority loading for above-the-fold images
 */

import React, { useState, useCallback, ImgHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'decoding'> {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Image width (required to prevent layout shift) */
  width?: number | string;
  /** Image height (required to prevent layout shift) */
  height?: number | string;
  /** If true, loads image eagerly (for above-the-fold content) */
  priority?: boolean;
  /** Custom placeholder to show while loading */
  placeholder?: React.ReactNode;
  /** Show a blur placeholder while loading */
  showBlurPlaceholder?: boolean;
  /** Callback when image loads successfully */
  onLoadComplete?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Additional CSS classes for the container */
  containerClassName?: string;
}

/**
 * Default blur placeholder SVG (low-quality image placeholder)
 */
const BlurPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <div 
    className={cn(
      "absolute inset-0 bg-gradient-to-br from-muted/50 to-muted animate-pulse",
      className
    )}
    aria-hidden="true"
  />
);

/**
 * OptimizedImage - Performance-optimized image component
 * 
 * @example
 * // Basic usage
 * <OptimizedImage 
 *   src="/image.jpg" 
 *   alt="Description" 
 *   width={400} 
 *   height={300} 
 * />
 * 
 * @example
 * // Priority image (above the fold)
 * <OptimizedImage 
 *   src="/hero.jpg" 
 *   alt="Hero image" 
 *   width={1200} 
 *   height={600}
 *   priority 
 * />
 * 
 * @example
 * // With blur placeholder
 * <OptimizedImage 
 *   src="/photo.jpg" 
 *   alt="Photo" 
 *   width={300} 
 *   height={200}
 *   showBlurPlaceholder 
 * />
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  placeholder,
  showBlurPlaceholder = false,
  onLoadComplete,
  onError: onErrorProp,
  className,
  containerClassName,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleError = useCallback(() => {
    setHasError(true);
    onErrorProp?.();
  }, [onErrorProp]);

  // If there's an error and no fallback, show error state
  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          containerClassName
        )}
        style={{ width, height, ...style }}
        role="img"
        aria-label={alt}
      >
        <svg 
          className="w-8 h-8 opacity-50" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Determine if we need a container for placeholder
  const needsContainer = placeholder || showBlurPlaceholder;

  if (needsContainer) {
    return (
      <div 
        className={cn("relative overflow-hidden", containerClassName)}
        style={{ width, height }}
      >
        {/* Placeholder layer */}
        {!isLoaded && (
          placeholder || (showBlurPlaceholder && <BlurPlaceholder />)
        )}
        
        {/* Actual image */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          style={style}
          {...props}
        />
      </div>
    );
  }

  // Simple image without placeholder
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={handleLoad}
      onError={handleError}
      className={className}
      style={style}
      {...props}
    />
  );
};

export default OptimizedImage;
export { OptimizedImage, BlurPlaceholder };











