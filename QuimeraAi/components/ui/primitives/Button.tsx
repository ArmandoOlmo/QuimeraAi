import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--q-radius-md,6px)] text-sm font-medium transition-all duration-[var(--q-duration-fast,150ms)] ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-q-accent/25 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-q-accent text-q-text-on-accent hover:opacity-90",
        secondary: "bg-q-surface text-q-text border border-q-border hover:bg-q-surface-elevated",
        ghost: "bg-transparent text-q-text-secondary hover:bg-q-surface hover:text-q-text",
        destructive: "bg-q-error text-white hover:opacity-90 focus-visible:ring-q-error/25",
        // Legacy support mappings
        default: "bg-q-accent text-q-text-on-accent hover:opacity-90",
        outline: "bg-transparent text-q-text border border-q-border hover:bg-q-surface",
        link: "text-q-accent underline-offset-4 hover:underline bg-transparent p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 px-3 text-xs has-[>svg]:px-2.5",
        md: "h-9 px-4 py-2 has-[>svg]:px-3",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
