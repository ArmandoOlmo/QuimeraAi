import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { sanitizeHtml } from '../utils/sanitize';
import { PortfolioNeonData } from '../types/components';

export interface PortfolioNeonProps extends PortfolioNeonData {
    isPreviewMode?: boolean;
}

const PortfolioNeon: React.FC<PortfolioNeonProps> = (props) => {
    const { t } = useTranslation();
    const data = props;

    // Fallbacks
    const headline = data.headline || 'Our Work';
    const subheadline = data.subheadline || 'A glimpse into our recent projects and designs.';
    const images = data.images && data.images.length > 0 ? data.images : [
        {
            url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800&ixlib=rb-4.0.3',
            title: 'Project Alpha',
            description: 'Retro game console interface design'
        },
        {
            url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=800&ixlib=rb-4.0.3',
            title: 'Project Beta',
            description: 'Cyberpunk city illustration'
        },
        {
            url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800&ixlib=rb-4.0.3',
            title: 'Project Gamma',
            description: 'Code and developer tools'
        }
    ];

    const colors = data.colors || {};
    const headlineFontFamily = data.headlineFont ? getFontStack(data.headlineFont) : 'var(--font-header)';
    const subheadlineFontFamily = data.subheadlineFont ? getFontStack(data.subheadlineFont) : 'var(--font-body)';

    // Box Shadow for Neon Glow
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 50;
    const blurRadius = (intensity / 100) * 20;
    const spreadRadius = (intensity / 100) * 2;
    const opacity = (intensity / 100) * 0.8;
    const neonColor = colors.neonGlow || '#FBB92B';
    
    const hoverGlowStyle = {
        boxShadow: `0 0 ${blurRadius}px ${spreadRadius}px ${neonColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: neonColor
    };

    return (
        <section 
            className="w-full relative py-24 px-6 md:px-12"
            style={{ 
                backgroundColor: colors.background,
                minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '100vh'
            }}
        >
            {/* Background Grid Pattern */}
            {data.showBackgroundGrid !== false && (
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${neonColor} 1px, transparent 1px), linear-gradient(90deg, ${neonColor} 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        backgroundPosition: 'center center'
                    }}
                />
            )}

            <div className="relative z-10 w-full max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    {headline && (
                        <h2 
                            className="text-4xl md:text-5xl font-bold font-header"
                            style={{ 
                                color: colors.heading || '#ffffff',
                                fontFamily: headlineFontFamily,
                                textTransform: 'var(--headings-transform, none)' as any,
                                letterSpacing: 'var(--headings-spacing, normal)'
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }}
                        />
                    )}
                    {subheadline && (
                        <p 
                            className="text-lg md:text-xl font-body opacity-80"
                            style={{ 
                                color: colors.text || '#a1a1aa',
                                fontFamily: subheadlineFontFamily
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subheadline) }}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {images.map((item, idx) => (
                        <div 
                            key={idx}
                            className={clsx(
                                "group relative overflow-hidden rounded-[2rem] transition-all duration-500 cursor-pointer h-80",
                                data.glassEffect ? "backdrop-blur-xl" : ""
                            )}
                            style={{
                                backgroundColor: data.glassEffect 
                                    ? `color-mix(in srgb, ${colors.cardBackground || '#141414'} 60%, transparent)` 
                                    : (colors.cardBackground || '#141414'),
                                borderWidth: intensity > 0 ? '1px' : '0px',
                                borderStyle: 'solid',
                                borderColor: 'rgba(255,255,255,0.05)'
                            }}
                            onMouseEnter={(e) => {
                                if (intensity > 0) {
                                    Object.assign(e.currentTarget.style, hoverGlowStyle);
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                            }}
                        >
                            <img 
                                src={item.url} 
                                alt={item.title || 'Portfolio Image'} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            
                            {/* Hover Overlay */}
                            <div 
                                className="absolute inset-0 flex flex-col justify-end p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                    background: `linear-gradient(to top, color-mix(in srgb, ${colors.cardBackground || '#000'} 90%, transparent), transparent)`
                                }}
                            >
                                <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500 space-y-2">
                                    {item.title && (
                                        <h3 
                                            className="text-2xl font-bold font-header"
                                            style={{ 
                                                color: colors.heading || '#ffffff',
                                                textShadow: intensity > 0 ? `0 0 10px ${neonColor}` : 'none'
                                            }}
                                        >
                                            {item.title}
                                        </h3>
                                    )}
                                    {item.description && (
                                        <p 
                                            className="text-base font-body opacity-90"
                                            style={{ color: colors.text || '#a1a1aa' }}
                                        >
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PortfolioNeon;
