import * as React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(function SectionHeader(
  {
    title,
    subtitle,
    icon,
    action,
    collapsible = false,
    isCollapsed = false,
    onToggle,
    className,
    ...props
  },
  ref,
) {
  const titleContent = (
    <>
      {icon && (
        <span className="mt-0.5 flex shrink-0 items-center justify-center text-q-text-muted [&_svg]:h-[var(--icon-md)] [&_svg]:w-[var(--icon-md)]">
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold text-q-text sm:text-lg">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-sm leading-5 text-q-text-muted">
            {subtitle}
          </span>
        )}
      </span>
      {collapsible && (
        <ChevronDown
          aria-hidden="true"
          className={joinClasses(
            'h-4 w-4 shrink-0 text-q-text-muted transition-transform duration-200',
            isCollapsed && '-rotate-90',
          )}
        />
      )}
    </>
  );

  return (
    <div
      ref={ref}
      className={joinClasses('flex items-start justify-between gap-3', className)}
      {...props}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          disabled={!onToggle}
          aria-expanded={!isCollapsed}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left outline-none transition-colors hover:text-q-text focus-visible:ring-2 focus-visible:ring-q-accent/30 disabled:pointer-events-none disabled:opacity-70"
        >
          {titleContent}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-2">{titleContent}</div>
      )}

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});

SectionHeader.displayName = 'SectionHeader';
