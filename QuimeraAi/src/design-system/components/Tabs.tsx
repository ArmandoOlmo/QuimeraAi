import * as React from 'react';
import { cn } from '@/utils';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ value, defaultValue = '', onValueChange, className, children, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectedValue = value ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value],
  );

  return (
    <TabsContext.Provider value={{ value: selectedValue, setValue }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex min-h-10 items-center gap-1 rounded-[var(--q-radius-lg)] border border-border-subtle bg-q-surface-overlay p-1',
        className,
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  { value, className, children, onClick, ...props },
  ref,
) {
  const context = React.useContext(TabsContext);
  const isSelected = context?.value === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-[var(--q-radius-md)] px-3 text-sm font-semibold outline-none transition-all duration-[var(--q-duration-fast)]',
        'focus-visible:ring-2 focus-visible:ring-q-accent/30 disabled:pointer-events-none disabled:opacity-55',
        isSelected
          ? 'bg-q-surface text-q-text shadow-[var(--q-shadow-card)]'
          : 'text-q-text-muted hover:bg-q-surface/70 hover:text-q-text',
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          context?.setValue(value);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
});

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

export function TabsContent({ value, forceMount = false, className, children, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  const isSelected = context?.value === value;

  if (!forceMount && !isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      data-state={isSelected ? 'active' : 'inactive'}
      hidden={!isSelected}
      className={cn('mt-4 outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}
