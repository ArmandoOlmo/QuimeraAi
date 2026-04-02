
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// --- Editor Control Primitives ---
// Extracted from Controls.tsx for reusability across the editor

export const Input = ({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className={`mb-3 ${className || ''}`}>
    {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
    <input
      {...props}
      className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
    />
  </div>
);

export const TextArea = ({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div className={`mb-3 ${className || ''}`}>
    {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
    <textarea
      {...props}
      className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent resize-y min-h-[80px] transition-all placeholder:text-editor-text-secondary/50"
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
              ? 'bg-editor-accent/15 text-editor-accent'
              : 'text-editor-text-primary hover:bg-editor-bg'
          }`}
        >
          <span className="flex-1 text-xs truncate">{opt.label}</span>
          {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-editor-accent" />}
        </button>
      );
    });

  return (
    <div className={`${noMargin ? '' : 'mb-3'} ${className || ''}`} ref={containerRef}>
      {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-editor-panel-bg border rounded-md px-3 py-2 text-sm text-editor-text-primary transition-all cursor-pointer ${
          isOpen
            ? 'border-editor-accent ring-1 ring-editor-accent'
            : 'border-editor-border hover:border-editor-accent/50'
        }`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-editor-text-secondary flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="relative z-[999]">
          <div className="absolute top-1 left-0 right-0 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl overflow-hidden">
            <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain">
              {groups ? (
                groups.map((group, gi) => (
                  <div key={gi}>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider bg-editor-bg/50 border-b border-editor-border/30 sticky top-0">
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
  <div className={`flex items-center ${label ? 'justify-between mb-3' : ''}`}>
    {label && <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
    >
      <span
        aria-hidden="true"
        className={`${checked ? 'translate-x-[18px]' : 'translate-x-0'} pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);

export const FontSizeSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
    <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
      {['sm', 'md', 'lg', 'xl'].map((size) => (
        <button
          key={size}
          onClick={() => onChange(size)}
          className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
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
      <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
      <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
        {options.map((size) => (
          <button
            key={size}
            onClick={() => onChange(size)}
            className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
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
      <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
      <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
        {options.map((opt) => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
};
