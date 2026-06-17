import * as React from 'react';

export type StatusBadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'premium'
  | 'muted';

export type StatusBadgeSize = 'sm' | 'md';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  default: 'border-q-border bg-q-surface text-q-text-secondary',
  success: 'border-q-success/30 bg-q-success/15 text-q-success',
  warning: 'border-q-warning/35 bg-q-warning/20 text-q-text',
  danger: 'border-q-error/30 bg-q-error/15 text-q-error',
  info: 'border-q-info/30 bg-q-info/15 text-q-info',
  premium: 'border-q-accent/35 bg-q-accent/20 text-q-text dark:text-q-accent black:text-q-accent',
  muted: 'border-q-border/60 bg-q-surface-overlay/50 text-q-text-muted',
};

const sizeClasses: Record<StatusBadgeSize, string> = {
  sm: 'h-5 px-2 text-[10px]',
  md: 'h-6 px-2.5 text-xs',
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  { variant = 'default', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={joinClasses(
        'inline-flex max-w-full items-center rounded-full border font-semibold leading-none',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';
