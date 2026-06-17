import * as React from 'react';

export type PageContainerVariant = 'default' | 'narrow' | 'wide' | 'full';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PageContainerVariant;
}

const variantClasses: Record<PageContainerVariant, string> = {
  default: 'max-w-7xl',
  narrow: 'max-w-4xl',
  wide: 'max-w-[88rem]',
  full: 'max-w-none',
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(function PageContainer(
  { variant = 'default', className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={joinClasses(
        'mx-auto w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

PageContainer.displayName = 'PageContainer';
