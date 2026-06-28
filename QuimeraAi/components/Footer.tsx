
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FooterData, SocialPlatform, FontSize } from '../types';
import { Twitter, Github, Facebook, Instagram, Linkedin, MapPin, Phone, Mail, Youtube, Music, Pin, MessageCircle, Send, Ghost, Gamepad2, AtSign, ArrowRight, CheckCircle, Globe2 } from 'lucide-react';
import BusinessHours from './BusinessHours';
import { supabase } from '../supabase';
import { getNeonGlowStyles, hexToRgba } from '../utils/colorUtils';
import { FOOTER_IMAGE_VARIANTS, getFooterVariantMeta, isFooterVariant } from '../data/footerVariants';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

// Quimera logo URL for the badge
import { useAppLogo } from '../hooks/useAppLogo';

const socialIconComponents: Record<SocialPlatform, React.ReactNode> = {
  twitter: <Twitter className="w-6 h-6" />,
  x: <Twitter className="w-6 h-6" />,
  github: <Github className="w-6 h-6" />,
  facebook: <Facebook className="w-6 h-6" />,
  instagram: <Instagram className="w-6 h-6" />,
  linkedin: <Linkedin className="w-6 h-6" />,
  youtube: <Youtube className="w-6 h-6" />,
  tiktok: <Music className="w-6 h-6" />,
  pinterest: <Pin className="w-6 h-6" />,
  whatsapp: <MessageCircle className="w-6 h-6" />,
  telegram: <Send className="w-6 h-6" />,
  snapchat: <Ghost className="w-6 h-6" />,
  discord: <Gamepad2 className="w-6 h-6" />,
  threads: <AtSign className="w-6 h-6" />,
};

const titleSizeClasses: Record<FontSize, string> = {
  sm: 'text-lg md:text-xl',
  md: 'text-xl md:text-2xl',
  lg: 'text-2xl md:text-3xl',
  xl: 'text-3xl md:text-4xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
  sm: 'text-xs md:text-sm',
  md: 'text-sm md:text-base',
  lg: 'text-base md:text-lg',
  xl: 'text-lg md:text-xl',
};

const isHexColor = (value?: string): boolean => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value || '');

const alphaColor = (color: string | undefined, alpha: number, fallback: string): string => (
  isHexColor(color) ? hexToRgba(color, alpha) : fallback
);

const getInitials = (value: string): string => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'Q';
  return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
};

const visibleColumns = (columns: Array<{ title: string; links?: Array<{ text: string; href?: string; url?: string }> }>) => (
  columns.filter(column => column.title || (column.links || []).length > 0)
);

const Footer: React.FC<FooterData & {
  onNavigate?: (href: string) => void;
  backgroundColor?: string;
  textColor?: string;
  // Alternative prop names from editor controls
  companyName?: string;
  tagline?: string;
  copyright?: string;
}> = ({
  title, description, linkColumns = [], socialLinks = [], copyrightText, colors, titleFontSize = 'sm', descriptionFontSize = 'sm',
  logoType = 'text', logoImageUrl, contactInfo, onNavigate, hideBranding,
  backgroundColor, textColor, // Accept top-level color props from editor
  companyName, tagline, copyright, // Accept alternative prop names from editor
  footerVariant = 'classic', cardGlow, backgroundImageUrl, backgroundOverlayColor, backgroundOverlayOpacity, backgroundPosition,
  wordmarkText, footerEyebrow, disclaimerText, newsletterLabel, newsletterPlaceholder, newsletterButtonText,
  ctaTitle, ctaBullets, primaryButtonText, secondaryButtonText, languageLabel, countryLabel
}) => {
  const { i18n } = useTranslation();
  
  const resolveText = (text: any) => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text !== null) {
      const preferred = i18n.language?.startsWith('es') ? 'es' : 'en';
      return text[preferred] || text.es || text.en || Object.values(text)[0] || '';
    }
    return String(text);
  };

  // Use alternative prop names if original ones are not provided, and resolve i18n objects
  const actualTitle = resolveText(title || companyName);
  const actualDescription = resolveText(description || tagline);
  const actualCopyrightText = resolveText(copyrightText || copyright);
  
  const resolvedLinkColumns = (linkColumns || []).map(column => ({
    ...column,
    title: resolveText(column.title),
    links: (column.links || []).map(link => ({
      ...link,
      text: resolveText(link.text)
    }))
  }));

    // Get global app logo
    const { logoUrl: quimeraLogoUrl } = useAppLogo();

    // Auto-detect White Label branding when hideBranding prop is not explicitly set
    // This handles the PublicWebsitePreview (/preview/) route where tenant context is unavailable
    const [autoHideBranding, setAutoHideBranding] = useState(false);
    useEffect(() => {
      if (hideBranding) return; // Already hidden by parent
      // Check if we're on a preview route with userId
      const path = window.location.pathname;
      const match = path.match(/\/preview\/([^/]+)\//);
      if (!match) return;
      const userId = match[1];
      if (!UUID_RE.test(userId)) return;
      // Fetch tenant doc to check for White Label branding
      const checkTenantBranding = async () => {
        try {
          const { data, error } = await supabase
            .from('tenants')
            .select('branding')
            .eq('owner_user_id', userId)
            .maybeSingle();
            
          if (!error && data) {
            const branding = (data as any).branding;
            if (branding?.companyName || branding?.logoUrl) {
              setAutoHideBranding(true);
            }
          }
        } catch (e) {
          // Silently ignore - branding stays visible
        }
      };
      checkTenantBranding();
    }, [hideBranding]);

    const shouldHideBranding = hideBranding || autoHideBranding;

    // Colors are now 100% from props - no hardcoded fallbacks
    // Editor is responsible for providing all colors via colors prop
    const actualColors = {
      background: backgroundColor || colors?.background,
      border: colors?.border,
      text: textColor || colors?.text,
      heading: colors?.heading,
      linkHover: colors?.linkHover,
      description: colors?.description,
      accent: colors?.accent,
      mutedText: colors?.mutedText,
      panelBackground: colors?.panelBackground,
      panelText: colors?.panelText,
      buttonBackground: colors?.buttonBackground,
      buttonText: colors?.buttonText,
      wordmark: colors?.wordmark,
      iconBackground: colors?.iconBackground,
      inputBackground: colors?.inputBackground,
      inputText: colors?.inputText,
      inputBorder: colors?.inputBorder,
      legalBackground: colors?.legalBackground,
      imageOverlay: colors?.imageOverlay,
    };

    const currentYear = new Date().getFullYear();
    const finalCopyrightText = (actualCopyrightText || '© {YEAR} All rights reserved.').replace('{YEAR}', currentYear.toString());
    const variant = isFooterVariant(footerVariant) ? footerVariant : 'classic';
    const variantMeta = getFooterVariantMeta(variant);
    const footerWordmark = resolveText(wordmarkText) || actualTitle || 'Brand';
    const footerEyebrowText = resolveText(footerEyebrow);
    const disclaimer = resolveText(disclaimerText);
    const newsletterTitle = resolveText(newsletterLabel) || 'Get updates';
    const newsletterInputPlaceholder = resolveText(newsletterPlaceholder) || 'E-mail';
    const newsletterButtonLabel = resolveText(newsletterButtonText) || 'Get updates';
    const ctaHeading = resolveText(ctaTitle) || actualDescription || actualTitle;
    const primaryCta = resolveText(primaryButtonText) || 'Get access';
    const secondaryCta = resolveText(secondaryButtonText) || 'Talk to us';
    const languageText = resolveText(languageLabel) || 'Language';
    const countryText = resolveText(countryLabel) || '';
    const resolvedColumns = visibleColumns(resolvedLinkColumns);
    const displayColumns = resolvedColumns.length > 0
      ? resolvedColumns
      : [{ title: 'Explore', links: [{ text: 'Home', href: '/' }, { text: 'Contact', href: '/#footer' }] }];
    const accentColor = actualColors.accent || actualColors.linkHover || actualColors.heading || '#ffffff';
    const mutedColor = actualColors.mutedText || actualColors.description || actualColors.text;
    const panelBackground = actualColors.panelBackground || actualColors.background;
    const panelText = actualColors.panelText || actualColors.heading || actualColors.text;
    const buttonBackground = actualColors.buttonBackground || accentColor;
    const buttonText = actualColors.buttonText || actualColors.heading || '#ffffff';
    const wordmarkColor = actualColors.wordmark || accentColor || actualColors.heading;
    const sectionOverlay = backgroundOverlayColor || actualColors.imageOverlay || actualColors.background || '#000000';
    const hasImageBackedVariant = FOOTER_IMAGE_VARIANTS.includes(variant);

    let footerStyles: React.CSSProperties = {
      backgroundColor: actualColors.background,
      borderColor: actualColors.border
    };
    let footerClasses = "border-t relative overflow-hidden";

    if (footerVariant === 'neon-glow') {
      const glowConfig = {
        enabled: cardGlow?.enabled !== false,
        color: cardGlow?.color || '#144CCD',
        intensity: cardGlow?.intensity ?? 100,
        borderRadius: 0, // Footers typically don't have border radius on the bottom, or just top radius
        gradientStart: cardGlow?.gradientStart || '#0A0909',
        gradientEnd: cardGlow?.gradientEnd || '#09101F'
      };
      
      const neonStyles = getNeonGlowStyles(glowConfig);
      
      // Override background and box shadow, remove border
      footerStyles = {
        ...footerStyles,
        background: neonStyles.background,
        boxShadow: neonStyles.boxShadow,
        borderTop: 'none'
      };
      footerClasses = "relative overflow-hidden";
    }

    const renderLink = (
      link: { text: string; href?: string; url?: string },
      className = 'text-sm transition-opacity hover:opacity-80',
      color = actualColors.text,
    ) => {
      const href = link.href || link.url || '#';
      return (
        <a
          href={href}
          onClick={(e) => {
            if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
              e.preventDefault();
              onNavigate(href);
            }
          }}
          className={className}
          style={{ color }}
        >
          {link.text}
        </a>
      );
    };

    const renderColumns = (options?: { headingColor?: string; textColor?: string; columnsClassName?: string; titleClassName?: string; listClassName?: string }) => (
      <div className={options?.columnsClassName || 'grid grid-cols-2 md:grid-cols-4 gap-8'}>
        {displayColumns.slice(0, 5).map((column, index) => (
          <div key={`${column.title}-${index}`}>
            <h4
              className={options?.titleClassName || 'text-sm font-semibold mb-4 font-header'}
              style={{ color: options?.headingColor || actualColors.heading }}
            >
              {column.title}
            </h4>
            <ul className={options?.listClassName || 'space-y-2 font-body'}>
              {(column.links || []).slice(0, 8).map((link, linkIndex) => (
                <li key={`${column.title}-${linkIndex}`}>
                  {renderLink(link as any, 'text-sm transition-opacity hover:opacity-80', options?.textColor || actualColors.text)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );

    const renderSocialLinks = (className = 'flex flex-wrap gap-3', itemClassName = 'p-2 rounded-lg transition-opacity hover:opacity-80', color = actualColors.text) => (
      <div className={className}>
        {Array.isArray(socialLinks) && socialLinks.map((link, index) => (
          <a
            key={`${link.platform}-${index}`}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClassName}
            style={{ color }}
            title={link.platform}
          >
            {socialIconComponents[link.platform]}
          </a>
        ))}
      </div>
    );

    const renderBrandMark = (className = 'h-12 w-12 rounded-xl') => (
      logoType === 'image' && logoImageUrl ? (
        <img src={logoImageUrl} alt={actualTitle} className={`${className} object-contain`} />
      ) : (
        <div
          className={`${className} inline-flex items-center justify-center font-bold font-header`}
          style={{ backgroundColor: actualColors.iconBackground || panelBackground, color: accentColor }}
        >
          {getInitials(actualTitle || footerWordmark)}
        </div>
      )
    );

    const renderBrandRow = (titleClassName = 'text-3xl font-bold font-header') => (
      <div className="flex items-center gap-4">
        {renderBrandMark('h-12 w-12 rounded-xl')}
        <div>
          {footerEyebrowText && <p className="text-xs uppercase font-semibold mb-1" style={{ color: accentColor }}>{footerEyebrowText}</p>}
          <h3 className={titleClassName} style={{ color: actualColors.heading }}>{actualTitle}</h3>
        </div>
      </div>
    );

    const renderNewsletter = (compact = false) => (
      <div className="w-full">
        <p className="text-xs uppercase font-semibold mb-3" style={{ color: mutedColor }}>{newsletterTitle}</p>
        <form className={`flex ${compact ? 'flex-col sm:flex-row' : 'flex-col md:flex-row'} gap-3`} onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            aria-label={newsletterInputPlaceholder}
            placeholder={newsletterInputPlaceholder}
            className="min-w-0 flex-1 rounded-full border px-5 py-3 text-sm outline-none"
            style={{
              backgroundColor: actualColors.inputBackground || 'transparent',
              borderColor: actualColors.inputBorder || actualColors.border,
              color: actualColors.inputText || actualColors.text,
            }}
          />
          <button
            type="submit"
            className="rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: buttonBackground, color: buttonText }}
          >
            {newsletterButtonLabel}
          </button>
        </form>
      </div>
    );

    const renderCtaCard = () => {
      const bullets = Array.isArray(ctaBullets) && ctaBullets.length > 0
        ? ctaBullets
        : [
            actualDescription || 'Move faster with a focused next step',
            'Built for repeatable growth',
          ];

      return (
        <div className="rounded-lg p-8 md:p-10" style={{ backgroundColor: accentColor, color: buttonText }}>
          <h3 className="text-3xl md:text-5xl font-bold font-header leading-tight mb-8" style={{ color: buttonText }}>
            {ctaHeading}
          </h3>
          <div className="space-y-4 mb-10">
            {bullets.slice(0, 3).map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-start gap-3 text-base md:text-lg font-body">
                <CheckCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                <span>{resolveText(item)}</span>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href="/#leads"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/#leads');
                }
              }}
              className="rounded-md px-5 py-3 text-center font-semibold"
              style={{ backgroundColor: panelBackground, color: panelText }}
            >
              {primaryCta} <ArrowRight className="inline w-4 h-4 ml-1" />
            </a>
            <a
              href="/#footer"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/#footer');
                }
              }}
              className="rounded-md px-5 py-3 text-center font-semibold border"
              style={{ backgroundColor: actualColors.inputBackground || '#ffffff', color: actualColors.inputText || '#111111', borderColor: actualColors.inputBorder || 'transparent' }}
            >
              {secondaryCta}
            </a>
          </div>
        </div>
      );
    };

    const richFooterStyle: React.CSSProperties = {
      backgroundColor: actualColors.background,
      color: actualColors.text,
      borderColor: actualColors.border,
      backgroundPosition: backgroundPosition || 'center',
      backgroundSize: 'cover',
      backgroundImage: backgroundImageUrl && hasImageBackedVariant
        ? `linear-gradient(180deg, ${alphaColor(sectionOverlay, (backgroundOverlayOpacity ?? 48) / 100, 'rgba(0,0,0,0.48)')}, ${alphaColor(sectionOverlay, 0.22, 'rgba(0,0,0,0.22)')}), url(${backgroundImageUrl})`
        : undefined,
    };

    const renderLegal = (className = 'text-sm', color = mutedColor) => (
      <div className={className} style={{ color }}>
        <span>{finalCopyrightText}</span>
        {countryText && <span className="ml-4">{countryText}</span>}
      </div>
    );

    const renderRichFooter = () => {
      switch (variant) {
        case 'mega-wordmark':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={richFooterStyle}>
              <div className="container mx-auto px-6 pt-16 md:pt-24 pb-10 relative z-10">
                <div className="grid lg:grid-cols-[1fr_2.4fr] gap-14">
                  {renderBrandMark('h-12 w-12 rounded-xl')}
                  {renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-3 gap-10', headingColor: actualColors.heading, textColor: mutedColor, titleClassName: 'text-sm font-semibold mb-5 font-header', listClassName: 'space-y-3 font-body' })}
                </div>
                <div className="mt-20 md:mt-28 overflow-hidden">
                  <p className="text-7xl md:text-9xl lg:text-[12rem] leading-none font-black font-header truncate" style={{ color: wordmarkColor }}>
                    {footerWordmark}
                  </p>
                </div>
                <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  {renderLegal()}
                  {renderSocialLinks('flex flex-wrap gap-3', 'p-2 rounded-lg transition-opacity hover:opacity-80', mutedColor)}
                </div>
              </div>
            </footer>
          );

        case 'compliance-wordmark':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={richFooterStyle}>
              <div className="container mx-auto px-6 py-14 md:py-20 relative z-10">
                <div className="grid lg:grid-cols-[1fr_2.2fr] gap-12">
                  <div className="space-y-8">
                    <div>
                      <p className="text-sm font-semibold mb-4" style={{ color: mutedColor }}>Follow us</p>
                      {renderSocialLinks('flex flex-wrap gap-3', 'p-2 rounded-full transition-opacity hover:opacity-80', actualColors.heading)}
                    </div>
                    {countryText && (
                      <div className="flex items-center gap-3 text-sm" style={{ color: mutedColor }}>
                        <Globe2 className="w-5 h-5" />
                        <span>{countryText}</span>
                      </div>
                    )}
                    {renderLegal('text-sm max-w-sm', mutedColor)}
                  </div>
                  {renderColumns({ columnsClassName: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-10', headingColor: mutedColor, textColor: actualColors.heading, titleClassName: 'text-sm font-semibold mb-5 font-header', listClassName: 'space-y-4 font-body font-semibold uppercase' })}
                </div>
                <p className="mt-20 md:mt-28 text-7xl md:text-9xl lg:text-[12rem] leading-none font-black font-header truncate" style={{ color: wordmarkColor }}>
                  {footerWordmark}
                </p>
              </div>
            </footer>
          );

        case 'grid-newsletter':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={{ ...richFooterStyle, backgroundImage: richFooterStyle.backgroundImage || `radial-gradient(circle at 20% 0%, ${alphaColor(accentColor, 0.25, 'rgba(255,255,255,0.12)')}, transparent 34%)` }}>
              <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
                <div className="grid lg:grid-cols-[1fr_1.8fr] gap-12">
                  <div className="space-y-8">
                    {renderBrandRow('text-3xl md:text-4xl font-black font-header leading-tight')}
                    <p className="max-w-sm text-sm md:text-base" style={{ color: mutedColor }}>{actualDescription}</p>
                    {renderLegal('text-xs md:text-sm', mutedColor)}
                  </div>
                  <div className="space-y-12">
                    {renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-3 gap-8', headingColor: mutedColor, textColor: actualColors.heading })}
                    {renderNewsletter(true)}
                  </div>
                </div>
              </div>
            </footer>
          );

        case 'grid-wordmark':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={{ ...richFooterStyle, backgroundImage: richFooterStyle.backgroundImage || `linear-gradient(${alphaColor(actualColors.border, 0.28, 'rgba(255,255,255,0.08)')} 1px, transparent 1px), linear-gradient(90deg, ${alphaColor(actualColors.border, 0.28, 'rgba(255,255,255,0.08)')} 1px, transparent 1px)`, backgroundSize: '33.333% 100%, 100% 33.333%' }}>
              <div className="container mx-auto px-6 pt-16 md:pt-24 pb-0 relative z-10">
                <div className="grid lg:grid-cols-[1fr_2.2fr] gap-12">
                  {renderBrandRow('text-3xl md:text-4xl font-black font-header')}
                  <div className="space-y-10">
                    {renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-4 gap-8', headingColor: actualColors.heading, textColor: mutedColor })}
                    {renderNewsletter(true)}
                  </div>
                </div>
                <p className="mt-20 text-7xl md:text-9xl lg:text-[11rem] leading-none font-black italic font-header truncate" style={{ color: wordmarkColor }}>
                  {footerWordmark}
                </p>
              </div>
            </footer>
          );

        case 'press-landscape':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={richFooterStyle}>
              <div className="container mx-auto px-6 py-12 relative z-10">
                <div className="grid md:grid-cols-[1fr_3fr] border-y" style={{ borderColor: actualColors.border }}>
                  <div className="flex items-center justify-center p-10">{renderBrandMark('h-24 w-24 rounded-2xl')}</div>
                  <div className="p-8 md:p-10">{renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-4 gap-8', headingColor: actualColors.heading, textColor: actualColors.text })}</div>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: actualColors.text }}>
                  {displayColumns.flatMap(column => column.links || []).slice(0, 8).map((link, index) => (
                    <span key={`${link.text}-${index}`}>{renderLink(link as any, 'transition-opacity hover:opacity-80', actualColors.text)}</span>
                  ))}
                </div>
              </div>
              {(disclaimer || finalCopyrightText) && (
                <div className="px-6 py-8 text-xs md:text-sm relative z-10" style={{ backgroundColor: actualColors.legalBackground || panelBackground, color: mutedColor }}>
                  <div className="container mx-auto">{disclaimer || finalCopyrightText}</div>
                </div>
              )}
            </footer>
          );

        case 'social-waitlist':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t min-h-[560px]" style={richFooterStyle}>
              <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
                <div className="grid md:grid-cols-[1.2fr_1fr] gap-14">
                  <div className="space-y-8">
                    {renderBrandRow('text-3xl md:text-4xl font-black font-header')}
                    <p className="text-4xl md:text-6xl leading-tight font-header max-w-xl" style={{ color: actualColors.heading }}>
                      {actualDescription || ctaHeading}
                    </p>
                    <a href="/#leads" className="inline-flex items-center gap-3 rounded-full border px-6 py-3" style={{ borderColor: actualColors.border, color: actualColors.heading }}>
                      <Mail className="w-4 h-4" /> {primaryCta}
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    {renderColumns({ columnsClassName: 'contents', headingColor: actualColors.heading, textColor: mutedColor })}
                    <div>
                      <h4 className="text-sm font-semibold mb-4" style={{ color: actualColors.heading }}>Follow Us</h4>
                      {renderSocialLinks('flex flex-wrap gap-2', 'p-2 rounded-lg transition-opacity hover:opacity-80', mutedColor)}
                    </div>
                  </div>
                </div>
                <div className="mt-16 pt-8 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-5" style={{ borderColor: actualColors.border }}>
                  {renderLegal()}
                  <div className="flex gap-8">{displayColumns.flatMap(column => column.links || []).slice(0, 2).map((link, index) => <span key={index}>{renderLink(link as any, 'underline underline-offset-4', actualColors.heading)}</span>)}</div>
                </div>
              </div>
            </footer>
          );

        case 'cta-card':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={richFooterStyle}>
              <div className="container mx-auto px-6 py-14 md:py-20 relative z-10">
                <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-start">
                  <div className="space-y-12">
                    {renderBrandRow('text-4xl md:text-5xl font-black font-header')}
                    {renderColumns({ columnsClassName: 'grid grid-cols-2 gap-10 max-w-3xl', headingColor: actualColors.heading, textColor: mutedColor })}
                    {renderSocialLinks('flex flex-wrap gap-3', 'p-2 rounded-lg transition-opacity hover:opacity-80', mutedColor)}
                    <p className="max-w-2xl text-sm md:text-base" style={{ color: mutedColor }}>{actualDescription}</p>
                  </div>
                  {renderCtaCard()}
                </div>
                <div className="mt-12 text-right">{renderLegal()}</div>
              </div>
            </footer>
          );

        case 'landscape-links':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t min-h-[520px]" style={richFooterStyle}>
              <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
                {renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-5 gap-8 max-w-7xl mx-auto', headingColor: actualColors.heading, textColor: actualColors.heading, titleClassName: 'text-lg font-bold mb-5 font-header', listClassName: 'space-y-3 font-body' })}
                <div className="mt-48 flex flex-wrap items-center gap-8" style={{ color: actualColors.heading }}>
                  {renderLegal('text-base', actualColors.heading)}
                  {displayColumns.flatMap(column => column.links || []).slice(0, 2).map((link, index) => <span key={index}>{renderLink(link as any, 'text-base transition-opacity hover:opacity-80', actualColors.heading)}</span>)}
                </div>
              </div>
            </footer>
          );

        case 'social-directory':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={richFooterStyle}>
              <div className="container mx-auto px-6 pt-16 md:pt-24 pb-8 relative z-10">
                <div className="grid lg:grid-cols-[0.9fr_2.3fr] gap-16">
                  <div className="space-y-12">
                    {renderBrandMark('h-16 w-16 rounded-2xl')}
                    <div>
                      <p className="text-sm mb-4" style={{ color: mutedColor }}>{languageText}</p>
                      <div className="rounded-xl px-5 py-4 max-w-xs flex items-center justify-between" style={{ backgroundColor: panelBackground, color: panelText }}>
                        <span>{countryText || 'English'}</span>
                        <span>v</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm mb-4" style={{ color: mutedColor }}>Social</p>
                      {renderSocialLinks('flex flex-wrap gap-4', 'p-1 transition-opacity hover:opacity-80', actualColors.heading)}
                    </div>
                  </div>
                  {renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-4 gap-10', headingColor: mutedColor, textColor: actualColors.heading, titleClassName: 'text-sm font-semibold mb-5 font-header', listClassName: 'space-y-4 font-body' })}
                </div>
                <p className="mt-24 text-7xl md:text-9xl lg:text-[12rem] leading-none font-black font-header truncate" style={{ color: wordmarkColor }}>
                  {footerWordmark}
                </p>
              </div>
            </footer>
          );

        case 'super-wordmark':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={richFooterStyle}>
              <div className="container mx-auto px-4 py-10 md:py-14 relative z-10">
                <div className="rounded-[2rem] p-8 md:p-14" style={{ backgroundColor: panelBackground || '#ffffff', color: panelText || '#111111' }}>
                  <p className="text-6xl md:text-9xl lg:text-[11rem] leading-none font-black font-header truncate mb-12" style={{ color: wordmarkColor }}>
                    {footerWordmark}
                  </p>
                  {renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-5 gap-8', headingColor: panelText, textColor: panelText, titleClassName: 'text-sm font-bold mb-4 font-header', listClassName: 'space-y-4 font-body font-semibold' })}
                  <div className="mt-16">{renderLegal('text-xs uppercase', panelText)}</div>
                </div>
              </div>
            </footer>
          );

        case 'gradient-silhouette':
          return (
            <footer id="contact" data-footer-style={variantMeta.value} className="relative overflow-hidden border-t" style={{ ...richFooterStyle, backgroundImage: richFooterStyle.backgroundImage || `radial-gradient(circle at 50% 78%, ${alphaColor(accentColor, 0.8, 'rgba(37,99,235,0.8)')}, transparent 28%), linear-gradient(115deg, transparent 0 18%, ${alphaColor(accentColor, 0.32, 'rgba(37,99,235,0.32)')} 18% 26%, transparent 26% 100%), linear-gradient(65deg, transparent 0 68%, ${alphaColor(accentColor, 0.28, 'rgba(37,99,235,0.28)')} 68% 76%, transparent 76% 100%)` }}>
              <div className="container mx-auto px-6 py-16 md:py-24 relative z-10 min-h-[560px] flex flex-col">
                <div className="grid lg:grid-cols-[1fr_2.4fr] gap-16">
                  <div className="space-y-5">
                    {renderBrandRow('text-2xl md:text-3xl font-bold font-header')}
                    <p className="max-w-xs" style={{ color: mutedColor }}>{actualDescription}</p>
                    {renderSocialLinks('flex flex-wrap gap-3', 'p-2 transition-opacity hover:opacity-80', actualColors.heading)}
                  </div>
                  {renderColumns({ columnsClassName: 'grid grid-cols-2 md:grid-cols-4 gap-10', headingColor: actualColors.heading, textColor: mutedColor, titleClassName: 'text-xs uppercase font-bold tracking-wider mb-5 font-header', listClassName: 'space-y-4 font-body' })}
                </div>
                <div className="mt-auto pt-24 border-t flex flex-col md:flex-row md:justify-between gap-5" style={{ borderColor: actualColors.border }}>
                  {renderLegal('text-sm', actualColors.heading)}
                  <span className="text-sm" style={{ color: actualColors.heading }}>{actualTitle}</span>
                </div>
              </div>
            </footer>
          );

        default:
          return null;
      }
    };

    if (variant !== 'classic' && variant !== 'neon-glow') {
      const richFooter = renderRichFooter();
      if (richFooter) return richFooter;
    }

    return (
      <footer id="contact" className={footerClasses} style={footerStyles}>
        {/* Glow accent under footer top edge */}
        {footerVariant === 'neon-glow' && cardGlow?.enabled !== false && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-1 opacity-50 blur-sm pointer-events-none" style={{ backgroundColor: cardGlow?.color || '#144CCD' }} />
        )}
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            <div className="lg:col-span-4">
              {/* Logo or Title */}
              {logoType === 'image' && logoImageUrl ? (
                <img
                  src={logoImageUrl}
                  alt={actualTitle}
                  className="h-10 md:h-12 w-auto mb-4 object-contain"
                />
              ) : (
                <h3 className={`${titleSizeClasses[titleFontSize]} font-bold text-site-heading mb-4 font-header`} style={{ color: actualColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{actualTitle}</h3>
              )}
              <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body max-w-xs`} style={{ color: actualColors.text }}>
                {actualDescription}
              </p>

              {/* Contact Information */}
              {contactInfo && (contactInfo.address || contactInfo.phone || contactInfo.email) && (
                <div className="mt-6 space-y-3">
                  {/* Address */}
                  {contactInfo.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: actualColors.linkHover }} />
                      <div className="text-sm font-body" style={{ color: actualColors.text }}>
                        <p>{contactInfo.address}</p>
                        {(contactInfo.city || contactInfo.state || contactInfo.zipCode) && (
                          <p>
                            {[contactInfo.city, contactInfo.state, contactInfo.zipCode].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {contactInfo.country && <p>{contactInfo.country}</p>}
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {contactInfo.phone && (
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="flex items-center gap-2 text-sm font-body hover:opacity-80 transition-opacity"
                      style={{ color: actualColors.text }}
                    >
                      <Phone size={16} style={{ color: actualColors.linkHover }} />
                      {contactInfo.phone}
                    </a>
                  )}

                  {/* Email */}
                  {contactInfo.email && (
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="flex items-center gap-2 text-sm font-body hover:opacity-80 transition-opacity"
                      style={{ color: actualColors.text }}
                    >
                      <Mail size={16} style={{ color: actualColors.linkHover }} />
                      {contactInfo.email}
                    </a>
                  )}
                </div>
              )}
            </div>

            {resolvedLinkColumns.map((column, index) => (
              <div key={index} className="lg:col-span-2">
                <h4 className="font-semibold text-site-heading mb-4 font-header" style={{ color: actualColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{column.title}</h4>
                <ul className="space-y-2 font-body">
                  {(column.links || []).map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href={link.href || (link as any).url || '#'}
                        onClick={(e) => {
                          const href = link.href || (link as any).url || '#';
                          if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
                            e.preventDefault();
                            onNavigate(href);
                          }
                        }}
                        className="text-sm"
                        style={{ color: actualColors.text }}
                      >
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Business Hours */}
            {contactInfo?.businessHours && (
              <div className="lg:col-span-3">
                <BusinessHours
                  businessHours={contactInfo.businessHours}
                  colors={{
                    text: actualColors.text,
                    heading: actualColors.heading,
                    accent: actualColors.linkHover,
                  }}
                  variant="compact"
                  title="Hours"
                />
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 flex flex-col lg:flex-row justify-between items-center" style={{ borderTopColor: actualColors.border }}>
            <div className="text-sm font-body mb-4 lg:mb-0 flex flex-wrap items-center gap-1" style={{ color: actualColors.text }}>
              <span>{finalCopyrightText}</span>
              {/* Made with Quimera badge - visible unless branding is hidden */}
              {!shouldHideBranding && (
                <>
                  <span className="mx-1">·</span>
                  <a
                    href="https://quimera.ai?ref=badge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    style={{ color: actualColors.text }}
                    title="Create your website with Quimera AI"
                  >
                    <span>Made with</span>
                    <img
                      src={quimeraLogoUrl}
                      alt="Quimera"
                      className="w-4 h-4 object-contain"
                    />
                    <span className="font-medium" style={{ color: actualColors.linkHover }}>Quimera</span>
                  </a>
                </>
              )}
            </div>
            <div className="flex space-x-3">
              {Array.isArray(socialLinks) && socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg"
                  style={{ color: actualColors.text }}
                  title={link.platform}
                >
                  {socialIconComponents[link.platform]}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  };

export default Footer;
