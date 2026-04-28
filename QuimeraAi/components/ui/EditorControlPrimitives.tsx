
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, CircleDot, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight } from 'lucide-react';

// --- Editor Control Primitives ---
// Extracted from Controls.tsx for reusability across the editor

export const Input = ({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className={`mb-4 ${className || ''}`}>
    {label && <label className="block text-[11px] font-semibold text-q-text-secondary mb-1.5 uppercase tracking-wider">{label}</label>}
    <input
      {...props}
      className="w-full bg-q-bg/80 border border-q-border/80 rounded-md px-3 py-2.5 text-sm text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent/25 focus:border-q-accent/70 transition-all placeholder:text-q-text-secondary/50"
    />
  </div>
);

export const TextArea = ({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div className={`mb-4 ${className || ''}`}>
    {label && <label className="block text-[11px] font-semibold text-q-text-secondary mb-1.5 uppercase tracking-wider">{label}</label>}
    <textarea
      {...props}
      className="w-full bg-q-bg/80 border border-q-border/80 rounded-md px-3 py-2.5 text-sm text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent/25 focus:border-q-accent/70 resize-y min-h-[88px] transition-all placeholder:text-q-text-secondary/50"
    />
  </div>
);

export interface SelectGroup {
  label: string;
  options: { value: string; label: string }[];
}

export const Select = ({ label, options, groups, value, onChange, className, noMargin }: { label?: string, options?: { value: string, label: string }[], groups?: SelectGroup[], value: string, onChange: (value: string) => void, className?: string, noMargin?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build flat options list for lookup
  const allOptions = groups
    ? groups.flatMap(g => g.options)
    : (options || []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Auto-scroll to selected option
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        const selectedEl = listRef.current?.querySelector('[data-selected="true"]');
        if (selectedEl) selectedEl.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
    }
  }, [isOpen]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setIsOpen(false);
  }, [onChange]);

  const selectedOption = allOptions.find(opt => opt.value === value);

  const renderOptions = (opts: { value: string; label: string }[]) =>
    opts.map(opt => {
      const isSelected = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          data-selected={isSelected}
          onClick={() => handleSelect(opt.value)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
            isSelected
              ? 'bg-q-accent/15 text-q-accent'
              : 'text-q-text hover:bg-q-bg'
          }`}
        >
          <span className="flex-1 text-xs truncate">{opt.label}</span>
          {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-q-accent" />}
        </button>
      );
    });

  return (
    <div className={`${noMargin ? '' : 'mb-3'} ${className || ''}`} ref={containerRef}>
      {label && <label className="block text-[11px] font-semibold text-q-text-secondary mb-1.5 uppercase tracking-wider">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-q-bg/80 border rounded-md px-3 py-2.5 text-sm text-q-text transition-all cursor-pointer ${
          isOpen
            ? 'border-q-accent/70 ring-2 ring-q-accent/20'
            : 'border-q-border/80 hover:border-q-accent/50'
        }`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-q-text-secondary flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="relative z-[999]">
          <div className="absolute top-1 left-0 right-0 bg-q-surface border border-q-border rounded-lg shadow-xl overflow-hidden">
            <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain">
              {groups ? (
                groups.map((group, gi) => (
                  <div key={gi}>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-q-text-secondary uppercase tracking-wider bg-q-bg/50 border-b border-q-border/30 sticky top-0">
                      {group.label}
                    </div>
                    {renderOptions(group.options)}
                  </div>
                ))
              ) : (
                renderOptions(options || [])
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ToggleControl = ({ label, checked, onChange }: { label?: string, checked: boolean, onChange: (checked: boolean) => void }) => (
  <div className={`flex items-center ${label ? 'justify-between gap-4 rounded-md py-2.5 mb-1' : ''}`}>
    {label && <label className="text-[11px] font-semibold text-q-text-secondary uppercase tracking-wider leading-4">{label}</label>}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      className={`${checked ? 'bg-q-accent' : 'bg-q-surface-overlay/80'} quimera-editor-switch relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-q-accent/40 focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
    >
      <span
        aria-hidden="true"
        className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);

export const FontSizeSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>
    <div className="flex bg-q-surface rounded-md border border-q-border p-1">
      {['sm', 'md', 'lg', 'xl'].map((size) => (
        <button
          key={size}
          onClick={() => onChange(size)}
          className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'}`}
        >
          {size.toUpperCase()}
        </button>
      ))}
    </div>
  </div>
);

export const PaddingSelector = ({ label, value, onChange, showNone = false, showXl = false }: { label: string, value: string, onChange: (val: string) => void, showNone?: boolean, showXl?: boolean }) => {
  const options = [
    ...(showNone ? ['none'] : []),
    'sm', 'md', 'lg',
    ...(showXl ? ['xl'] : []),
  ];
  return (
    <div className="mb-3">
      <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>
      <div className="flex bg-q-surface rounded-md border border-q-border p-1">
        {options.map((size) => (
          <button
            key={size}
            onClick={() => onChange(size)}
            className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'}`}
          >
            {size === 'none' ? '0' : size.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export const BorderRadiusSelector = ({ label, value, onChange, extended = false }: { label: string, value: string, onChange: (val: string) => void, extended?: boolean }) => {
  const options = extended
    ? [{ v: 'none', l: '0' }, { v: 'sm', l: 'SM' }, { v: 'md', l: 'MD' }, { v: 'lg', l: 'LG' }, { v: 'xl', l: 'XL' }, { v: '2xl', l: '2XL' }, { v: 'full', l: 'Full' }]
    : [{ v: 'none', l: 'None' }, { v: 'md', l: 'Med' }, { v: 'xl', l: 'Lg' }, { v: 'full', l: 'Full' }];
  return (
    <div className="mb-3">
      <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>
      <div className="flex bg-q-surface rounded-md border border-q-border p-1">
        {options.map((opt) => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'}`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * SliderControl — reusable range slider primitive for editor controls.
 *
 * Renders a label row with value badge and a styled range input.
 * Replaces duplicated `<input type="range" />` blocks across section controls.
 */
export const SliderControl = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
  formatValue,
  className,
}: {
  /** Label shown above the slider */
  label?: string;
  /** Current numeric value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Unit displayed after the value (e.g. 'px', '%', 's', '°', 'vh') */
  suffix?: string;
  /** Custom value formatter — overrides default `value + suffix` display */
  formatValue?: (value: number) => string;
  className?: string;
}) => {
  const displayValue = formatValue ? formatValue(value) : `${value}${suffix}`;

  return (
    <div className={className || ''}>
      {label && (
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">
          {label}: {displayValue}
        </label>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-editor-accent"
      />
    </div>
  );
};

export const PositionGridControl = ({ label, value, onChange }: { label?: string, value: string, onChange: (val: string) => void }) => {
  return (
    <div className="mt-3 pt-3 border-t border-q-border/30">
      {label && (
        <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider block mb-2">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-1 bg-q-bg p-1.5 rounded-md border border-q-border w-fit mx-auto">
        {[
          { id: 'top left', icon: ArrowUpLeft },
          { id: 'top center', icon: ArrowUp },
          { id: 'top right', icon: ArrowUpRight },
          { id: 'center left', icon: ArrowLeft },
          { id: 'center center', icon: CircleDot },
          { id: 'center right', icon: ArrowRight },
          { id: 'bottom left', icon: ArrowDownLeft },
          { id: 'bottom center', icon: ArrowDown },
          { id: 'bottom right', icon: ArrowDownRight },
        ].map((pos) => {
          const Icon = pos.icon;
          return (
            <button
              key={pos.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(pos.id);
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all ${
                (value || 'center center') === pos.id
                  ? 'bg-q-accent text-q-bg shadow-md scale-110'
                  : 'text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text'
              }`}
              title={pos.id}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
