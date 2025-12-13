
import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  color?: 'green' | 'primary' | 'gray';
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, count, onClick, color = 'primary' }) => {
  const colorClasses = {
    green: active 
      ? 'bg-green-500/20 text-green-500 border-green-500/50' 
      : 'bg-secondary text-muted-foreground border-border hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30',
    primary: active 
      ? 'bg-primary/20 text-primary border-primary/50' 
      : 'bg-secondary text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30',
    gray: active 
      ? 'bg-muted text-foreground border-border' 
      : 'bg-secondary text-muted-foreground border-border hover:bg-muted hover:text-foreground',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1.5 md:px-4 md:py-2 rounded-md md:rounded-lg border transition-all duration-200 
        font-medium text-xs md:text-sm flex items-center gap-1.5 md:gap-2
        ${colorClasses[color]}
        ${active ? 'shadow-sm' : ''}
      `}
    >
      <span>{label}</span>
      <span className={`
        px-1.5 py-0.5 md:px-2 rounded-full text-[10px] md:text-xs font-semibold
        ${active 
          ? 'bg-background/50' 
          : 'bg-muted'
        }
      `}>
        {count}
      </span>
    </button>
  );
};

export default FilterChip;
