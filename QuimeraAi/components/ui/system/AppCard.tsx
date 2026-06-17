import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils";

const appCardVariants = cva(
  "rounded-xl border text-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border bg-card",
        muted: "border-border bg-secondary/60",
        elevated: "border-border bg-card shadow-md",
        interactive: "border-border bg-card hover:border-primary/40 hover:bg-secondary/35 hover:shadow-sm",
        premium: "border-primary/30 bg-card shadow-sm shadow-primary/10",
      },
      clickable: {
        true: "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      clickable: false,
    },
  },
);

export type AppCardVariant = NonNullable<VariantProps<typeof appCardVariants>["variant"]>;

export interface AppCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className">,
    Omit<VariantProps<typeof appCardVariants>, "clickable"> {
  className?: string;
}

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ children, className, onClick, onKeyDown, role, tabIndex, variant, ...props }, ref) => {
    const clickable = Boolean(onClick);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !clickable) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.currentTarget.click();
      }
    };

    return (
      <div
        ref={ref}
        className={cn(appCardVariants({ variant, clickable, className }))}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={role ?? (clickable ? "button" : undefined)}
        tabIndex={tabIndex ?? (clickable ? 0 : undefined)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

AppCard.displayName = "AppCard";

export { appCardVariants };
