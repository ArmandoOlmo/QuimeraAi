import React from 'react';
import { CornerGradientConfig, CornerGradientPosition } from '../../types/components';

interface CornerGradientProps {
  config?: CornerGradientConfig;
}

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  // Handle shorthand hex
  let normalizedHex = hex;
  if (hex.length === 4) {
    normalizedHex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  
  const r = parseInt(normalizedHex.slice(1, 3), 16);
  const g = parseInt(normalizedHex.slice(3, 5), 16);
  const b = parseInt(normalizedHex.slice(5, 7), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(79, 70, 229, ${alpha})`; // Fallback to default purple
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Get gradient direction based on corner position
const getGradientDirection = (position: CornerGradientPosition): string => {
  switch (position) {
    case 'top-left':
      return 'to bottom right';
    case 'top-right':
      return 'to bottom left';
    case 'bottom-left':
      return 'to top right';
    case 'bottom-right':
      return 'to top left';
    default:
      return 'to bottom right';
  }
};

/**
 * CornerGradient - Renders a diagonal gradient overlay from a corner
 * 
 * Usage:
 * ```tsx
 * <section className="relative">
 *   <CornerGradient config={data.cornerGradient} />
 *   <div className="relative z-10">...content...</div>
 * </section>
 * ```
 */
const CornerGradient: React.FC<CornerGradientProps> = ({ config }) => {
  // If no config or not enabled, render nothing
  if (!config?.enabled) return null;

  const {
    position = 'top-left',
    color = '#4f46e5',
    opacity = 30,
    size = 50,
  } = config;

  // Skip if position is 'none'
  if (position === 'none') return null;

  const direction = getGradientDirection(position);
  const gradientColor = hexToRgba(color, opacity / 100);

  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: `linear-gradient(${direction}, ${gradientColor} 0%, transparent ${size}%)`,
    zIndex: 0,
  };

  return <div style={style} aria-hidden="true" />;
};

export default CornerGradient;

/**
 * Helper hook to get corner gradient styles as inline CSS
 * Use this if you prefer not to add an extra DOM element
 */
export const useCornerGradientStyle = (config?: CornerGradientConfig): React.CSSProperties | undefined => {
  if (!config?.enabled || config.position === 'none') return undefined;

  const {
    position = 'top-left',
    color = '#4f46e5',
    opacity = 30,
    size = 50,
  } = config;

  const direction = getGradientDirection(position);
  const gradientColor = hexToRgba(color, opacity / 100);

  return {
    backgroundImage: `linear-gradient(${direction}, ${gradientColor} 0%, transparent ${size}%)`,
  };
};

