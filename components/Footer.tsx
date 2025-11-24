
import React from 'react';
import { FooterData, SocialPlatform, FontSize } from '../types';
import { Twitter, Github, Facebook, Instagram, Linkedin } from 'lucide-react';
import { useDesignTokens } from '../hooks/useDesignTokens';

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

const Footer: React.FC<FooterData> = ({ 
  title, description, linkColumns, socialLinks, copyrightText, colors, titleFontSize = 'sm', descriptionFontSize = 'sm'
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Merge Design Tokens with component colors
  const actualColors = {
    background: colors.background,
    border: colors.border,
    text: colors.text,
    heading: colors.heading,
    linkHover: getColor('primary.main', colors.linkHover),
  };

  const currentYear = new Date().getFullYear();
  const finalCopyrightText = copyrightText.replace('{YEAR}', currentYear.toString());

  return (
    <footer id="contact" className="border-t" style={{ backgroundColor: actualColors.background, borderColor: actualColors.border }}>
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
          
          <div className="sm:col-span-2 lg:col-span-4">
            <h3 className={`${titleSizeClasses[titleFontSize]} font-bold text-site-heading mb-4 font-header`} style={{ color: actualColors.heading }}>{title}</h3>
            <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body max-w-xs`} style={{ color: actualColors.text }}>
              {description}
            </p>
          </div>

          {linkColumns.map((column, index) => (
            <div key={index} className="lg:col-span-2">
              <h4 className="font-semibold text-site-heading mb-4 font-header">{column.title}</h4>
              <ul className="space-y-2 font-body">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href} 
                      className="transition-colors duration-300 text-sm" 
                      style={{ color: actualColors.text }}
                      onMouseEnter={(e) => e.currentTarget.style.color = actualColors.linkHover}
                      onMouseLeave={(e) => e.currentTarget.style.color = actualColors.text}
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center" style={{ borderTopColor: actualColors.border }}>
          <p className="text-sm font-body mb-4 sm:mb-0" style={{ color: actualColors.text }}>
            {finalCopyrightText}
          </p>
          <div className="flex space-x-4">
            {socialLinks.map((link, index) => (
              <a 
                key={index} 
                href={link.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="transition-colors duration-300"
                style={{ color: actualColors.text }}
                onMouseEnter={(e) => e.currentTarget.style.color = actualColors.linkHover}
                onMouseLeave={(e) => e.currentTarget.style.color = actualColors.text}
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
