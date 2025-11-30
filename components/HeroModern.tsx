import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

// Ajustamos los tamaños para que sean más impactantes en este diseño full-screen
const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-3xl md:text-4xl',
    md: 'text-4xl md:text-6xl',
    lg: 'text-5xl md:text-7xl',
    xl: 'text-6xl md:text-8xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-3xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-3xl',
};

const paddingYClasses: Record<PaddingSize, string> = {
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
};

const paddingXClasses: Record<PaddingSize, string> = {
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

// Helper function to render badge icon (supports both emoji strings and Lucide icons)
const renderBadgeIcon = (badgeIcon?: ServiceIcon | string) => {
    if (!badgeIcon) return '✨';
    if (badgeIcon.length <= 2) return badgeIcon;
    
    const iconMap: Record<string, any> = {
        'sparkles': LucideIcons.Sparkles, 'zap': LucideIcons.Zap, 'star': LucideIcons.Star,
        'award': LucideIcons.Award, 'trophy': LucideIcons.Trophy, 'rocket': LucideIcons.Rocket,
        'lightbulb': LucideIcons.Lightbulb, 'heart': LucideIcons.Heart, 'check-circle': LucideIcons.CheckCircle,
        'alert-circle': LucideIcons.AlertCircle, 'shield': LucideIcons.Shield, 'target': LucideIcons.Target,
        'trending-up': LucideIcons.TrendingUp, 'circle-dot': LucideIcons.CircleDot, 'hexagon': LucideIcons.Hexagon,
        'layers': LucideIcons.Layers,
    };
    
    const IconComponent = iconMap[badgeIcon];
    return IconComponent ? React.createElement(IconComponent, { size: 16, className: 'inline-block' }) : badgeIcon;
};

interface HeroProps extends HeroData {
    borderRadius: BorderRadiusSize;
}

const HeroModern: React.FC<HeroProps> = ({ 
    headline, subheadline, primaryCta, secondaryCta, imageUrl, 
    colors, borderRadius,
    paddingY = 'md', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    showBadge = true, badgeText = '', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    secondaryButtonStyle = 'outline',
    secondaryButtonOpacity = 100,
}) => {
  const { getColor } = useDesignTokens();
  
  // Component colors take priority - user colors override defaults
  const actualColors = {
    primary: colors.primary || getColor('primary.main', '#4f46e5'),
    secondary: colors.secondary || getColor('secondary.main', '#10b981'),
    text: '#ffffff', 
    heading: '#ffffff',
    buttonBackground: colors.buttonBackground || getColor('primary.main', '#4f46e5'),
    buttonText: colors.buttonText || '#ffffff',
    secondaryButtonBackground: colors.secondaryButtonBackground || '#ffffff',
    secondaryButtonText: colors.secondaryButtonText || '#ffffff',
  };

  // Manejo seguro del headline
  const safeHeadline = typeof headline === 'string' ? headline : 'Welcome';
  
  // Reemplaza spans para aplicar gradiente al texto destacado
  const styledHeadline = safeHeadline.replace(
      /(<span.*?>)(.*?)(<\/span>)/,
      `<span class="text-transparent bg-clip-text bg-gradient-to-r from-[${actualColors.primary}] to-[${actualColors.secondary}]">$2</span>`
  );

  return (
    <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* === ANIMATED MESH GRADIENT BACKGROUND === */}
      <div className="absolute inset-0 z-0">
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.25),rgba(0,0,0,0))]" />
        
        {/* Animated floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_30%,transparent_100%)]" />
      </div>

      {/* Imagen de Fondo Full Bleed con Parallax Effect */}
      {imageUrl && (
        <div className="absolute inset-0 z-0 transform-gpu">
           <img 
              src={imageUrl} 
              alt="Hero Background" 
              className="w-full h-full object-cover scale-105 transition-transform duration-1000"
           />
           {/* Gradient Overlay Mejorado con múltiples capas */}
           <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/95"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 via-transparent to-emerald-900/20"></div>
           
           {/* Efectos de luz decorativos opcionales */}
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent opacity-50"></div>
           <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent opacity-40"></div>
        </div>
      )}

      {/* Contenido */}
      <div className={`relative z-10 container mx-auto ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} text-center max-w-5xl flex flex-col items-center`}>
         
         {/* Badge Flotante Premium */}
         {showBadge && badgeText && (
            <div className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8 border border-white/10 backdrop-blur-md bg-white/5 animate-fade-in-up hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-default">
               <span className="relative flex items-center">
                 <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping-soft" style={{ backgroundColor: badgeColor || actualColors.primary }}></span>
                 <span className="relative text-base flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
               </span>
               <span className="text-sm font-bold tracking-wide uppercase text-white/90 group-hover:text-white transition-colors">{badgeText}</span>
            </div>
         )}

         {/* Título Principal */}
         <h1 
            className={`${headlineSizeClasses[headlineFontSize]} font-black tracking-tight mb-8 leading-[1.1] animate-fade-in-up font-header`}
            style={{ animationDelay: '0.1s', color: actualColors.heading }}
            dangerouslySetInnerHTML={{ __html: styledHeadline }}
         />
         
         {/* Subtítulo */}
         <p 
            className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-12 opacity-90 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up font-body`}
            style={{ animationDelay: '0.2s', color: actualColors.text }}
         >
            {subheadline}
         </p>

         {/* Botones de Acción Premium */}
         <div className="flex flex-col sm:flex-row justify-center gap-5 mb-16 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
             <a 
                href="#cta"
                className={`group relative overflow-hidden py-4 px-10 font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95 font-button ${borderRadiusClasses[borderRadius]}`}
                style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}
             >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {primaryCta}
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                {/* Shine effect overlay */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
             </a>
             <a 
                href="#features"
                className={`group py-4 px-10 font-bold text-lg backdrop-blur-md transition-all duration-300 hover:scale-105 font-button ${borderRadiusClasses[borderRadius]} ${
                  secondaryButtonStyle === 'outline' 
                    ? 'border-2 bg-transparent hover:bg-white/10' 
                    : secondaryButtonStyle === 'ghost'
                      ? 'bg-transparent hover:bg-white/10 border border-transparent'
                      : 'hover:brightness-110'
                }`}
                style={{ 
                  backgroundColor: secondaryButtonStyle === 'solid' 
                    ? hexToRgba(actualColors.secondaryButtonBackground || '#334155', secondaryButtonOpacity / 100)
                    : 'transparent',
                  borderColor: secondaryButtonStyle === 'outline' ? actualColors.secondaryButtonBackground : 'transparent',
                  color: actualColors.secondaryButtonText
                }}
             >
                <span className="flex items-center justify-center gap-2">
                  {secondaryCta}
                  <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
             </a>
         </div>

      </div>
    </section>
  );
};

export default HeroModern;

