
import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  color?: 'green' | 'blue' | 'gray';
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, count, onClick, color = 'blue' }) => {
  const colorClasses = {
    green: active 
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500' 
      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20',
    blue: active 
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-500' 
      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    gray: active 
      ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-400 dark:border-gray-500' 
      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1.5 md:px-4 md:py-2 rounded-md md:rounded-lg border-2 transition-all duration-200 
        font-medium text-xs md:text-sm flex items-center gap-1.5 md:gap-2
        ${colorClasses[color]}
        ${active ? 'shadow-sm' : ''}
      `}
    >
      <span>{label}</span>
      <span className={`
        px-1.5 py-0.5 md:px-2 rounded-full text-[10px] md:text-xs font-semibold
        ${active 
          ? 'bg-white/30 dark:bg-black/20' 
          : 'bg-gray-200 dark:bg-gray-700'
        }
      `}>
        {count}
      </span>
    </button>
  );
};

export default FilterChip;
