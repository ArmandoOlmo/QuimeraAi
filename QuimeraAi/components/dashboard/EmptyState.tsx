import React from 'react';
import { LucideIcon } from 'lucide-react';
import { AppButton } from '../ui/system';

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
        <circle cx="80" cy="80" r="40" stroke="currentColor" strokeWidth="4" className="text-q-accent/25" />
        <path d="M110 110L140 140" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-q-accent/45" />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-q-text-muted/20" />
      </svg>
    ),
    website: (
      <svg className="w-48 h-48 mx-auto mb-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="50" width="120" height="100" rx="8" stroke="currentColor" strokeWidth="3" className="text-q-accent/25" />
        <line x1="40" y1="70" x2="160" y2="70" stroke="currentColor" strokeWidth="3" className="text-q-accent/25" />
        <circle cx="55" cy="60" r="3" fill="currentColor" className="text-q-accent/45" />
        <circle cx="70" cy="60" r="3" fill="currentColor" className="text-q-accent/45" />
        <circle cx="85" cy="60" r="3" fill="currentColor" className="text-q-accent/45" />
        <rect x="60" y="90" width="80" height="8" rx="4" fill="currentColor" className="text-q-text-muted/20" />
        <rect x="60" y="110" width="60" height="6" rx="3" fill="currentColor" className="text-q-text-muted/10" />
        <rect x="60" y="125" width="70" height="6" rx="3" fill="currentColor" className="text-q-text-muted/10" />
      </svg>
    ),
    folder: (
      <svg className="w-48 h-48 mx-auto mb-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 70L70 50H130L150 70V150H50V70Z" stroke="currentColor" strokeWidth="3" className="text-q-accent/25" />
        <path d="M50 70H150" stroke="currentColor" strokeWidth="3" className="text-q-accent/25" />
        <circle cx="100" cy="110" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-q-text-muted/20" />
      </svg>
    ),
    default: (
      <svg className="w-48 h-48 mx-auto mb-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="3" className="text-q-accent/25" />
        <path d="M80 90L90 100L120 70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-q-accent/45" />
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" className="text-q-text-muted/10" />
      </svg>
    )
  };

  return (
    <div className="text-center py-20 bg-q-surface rounded-[var(--radius-card)] border border-dashed border-border-subtle shadow-[var(--shadow-card)]">
      {/* Illustration */}
      <div className="mb-6">
        {illustrations[illustration]}
      </div>

      {/* Icon Badge */}
      <div className="w-16 h-16 bg-q-accent/12 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="text-q-accent" size={24} />
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-foreground mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-q-text-muted mb-8 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        {action && (
          <AppButton
            onClick={action.onClick}
            size="lg"
            leftIcon={action.icon ? <action.icon size={20} /> : undefined}
          >
            {action.label}
          </AppButton>
        )}

        {secondaryAction && (
          <AppButton
            onClick={secondaryAction.onClick}
            variant="ghost"
            size="lg"
          >
            {secondaryAction.label}
          </AppButton>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
