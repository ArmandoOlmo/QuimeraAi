import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/utils";

export interface SearchInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "className" | "onChange" | "type" | "value"
  > {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      clearLabel = "Clear search",
      clearable = false,
      onChange,
      onClear,
      placeholder,
      value,
      ...props
    },
    ref,
  ) => {
    const showClear = clearable && value.length > 0;

    const handleClear = () => {
      onChange("");
      onClear?.();
    };

    return (
      <div
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-foreground transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
          className,
        )}
      >
        <Search className="size-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        {showClear ? (
          <button
            type="button"
            onClick={handleClear}
            className="flex size-6 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            aria-label={clearLabel}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
