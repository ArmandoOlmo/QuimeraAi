import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/utils";

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function SectionHeader({
  action,
  className,
  collapsible = false,
  icon,
  isCollapsed = false,
  onToggle,
  subtitle,
  title,
  ...props
}: SectionHeaderProps) {
  const titleContent = (
    <>
      {icon ? <span className="flex-shrink-0 text-primary">{icon}</span> : null}
      <span className="min-w-0">
        <span className="block truncate text-lg font-semibold text-foreground">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-sm font-normal leading-5 text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      {collapsible ? (
        <ChevronDown
          className={cn(
            "size-4 flex-shrink-0 text-muted-foreground transition-transform",
            isCollapsed ? "-rotate-90" : "rotate-0",
          )}
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  return (
    <div
      className={cn("flex items-start justify-between gap-4", className)}
      {...props}
    >
      {collapsible && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-start gap-2 rounded-lg text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/35"
          aria-expanded={!isCollapsed}
        >
          {titleContent}
        </button>
      ) : (
        <div className="flex min-w-0 items-start gap-2">{titleContent}</div>
      )}

      {action ? <div className="flex flex-shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
