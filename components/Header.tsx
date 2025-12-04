
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
  forceShowText?: boolean; // For mobile drawer where text should always show
}

const Logo: React.FC<LogoProps> = ({ logoType, logoText, logoImageUrl, logoWidth, textColor, forceShowText = false }) => {
  const showImage = (logoType === 'image' || logoType === 'both') && logoImageUrl;
  const showText = (logoType === 'text' || logoType === 'both');

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
        {showText && (
            <span 
              className={`${forceShowText ? '' : 'hidden md:inline'} text-2xl font-bold font-header tracking-tight transition-colors`} 
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

          {/* Mobile Toggle - Touch optimized with minimum 44px target */}
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
                className="
                  flex items-center justify-center w-11 h-11 -mr-2
                  rounded-full hover:bg-white/10 active:bg-white/20
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                  transition-all duration-200 touch-manipulation active:scale-95
                "
                style={{ color: isMenuOpen ? colors.text : finalTextColor }}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>
      
      {/* Mobile Menu Overlay - Enhanced with smooth transition */}
      <div 
        className={`
          fixed inset-0 bg-black/40 backdrop-blur-sm z-30 
          transition-all duration-300 ease-out md:hidden 
          ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer - Enhanced with swipe gestures and safe areas */}
      <div 
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
            fixed top-0 right-0 bottom-0 w-[85vw] max-w-[340px] z-40 
            transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden
            shadow-2xl
            ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ 
          backgroundColor: colors.background,
          transform: isMenuOpen && isDragging 
            ? `translateX(${dragOffset}px)` 
            : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
          {/* Close button - Touch optimized with 44px minimum target */}
          <button
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center 
                      rounded-full hover:bg-white/10 active:bg-white/20 
                      transition-colors touch-manipulation active:scale-95 z-10"
            style={{ color: colors.text }}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col h-full p-6 pt-20 safe-area-inset-right">
              {/* Logo section */}
              <div className="mb-6">
                  <Logo logoType={logoType} logoText={logoText} logoImageUrl={logoImageUrl} logoWidth={Math.min(logoWidth, 120)} textColor={colors.text} forceShowText />
              </div>
              
              {/* Navigation links - Touch optimized with staggered animation */}
              <nav className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                   <NavLinks 
                        links={links} 
                        textColor={colors.text} 
                        accentColor={colors.accent} 
                        hoverStyle="simple" 
                        className="flex flex-col space-y-2" 
                        isMobile
                        onLinkClick={() => setIsMenuOpen(false)}
                    />
              </nav>
              
              {/* Footer actions - Touch optimized */}
              <div className="pt-6 border-t border-white/10 space-y-3 safe-area-inset-bottom">
                 {showLogin && (
                     <a 
                        href={loginUrl || '#'} 
                        className="block w-full text-center py-3 font-bold text-base 
                                  rounded-xl hover:bg-white/5 active:bg-white/10 
                                  transition-colors touch-manipulation"
                        style={{ color: colors.text }}
                        onClick={() => setIsMenuOpen(false)}
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
