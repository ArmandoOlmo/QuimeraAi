
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeaderData, NavLink, BorderRadiusSize, NavbarLayout, NavLinkHoverStyle } from '../types';
import { useSafeEditor } from '../contexts/EditorContext';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useDesignTokens } from '../hooks/useDesignTokens';

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-3xl',
};

interface LogoProps {
  logoType: 'text' | 'image' | 'both';
  logoText: string;
  logoImageUrl: string;
  logoWidth: number;
  textColor: string;
  compact?: boolean; // For mobile header - smaller text
}

const Logo: React.FC<LogoProps> = ({ logoType, logoText, logoImageUrl, logoWidth, textColor, compact = false }) => {
  const showImage = (logoType === 'image' || logoType === 'both') && logoImageUrl;
  const showText = (logoType === 'text' || logoType === 'both');

  return (
    <a href="#" className="flex items-center gap-2 md:gap-3 flex-shrink-0 relative z-50 group">
        {showImage && (
             <img
                src={logoImageUrl}
                alt={logoText || 'Logo'}
                style={{ width: `${logoWidth}px`, height: 'auto', maxHeight: '100%' }}
                className="object-contain"
            />
        )}
        {showText && (
            <span 
              className={`${compact ? 'text-lg' : 'text-xl md:text-2xl'} font-bold font-header tracking-tight transition-colors truncate max-w-[150px] md:max-w-none`} 
              style={{ color: textColor }}
            >
              {logoText}
            </span>
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
  linkFontSize?: number;
}

const NavLinks: React.FC<NavLinksProps> = ({ links, textColor, accentColor, hoverStyle, className, isMobile, onLinkClick, linkFontSize = 14 }) => {
  
    const getHoverClass = () => {
        if (isMobile) return '';
        switch(hoverStyle) {
            case 'underline': return 'after:content-[""] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-current after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left';
            case 'highlight': return 'hover:opacity-70 transition-colors';
            case 'bracket': return 'before:content-["["] before:mr-1 before:opacity-0 hover:before:opacity-100 after:content-["]"] after:ml-1 after:opacity-0 hover:after:opacity-100 before:transition-all after:transition-all';
            case 'glow': return 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all';
            default: return 'hover:opacity-70';
        }
    }

    return (
      <ul className={className}>
        {links.map((link, index) => (
          <li 
            key={link.text} 
            className="relative"
            style={isMobile ? { 
              animationDelay: `${index * 50}ms`,
              animation: 'slideInFromRight 0.3s ease-out forwards',
              opacity: 0,
            } : undefined}
          >
            <a 
                href={link.href} 
                onClick={onLinkClick}
                className={`
                  relative transition-all duration-300 font-header font-medium
                  ${isMobile 
                    ? 'text-xl py-4 px-4 -mx-4 block rounded-xl hover:bg-white/5 active:bg-white/10 touch-manipulation' 
                    : ''
                  } 
                  ${getHoverClass()}
                `}
                style={{ 
                  color: textColor, 
                  fontSize: isMobile ? undefined : `${linkFontSize}px`,
                  textTransform: 'var(--navlinks-transform, none)' as any,
                  letterSpacing: 'var(--navlinks-spacing, normal)'
                }}
            >
                {link.text}
            </a>
          </li>
        ))}
      </ul>
    );
};

const Header: React.FC<HeaderData & { containerRef?: React.RefObject<HTMLDivElement> }> = ({ 
    style, layout, isSticky, glassEffect, height,
    logoType, logoText, logoImageUrl, logoWidth,
    links, hoverStyle,
    ctaText, showCta, buttonBorderRadius, 
    showLogin, loginText, loginUrl,
    colors,
    isPreviewMode = false,
    containerRef,
    linkFontSize = 14
}) => {
  // Use safe versions of hooks that work outside EditorProvider (for public preview)
  const editorContext = useSafeEditor();
  const previewRef = containerRef || editorContext?.previewRef || null;
  
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Touch gesture state for swipe-to-close mobile drawer
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Handle touch start for swipe gesture
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  // Handle touch move for swipe gesture  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    // Only allow dragging right (to close, since drawer opens from right)
    if (diff > 0) {
      setDragOffset(Math.min(diff, 350));
    }
  }, [isDragging]);

  // Handle touch end for swipe gesture
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    // If dragged more than 80px, close the drawer
    if (dragOffset > 80) {
      setIsMenuOpen(false);
    }
    setDragOffset(0);
  }, [dragOffset]);
  
  // Use primary color for navbar background
  const primaryColor = getColor('primary.main', '#4f46e5');
  
  // For transparent style, background should default to transparent, not primary color
  const isTransparentStyle = style === 'sticky-transparent';
  const defaultBackground = isTransparentStyle ? 'transparent' : primaryColor;
  
  // Merge component colors with Design Tokens - component colors take priority
  const actualColors = {
    background: colors.background || defaultBackground,
    text: colors.text,
    accent: colors.accent || primaryColor,
  };

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
      
      // Calculate scroll progress for progress bar
      const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const progress = scrollHeight > 0 ? (scrollContainer.scrollTop / scrollHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    handleScroll(); // Check on mount
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [style, isSticky, previewRef]);

  // Visual State Calculations
  const isTransparent = style === 'sticky-transparent' && !isScrolled && !isMenuOpen;
  const bgColor = isTransparent ? 'transparent' : actualColors.background;
  
  // Ensure contrast on transparent backgrounds by falling back to white if text is the default dark
  const finalTextColor = (isTransparent && actualColors.text.toLowerCase() === '#e2e8f0') ? '#FFFFFF' : actualColors.text; 
  
  // Glass Effect
  const glassClasses = (glassEffect && !isTransparent) ? 'backdrop-blur-md bg-opacity-80 border-b border-white/10' : '';
  const shadowClasses = (isScrolled && !isTransparent && !glassEffect) ? 'shadow-md' : '';

  // Floating Bar Style Override
  // In preview mode, use absolute instead of fixed to stay within preview container
  const containerClasses = style === 'floating' 
    ? `${isPreviewMode ? 'absolute' : 'fixed'} top-6 left-6 right-6 rounded-2xl border border-white/10 max-w-7xl mx-auto`
    : 'w-full border-b border-transparent';

  const CtaButton = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <a href="#cta" className={`
        inline-flex items-center justify-center font-semibold transition-all duration-300 hover:opacity-70 font-button
        ${fullWidth ? 'w-full py-2' : ''}
    `}
    style={{ color: actualColors.accent }}
    >
        {ctaText}
        <ArrowRight size={16} className="ml-2" />
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
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} />
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
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} />
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
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} />
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
                    <NavLinks links={links} textColor={finalTextColor} accentColor={colors.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} />
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

  // For transparent style, use absolute positioning so navbar overlays the content below (e.g., Hero)
  // This allows the Hero to start from the top and be visible behind the transparent navbar
  const getPositionClass = () => {
    if (style === 'sticky-transparent') {
      // Absolute positioning so it overlays content, but sticky when scrolled for better UX
      return isScrolled ? 'sticky' : 'absolute';
    }
    if (style === 'floating') {
      return isPreviewMode ? 'absolute' : 'fixed';
    }
    if (isSticky) {
      return isPreviewMode ? 'relative' : 'sticky';
    }
    return 'relative';
  };
  
  const positionClass = getPositionClass();

  // For transparent style, header should not take up space in the document flow
  const shouldNotTakeSpace = style === 'floating' || (style === 'sticky-transparent' && !isScrolled);

  return (
    <header 
        className={`${positionClass} top-0 z-40 transition-all duration-500 ease-in-out ${style === 'sticky-transparent' ? 'w-full left-0 right-0' : ''}`}
        style={{ height: shouldNotTakeSpace ? 0 : 'auto' }} 
    >
      {/* === SCROLL PROGRESS BAR === */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] z-50 transition-all duration-150"
        style={{ 
          width: `${scrollProgress}%`,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent})`
        }}
      />
      
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

          {/* Mobile Menu Button - Only visible on mobile */}
          <button 
            onClick={() => setIsMenuOpen(true)} 
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10 active:bg-white/20 transition-all touch-manipulation ml-auto"
            style={{ color: finalTextColor }}
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

        </div>
      </div>
      
      {/* ===== MOBILE MENU ===== */}
      {/* Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Drawer */}
      <div 
        ref={drawerRef}
        className={`
          fixed top-0 right-0 bottom-0 w-[80vw] max-w-[320px] z-[101] 
          transform transition-transform duration-300 ease-out md:hidden
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ backgroundColor: colors.background }}
      >
        <div className="flex flex-col h-full p-5">
          {/* Close button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              style={{ color: colors.text }}
              aria-label="Cerrar menú"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.text}>
                  <a 
                    href={link.href} 
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-3 px-4 text-lg font-medium rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: colors.text }}
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            {showLogin && (
              <a 
                href={loginUrl || '#'} 
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-center py-3 font-bold rounded-lg hover:bg-white/10 transition-colors"
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
