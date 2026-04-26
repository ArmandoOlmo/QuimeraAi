import React from 'react';

interface LuminaPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid';
  customBgColor?: string;
  customBorderColor?: string;
}

export const LuminaPanel: React.FC<LuminaPanelProps> = ({ 
  children, 
  variant = 'glass', 
  className = '',
  customBgColor,
  customBorderColor,
  ...props 
}) => {
  const baseClasses = 'rounded-[24px] overflow-hidden transition-all duration-300';
  
  const variantClasses = variant === 'glass' 
    ? 'backdrop-blur-[12px] shadow-[0_8px_32px_rgba(2,44,34,0.4)]'
    : 'shadow-lg';
    
  const defaultBg = variant === 'glass' ? 'bg-[#022C22]/70' : 'bg-[#064E3B]';
  const defaultBorder = variant === 'glass' ? 'border-[#10B981]/20 hover:border-[#10B981]/40' : 'border-[#10B981]/30';

  const styleOverrides: React.CSSProperties = {
    ...(customBgColor && { backgroundColor: customBgColor }),
    ...(customBorderColor && { borderColor: customBorderColor }),
    ...props.style
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses} ${!customBgColor ? defaultBg : ''} ${!customBorderColor ? 'border ' + defaultBorder : 'border'} ${className}`} 
      style={styleOverrides}
      {...props}
    >
      {children}
    </div>
  );
};
