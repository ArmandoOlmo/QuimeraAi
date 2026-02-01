import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: 'search' | 'website' | 'folder' | 'default';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration = 'default'
}) => {
  // SVG Illustrations
  const illustrations = {
    search: (
      <svg className="w-48 h-48 mx-auto mb-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="40" stroke="currentColor" strokeWidth="4" className="text-yellow-400/30" />
        <path d="M110 110L140 140" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-yellow-400/50" />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-muted-foreground/20" />
      </svg>
    ),
    website: (
      <svg className="w-48 h-48 mx-auto mb-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="50" width="120" height="100" rx="8" stroke="currentColor" strokeWidth="3" className="text-yellow-400/30" />
        <line x1="40" y1="70" x2="160" y2="70" stroke="currentColor" strokeWidth="3" className="text-yellow-400/30" />
        <circle cx="55" cy="60" r="3" fill="currentColor" className="text-yellow-400/50" />
        <circle cx="70" cy="60" r="3" fill="currentColor" className="text-yellow-400/50" />
        <circle cx="85" cy="60" r="3" fill="currentColor" className="text-yellow-400/50" />
        <rect x="60" y="90" width="80" height="8" rx="4" fill="currentColor" className="text-muted-foreground/20" />
        <rect x="60" y="110" width="60" height="6" rx="3" fill="currentColor" className="text-muted-foreground/10" />
        <rect x="60" y="125" width="70" height="6" rx="3" fill="currentColor" className="text-muted-foreground/10" />
      </svg>
    ),
    folder: (
      <svg className="w-48 h-48 mx-auto mb-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 70L70 50H130L150 70V150H50V70Z" stroke="currentColor" strokeWidth="3" className="text-yellow-400/30" />
        <path d="M50 70H150" stroke="currentColor" strokeWidth="3" className="text-yellow-400/30" />
        <circle cx="100" cy="110" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-muted-foreground/20" />
      </svg>
    ),
    default: (
      <svg className="w-48 h-48 mx-auto mb-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="3" className="text-yellow-400/30" />
        <path d="M80 90L90 100L120 70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400/50" />
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" className="text-muted-foreground/10" />
      </svg>
    )
  };

  return (
    <div className="text-center py-20 bg-gradient-to-br from-card/30 to-secondary/20 rounded-3xl border border-dashed border-border/50">
      {/* Illustration */}
      <div className="mb-6">
        {illustrations[illustration]}
      </div>

      {/* Icon Badge */}
      <div className="w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="text-yellow-400" size={32} />
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-foreground mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        {action && (
          <button 
            onClick={action.onClick}
            className="bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            {action.icon && <action.icon size={20} />}
            {action.label}
          </button>
        )}
        
        {secondaryAction && (
          <button 
            onClick={secondaryAction.onClick}
            className="text-yellow-400 font-bold hover:underline py-3 px-6"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;

