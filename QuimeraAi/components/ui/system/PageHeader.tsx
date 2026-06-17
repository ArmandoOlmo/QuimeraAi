import * as React from 'react';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  backAction?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  {
    title,
    subtitle,
    eyebrow,
    icon,
    backAction,
    primaryAction,
    secondaryAction,
    children,
    className,
    ...props
  },
  ref,
) {
  const hasActions = Boolean(primaryAction || secondaryAction || children);

  return (
    <header
      ref={ref}
      className={joinClasses(
        'flex flex-col gap-4 border-b border-q-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {backAction && <div className="mb-3">{backAction}</div>}
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-q-border bg-q-surface text-q-accent">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-q-accent">
                {eyebrow}
              </p>
            )}
            <h1 className="text-xl font-semibold leading-tight text-q-text sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-muted">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {hasActions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {secondaryAction}
          {primaryAction}
          {children}
        </div>
      )}
    </header>
  );
});

PageHeader.displayName = 'PageHeader';
