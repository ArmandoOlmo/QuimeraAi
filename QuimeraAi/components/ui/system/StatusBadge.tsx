import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils";

const statusBadgeVariants = cva(
  "inline-flex w-fit items-center rounded-full border font-medium leading-none",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        success: "border-primary/30 bg-secondary text-foreground",
        warning: "border-primary/40 bg-primary/10 text-foreground",
        danger: "border-destructive bg-destructive text-destructive-foreground",
        info: "border-border bg-secondary text-foreground",
        premium: "border-primary bg-primary text-primary-foreground",
        muted: "border-border bg-secondary text-muted-foreground",
      },
      size: {
        sm: "gap-1 px-2 py-0.5 text-[11px]",
        md: "gap-1.5 px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export type StatusBadgeVariant = NonNullable<VariantProps<typeof statusBadgeVariants>["variant"]>;
export type StatusBadgeSize = NonNullable<VariantProps<typeof statusBadgeVariants>["size"]>;

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ children, className, size, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(statusBadgeVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </span>
  ),
);

StatusBadge.displayName = "StatusBadge";

export { statusBadgeVariants };
