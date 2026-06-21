
import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
  color?: 'green' | 'primary' | 'gray';
  icon?: React.ReactNode;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, count, onClick, color = 'primary', icon }) => {
  const colorClasses = {
    green: active
      ? 'bg-q-success/12 text-q-success border-q-success/40'
      : 'bg-q-surface text-q-text-muted border-border-subtle hover:bg-q-surface-overlay hover:text-q-success hover:border-q-success/25',
    primary: active
      ? 'bg-q-accent/14 text-q-accent border-q-accent/40'
      : 'bg-q-surface text-q-text-muted border-border-subtle hover:bg-q-surface-overlay hover:text-q-accent hover:border-q-accent/30',
    gray: active
      ? 'bg-q-surface-overlay text-foreground border-border-subtle'
      : 'bg-q-surface text-q-text-muted border-border-subtle hover:bg-q-surface-overlay hover:text-foreground',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1.5 md:px-4 md:py-2 rounded-[var(--q-radius-md)] border transition-all duration-200
        font-medium text-xs md:text-sm flex items-center gap-1.5 md:gap-2
        ${colorClasses[color]}
        ${active ? 'shadow-sm' : ''}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
      <span className={`
        px-1.5 py-0.5 md:px-2 rounded-full text-[10px] md:text-xs font-semibold
        ${active
          ? 'bg-q-bg/50'
          : 'bg-muted'
        }
      `}>
        {count}
      </span>
      )}
    </button>
  );
};

export default FilterChip;
