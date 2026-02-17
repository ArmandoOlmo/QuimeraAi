
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HeaderData, NavLink, BorderRadiusSize, NavbarLayout, NavLinkHoverStyle } from '../types';
import { useSafeProject } from '../contexts/project';
import { Menu, X, ArrowRight, ShoppingCart } from 'lucide-react';

import { GlobalSearch } from './ecommerce/search';

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-3xl',
};

interface LogoProps {
  logoType: 'text' | 'image' | 'both';
  logoText: string;
  logoImageUrl: string;
  logoWidth: number;
  textColor: string;
  compact?: boolean; // For mobile header - smaller text
  onNavigate?: (href: string) => void;
}

const Logo: React.FC<LogoProps> = ({ logoType, logoText, logoImageUrl, logoWidth, textColor, compact = false, onNavigate }) => {
  // Respect explicit logoType selection:
  // 'image' = show only image, 'text' = show only text, 'both' = show both
  // Fallback: if no explicit type but image URL exists, show image
  const hasImage = !!logoImageUrl;
  const showImage = (logoType === 'image' || logoType === 'both') ? hasImage : (hasImage && logoType !== 'text');
  const showText = logoType === 'text' || logoType === 'both' || (!logoType && !hasImage);

  return (
    <a
      href="/"
      onClick={(e) => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate('/');
        }
      }}
      className="flex items-center gap-2 md:gap-3 flex-shrink-0 relative z-50 group"
    >
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
          className={`${compact ? 'text-lg' : 'text-xl md:text-2xl'} font-bold font-header tracking-tight transition-colors`}
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
  onNavigate?: (href: string) => void;
  linkFontSize?: number;
}

const NavLinks: React.FC<NavLinksProps> = ({ links, textColor, accentColor, hoverStyle, className, isMobile, onLinkClick, onNavigate, linkFontSize = 14 }) => {

  const getHoverClass = () => {
    if (isMobile) return '';
    switch (hoverStyle) {
      case 'underline': return 'after:content-[""] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-current after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left';
      case 'highlight': return 'hover:opacity-70 transition-colors';
      case 'bracket': return 'before:content-["["] before:mr-1 before:opacity-0 hover:before:opacity-100 after:content-["]"] after:ml-1 after:opacity-0 hover:after:opacity-100 before:transition-all after:transition-all';
      case 'glow': return 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all';
      default: return 'hover:opacity-70';
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // If onNavigate is provided, use internal navigation
    if (onNavigate) {
      e.preventDefault();
      onNavigate(href);
      onLinkClick?.();
    } else {
      // Only call onLinkClick for closing mobile menu
      onLinkClick?.();
    }
  };

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
            onClick={(e) => handleClick(e, link.href)}
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

const Header: React.FC<HeaderData & {
  containerRef?: React.RefObject<HTMLDivElement>;
  /** When true, forces the header to use solid background regardless of style setting */
  forceSolid?: boolean;
  /** Callback when search is performed */
  onSearch?: (term: string) => void;
  /** Callback for internal navigation (prevents page reload in preview mode) */
  onNavigate?: (href: string) => void;
  /** Top-level backgroundColor prop from editor */
  backgroundColor?: string;
  /** Top-level textColor prop from editor */
  textColor?: string;
  /** Alternative prop names from editor */
  logoImage?: string;
  showLoginButton?: boolean;
  showRegisterButton?: boolean;
  registerText?: string;
  sticky?: boolean;
  transparent?: boolean;
}> = ({
  style = 'sticky-solid', layout, isSticky, glassEffect, height,
  logoType, logoText, logoImageUrl, logoWidth,
  links = [], hoverStyle,
  ctaText, showCta, buttonBorderRadius,
  showLogin, loginText, loginUrl,
  showSearch = false,
  searchPlaceholder,
  showCart = false,
  cartItemCount = 0,
  onCartClick,
  colors = {},
  isPreviewMode = false,
  containerRef,
  linkFontSize = 14,
  forceSolid = false,
  onSearch,
  onNavigate,
  backgroundColor, // Accept top-level color prop from editor
  textColor, // Accept top-level color prop from editor
  // Alternative prop names from editor
  logoImage,
  showLoginButton,
  showRegisterButton,
  registerText,
  sticky,
  transparent,
}) => {
    // Use alternative prop names if original ones are not provided
    const actualLogoImageUrl = logoImageUrl || logoImage;
    const actualShowLogin = showLogin ?? showLoginButton;
    const actualShowCta = showCta ?? showRegisterButton;
    const actualCtaText = ctaText || registerText;
    const actualIsSticky = isSticky ?? sticky;
    const actualStyle = transparent ? 'sticky-transparent' : style;
    // Use safe versions of hooks that work outside ProjectProvider (for public preview)
    const projectContext = useSafeProject();
    const previewRef = containerRef || null;


    // Use links directly - store links are now added manually via Navigation Dashboard
    const allLinks = links;

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

    // Colors are now 100% from props - no hardcoded fallbacks
    // colors.background, colors.text, colors.accent come from the editor
    const isAnyTransparentStyle = style === 'sticky-transparent' || style.startsWith('transparent');

    // Use colors directly from props - editor is responsible for providing all colors
    const actualColors = {
      background: backgroundColor || colors?.background || (isAnyTransparentStyle ? 'transparent' : colors?.accent),
      text: textColor || colors?.text,
      accent: colors?.accent,
    };

    useEffect(() => {
      // Para estilos flotantes, siempre mostrar como "scrolled"
      if (style.startsWith('floating')) {
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
    const isTransparentStyle = style === 'sticky-transparent' || style.startsWith('transparent');
    // When forceSolid is true, never use transparent background (useful for ecommerce pages without hero)
    const isTransparent = !forceSolid && isTransparentStyle && !isScrolled && !isMenuOpen;
    const bgColor = isTransparent ? 'transparent' : actualColors.background;

    // Ensure contrast on transparent backgrounds by falling back to white if text is the default dark
    const finalTextColor = (isTransparent && actualColors.text.toLowerCase() === '#e2e8f0') ? '#FFFFFF' : actualColors.text;

    // Glass Effect
    const glassClasses = (glassEffect && !isTransparent) ? 'backdrop-blur-md bg-opacity-80 border-b border-white/10' : '';
    const shadowClasses = (isScrolled && !isTransparent && !glassEffect) ? 'shadow-md' : '';

    // ============================================
    // ESTILOS DE CONTENEDOR SEGÚN VARIANTE
    // ============================================
    const getContainerClasses = (): string => {
      switch (style) {
        // --- EDGE-TO-EDGE (Lisos de lado a lado, sin curvas) ---
        case 'edge-solid':
          return 'w-full rounded-none';
        case 'edge-minimal':
          return 'w-full rounded-none border-b border-transparent';
        case 'edge-bordered':
          return 'w-full rounded-none border-b-2';

        // --- FLOTANTES ---
        case 'floating':
          return `${isPreviewMode ? 'absolute' : 'fixed'} top-6 left-6 right-6 rounded-2xl border border-white/10 max-w-7xl mx-auto`;
        case 'floating-pill':
          return `${isPreviewMode ? 'absolute' : 'fixed'} top-4 left-1/2 -translate-x-1/2 rounded-full border border-white/15 shadow-lg`;
        case 'floating-glass':
          return `${isPreviewMode ? 'absolute' : 'fixed'} top-6 left-6 right-6 rounded-xl border border-white/20 max-w-7xl mx-auto`;
        case 'floating-shadow':
          return `${isPreviewMode ? 'absolute' : 'fixed'} top-6 left-8 right-8 rounded-none shadow-2xl shadow-black/30 max-w-6xl mx-auto`;

        // --- TRANSPARENTES ---
        case 'sticky-transparent':
          return 'w-full border-b border-transparent';
        case 'transparent-blur':
          return 'w-full rounded-none';
        case 'transparent-bordered':
          return 'w-full rounded-none border-b';
        case 'transparent-gradient':
          return 'w-full rounded-none';

        default:
          return 'w-full border-b border-transparent';
      }
    };

    // ============================================
    // ESTILOS DE BACKGROUND SEGÚN VARIANTE
    // ============================================
    const getBackgroundStyle = (): React.CSSProperties => {
      switch (style) {
        // --- EDGE-TO-EDGE ---
        case 'edge-solid':
          return { backgroundColor: actualColors.background };
        case 'edge-minimal':
          return { backgroundColor: actualColors.background };
        case 'edge-bordered':
          return {
            backgroundColor: actualColors.background,
            borderColor: colors?.accent
          };

        // --- FLOTANTES ---
        case 'floating':
          return { backgroundColor: actualColors.background };
        case 'floating-pill':
          return {
            backgroundColor: `${actualColors.background}f0`,
            backdropFilter: 'blur(8px)'
          };
        case 'floating-glass':
          return {
            backgroundColor: `${actualColors.background}40`,
            backdropFilter: 'blur(20px) saturate(180%)'
          };
        case 'floating-shadow':
          return { backgroundColor: actualColors.background };

        // --- TRANSPARENTES ---
        case 'sticky-transparent':
          return { backgroundColor: isTransparent ? 'transparent' : actualColors.background };
        case 'transparent-blur':
          return {
            backgroundColor: isScrolled ? `${actualColors.background}cc` : 'transparent',
            backdropFilter: isScrolled ? 'blur(12px)' : 'none'
          };
        case 'transparent-bordered':
          return {
            backgroundColor: isScrolled ? `${actualColors.background}e0` : 'transparent',
            borderColor: isScrolled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'
          };
        case 'transparent-gradient':
          return {
            background: isScrolled
              ? actualColors.background
              : `linear-gradient(180deg, ${actualColors.background}80 0%, transparent 100%)`
          };

        default:
          return { backgroundColor: actualColors.background };
      }
    };

    const containerClasses = getContainerClasses();

    const CtaButton = ({ fullWidth = false }: { fullWidth?: boolean }) => (
      <a href="#cta" className={`
        inline-flex items-center justify-center font-semibold transition-all duration-300 hover:opacity-70 font-button
        ${fullWidth ? 'w-full py-2' : ''}
    `}
        style={{ color: actualColors.accent }}
      >
        {actualCtaText}
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

    const CartButton = () => (
      <button
        onClick={onCartClick}
        className="relative p-2 rounded-full transition-colors hover:bg-white/10"
        style={{ color: finalTextColor }}
        aria-label={`Carrito (${cartItemCount} productos)`}
      >
        <ShoppingCart size={22} />
        {cartItemCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold shadow-lg"
            style={{ backgroundColor: '#ef4444' }}
          >
            {cartItemCount > 99 ? '99+' : cartItemCount}
          </span>
        )}
      </button>
    );

    // Get storeId and data for global search
    const storeId = projectContext?.activeProjectId || undefined;
    const pageData = projectContext?.data;

    // Build searchable sections from page content
    const searchableSections = useMemo(() => {
      const sections: Array<{ id: string; title: string; href: string; description?: string }> = [];

      if (pageData) {
        // Add hero section
        if (pageData.hero?.headline) {
          sections.push({
            id: 'hero',
            title: pageData.hero.headline,
            description: pageData.hero.subheadline,
            href: '/'
          });
        }

        // Add features section
        if (pageData.features?.title) {
          sections.push({
            id: 'features',
            title: pageData.features.title,
            description: pageData.features.subtitle,
            href: '#features'
          });
        }

        // Add services section
        if (pageData.services?.title) {
          sections.push({
            id: 'services',
            title: pageData.services.title,
            description: pageData.services.subtitle,
            href: '#services'
          });
        }

        // Add testimonials section
        if (pageData.testimonials?.title) {
          sections.push({
            id: 'testimonials',
            title: pageData.testimonials.title,
            description: pageData.testimonials.subtitle,
            href: '#testimonials'
          });
        }

        // Add pricing section
        if (pageData.pricing?.title) {
          sections.push({
            id: 'pricing',
            title: pageData.pricing.title,
            description: pageData.pricing.subtitle,
            href: '#pricing'
          });
        }

        // Add FAQ section
        if (pageData.faq?.title) {
          sections.push({
            id: 'faq',
            title: pageData.faq.title,
            description: pageData.faq.subtitle,
            href: '#faq'
          });
        }

        // Add portfolio section
        if (pageData.portfolio?.title) {
          sections.push({
            id: 'portfolio',
            title: pageData.portfolio.title,
            description: pageData.portfolio.subtitle,
            href: '#portfolio'
          });
        }

        // Add team section
        if (pageData.team?.title) {
          sections.push({
            id: 'team',
            title: pageData.team.title,
            description: pageData.team.subtitle,
            href: '#team'
          });
        }

        // Add CTA section
        if (pageData.cta?.headline) {
          sections.push({
            id: 'cta',
            title: pageData.cta.headline,
            description: pageData.cta.subheadline,
            href: '#cta'
          });
        }

        // Add store link
        sections.push({
          id: 'store',
          title: 'Tienda',
          description: 'Ver todos los productos',
          href: '/tienda'
        });
      }

      return sections;
    }, [pageData]);

    const handleProductClick = (productId: string) => {
      window.location.hash = `#product/${productId}`;
    };

    const handleContentClick = (href: string) => {
      window.location.hash = href;
    };

    const renderLayout = () => {
      switch (layout) {
        case 'minimal':
          return (
            <>
              <div className="flex-shrink-0 mr-4"><Logo logoType={logoType} logoText={logoText} logoImageUrl={actualLogoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} onNavigate={onNavigate} /></div>
              <div className="hidden nav:flex flex-1 justify-center">
                <NavLinks links={allLinks} textColor={finalTextColor} accentColor={colors?.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} onNavigate={onNavigate} />
              </div>
              <div className="hidden nav:flex flex-shrink-0 ml-4 justify-end items-center gap-4">
                {showSearch && (
                  <GlobalSearch
                    storeId={storeId}
                    onProductClick={handleProductClick}
                    onContentClick={handleContentClick}
                    placeholder={searchPlaceholder}
                    primaryColor={colors?.accent}
                    textColor={finalTextColor}
                    sections={searchableSections}
                  />
                )}
                {showCart && <CartButton />}
                {actualShowLogin && <LoginButton />}
                {actualShowCta && <CtaButton />}
              </div>
            </>
          );
        case 'center':
          return (
            <>
              <div className="hidden nav:flex flex-1 justify-start items-center">
                <NavLinks links={allLinks} textColor={finalTextColor} accentColor={colors?.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} onNavigate={onNavigate} />
              </div>
              <div className="flex-shrink-0 nav:mx-auto absolute left-1/2 -translate-x-1/2 nav:static nav:translate-x-0">
                <Logo logoType={logoType} logoText={logoText} logoImageUrl={actualLogoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} onNavigate={onNavigate} />
              </div>
              <div className="hidden nav:flex flex-1 justify-end items-center gap-4">
                {showSearch && (
                  <GlobalSearch
                    storeId={storeId}
                    onProductClick={handleProductClick}
                    onContentClick={handleContentClick}
                    placeholder={searchPlaceholder}
                    primaryColor={colors?.accent}
                    textColor={finalTextColor}
                    sections={searchableSections}
                  />
                )}
                {showCart && <CartButton />}
                {actualShowLogin && <LoginButton />}
                {actualShowCta && <CtaButton />}
              </div>
            </>
          );
        case 'stack':
          return (
            <div className="flex flex-col w-full py-2">
              <div className="flex justify-center mb-4">
                <Logo logoType={logoType} logoText={logoText} logoImageUrl={actualLogoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} onNavigate={onNavigate} />
              </div>
              <div className="hidden nav:flex justify-center items-center border-t border-white/10 pt-2">
                <NavLinks links={allLinks} textColor={finalTextColor} accentColor={colors?.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} onNavigate={onNavigate} />
                <div className="ml-8 flex items-center gap-4">
                  {showSearch && (
                    <GlobalSearch
                      storeId={storeId}
                      onProductClick={handleProductClick}
                      onContentClick={handleContentClick}
                      placeholder={searchPlaceholder}
                      primaryColor={colors?.accent}
                      textColor={finalTextColor}
                      sections={searchableSections}
                    />
                  )}
                  {showCart && <CartButton />}
                  {showLogin && <LoginButton />}
                  {showCta && <CtaButton />}
                </div>
              </div>
            </div>
          )
        default: // Classic
          return (
            <>
              <div className="flex-shrink-0 mr-8"><Logo logoType={logoType} logoText={logoText} logoImageUrl={actualLogoImageUrl} logoWidth={logoWidth} textColor={finalTextColor} onNavigate={onNavigate} /></div>
              <div className="hidden nav:flex flex-1 justify-end items-center gap-8">
                <NavLinks links={allLinks} textColor={finalTextColor} accentColor={colors?.accent} hoverStyle={hoverStyle} className="flex items-center gap-8" linkFontSize={linkFontSize} onNavigate={onNavigate} />
                <div className="flex items-center ml-4 gap-4">
                  {showSearch && (
                    <GlobalSearch
                      storeId={storeId}
                      onProductClick={handleProductClick}
                      onContentClick={handleContentClick}
                      placeholder={searchPlaceholder}
                      primaryColor={colors?.accent}
                      textColor={finalTextColor}
                      sections={searchableSections}
                    />
                  )}
                  {showCart && <CartButton />}
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

    // ============================================
    // POSICIÓN SEGÚN ESTILO
    // ============================================
    const getPositionClass = () => {
      // When forceSolid is true, always behave like a normal sticky/relative header
      if (forceSolid) {
        return actualIsSticky ? 'sticky' : 'relative';
      }

      // Edge styles - siempre sticky o relative
      if (actualStyle.startsWith('edge-')) {
        return actualIsSticky ? 'sticky' : 'relative';
      }

      // Floating styles - absolute o fixed
      if (style.startsWith('floating')) {
        return isPreviewMode ? 'absolute' : 'fixed';
      }

      // Transparent styles - comportamiento especial
      if (style.startsWith('transparent') || style === 'sticky-transparent') {
        return isScrolled ? 'sticky' : 'absolute';
      }

      if (actualIsSticky) {
        return isPreviewMode ? 'relative' : 'sticky';
      }
      return 'relative';
    };

    const positionClass = getPositionClass();
    const backgroundStyle = getBackgroundStyle();

    // Determinar si toma espacio en el flujo del documento
    // When forceSolid is true, always take space (the header is solid and visible)
    const shouldNotTakeSpace = !forceSolid && (
      style.startsWith('floating') ||
      ((style.startsWith('transparent') || style === 'sticky-transparent') && !isScrolled)
    );

    return (
      <>
        <header
          className={`${positionClass} top-0 z-40 transition-all duration-500 ease-in-out ${style.includes('transparent') || style === 'sticky-transparent' ? 'w-full left-0 right-0' : ''
            }`}
          style={{ height: shouldNotTakeSpace ? 0 : 'auto' }}
        >
          {/* === SCROLL PROGRESS BAR === */}
          <div
            className="absolute bottom-0 left-0 h-[2px] z-50 transition-all duration-150"
            style={{
              width: `${scrollProgress}%`,
              background: `linear-gradient(90deg, ${colors?.accent}, ${colors?.accent})`
            }}
          />

          <div
            className={`transition-all duration-500 ease-out ${containerClasses} ${glassEffect && !style.includes('transparent') && !style.includes('glass') ? glassClasses : ''
              } ${!style.startsWith('floating') && !style.includes('transparent') ? shadowClasses : ''}`}
            style={{
              ...backgroundStyle,
              height: style.startsWith('floating') ? 'auto' : computedHeight,
              minHeight: style.startsWith('floating') ? 'auto' : computedMinHeight,
              padding: style.startsWith('floating')
                ? (style === 'floating-pill' ? '8px 32px' : '12px 24px')
                : `0 ${isScrolled ? '1.5rem' : '2rem'}`
            }}
          >
            <div className={`container mx-auto h-full flex items-center justify-between relative ${style.startsWith('floating') ? '' : 'px-0'
              }`}>

              {/* Desktop Layouts */}
              {renderLayout()}

              {/* Mobile Actions - Only visible on mobile and tablet */}
              <div className="nav:hidden flex items-center gap-0 -ml-2.5 -mr-2.5">
                {/* Cart Button (mobile) */}
                {showCart && (
                  <button
                    onClick={onCartClick}
                    className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 active:bg-white/20 transition-all touch-manipulation"
                    style={{ color: finalTextColor }}
                    aria-label={`Carrito (${cartItemCount} productos)`}
                  >
                    <ShoppingCart size={20} />
                    {cartItemCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold shadow-lg"
                        style={{ backgroundColor: '#ef4444' }}
                      >
                        {cartItemCount > 99 ? '99+' : cartItemCount}
                      </span>
                    )}
                  </button>
                )}
                {/* Menu Button */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 active:bg-white/20 transition-all touch-manipulation"
                  style={{ color: finalTextColor }}
                  aria-label="Abrir menú"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

            </div>
          </div>

        </header>

        {/* ===== MOBILE MENU - Rendered via portal outside header stacking context ===== */}
        {/* Portal fixes iOS Safari bug where position:fixed inside position:sticky */}
        {/* doesn't receive touch events correctly */}
        {typeof document !== 'undefined' && createPortal(
          <>
            {/* Overlay */}
            {isMenuOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-[10000] nav:hidden"
                onClick={() => setIsMenuOpen(false)}
              />
            )}

            {/* Drawer */}
            <div
              ref={drawerRef}
              className={`
            fixed top-0 right-0 bottom-0 w-[80vw] max-w-[320px] z-[10001]
            transform transition-transform duration-300 ease-out nav:hidden
            ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
              style={{ backgroundColor: colors?.background }}
            >
              <div className="flex flex-col h-full p-5">
                {/* Close button */}
                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                    style={{ color: colors?.text }}
                    aria-label="Cerrar menú"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Mobile Search */}
                {showSearch && (
                  <div className="mb-6">
                    <GlobalSearch
                      storeId={storeId}
                      onProductClick={(productId) => {
                        handleProductClick(productId);
                        setIsMenuOpen(false);
                      }}
                      onContentClick={(href) => {
                        handleContentClick(href);
                        setIsMenuOpen(false);
                      }}
                      placeholder={searchPlaceholder}
                      primaryColor={colors?.accent}
                      textColor={colors?.text}
                      sections={searchableSections}
                    />
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="flex-1">
                  <ul className="space-y-1">
                    {allLinks.map((link) => (
                      <li key={link.text}>
                        <a
                          href={link.href || '#'}
                          onClick={(e) => {
                            e.preventDefault();
                            if (onNavigate && link.href) {
                              onNavigate(link.href);
                            }
                            setIsMenuOpen(false);
                          }}
                          className="block py-3 px-4 text-lg font-medium rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                          style={{ color: colors?.text }}
                        >
                          {link.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  {actualShowLogin && (
                    <a
                      href={loginUrl || '#'}
                      onClick={(e) => {
                        if (onNavigate && loginUrl) {
                          e.preventDefault();
                          onNavigate(loginUrl);
                        }
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-center py-3 font-bold rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                      style={{ color: colors?.text }}
                    >
                      {loginText}
                    </a>
                  )}
                  {actualShowCta && <CtaButton fullWidth />}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
      </>
    );
  };

export default Header;
