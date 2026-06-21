import * as React from "react"

import { cn } from "@/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-q-text placeholder:text-q-text-muted selection:bg-q-accent selection:text-q-text-on-accent border-border-subtle h-10 w-full min-w-0 rounded-[var(--q-radius-md)] border bg-q-surface px-3 py-2 text-base shadow-[var(--shadow-card)] transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-q-accent focus-visible:ring-q-accent/25 focus-visible:ring-[3px]",
        "aria-invalid:ring-q-error/25 aria-invalid:border-q-error",
        className
      )}
      {...props}
    />
  )
}

export { Input }
