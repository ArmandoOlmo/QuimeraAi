
import React from 'react';
import { FooterData, SocialPlatform, FontSize } from '../types';
import { Twitter, Github, Facebook, Instagram, Linkedin, MapPin, Phone, Mail } from 'lucide-react';
import BusinessHours from './BusinessHours';

// Quimera logo URL for the badge
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const socialIconComponents: Record<SocialPlatform, React.ReactNode> = {
  twitter: <Twitter className="w-6 h-6" />,
  github: <Github className="w-6 h-6" />,
  facebook: <Facebook className="w-6 h-6" />,
  instagram: <Instagram className="w-6 h-6" />,
  linkedin: <Linkedin className="w-6 h-6" />,
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
  companyName, tagline, copyright // Accept alternative prop names from editor
}) => {
    // Use alternative prop names if original ones are not provided
    const actualTitle = title || companyName;
    const actualDescription = description || tagline;
    const actualCopyrightText = copyrightText || copyright;

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

    return (
      <footer id="contact" className="border-t" style={{ backgroundColor: actualColors.background, borderColor: actualColors.border }}>
        <div className="container mx-auto px-6 py-12">
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
              {/* Made with Quimera badge - visible unless hideBranding is true */}
              {!hideBranding && (
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
                      src={QUIMERA_LOGO}
                      alt="Quimera"
                      className="w-4 h-4 object-contain"
                    />
                    <span className="font-medium" style={{ color: actualColors.linkHover }}>Quimera</span>
                  </a>
                </>
              )}
            </div>
            <div className="flex space-x-3">
              {socialLinks.map((link, index) => (
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

