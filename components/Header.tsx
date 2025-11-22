
import React, { useState, useEffect } from 'react';
import { HeaderData, NavLink, BorderRadiusSize, NavbarLayout, NavLinkHoverStyle } from '../types';
import { useEditor } from '../contexts/EditorContext';
import { Box, Menu, X, ArrowRight } from 'lucide-react';

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

interface LogoProps {
  logoType: 'text' | 'image' | 'both';
  logoText: string;
  logoImageUrl: string;
  logoWidth: number;
  textColor: string;
}

const Logo: React.FC<LogoProps> = ({ logoType, logoText, logoImageUrl, logoWidth, textColor }) => {
  const showImage = (logoType === 'image' || logoType === 'both') && logoImageUrl;
  const showText = (logoType === 'text' || logoType === 'both');
  const showDefaultIcon = logoType === 'text'; // Only show default icon if strictly text mode

  return (
    <a href="#" className="flex items-center gap-3 flex-shrink-0 relative z-50 group">
        {showImage && (
             <img
                src={logoImageUrl}
                alt={logoText || 'Logo'}
                style={{ width: `${logoWidth}px`, height: 'auto', maxHeight: '100%' }}
                className="object-contain"
            />
        )}
        {showDefaultIcon && !showImage && (
             <Box className="h-8 w-8" style={{ color: textColor }} />
        )}
        {showText && (
            <span className="text-2xl font-bold font-header tracking-tight transition-colors" style={{ color: textColor }}>{logoText}</span>
        )}
    </a>
  );
};

interface NavLinksProps {
  links: NavLink[];
  textColor: string;
  accentColor: string;
  hoverStyle: NavLinkHoverStyle;
  className?: string;
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = ({ links, textColor, accentColor, hoverStyle, className, isMobile, onLinkClick }) => {
  
    const getHoverClass = () => {
        if (isMobile) return '';
        switch(hoverStyle) {
            case 'underline': return 'after:content-[""] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-current after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left';
            case 'highlight': return 'hover:bg-white/10 rounded-md px-3 py-1 transition-colors';
            case 'bracket': return 'before:content-["["] before:mr-1 before:opacity-0 hover:before:opacity-100 after:content-["]"] after:ml-1 after:opacity-0 hover:after:opacity-100 before:transition-all after:transition-all';
            case 'glow': return 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all';
            default: return 'hover:opacity-70';
        }
    }

    return (
      <ul className={className}>
        {links.map((link) => (
          <li key={link.text} className="relative">
            <a 
                href={link.href} 
                onClick={onLinkClick}
                className={`relative transition-all duration-300 font-header font-medium tracking-wide ${isMobile ? 'text-2xl py-2 block' : 'text-sm'} ${getHoverClass()}`}
                style={{ color: textColor }}
            >
                {link.text}
            </a>
          </li>
        ))}
      </ul>
    );
};

const Header: React.FC<HeaderData> = ({ 
    style, layout, isSticky, glassEffect, height,
    logoType, logoText, logoImageUrl, logoWidth,
    links, hoverStyle,
    ctaText, showCta, buttonBorderRadius, 
    showLogin, loginText, loginUrl,
    colors,
    isPreviewMode = false
}) => {
  const { previewRef } = useEditor();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (style === 'floating') {
        setIsScrolled(true);
        return;
    }

    const scrollContainer = previewRef?.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrolled = scrollContainer.scrollTop > 20;
      setIsScrolled(scrolled);
    };

    handleScroll(); // Check on mount
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [style, isSticky, previewRef]);

  // Visual State Calculations
  const isTransparent = style === 'sticky-transparent' && !isScrolled && !isMenuOpen;
  const bgColor = isTransparent ? 'transparent' : colors.background;
  
  // Ensure contrast on transparent backgrounds by falling back to white if text is the default dark
  const finalTextColor = (isTransparent && colors.text.toLowerCase() === '#e2e8f0') ? '#FFFFFF' : colors.text; 
  
  // Glass Effect
  const glassClasses = (glassEffect && !isTransparent) ? 'backdrop-blur-md bg-opacity-80 border-b border-white/10' : '';
  const shadowClasses = (isScrolled && !isTransparent && !glassEffect) ? 'shadow-md' : '';

  // Floating Bar Style Override
  // In preview mode, use absolute instead of fixed to stay within preview container
  const containerClasses = style === 'floating' 
    ? `${isPreviewMode ? 'absolute' : 'fixed'} top-6 left-6 right-6 rounded-2xl shadow-xl border border-white/10 max-w-7xl mx-auto`
    : 'w-full border-b border-transparent';

  const CtaButton = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <a href="#cta" className={`
        inline-flex items-center justify-center font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 font-button
        ${borderRadiusClasses[buttonBorderRadius]}
        ${fullWidth ? 'w-full py-3' : 'px-6 py-2.5'}
    `}
    style={{ backgroundColor: colors.accent, color: '#FFFFFF', boxShadow: `0 4px 14px 0 ${colors.accent}66` }}
    >
        {ctaText}
        {!fullWidth && <ArrowRight size={16} className="ml-2" />}
    </a>
  );

  const LoginButton = () => (
    <a 
        href={loginUrl || '#'} 
        className="text-sm font-bold transition-colors hover:opacity-70 mr-6 whitespace-nowrap"
        style={{ color: finalTextColor }}
    >
        {loginText}
    </a>
  );

  const renderLayout = () => {
    switch (layout) {
      case 'minimal':
        return (
            <>
                <div className="flex-shrink-0 mr-4"><Logo logoType={logoType} logoText={logoText} logoImageUrl={logoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} /></div>
                <div className="hidden md:flex flex-1 justify-center">
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" />
                </div>
                <div className="hidden md:flex flex-shrink-0 ml-4 justify-end items-center">
                    {showLogin && <LoginButton />}
                    {showCta && <CtaButton />}
                </div>
            </>
        );
      case 'center':
        return (
             <>
                 <div className="hidden md:flex flex-1 justify-start items-center">
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" />
                 </div>
                 <div className="flex-shrink-0 mx-auto">
                    <Logo logoType={logoType} logoText={logoText} logoImageUrl={logoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} />
                 </div>
                 <div className="hidden md:flex flex-1 justify-end items-center">
                     {showLogin && <LoginButton />}
                     {showCta && <CtaButton />}
                 </div>
             </>
         );
      case 'stack':
         return (
             <div className="flex flex-col w-full py-2">
                 <div className="flex justify-center mb-4">
                    <Logo logoType={logoType} logoText={logoText} logoImageUrl={logoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} />
                 </div>
                 <div className="hidden md:flex justify-center items-center border-t border-white/10 pt-2">
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" />
                    <div className="ml-8 flex items-center">
                        {showLogin && <LoginButton />}
                        {showCta && <CtaButton />}
                    </div>
                 </div>
             </div>
         )
      default: // Classic
        return (
            <>
                <div className="flex-shrink-0 mr-8"><Logo logoType={logoType} logoText={logoText} logoImageUrl={logoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} /></div>
                <div className="hidden md:flex flex-1 justify-end items-center gap-8">
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" />
                    <div className="flex items-center ml-4">
                        {showLogin && <LoginButton />}
                        {showCta && <CtaButton />}
                    </div>
                </div>
            </>
        );
    }
  };

  // When stack layout is active, height needs to be flexible or larger
  const computedHeight = layout === 'stack' ? 'auto' : `${height}px`;
  const computedMinHeight = layout === 'stack' ? `${height + 40}px` : `${height}px`;

  const positionClass = (isSticky || style === 'floating') ? (isPreviewMode ? 'relative' : 'sticky') : 'relative';

  return (
    <header 
        className={`${positionClass} top-0 z-40 transition-all duration-500 ease-in-out`}
        style={{ height: style === 'floating' ? 0 : 'auto' }} 
    >
      <div 
        className={`transition-all duration-500 ease-out ${containerClasses} ${glassClasses} ${shadowClasses}`}
        style={{ 
            backgroundColor: bgColor,
            height: (style === 'floating') ? 'auto' : computedHeight, 
            minHeight: (style === 'floating') ? 'auto' : computedMinHeight,
            padding: style === 'floating' ? '12px 24px' : `0 ${isScrolled ? '1.5rem' : '2rem'}`
        }} 
      >
        <div className={`container mx-auto h-full flex items-center justify-between ${style === 'floating' ? '' : 'px-0'}`}>
          
          {/* Desktop Layouts */}
          {renderLayout()}

          {/* Mobile Toggle */}
          <div className="md:hidden flex items-center relative z-50 ml-auto">
            {/* In Stack layout mobile, ensure logo is visible if it wasn't rendered in the main flow due to responsiveness */}
             {layout === 'stack' && (
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center" style={{ left: '-80vw'}}> 
                    {/* Positioning hack for stack mobile to keep logo visible, simplified below */}
                 </div>
             )}
             {/* For stack layout on mobile, we usually want the logo left and menu right, standard behavior handles this via the mobile drawer */}
             
             {/* In Stack layout, the desktop logic hides the logo inside the flex col. We need a mobile-only logo if stack */}
             {layout === 'stack' && (
                 <div className="md:hidden absolute right-14 top-1/2 -translate-y-1/2">
                     <Logo logoType={logoType} logoText={logoText} logoImageUrl={logoImageUrl} logoWidth={80} textColor={finalTextColor} />
                 </div>
             )}

            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-2 focus:outline-none transition-transform active:scale-90"
                style={{ color: isMenuOpen ? colors.text : finalTextColor }}
                aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <div 
        className={`
            fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-40 shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) md:hidden
            ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ backgroundColor: colors.background }}
      >
          <div className="flex flex-col h-full p-8 pt-24 relative">
              <div className="absolute top-6 left-8">
                  <Logo logoType={logoType} logoText={logoText} logoImageUrl={logoImageUrl} logoWidth={Math.min(logoWidth, 100)} textColor={colors.text} />
              </div>
              <nav className="flex-1 flex flex-col space-y-6 mt-4">
                   <NavLinks 
                        links={links} 
                        textColor={colors.text} 
                        accentColor={colors.accent} 
                        hoverStyle="simple" 
                        className="flex flex-col space-y-4" 
                        isMobile
                        onLinkClick={() => setIsMenuOpen(false)}
                    />
              </nav>
              
              <div className="pt-8 border-t border-white/10 space-y-4">
                 {showLogin && (
                     <a 
                        href={loginUrl || '#'} 
                        className="block w-full text-center py-2 font-bold text-sm hover:opacity-70 transition-opacity"
                        style={{ color: colors.text }}
                     >
                         {loginText}
                     </a>
                 )}
                 {showCta && <CtaButton fullWidth />}
              </div>
          </div>
      </div>
    </header>
  );
};

export default Header;
