import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils";

const pageContainerVariants = cva(
  "w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8",
  {
    variants: {
      variant: {
        default: "mx-auto max-w-7xl",
        narrow: "mx-auto max-w-4xl",
        wide: "mx-auto max-w-[1440px]",
        full: "max-w-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type PageContainerVariant = NonNullable<VariantProps<typeof pageContainerVariants>["variant"]>;

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageContainerVariants> {}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ children, className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(pageContainerVariants({ variant, className }))}
      {...props}
    >
      {children}
    </div>
  ),
);

PageContainer.displayName = "PageContainer";

export { pageContainerVariants };
