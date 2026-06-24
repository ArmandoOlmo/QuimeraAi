import * as React from 'react';
import { cn } from '@/utils';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(function AppShell(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('flex h-screen bg-q-bg text-q-text', className)}
      {...props}
    />
  );
});

export interface AppShellMainProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AppShellMain = React.forwardRef<HTMLDivElement, AppShellMainProps>(function AppShellMain(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('relative flex min-w-0 flex-1 flex-col overflow-hidden', className)}
      {...props}
    />
  );
});

export interface AppShellTopbarProps extends React.HTMLAttributes<HTMLElement> {}

export const AppShellTopbar = React.forwardRef<HTMLElement, AppShellTopbarProps>(function AppShellTopbar(
  { className, ...props },
  ref,
) {
  return (
    <header
      ref={ref}
      className={cn(
        'quimera-dashboard-header-bar sticky top-0 z-20 flex h-[var(--q-layout-topbar-height)] items-center justify-between px-2 sm:px-6',
        className,
      )}
      {...props}
    />
  );
});

export interface AppShellContentProps extends React.HTMLAttributes<HTMLElement> {}

export const AppShellContent = React.forwardRef<HTMLElement, AppShellContentProps>(function AppShellContent(
  { className, ...props },
  ref,
) {
  return (
    <main
      ref={ref}
      className={cn('flex-1 overflow-y-auto scroll-smooth', className)}
      {...props}
    />
  );
});
