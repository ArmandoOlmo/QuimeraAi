import * as React from 'react';
import { Badge, type BadgeProps } from '@/src/design-system/components/Feedback';
import { cn } from '@/utils';

export type StatusBadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'premium'
  | 'muted';

export type StatusBadgeSize = 'sm' | 'md';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'size'> {
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  { variant = 'default', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <Badge
      ref={ref}
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    >
      {children}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';
