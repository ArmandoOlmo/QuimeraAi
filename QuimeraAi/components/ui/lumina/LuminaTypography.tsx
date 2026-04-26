import React from 'react';

type TypographyVariant = 'display-lg' | 'display-md' | 'heading-lg' | 'heading-md' | 'heading-sm' | 'body-lg' | 'body-md' | 'body-sm' | 'label-md' | 'label-sm';

interface LuminaTypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant: TypographyVariant;
  as?: React.ElementType;
  children: React.ReactNode;
  customColor?: string;
}

export const LuminaTypography: React.FC<LuminaTypographyProps> = ({ 
  variant, 
  as, 
  className = '', 
  children,
  customColor,
  ...props 
}) => {
  const isHeading = variant.startsWith('display') || variant.startsWith('heading');
  const Component = as || (isHeading ? 'h2' : 'p');
  
  const baseClass = isHeading ? 'font-header' : 'font-body';
  const defaultColorClass = variant.startsWith('label') ? 'text-[#10B981]' : 'text-white';
  
  const variantClasses = {
    'display-lg': 'text-5xl md:text-7xl font-bold tracking-tight',
    'display-md': 'text-4xl md:text-5xl font-bold tracking-tight',
    'heading-lg': 'text-3xl md:text-4xl font-semibold',
    'heading-md': 'text-2xl md:text-3xl font-semibold',
    'heading-sm': 'text-xl md:text-2xl font-medium',
    'body-lg': 'text-lg md:text-xl text-gray-200',
    'body-md': 'text-base text-gray-300',
    'body-sm': 'text-sm text-gray-400',
    'label-md': 'text-sm font-semibold uppercase tracking-wider',
    'label-sm': 'text-xs font-semibold uppercase tracking-wider'
  };

  const styleOverrides: React.CSSProperties = {
    ...(isHeading && {
      textTransform: 'var(--headings-transform, none)' as any, 
      letterSpacing: 'var(--headings-spacing, normal)'
    }),
    ...(customColor && { color: customColor }),
    ...props.style
  };

  return (
    <Component 
      className={`${baseClass} ${!customColor ? defaultColorClass : ''} ${variantClasses[variant]} ${className}`}
      style={styleOverrides}
      {...props}
    >
      {children}
    </Component>
  );
};
