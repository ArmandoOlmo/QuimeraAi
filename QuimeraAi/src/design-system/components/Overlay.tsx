import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { IconButton } from './Button';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const modalSizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md', className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100000] bg-q-text/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[100001] flex max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface text-q-text shadow-[var(--q-shadow-modal)] outline-none',
            modalSizeClasses[size],
            className,
          )}
        >
          {(title || description) && (
            <div className="border-b border-border-subtle px-5 py-4 pr-12">
              {title && <Dialog.Title className="text-base font-semibold text-q-text">{title}</Dialog.Title>}
              {description && <Dialog.Description className="mt-1 text-sm text-q-text-muted">{description}</Dialog.Description>}
            </div>
          )}
          <Dialog.Close asChild>
            <IconButton icon={<X />} label="Close" size="icon-sm" className="absolute right-3 top-3" />
          </Dialog.Close>
          <div className="min-h-0 flex-1 overflow-auto p-5 quimera-ds-scrollbar">{children}</div>
          {footer && <div className="border-t border-border-subtle px-5 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface DrawerProps extends ModalProps {
  side?: 'left' | 'right';
}

export function Drawer({ side = 'right', className, size: _size, ...props }: DrawerProps) {
  const sideClasses =
    side === 'right'
      ? 'right-0 top-0 h-dvh translate-x-0 rounded-none border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
      : 'left-0 top-0 h-dvh translate-x-0 rounded-none border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left';

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100000] bg-q-text/45 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed z-[100001] flex w-[min(100vw,24rem)] flex-col overflow-hidden border-border-subtle bg-q-surface text-q-text shadow-[var(--q-shadow-floating-panel)] outline-none',
            sideClasses,
            className,
          )}
        >
          {(props.title || props.description) && (
            <div className="border-b border-border-subtle px-5 py-4 pr-12">
              {props.title && <Dialog.Title className="text-base font-semibold text-q-text">{props.title}</Dialog.Title>}
              {props.description && <Dialog.Description className="mt-1 text-sm text-q-text-muted">{props.description}</Dialog.Description>}
            </div>
          )}
          <Dialog.Close asChild>
            <IconButton icon={<X />} label="Close" size="icon-sm" className="absolute right-3 top-3" />
          </Dialog.Close>
          <div className="min-h-0 flex-1 overflow-auto p-5 quimera-ds-scrollbar">{props.children}</div>
          {props.footer && <div className="border-t border-border-subtle px-5 py-4">{props.footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
