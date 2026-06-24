import * as React from 'react';
import {
  Button,
  type DesignSystemButtonSize,
  type DesignSystemButtonVariant,
} from '@/src/design-system/components/Button';
import { cn } from '@/utils';

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

const variantMap: Record<AppButtonVariant, DesignSystemButtonVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  outline: 'secondary',
  danger: 'destructive',
  premium: 'primary',
  icon: 'icon',
};

const sizeMap: Record<AppButtonSize, DesignSystemButtonSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  'icon-sm': 'icon-sm',
  'icon-md': 'icon-md',
};

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
  const shouldUseIconSizing = variant === 'icon' || size === 'icon-sm' || size === 'icon-md';

  return (
    <Button
      ref={ref}
      type={type}
      disabled={disabled}
      loading={loading}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      fullWidth={fullWidth}
      className={cn(
        shouldUseIconSizing && 'aspect-square',
        variant === 'premium' && 'dark:text-q-text-on-accent dark:shadow-lg dark:shadow-q-accent/20 black:text-q-text-on-accent',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
});

AppButton.displayName = 'AppButton';
