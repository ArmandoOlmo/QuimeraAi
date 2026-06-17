import * as React from 'react';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'premium'
  | 'icon';

export type AppButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md';

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses: Record<AppButtonVariant, string> = {
  primary: 'bg-q-accent text-q-text-on-accent shadow-sm shadow-q-accent/20 hover:opacity-90 focus-visible:ring-q-accent/35',
  secondary: 'border border-q-border bg-q-surface text-q-text hover:bg-q-surface-elevated focus-visible:ring-q-accent/25',
  ghost: 'bg-transparent text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text focus-visible:ring-q-accent/25',
  outline: 'border border-q-border bg-transparent text-q-text hover:bg-q-surface-overlay focus-visible:ring-q-accent/25',
  danger: 'bg-q-error text-white shadow-sm shadow-q-error/20 hover:opacity-90 focus-visible:ring-q-error/30',
  premium: 'bg-gradient-to-r from-q-accent-tertiary via-q-accent to-q-accent-tertiary text-white shadow-lg shadow-q-accent/20 hover:brightness-110 focus-visible:ring-q-accent/35',
  icon: 'bg-transparent text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text focus-visible:ring-q-accent/25',
};

const sizeClasses: Record<AppButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  'icon-sm': 'h-8 w-8 p-0',
  'icon-md': 'h-9 w-9 p-0',
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  {
    variant = 'primary',
    size = variant === 'icon' ? 'icon-md' : 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const shouldUseIconSizing = variant === 'icon' || size === 'icon-sm' || size === 'icon-md';

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading ? 'true' : undefined}
      className={joinClasses(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold outline-none transition-all duration-150 ease-out',
        'focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98]',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:h-4 [&_svg:not([class*="size-"])]:w-4',
        variantClasses[variant],
        sizeClasses[size],
        shouldUseIconSizing && 'aspect-square',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </button>
  );
});

AppButton.displayName = 'AppButton';
