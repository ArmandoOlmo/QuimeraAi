import * as React from 'react';

export type AppCardVariant = 'default' | 'muted' | 'elevated' | 'interactive' | 'premium';

export interface AppCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  variant?: AppCardVariant;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const variantClasses: Record<AppCardVariant, string> = {
  default: 'border border-q-border bg-q-surface text-q-text',
  muted: 'border border-q-border/70 bg-q-surface-overlay/55 text-q-text',
  elevated: 'border border-q-border bg-q-surface-elevated text-q-text shadow-md',
  interactive: 'border border-q-border bg-q-surface text-q-text hover:-translate-y-0.5 hover:border-q-accent/45 hover:bg-q-surface-elevated hover:shadow-md',
  premium: 'border border-q-accent/30 bg-q-surface-elevated text-q-text shadow-[0_18px_45px_rgba(var(--q-accent-rgb),0.10)]',
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(function AppCard(
  {
    variant = 'default',
    className,
    children,
    onClick,
    onKeyDown,
    role,
    tabIndex,
    'aria-label': ariaLabel,
    ...props
  },
  ref,
) {
  const isClickable = typeof onClick === 'function';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);

    if (!isClickable || event.defaultPrevented) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <div
      ref={ref}
      role={role ?? (isClickable ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isClickable ? 0 : undefined)}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={joinClasses(
        'rounded-xl p-4 transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-accent/30',
        variantClasses[variant],
        isClickable && 'cursor-pointer select-none',
        isClickable && variant !== 'interactive' && 'hover:-translate-y-0.5 hover:border-q-accent/40 hover:shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

AppCard.displayName = 'AppCard';
