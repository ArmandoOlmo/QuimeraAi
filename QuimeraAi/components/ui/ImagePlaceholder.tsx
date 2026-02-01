/**
 * ImagePlaceholder Component
 * Displays a styled SVG placeholder when an image is pending/failed to generate
 * with an option to trigger image generation
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImageOff, Wand2 } from 'lucide-react';
import { ImageAspectRatio, aspectRatioToCss } from '../../utils/imagePlaceholders';

interface ImagePlaceholderProps {
  /** Aspect ratio for the placeholder container */
  aspectRatio?: ImageAspectRatio;
  /** Callback when user clicks the generate button */
  onGenerateClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the generate button */
  showGenerateButton?: boolean;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ 
  aspectRatio = '16:9', 
  onGenerateClick,
  className = '',
  showGenerateButton = true
}) => {
  const { t } = useTranslation();
  
  return (
    <div 
      className={`relative w-full bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 transition-colors hover:border-gray-500 hover:bg-gray-800/70 ${className}`}
      style={{ aspectRatio: aspectRatioToCss(aspectRatio) }}
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mb-4">
        <ImageOff className="w-8 h-8 text-gray-500" />
      </div>
      
      {/* Title */}
      <p className="text-gray-400 text-sm font-medium text-center mb-1">
        {t('imagePlaceholder.title')}
      </p>
      
      {/* Description */}
      <p className="text-gray-500 text-xs text-center mb-4 max-w-[200px]">
        {t('imagePlaceholder.description')}
      </p>
      
      {/* Generate Button */}
      {showGenerateButton && onGenerateClick && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onGenerateClick();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-medium transition-colors"
        >
          <Wand2 size={16} />
          {t('imagePlaceholder.generateButton')}
        </button>
      )}
    </div>
  );
};

export default ImagePlaceholder;



























