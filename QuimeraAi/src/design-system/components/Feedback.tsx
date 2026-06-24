import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from './Button';

export const badgeVariants = cva(
  'inline-flex max-w-full items-center rounded-[var(--q-radius-full)] border font-semibold leading-none',
  {
    variants: {
      variant: {
        default: 'border-border-subtle bg-q-surface text-q-text-secondary',
        success: 'border-q-success/30 bg-q-success/15 text-q-success',
        warning: 'border-q-warning/35 bg-q-warning/20 text-q-text',
        danger: 'border-q-error/30 bg-q-error/15 text-q-error',
        info: 'border-q-info/30 bg-q-info/15 text-q-info',
        primary: 'border-q-accent/35 bg-q-accent/20 text-q-text',
        premium: 'border-q-accent/35 bg-q-accent/20 text-q-text dark:text-q-accent black:text-q-accent',
        muted: 'border-border-subtle bg-q-surface-overlay text-q-text-muted',
      },
      size: {
        sm: 'h-5 px-2 text-[10px]',
        md: 'h-6 px-2.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, size, children, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn(badgeVariants({ variant, size, className }))} {...props}>
      <span className="truncate">{children}</span>
    </span>
  );
});

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const alertVariantClasses: Record<AlertVariant, string> = {
  info: 'border-q-info/25 bg-q-info/10 text-q-text',
  success: 'border-q-success/25 bg-q-success/10 text-q-text',
  warning: 'border-q-warning/30 bg-q-warning/12 text-q-text',
  danger: 'border-q-error/25 bg-q-error/10 text-q-text',
};

const alertIcons: Record<AlertVariant, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  action?: React.ReactNode;
}

export function Alert({ variant = 'info', title, action, children, className, ...props }: AlertProps) {
  const Icon = alertIcons[variant];

  return (
    <div className={cn('flex gap-3 rounded-[var(--q-radius-lg)] border p-4', alertVariantClasses[variant], className)} {...props}>
      <Icon className="mt-0.5 h-[var(--q-icon-md)] w-[var(--q-icon-md)] shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold text-q-text">{title}</div>}
        {children && <div className="mt-1 text-sm text-q-text-secondary">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon = Info, title, description, action, secondaryAction, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn('rounded-[var(--q-radius-xl)] border border-dashed border-border-subtle bg-q-surface px-6 py-12 text-center shadow-[var(--q-shadow-card)]', className)} {...props}>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--q-radius-full)] bg-q-accent/12 text-q-accent">
        <Icon className="h-[var(--q-icon-xl)] w-[var(--q-icon-xl)]" />
      </div>
      <h3 className="text-lg font-semibold text-q-text">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-q-text-muted">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && <Button variant="ghost" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
        </div>
      )}
    </div>
  );
}
