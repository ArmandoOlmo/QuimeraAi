import React from 'react';
import { HeroData, BorderRadiusSize, FontSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';

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
  full: 'rounded-full',
};

interface HeroProps extends HeroData {
    borderRadius: BorderRadiusSize;
}

const HeroModern: React.FC<HeroProps> = ({ 
    headline, subheadline, primaryCta, secondaryCta, imageUrl, 
    colors, borderRadius,
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    showBadge = true, badgeText = 'AI-Powered Generation', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    showStats = true, stats = [],
    statsValueColor,
}) => {
  console.log('🚀 HeroModern rendering with imageUrl:', imageUrl);
  const { getColor } = useDesignTokens();
  
  // Forzamos colores claros para texto ya que el fondo es una imagen oscura
  const actualColors = {
    primary: getColor('primary.main', colors.primary),
    secondary: getColor('secondary.main', colors.secondary),
    text: '#ffffff', 
    heading: '#ffffff',
    buttonBackground: getColor('primary.main', colors.buttonBackground),
    buttonText: colors.buttonText || '#ffffff',
    secondaryButtonBackground: 'rgba(255,255,255,0.1)', // Efecto cristal
    secondaryButtonText: '#ffffff',
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
      {/* Imagen de Fondo Full Bleed */}
      <div className="absolute inset-0 z-0">
         <img 
            src={imageUrl} 
            alt="Hero Background" 
            className="w-full h-full object-cover"
         />
         {/* Superposición de Gradiente para legibilidad */}
         <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90"></div>
         
         {/* Efectos de luz decorativos opcionales */}
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-40"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center max-w-5xl flex flex-col items-center">
         
         {/* Badge Flotante */}
         {showBadge && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 border border-white/10 backdrop-blur-md bg-white/5 shadow-xl animate-fade-in-up">
               <span className="text-base animate-pulse" style={{ color: badgeColor || actualColors.primary }}>{badgeIcon}</span>
               <span className="text-sm font-bold tracking-wide uppercase text-white/90">{badgeText}</span>
            </div>
         )}

         {/* Título Principal */}
         <h1 
            className={`${headlineSizeClasses[headlineFontSize]} font-black tracking-tight mb-8 leading-[1.1] drop-shadow-2xl animate-fade-in-up font-header`}
            style={{ animationDelay: '0.1s', color: actualColors.heading }}
            dangerouslySetInnerHTML={{ __html: styledHeadline }}
         />
         
         {/* Subtítulo */}
         <p 
            className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-12 opacity-90 drop-shadow-lg max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up font-body`}
            style={{ animationDelay: '0.2s', color: actualColors.text }}
         >
            {subheadline}
         </p>

         {/* Botones de Acción */}
         <div className="flex flex-col sm:flex-row justify-center gap-5 mb-16 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
             <a 
                href="#cta"
                className={`py-4 px-10 font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] font-button ${borderRadiusClasses[borderRadius]}`}
                style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}
             >
                {primaryCta}
             </a>
             <a 
                href="#features"
                className={`py-4 px-10 font-bold text-lg backdrop-blur-md transition-all duration-300 hover:bg-white/20 border border-white/20 hover:border-white/40 font-button ${borderRadiusClasses[borderRadius]}`}
                style={{ backgroundColor: actualColors.secondaryButtonBackground, color: actualColors.secondaryButtonText }}
             >
                {secondaryCta}
             </a>
         </div>

         {/* Estadísticas en Grid Transparente */}
         {showStats && stats && stats.length > 0 && (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-20 pt-10 border-t border-white/10 w-full max-w-3xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                 {stats.map((stat, idx) => (
                     <div key={idx} className="text-center group cursor-default">
                         <div className="text-3xl md:text-5xl font-bold mb-2 transition-colors duration-300 group-hover:brightness-125" style={{ color: statsValueColor || actualColors.primary }}>
                             {stat.value}
                         </div>
                         <div className="text-sm uppercase tracking-wider text-gray-400 font-medium group-hover:text-white transition-colors">
                             {stat.label}
                         </div>
                     </div>
                 ))}
             </div>
         )}
      </div>
    </section>
  );
};

export default HeroModern;

