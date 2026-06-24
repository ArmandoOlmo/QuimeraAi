import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { cn } from '@/utils';
import { Button, IconButton } from './Button';
import { Tooltip, TooltipContent, TooltipTrigger } from './Overlay';

export const cardVariants = cva(
  'rounded-[var(--q-radius-xl)] text-q-text transition-all duration-[var(--q-duration-normal)] ease-[var(--q-ease-standard)]',
  {
    variants: {
      variant: {
        default: 'border border-border-subtle bg-q-surface shadow-[var(--q-shadow-card)]',
        elevated: 'border border-border-subtle bg-q-surface-elevated shadow-[var(--q-shadow-floating-panel)]',
        interactive: 'border border-border-subtle bg-q-surface shadow-[var(--q-shadow-card)] hover:-translate-y-0.5 hover:border-q-border hover:shadow-[var(--shadow-card-hover)]',
        selected: 'border border-q-accent/55 bg-q-accent/10 shadow-[var(--q-shadow-card)]',
        muted: 'border border-border-subtle bg-q-surface-overlay',
        danger: 'border border-q-error/30 bg-q-error/10',
        dashboard: 'border border-border-subtle bg-q-surface p-5 shadow-[var(--q-shadow-card)]',
        editor: 'border border-q-border bg-q-surface p-3 shadow-[var(--q-shadow-card)]',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  },
);

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, padding, ...props },
  ref,
) {
  return <div ref={ref} className={cn(cardVariants({ variant, padding, className }))} {...props} />;
});

export type PanelVariant = 'settings' | 'inspector' | 'sidebar' | 'floating';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  variant?: PanelVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

const panelVariantClasses: Record<PanelVariant, string> = {
  settings: 'max-w-4xl rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface shadow-[var(--q-shadow-card)]',
  inspector: 'w-full rounded-none border-l border-q-border bg-q-surface shadow-none',
  sidebar: 'h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
  floating: 'rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface-elevated shadow-[var(--q-shadow-floating-panel)]',
};

export const Panel = React.forwardRef<HTMLElement, PanelProps>(function Panel(
  { className, variant = 'settings', title, description, actions, children, ...props },
  ref,
) {
  return (
    <section ref={ref} className={cn(panelVariantClasses[variant], className)} {...props}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-q-text">{title}</h2>}
            {description && <p className="mt-1 text-xs text-q-text-muted">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

export interface SectionCardProps extends Omit<CardProps, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  selected?: boolean;
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  actions?: React.ReactNode;
}

export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(function SectionCard(
  { title, description, icon, selected, visible = true, onVisibilityChange, actions, children, className, ...props },
  ref,
) {
  return (
    <Card ref={ref} variant={selected ? 'selected' : 'editor'} padding="none" className={cn(!visible && 'opacity-55', className)} {...props}>
      <div className="flex items-center justify-between gap-3 border-b border-q-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--q-radius-md)] bg-q-surface-overlay text-q-text-muted">{icon}</span>}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-q-text">{title}</h3>
            {description && <p className="truncate text-xs text-q-text-muted">{description}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onVisibilityChange && (
            <IconButton
              label={visible ? 'Hide section' : 'Show section'}
              icon={visible ? <Eye /> : <EyeOff />}
              size="icon-sm"
              onClick={() => onVisibilityChange(!visible)}
            />
          )}
          {actions}
        </div>
      </div>
      {children && <div className="p-3">{children}</div>}
    </Card>
  );
});

export interface InspectorGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}

export function InspectorGroup({
  title,
  description,
  collapsible = false,
  defaultOpen = true,
  actions,
  children,
  className,
  ...props
}: InspectorGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const contentId = React.useId();
  const canToggle = collapsible;

  return (
    <div className={cn('border-b border-q-border px-4 py-4', className)} {...props}>
      <div className={cn('flex items-start justify-between gap-3', isOpen && 'mb-3')}>
        <button
          type="button"
          disabled={!canToggle}
          aria-expanded={canToggle ? isOpen : undefined}
          aria-controls={canToggle ? contentId : undefined}
          onClick={() => canToggle && setIsOpen((open) => !open)}
          className={cn(
            'min-w-0 flex-1 text-left',
            canToggle && 'rounded-[var(--q-radius-sm)] outline-none transition-colors hover:text-q-text focus-visible:ring-2 focus-visible:ring-q-accent/30',
            !canToggle && 'cursor-default',
          )}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide text-q-text-secondary">{title}</h3>
          {description && <p className="mt-1 text-xs text-q-text-muted">{description}</p>}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {canToggle && (
            <IconButton
              label={isOpen ? 'Collapse group' : 'Expand group'}
              icon={<ChevronDown className={cn('transition-transform', !isOpen && '-rotate-90')} />}
              size="icon-sm"
              onClick={() => setIsOpen((open) => !open)}
            />
          )}
        </div>
      </div>
      {isOpen && (
        <div id={contentId} className="space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export type BuilderControlKind =
  | 'content'
  | 'color'
  | 'gradient'
  | 'intensity'
  | 'spacing'
  | 'radius'
  | 'typography'
  | 'layout'
  | 'visibility'
  | 'responsive';

export interface BuilderControlProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  kind?: BuilderControlKind;
  description?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  help?: React.ReactNode;
  compact?: boolean;
  density?: 'default' | 'compact';
}

export function BuilderControl({
  label,
  kind = 'content',
  description,
  helperText,
  error,
  required = false,
  disabled = false,
  action,
  actionLabel,
  onAction,
  help,
  compact = false,
  density,
  children,
  className,
  ...props
}: BuilderControlProps) {
  const isCompact = compact || density === 'compact';
  const hasHeader = label || description || help || action || (onAction && actionLabel);
  const message = error || helperText;

  return (
    <div
      className={cn(
        'rounded-[var(--q-radius-md)] border border-q-border bg-q-bg/60',
        isCompact ? 'p-2.5' : 'p-3',
        disabled && 'opacity-55',
        error && 'border-q-error/55',
        className,
      )}
      data-control-kind={kind}
      aria-disabled={disabled || undefined}
      {...props}
    >
      {hasHeader && (
        <div className={cn('flex items-start justify-between gap-3', isCompact ? 'mb-1.5' : 'mb-2')}>
          <div className="min-w-0">
            {label && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-q-text">
                <span>
                  {label}
                  {required && <span className="ml-1 text-q-error">*</span>}
                </span>
                {help && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex rounded-[var(--q-radius-sm)] text-q-text-muted outline-none transition-colors hover:text-q-text focus-visible:ring-2 focus-visible:ring-q-accent/30"
                        aria-label="Show help"
                      >
                        <HelpCircle className="h-[var(--q-icon-xs)] w-[var(--q-icon-xs)]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{help}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            {description && <div className="mt-0.5 text-[11px] text-q-text-muted">{description}</div>}
          </div>
          {(action || (onAction && actionLabel)) && (
            <div className="shrink-0">
              {action || (
                <Button variant="ghost" size="sm" onClick={onAction} disabled={disabled}>
                  {actionLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <div className={cn(disabled && 'pointer-events-none')}>{children}</div>
      {message && (
        <div className={cn('mt-2 text-xs leading-5', error ? 'text-q-error' : 'text-q-text-muted')}>
          {message}
        </div>
      )}
    </div>
  );
}
