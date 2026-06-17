import * as React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'placeholder' | 'autoFocus' | 'className'
  > {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    placeholder,
    className,
    autoFocus,
    clearable = false,
    onClear,
    'aria-label': ariaLabel,
    ...props
  },
  ref,
) {
  const showClear = clearable && value.length > 0;

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div
      className={joinClasses(
        'relative flex h-10 w-full items-center rounded-lg border border-q-border bg-q-surface text-q-text shadow-sm transition-colors',
        'focus-within:border-q-accent/70 focus-within:ring-2 focus-within:ring-q-accent/20',
        className,
      )}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-q-text-muted"
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder ?? 'Search'}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-q-text outline-none placeholder:text-q-text-muted"
        {...props}
      />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-q-text-muted transition-colors hover:bg-q-surface-overlay hover:text-q-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-accent/30"
          aria-label="Clear search"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
