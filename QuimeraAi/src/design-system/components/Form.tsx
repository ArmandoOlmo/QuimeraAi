import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';
import ColorControl from '@/components/ui/ColorControl';

type FieldTone = 'default' | 'error';

const fieldBaseClasses = [
  'w-full min-w-0 rounded-[var(--q-radius-md)] border bg-q-surface text-q-text',
  'shadow-[var(--q-shadow-subtle)] outline-none transition-[border-color,box-shadow,background-color]',
  'placeholder:text-q-text-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55',
  'focus-visible:border-q-accent focus-visible:ring-2 focus-visible:ring-q-accent/25',
].join(' ');

const fieldToneClasses: Record<FieldTone, string> = {
  default: 'border-border-subtle',
  error: 'border-q-error focus-visible:ring-q-error/25',
};

interface FieldShellProps {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function FieldShell({ label, helperText, error, required, className, children }: FieldShellProps) {
  if (!label && !helperText && !error) {
    return <>{children}</>;
  }

  return (
    <label className={cn('block space-y-1.5', className)}>
      {label && (
        <span className="block text-[var(--q-font-size-label)] font-semibold leading-none text-q-text-secondary">
          {label}
          {required && <span className="ml-1 text-q-error">*</span>}
        </span>
      )}
      {children}
      {(error || helperText) && (
        <span className={cn('block text-xs leading-5', error ? 'text-q-error' : 'text-q-text-muted')}>
          {error || helperText}
        </span>
      )}
    </label>
  );
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  shellClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, helperText, error, prefix, suffix, required, shellClassName, ...props },
  ref,
) {
  const tone: FieldTone = error ? 'error' : 'default';
  const input = (
    <div className={cn((prefix || suffix) && 'relative flex items-center')}>
      {prefix && <span className="absolute left-3 text-q-text-muted">{prefix}</span>}
      <input
        ref={ref}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          fieldBaseClasses,
          fieldToneClasses[tone],
          'h-10 px-3 py-2 text-sm',
          prefix && 'pl-9',
          suffix && 'pr-9',
          className,
        )}
        {...props}
      />
      {suffix && <span className="absolute right-3 text-q-text-muted">{suffix}</span>}
    </div>
  );

  return (
    <FieldShell label={label} helperText={helperText} error={error} required={required} className={shellClassName}>
      {input}
    </FieldShell>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  shellClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, helperText, error, required, shellClassName, ...props },
  ref,
) {
  const tone: FieldTone = error ? 'error' : 'default';

  return (
    <FieldShell label={label} helperText={helperText} error={error} required={required} className={shellClassName}>
      <textarea
        ref={ref}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          fieldBaseClasses,
          fieldToneClasses[tone],
          'min-h-24 resize-y px-3 py-2 text-sm',
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  options: SelectOption[];
  shellClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, helperText, error, options, required, shellClassName, ...props },
  ref,
) {
  const tone: FieldTone = error ? 'error' : 'default';

  return (
    <FieldShell label={label} helperText={helperText} error={error} required={required} className={shellClassName}>
      <div className="relative">
        <select
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(
            fieldBaseClasses,
            fieldToneClasses[tone],
            'h-10 appearance-none px-3 py-2 pr-9 text-sm',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-[var(--q-icon-sm)] w-[var(--q-icon-sm)] -translate-y-1/2 text-q-text-muted" />
      </div>
    </FieldShell>
  );
});

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onCheckedChange, label, description, className, onClick, ...props },
  ref,
) {
  const control = (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-q-accent/35',
        checked ? 'bg-q-accent' : 'bg-q-surface-overlay',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-q-surface shadow-sm transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );

  if (!label && !description) return control;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-q-text">{label}</div>
        {description && <div className="mt-0.5 text-xs text-q-text-muted">{description}</div>}
      </div>
      {control}
    </div>
  );
});

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label?: React.ReactNode;
  value: number;
  onValueChange: (value: number) => void;
  suffix?: string;
}

export function Slider({ label, value, onValueChange, suffix = '', className, min = 0, max = 100, step = 1, ...props }: SliderProps) {
  return (
    <label className={cn('block space-y-2', className)}>
      {label && (
        <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-q-text-secondary">
          <span>{label}</span>
          <span className="rounded-[var(--q-radius-sm)] bg-q-surface-overlay px-2 py-0.5 text-q-text">
            {value}{suffix}
          </span>
        </span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onValueChange(Number(event.target.value))}
        className="w-full accent-q-accent"
        {...props}
      />
    </label>
  );
}

export interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  paletteColors?: string[];
  compact?: boolean;
  className?: string;
}

export function ColorPickerField({ className, ...props }: ColorPickerFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <ColorControl variant="editor" {...props} />
    </div>
  );
}
