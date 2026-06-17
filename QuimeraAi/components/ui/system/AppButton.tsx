import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils";

const appButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary: "bg-secondary text-foreground hover:bg-secondary/80",
        ghost: "bg-transparent text-foreground hover:bg-secondary",
        outline: "border border-border bg-background text-foreground hover:bg-secondary",
        danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/35",
        premium: "border border-primary/40 bg-card text-foreground shadow-sm shadow-primary/10 hover:border-primary/60 hover:bg-primary/10",
        icon: "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-4 [&_svg]:size-4",
        lg: "h-10 px-5 text-base [&_svg]:size-4",
        "icon-sm": "size-8 p-0 [&_svg]:size-4",
        "icon-md": "size-9 p-0 [&_svg]:size-4",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

export type AppButtonVariant = NonNullable<VariantProps<typeof appButtonVariants>["variant"]>;
export type AppButtonSize = NonNullable<VariantProps<typeof appButtonVariants>["size"]>;

export interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof appButtonVariants>, "fullWidth"> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      children,
      className,
      disabled,
      fullWidth = false,
      leftIcon,
      loading = false,
      rightIcon,
      size,
      type = "button",
      variant,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(appButtonVariants({ variant, size, fullWidth, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  ),
);

AppButton.displayName = "AppButton";

export { appButtonVariants };
