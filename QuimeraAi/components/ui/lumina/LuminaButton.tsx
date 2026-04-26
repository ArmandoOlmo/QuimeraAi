import React from 'react';

interface LuminaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'link';
  children: React.ReactNode;
  customBgColor?: string;
  customTextColor?: string;
  customBorderColor?: string;
}

export const LuminaButton: React.FC<LuminaButtonProps> = ({ 
  variant = 'primary', 
  className = '', 
  children,
  customBgColor,
  customTextColor,
  customBorderColor,
  ...props 
}) => {
  const baseClasses = 'font-button px-6 py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2';
  
  const defaultClasses = {
    primary: 'bg-[#10B981] hover:bg-[#059669] text-[#022C22] font-semibold shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-[1px]',
    secondary: 'bg-[#064E3B] hover:bg-[#065F46] text-white border border-[#10B981]/30 hover:border-[#10B981]/50',
    link: 'bg-transparent text-[#10B981] hover:text-[#34D399] underline-offset-4 hover:underline px-4'
  };

  const hasCustomOverrides = customBgColor || customTextColor || customBorderColor;

  const styleOverrides: React.CSSProperties = {
    textTransform: 'var(--buttons-transform, none)' as any, 
    letterSpacing: 'var(--buttons-spacing, normal)',
    ...(customBgColor && { backgroundColor: customBgColor }),
    ...(customTextColor && { color: customTextColor }),
    ...(customBorderColor && { borderColor: customBorderColor, borderWidth: '1px', borderStyle: 'solid' }),
    ...props.style
  };

  return (
    <button 
      className={`${baseClasses} ${!hasCustomOverrides ? defaultClasses[variant] : ''} ${className}`}
      style={styleOverrides}
      {...props}
    >
      {children}
    </button>
  );
};
