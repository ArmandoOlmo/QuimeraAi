import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils';

export type AppIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AppIconTone = 'default' | 'muted' | 'accent' | 'danger' | 'success' | 'warning' | 'info';

const sizeClasses: Record<AppIconSize, string> = {
  xs: 'icon-xs',
  sm: 'icon-sm',
  md: 'icon-md',
  lg: 'icon-lg',
  xl: 'icon-xl',
};

const toneClasses: Record<AppIconTone, string> = {
  default: 'text-current',
  muted: 'text-q-text-muted',
  accent: 'text-q-accent',
  danger: 'text-q-error',
  success: 'text-q-success',
  warning: 'text-q-warning',
  info: 'text-q-info',
};

export interface AppIconProps {
  icon: LucideIcon;
  size?: AppIconSize;
  tone?: AppIconTone;
  className?: string;
  strokeWidth?: number;
  role?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

export function AppIcon({
  icon: Icon,
  size = 'md',
  tone = 'default',
  className,
  strokeWidth = 2,
  role,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
}: AppIconProps) {
  return (
    <Icon
      aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
      aria-label={ariaLabel}
      role={role}
      strokeWidth={strokeWidth}
      className={cn('app-icon', sizeClasses[size], toneClasses[tone], className)}
    />
  );
}

export interface IconBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: LucideIcon;
  size?: AppIconSize;
  tone?: AppIconTone;
}

export const IconBadge = React.forwardRef<HTMLSpanElement, IconBadgeProps>(function IconBadge(
  { icon, size = 'md', tone = 'muted', className, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn('icon-badge', className)} {...props}>
      <AppIcon icon={icon} size={size} tone={tone} />
    </span>
  );
});

IconBadge.displayName = 'IconBadge';
