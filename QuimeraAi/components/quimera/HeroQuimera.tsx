import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HeroQuimeraProps {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    badgeText?: string;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
        secondaryText?: string;
    };
    textDropShadow?: boolean;
    // Background image
    backgroundImageUrl?: string;
    backgroundOverlayEnabled?: boolean;
    backgroundOverlayColor?: string;
    backgroundOverlayOpacity?: number;
    backgroundPosition?: string;
    glassEffect?: boolean;
    // Decoration
    showDecoration?: boolean;
    showParticles?: boolean;
    // Layout
    sectionHeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    isPreviewMode?: boolean;
}

const HeroQuimera: React.FC<HeroQuimeraProps> = ({
    title,
    subtitle,
    buttonText,
    buttonLink = '/register',
    secondaryButtonText,
    secondaryButtonLink = '/contact',
    badgeText,
    colors = {},
    textDropShadow = false,
    backgroundImageUrl,
    backgroundOverlayEnabled = true,
    backgroundOverlayColor,
    backgroundOverlayOpacity = 60,
    backgroundPosition = 'center center',
    glassEffect = false,
    showDecoration = true,
    showParticles = true,
    sectionHeight = 80,
    textAlign = 'center',
    isPreviewMode = false,
}) => {
    const { t } = useTranslation();

    const bgColor = colors.background || '#0A0A0A';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';
    const secondaryColor = colors.secondaryText || '#d1d5db'; // gray-300

    const displayTitle = title || t('editor.placeholder.title', 'La plataforma definitiva para la era de la IA');
    const displaySubtitle = subtitle || t('editor.placeholder.subtitle', 'Crea sitios web, tiendas y directorios inmobiliarios impulsados por IA en segundos.');
    const displayBtn = buttonText || t('editor.placeholder.button', 'Comenzar Gratis');
    const displayBadge = badgeText || 'QuimeraAi Agency OS 2.0';

    // Text alignment classes
    const alignItems = textAlign === 'left' ? 'items-start' : textAlign === 'right' ? 'items-end' : 'items-center';
    const textAlignClass = textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center';

    // Click handler that respects preview mode
    const handleButtonClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, link: string) => {
        if (isPreviewMode) {
            e.preventDefault();
            return;
        }
    };

    // Compute overlay color from the prop or fallback to background
    const overlayColor = backgroundOverlayColor || bgColor;

    return (
        <section
            className={`flex flex-col justify-center py-16 md:py-20 px-4 sm:px-6 relative overflow-hidden ${alignItems} ${textAlignClass} font-button button-caps`}
            style={{
                backgroundColor: bgColor,
                color: textColor,
                minHeight: `${sectionHeight}vh`,
            }}
        >
            {/* Background Image Layer */}
            {backgroundImageUrl && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={backgroundImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: backgroundPosition }}
                    />
                    {/* Overlay */}
                    {backgroundOverlayEnabled && (
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor: overlayColor,
                                opacity: backgroundOverlayOpacity / 100,
                            }}
                        />
                    )}
                </div>
            )}

            {/* Glass effect layer */}
            {glassEffect && (
                <div
                    className="absolute inset-0 z-[1]"
                    style={{
                        backdropFilter: 'blur(24px) saturate(1.6)',
                        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                    }}
                />
            )}

            {/* Hero Background Animations — only shown when showDecoration is true */}
            {showDecoration && (
                <div className="absolute inset-0 z-0 pointer-events-none -translate-y-20">
                    {/* Deep warm ambient glow layers */}
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 120% 80% at 50% 55%, rgba(160, 120, 20, 0.12) 0%, rgba(120, 80, 10, 0.06) 40%, transparent 70%)',
                    }} />
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(200, 150, 30, 0.08) 0%, transparent 60%)',
                    }} />
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 60% 40% at 70% 45%, rgba(180, 130, 20, 0.08) 0%, transparent 60%)',
                    }} />

                    {/* Pulsing ambient glow behind ribbons */}
                    <div className="absolute" style={{
                        width: '60%', height: '40%', left: '20%', top: '10%',
                        background: 'radial-gradient(ellipse, rgba(218,165,32,0.1) 0%, transparent 70%)',
                        animation: 'heroPulse 8s ease-in-out infinite',
                    }} />

                    <style>{`
                      @keyframes heroPulse {
                        0%, 100% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 0.6; transform: scale(1.08); }
                      }
                    `}</style>

                    {/* Main SVG wave system — extra wide to prevent edge clipping */}
                    <svg
                        className="absolute top-0"
                        style={{ width: '300%', height: '100%', left: '-100%' }}
                        viewBox="0 0 3000 1000"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient id="gold3d1" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(120,80,10,0)" />
                                <stop offset="10%" stopColor="rgba(160,110,20,0.3)" />
                                <stop offset="30%" stopColor="rgba(218,165,32,0.7)" />
                                <stop offset="45%" stopColor="rgba(255,210,60,0.9)" />
                                <stop offset="55%" stopColor="rgba(255,220,80,1)" />
                                <stop offset="70%" stopColor="rgba(218,165,32,0.7)" />
                                <stop offset="90%" stopColor="rgba(160,110,20,0.3)" />
                                <stop offset="100%" stopColor="rgba(120,80,10,0)" />
                            </linearGradient>
                            <linearGradient id="gold3dShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(80,50,5,0)" />
                                <stop offset="15%" stopColor="rgba(100,60,10,0.4)" />
                                <stop offset="40%" stopColor="rgba(140,90,15,0.6)" />
                                <stop offset="60%" stopColor="rgba(140,90,15,0.6)" />
                                <stop offset="85%" stopColor="rgba(100,60,10,0.4)" />
                                <stop offset="100%" stopColor="rgba(80,50,5,0)" />
                            </linearGradient>
                            <linearGradient id="gold3dHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(255,230,120,0)" />
                                <stop offset="20%" stopColor="rgba(255,240,150,0.2)" />
                                <stop offset="45%" stopColor="rgba(255,250,200,0.6)" />
                                <stop offset="55%" stopColor="rgba(255,250,200,0.6)" />
                                <stop offset="80%" stopColor="rgba(255,240,150,0.2)" />
                                <stop offset="100%" stopColor="rgba(255,230,120,0)" />
                            </linearGradient>
                            <linearGradient id="gold3d2" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(140,90,10,0)" />
                                <stop offset="15%" stopColor="rgba(180,120,20,0.35)" />
                                <stop offset="40%" stopColor="rgba(210,155,35,0.6)" />
                                <stop offset="60%" stopColor="rgba(210,155,35,0.6)" />
                                <stop offset="85%" stopColor="rgba(180,120,20,0.35)" />
                                <stop offset="100%" stopColor="rgba(140,90,10,0)" />
                            </linearGradient>
                            <filter id="softGlow3d">
                                <feGaussianBlur stdDeviation="12" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="deepShadow">
                                <feGaussianBlur stdDeviation="20" />
                            </filter>
                            <filter id="specular3d">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Layer 1: Deep shadow (bottom) */}
                        <path
                            d="M-200,320 C200,220 500,420 900,280 C1300,140 1600,380 2000,260 C2400,140 2700,340 3200,300"
                            fill="none"
                            stroke="url(#gold3dShadow)"
                            strokeWidth="100"
                            strokeLinecap="round"
                            filter="url(#deepShadow)"
                            opacity="0.5"
                            style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                        />
                        {/* Layer 2: Main thick ribbon body */}
                        <path
                            d="M-200,300 C200,180 500,400 900,260 C1300,120 1600,360 2000,240 C2400,120 2700,320 3200,280"
                            fill="none"
                            stroke="url(#gold3d1)"
                            strokeWidth="70"
                            strokeLinecap="round"
                            filter="url(#softGlow3d)"
                            style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                        />
                        {/* Layer 3: Specular highlight */}
                        <path
                            d="M-200,295 C200,178 500,395 900,255 C1300,118 1600,355 2000,235 C2400,118 2700,315 3200,275"
                            fill="none"
                            stroke="url(#gold3dHighlight)"
                            strokeWidth="20"
                            strokeLinecap="round"
                            filter="url(#specular3d)"
                            style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                        />
                        {/* Layer 4: Secondary ribbon shadow */}
                        <path
                            d="M-200,370 C300,270 600,470 1000,330 C1400,190 1700,410 2100,290 C2500,170 2800,370 3200,340"
                            fill="none"
                            stroke="url(#gold3dShadow)"
                            strokeWidth="65"
                            strokeLinecap="round"
                            filter="url(#deepShadow)"
                            opacity="0.4"
                            style={{ animation: 'goldFlow2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                        />
                        {/* Layer 5: Secondary ribbon */}
                        <path
                            d="M-200,350 C300,250 600,450 1000,310 C1400,170 1700,390 2100,270 C2500,150 2800,350 3200,320"
                            fill="none"
                            stroke="url(#gold3d2)"
                            strokeWidth="50"
                            strokeLinecap="round"
                            filter="url(#softGlow3d)"
                            style={{ animation: 'goldFlow2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                        />
                        {/* Layer 6: Thin accent filament - top */}
                        <path
                            d="M-200,260 C250,350 550,170 850,290 C1150,410 1450,200 1750,280 C2050,360 2350,190 2650,270 C2950,350 3100,220 3200,260"
                            fill="none"
                            stroke="url(#gold3dHighlight)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            filter="url(#specular3d)"
                            opacity="0.7"
                            style={{ animation: 'goldFlow3 30s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                        />
                        {/* Layer 7: Thin accent filament - bottom */}
                        <path
                            d="M-200,330 C300,400 600,230 900,340 C1200,450 1500,240 1800,330 C2100,420 2400,250 2700,330 C2900,380 3100,290 3200,330"
                            fill="none"
                            stroke="url(#gold3d1)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            opacity="0.4"
                            style={{ animation: 'goldFlow3 30s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite reverse' }}
                        />
                    </svg>
                    
                    <style>{`
                      @keyframes goldFlow1 {
                        0%   { transform: translateX(0%) translateY(0px); }
                        10%  { transform: translateX(1.5%) translateY(-8px); }
                        20%  { transform: translateX(3%) translateY(-15px); }
                        30%  { transform: translateX(2%) translateY(-5px); }
                        40%  { transform: translateX(-1%) translateY(10px); }
                        50%  { transform: translateX(-2.5%) translateY(18px); }
                        60%  { transform: translateX(-1.5%) translateY(12px); }
                        70%  { transform: translateX(1%) translateY(-3px); }
                        80%  { transform: translateX(2.5%) translateY(-12px); }
                        90%  { transform: translateX(1%) translateY(-5px); }
                        100% { transform: translateX(0%) translateY(0px); }
                      }
                      @keyframes goldFlow2 {
                        0%   { transform: translateX(0%) translateY(0px); }
                        15%  { transform: translateX(-2%) translateY(12px); }
                        30%  { transform: translateX(-3.5%) translateY(20px); }
                        45%  { transform: translateX(-1%) translateY(8px); }
                        55%  { transform: translateX(1.5%) translateY(-6px); }
                        70%  { transform: translateX(3%) translateY(-16px); }
                        85%  { transform: translateX(1.5%) translateY(-8px); }
                        100% { transform: translateX(0%) translateY(0px); }
                      }
                      @keyframes goldFlow3 {
                        0%   { transform: translateX(0%) translateY(0px); }
                        12%  { transform: translateX(1%) translateY(10px); }
                        25%  { transform: translateX(2.5%) translateY(16px); }
                        37%  { transform: translateX(1%) translateY(6px); }
                        50%  { transform: translateX(-1.5%) translateY(-8px); }
                        62%  { transform: translateX(-3%) translateY(-18px); }
                        75%  { transform: translateX(-2%) translateY(-10px); }
                        87%  { transform: translateX(-0.5%) translateY(-3px); }
                        100% { transform: translateX(0%) translateY(0px); }
                      }
                    `}</style>
                </div>
            )}

            {/* Particles Effect Layer */}
            {showParticles && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {/* Floating gold particles */}
                    {[
                        { left: '10%', top: '15%', size: 4, dur: '14s', delay: '0s' },
                        { left: '25%', top: '25%', size: 3, dur: '18s', delay: '2s' },
                        { left: '45%', top: '10%', size: 5, dur: '16s', delay: '4s' },
                        { left: '60%', top: '20%', size: 3, dur: '20s', delay: '1s' },
                        { left: '75%', top: '30%', size: 4, dur: '15s', delay: '3s' },
                        { left: '85%', top: '12%', size: 3, dur: '17s', delay: '5s' },
                        { left: '35%', top: '35%', size: 2, dur: '22s', delay: '6s' },
                        { left: '55%', top: '5%', size: 3, dur: '19s', delay: '7s' },
                        { left: '15%', top: '45%', size: 3, dur: '15s', delay: '1s' },
                        { left: '5%', top: '65%', size: 4, dur: '21s', delay: '4s' },
                        { left: '30%', top: '85%', size: 2, dur: '17s', delay: '2s' },
                        { left: '50%', top: '55%', size: 5, dur: '19s', delay: '8s' },
                        { left: '65%', top: '75%', size: 3, dur: '14s', delay: '3s' },
                        { left: '80%', top: '90%', size: 4, dur: '23s', delay: '7s' },
                        { left: '95%', top: '40%', size: 2, dur: '16s', delay: '5s' },
                        { left: '90%', top: '60%', size: 3, dur: '20s', delay: '0s' },
                        { left: '40%', top: '95%', size: 4, dur: '18s', delay: '9s' },
                        { left: '20%', top: '80%', size: 3, dur: '22s', delay: '6s' },
                        { left: '70%', top: '50%', size: 2, dur: '15s', delay: '2s' },
                        { left: '8%', top: '85%', size: 5, dur: '24s', delay: '1s' },
                        { left: '88%', top: '25%', size: 3, dur: '19s', delay: '4s' },
                        { left: '42%', top: '65%', size: 4, dur: '17s', delay: '8s' },
                        { left: '58%', top: '40%', size: 2, dur: '21s', delay: '3s' },
                        { left: '28%', top: '55%', size: 3, dur: '16s', delay: '5s' },
                        { left: '78%', top: '70%', size: 4, dur: '20s', delay: '7s' },
                        { left: '52%', top: '90%', size: 3, dur: '18s', delay: '2s' },
                        { left: '12%', top: '50%', size: 2, dur: '14s', delay: '6s' },
                        { left: '92%', top: '85%', size: 4, dur: '22s', delay: '0s' },
                        { left: '38%', top: '20%', size: 3, dur: '15s', delay: '4s' },
                        { left: '68%', top: '15%', size: 2, dur: '19s', delay: '1s' },
                        { left: '82%', top: '45%', size: 5, dur: '23s', delay: '9s' },
                        { left: '18%', top: '70%', size: 3, dur: '17s', delay: '3s' },
                    ].map((p, i) => (
                        <div key={`particle-${i}`} className="absolute rounded-full" style={{
                            left: p.left, top: p.top, width: `${p.size}px`, height: `${p.size}px`,
                            background: 'radial-gradient(circle, rgba(255,220,80,0.8), rgba(218,165,32,0.3))',
                            boxShadow: '0 0 8px rgba(218,165,32,0.4)',
                            animation: `heroParticle ${p.dur} ease-in-out ${p.delay} infinite`,
                        }} />
                    ))}
                    <style>{`
                      @keyframes heroParticle {
                        0%   { transform: translate(0, 0) scale(1); opacity: 0.3; }
                        20%  { transform: translate(15px, -25px) scale(1.3); opacity: 0.7; }
                        40%  { transform: translate(-10px, -40px) scale(0.8); opacity: 0.4; }
                        60%  { transform: translate(20px, -15px) scale(1.1); opacity: 0.6; }
                        80%  { transform: translate(-5px, -30px) scale(0.9); opacity: 0.3; }
                        100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
                      }
                    `}</style>
                </div>
            )}

            {/* Content Layer */}
            <div className={`relative z-10 w-full max-w-7xl mx-auto flex flex-col ${alignItems} font-body`}>
                
                {/* Agency Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-8 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                    {displayBadge}
                </div>

                <h1 className={`text-4xl sm:text-5xl lg:text-[5.5rem] font-black mb-6 tracking-tight animate-fade-in-up leading-tight ${textDropShadow ? 'drop-shadow-2xl' : ''} font-header heading-caps`} style={{ animationDelay: '0.2s', maxWidth: '1000px', textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                    <span dangerouslySetInnerHTML={{ __html: displayTitle.replace(/IA/g, `<span class="text-transparent bg-clip-text" style="background-image: linear-gradient(to right, ${accentColor}, ${accentColor}80)">IA</span>`).replace(/AI/g, `<span class="text-transparent bg-clip-text" style="background-image: linear-gradient(to right, ${accentColor}, ${accentColor}80)">AI</span>`) }} />
                </h1>

                <p className={`text-xl md:text-2xl mb-10 max-w-3xl leading-relaxed animate-fade-in-up font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ animationDelay: '0.3s', color: secondaryColor }}>
                    {displaySubtitle}
                </p>

                <div className={`flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: '0.4s' }}>
                    <a
                        href={buttonLink}
                        onClick={(e) => handleButtonClick(e, buttonLink)}
                        className="group relative px-8 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-lg overflow-hidden font-button button-caps"
                        style={{ backgroundColor: accentColor, color: '#000000', boxShadow: `0 0 40px ${accentColor}4D`, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        {displayBtn} <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </a>
                    
                    {secondaryButtonText && (
                        <a
                            href={secondaryButtonLink}
                            onClick={(e) => handleButtonClick(e, secondaryButtonLink)}
                            className="px-8 py-4 font-medium rounded-xl transition-all flex items-center justify-center text-lg backdrop-blur-sm font-button button-caps border"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: textColor, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
                        >
                            {secondaryButtonText}
                        </a>
                    )}
                </div>
            </div>
            
            {/* Gradient Overlay at bottom for smooth transition to next section */}
            <div 
                className="absolute bottom-0 left-0 w-full h-32 z-0 pointer-events-none" 
                style={{ background: `linear-gradient(to top, ${bgColor}, transparent)` }}
            />
        </section>
    );
};

export default HeroQuimera;
