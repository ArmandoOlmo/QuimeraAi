
import React, { useState, useEffect } from 'react';
import { FooterData, SocialPlatform, FontSize } from '../types';
import { Twitter, Github, Facebook, Instagram, Linkedin, MapPin, Phone, Mail, Youtube, Music, Pin, MessageCircle, Send, Ghost, Gamepad2, AtSign } from 'lucide-react';
import BusinessHours from './BusinessHours';
import { db, doc, getDoc } from '../firebase';
import { getNeonGlowStyles } from '../utils/colorUtils';

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
  footerVariant = 'classic', cardGlow
}) => {
    // Use alternative prop names if original ones are not provided
    const actualTitle = title || companyName;
    const actualDescription = description || tagline;
    const actualCopyrightText = copyrightText || copyright;

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
      // Fetch tenant doc to check for White Label branding
      const checkTenantBranding = async () => {
        try {
          const tenantRef = doc(db, 'tenants', `tenant_${userId}`);
          const tenantSnap = await getDoc(tenantRef);
          if (tenantSnap.exists()) {
            const data = tenantSnap.data();
            if (data?.branding?.companyName || data?.branding?.logoUrl) {
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
    };

    const currentYear = new Date().getFullYear();
    const finalCopyrightText = (actualCopyrightText || '© {YEAR} All rights reserved.').replace('{YEAR}', currentYear.toString());

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

    return (
      <footer id="contact" className={footerClasses} style={footerStyles}>
        {/* Glow accent under footer top edge */}
        {footerVariant === 'neon-glow' && cardGlow?.enabled !== false && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-1 opacity-50 blur-sm pointer-events-none" style={{ backgroundColor: cardGlow?.color || '#144CCD' }} />
        )}
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">

            <div className="sm:col-span-2 lg:col-span-4">
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

            {linkColumns.map((column, index) => (
              <div key={index} className="lg:col-span-2">
                <h4 className="font-semibold text-site-heading mb-4 font-header" style={{ color: actualColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{column.title}</h4>
                <ul className="space-y-2 font-body">
                  {(column.links || []).map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href={link.href}
                        onClick={(e) => {
                          if (onNavigate && !link.href.startsWith('http://') && !link.href.startsWith('https://')) {
                            e.preventDefault();
                            onNavigate(link.href);
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

          <div className="mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center" style={{ borderTopColor: actualColors.border }}>
            <div className="text-sm font-body mb-4 sm:mb-0 flex flex-wrap items-center gap-1" style={{ color: actualColors.text }}>
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

