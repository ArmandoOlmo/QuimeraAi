import React from 'react';
import FilterChip from '../FilterChip';

export interface FilterChipOption<T extends string = string> {
    id: T;
    label: string;
    count?: number;
    color?: 'green' | 'primary' | 'gray';
    icon?: React.ReactNode;
}

interface FilterChipRowProps<T extends string> {
    options: readonly FilterChipOption<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}

function FilterChipRow<T extends string>({
    options,
    value,
    onChange,
    className = '',
}: FilterChipRowProps<T>) {
    return (
        <div className={`flex flex-wrap items-center gap-2 md:gap-3 ${className}`}>
            {options.map((option) => (
                <FilterChip
                    key={option.id}
                    label={option.label}
                    active={value === option.id}
                    count={option.count}
                    onClick={() => onChange(option.id)}
                    color={option.color}
                    icon={option.icon}
                />
            ))}
        </div>
    );
}

export default FilterChipRow;
