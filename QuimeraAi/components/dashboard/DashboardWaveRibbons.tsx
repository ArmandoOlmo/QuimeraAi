import React from 'react';
import { useUI } from '../../contexts/core/UIContext';

type ThemeMode = 'light' | 'dark' | 'black';

/**
 * Theme-aware animated wave ribbons for dashboard backgrounds.
 * - Light mode: hidden
 * - Dark mode: violet/purple ribbons  
 * - Black mode: gold ribbons
 * 
 * Place inside a `position: relative` container. Renders as absolute overlay.
 */
const DashboardWaveRibbons: React.FC<{ className?: string }> = ({ className }) => {
    const { themeMode } = useUI();
    const mode = themeMode as ThemeMode;

    if (mode === 'light') return null;

    const isGold = mode === 'black';

    return (
        <div className={className || "absolute inset-x-0 top-0 h-64 z-[15] pointer-events-none overflow-hidden"}>
            <svg
                className="absolute"
                style={{ width: '300%', height: '100%', left: '-100%', top: '0' }}
                viewBox="0 0 3000 500"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="dashWaveMain" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={`rgba(${isGold ? '120,80,10' : '80,30,120'},0)`} />
                        <stop offset="10%" stopColor={`rgba(${isGold ? '180,140,30' : '120,50,180'},0.25)`} />
                        <stop offset="30%" stopColor={`rgba(${isGold ? '218,165,32' : '147,51,234'},0.55)`} />
                        <stop offset="50%" stopColor={`rgba(${isGold ? '255,200,50' : '168,85,247'},0.8)`} />
                        <stop offset="70%" stopColor={`rgba(${isGold ? '218,165,32' : '147,51,234'},0.55)`} />
                        <stop offset="90%" stopColor={`rgba(${isGold ? '180,140,30' : '120,50,180'},0.25)`} />
                        <stop offset="100%" stopColor={`rgba(${isGold ? '120,80,10' : '80,30,120'},0)`} />
                    </linearGradient>
                    <linearGradient id="dashWaveShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={`rgba(${isGold ? '60,40,5' : '40,15,60'},0)`} />
                        <stop offset="20%" stopColor={`rgba(${isGold ? '100,70,10' : '60,20,100'},0.3)`} />
                        <stop offset="50%" stopColor={`rgba(${isGold ? '140,100,15' : '88,28,135'},0.5)`} />
                        <stop offset="80%" stopColor={`rgba(${isGold ? '100,70,10' : '60,20,100'},0.3)`} />
                        <stop offset="100%" stopColor={`rgba(${isGold ? '60,40,5' : '40,15,60'},0)`} />
                    </linearGradient>
                    <linearGradient id="dashWaveHL" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={`rgba(${isGold ? '255,230,150' : '200,170,255'},0)`} />
                        <stop offset="25%" stopColor={`rgba(${isGold ? '255,240,180' : '216,180,254'},0.15)`} />
                        <stop offset="50%" stopColor={`rgba(${isGold ? '255,250,210' : '233,213,255'},0.45)`} />
                        <stop offset="75%" stopColor={`rgba(${isGold ? '255,240,180' : '216,180,254'},0.15)`} />
                        <stop offset="100%" stopColor={`rgba(${isGold ? '255,230,150' : '200,170,255'},0)`} />
                    </linearGradient>
                    <filter id="dashGlow">
                        <feGaussianBlur stdDeviation="12" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="dashDeep"><feGaussianBlur stdDeviation="18" /></filter>
                    <filter id="dashSpec">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <path d="M-200,200 C400,120 800,300 1200,160 C1600,40 2000,280 2400,150 C2800,30 3000,180 3200,140"
                    fill="none" stroke="url(#dashWaveShadow)" strokeWidth="100" strokeLinecap="round"
                    filter="url(#dashDeep)" opacity="0.5"
                    style={{ animation: 'dashFlow1 25s ease-in-out infinite' }} />
                <path d="M-200,180 C400,100 800,280 1200,140 C1600,20 2000,260 2400,130 C2800,10 3000,160 3200,120"
                    fill="none" stroke="url(#dashWaveMain)" strokeWidth="70" strokeLinecap="round"
                    filter="url(#dashGlow)"
                    style={{ animation: 'dashFlow1 25s ease-in-out infinite' }} />
                <path d="M-200,175 C400,95 800,275 1200,135 C1600,15 2000,255 2400,125 C2800,5 3000,155 3200,115"
                    fill="none" stroke="url(#dashWaveHL)" strokeWidth="20" strokeLinecap="round"
                    filter="url(#dashSpec)"
                    style={{ animation: 'dashFlow1 25s ease-in-out infinite' }} />
                <path d="M-200,140 C600,220 1000,80 1400,200 C1800,300 2200,100 2600,190 C2900,250 3100,130 3200,160"
                    fill="none" stroke="url(#dashWaveHL)" strokeWidth="9" strokeLinecap="round"
                    filter="url(#dashSpec)" opacity="0.6"
                    style={{ animation: 'dashFlow2 30s ease-in-out infinite reverse' }} />
            </svg>
            <style>{`
        @keyframes dashFlow1 {
          0%   { transform: translateX(0%) translateY(0px); }
          25%  { transform: translateX(2%) translateY(-8px); }
          50%  { transform: translateX(-2%) translateY(8px); }
          75%  { transform: translateX(1.5%) translateY(-5px); }
          100% { transform: translateX(0%) translateY(0px); }
        }
        @keyframes dashFlow2 {
          0%   { transform: translateX(0%) translateY(0px); }
          33%  { transform: translateX(-3%) translateY(12px); }
          66%  { transform: translateX(2.5%) translateY(-10px); }
          100% { transform: translateX(0%) translateY(0px); }
        }
      `}</style>
        </div>
    );
};

export default DashboardWaveRibbons;
