import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none',
    'transition-all duration-[var(--q-duration-fast)] ease-[var(--q-ease-standard)]',
    'disabled:pointer-events-none disabled:opacity-55',
    'focus-visible:ring-2 focus-visible:ring-q-accent/35 active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:h-[var(--q-icon-sm)] [&_svg:not([class*="size-"])]:w-[var(--q-icon-sm)]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-q-accent text-q-text-on-accent shadow-sm shadow-q-accent/15 hover:opacity-90',
        primary: 'bg-q-accent text-q-text-on-accent shadow-sm shadow-q-accent/15 hover:opacity-90',
        secondary: 'border border-border-subtle bg-q-surface text-q-text hover:bg-q-surface-overlay',
        outline: 'border border-border-subtle bg-q-surface text-q-text shadow-[var(--q-shadow-card)] hover:bg-q-surface-overlay',
        ghost: 'bg-transparent text-q-text-muted hover:bg-q-surface-overlay hover:text-q-text',
        subtle: 'bg-q-surface-overlay text-q-text-secondary hover:bg-q-surface hover:text-q-text',
        danger: 'bg-q-error text-white shadow-sm shadow-q-error/20 hover:opacity-90 focus-visible:ring-q-error/30',
        destructive: 'bg-q-error text-white shadow-sm shadow-q-error/20 hover:opacity-90 focus-visible:ring-q-error/30',
        link: 'h-auto rounded-none bg-transparent p-0 text-q-accent underline-offset-4 hover:underline',
        icon: 'bg-transparent text-q-text-muted hover:bg-q-surface-overlay hover:text-q-text',
      },
      size: {
        default: 'h-9 rounded-[var(--q-radius-md)] px-4 text-sm',
        sm: 'h-8 rounded-[var(--q-radius-sm)] px-3 text-xs',
        md: 'h-9 rounded-[var(--q-radius-md)] px-4 text-sm',
        lg: 'h-11 rounded-[var(--q-radius-md)] px-5 text-sm',
        icon: 'h-9 w-9 rounded-[var(--q-radius-md)] p-0',
        'icon-sm': 'h-8 w-8 rounded-[var(--q-radius-sm)] p-0',
        'icon-md': 'h-9 w-9 rounded-[var(--q-radius-md)] p-0',
        'icon-lg': 'h-11 w-11 rounded-[var(--q-radius-md)] p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export type DesignSystemButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type DesignSystemButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    children,
    disabled,
    loading = false,
    leftIcon,
    rightIcon,
    variant,
    size,
    fullWidth,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading ? 'true' : undefined}
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      {...props}
    >
      {loading ? <Loader2 aria-hidden="true" className="animate-spin" /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  label: string;
  framed?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, framed = false, variant, size = 'icon-md', title, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      aria-label={label}
      title={title || label}
      variant={variant || (framed ? 'secondary' : 'icon')}
      size={size}
      {...props}
    >
      {icon}
    </Button>
  );
});
