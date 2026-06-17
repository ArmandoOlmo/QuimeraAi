import * as React from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/utils";
import { AppButton, type AppButtonProps } from "./AppButton";

export interface PageHeaderAction
  extends Pick<AppButtonProps, "disabled" | "loading" | "type" | "variant"> {
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

export type PageHeaderActionSlot = React.ReactNode | PageHeaderAction;

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  backAction?: PageHeaderActionSlot;
  primaryAction?: PageHeaderActionSlot;
  secondaryAction?: PageHeaderActionSlot;
}

function isActionConfig(action: PageHeaderActionSlot): action is PageHeaderAction {
  return (
    typeof action === "object" &&
    action !== null &&
    !React.isValidElement(action) &&
    "label" in action
  );
}

function renderAction(
  action: PageHeaderActionSlot | undefined,
  fallbackVariant: AppButtonProps["variant"],
  fallbackIcon?: React.ReactNode,
) {
  if (!action) return null;
  if (!isActionConfig(action)) return action;

  const { ariaLabel, icon, label, variant = fallbackVariant, ...buttonProps } = action;

  return (
    <AppButton
      {...buttonProps}
      variant={variant}
      leftIcon={icon ?? fallbackIcon}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </AppButton>
  );
}

export function PageHeader({
  backAction,
  children,
  className,
  eyebrow,
  icon,
  primaryAction,
  secondaryAction,
  subtitle,
  title,
  ...props
}: PageHeaderProps) {
  const hasActions = Boolean(primaryAction || secondaryAction);

  return (
    <header
      className={cn("flex flex-col gap-4 border-b border-border bg-background/80 py-4", className)}
      {...props}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {backAction ? (
            <div className="flex-shrink-0">
              {renderAction(backAction, "ghost", <ArrowLeft aria-hidden="true" />)}
            </div>
          ) : null}

          {icon ? (
            <div className="mt-0.5 flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {hasActions ? (
          <div className="flex flex-shrink-0 items-center gap-2 sm:justify-end">
            {renderAction(secondaryAction, "outline")}
            {renderAction(primaryAction, "primary")}
          </div>
        ) : null}
      </div>

      {children}
    </header>
  );
}
