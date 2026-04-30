import React from 'react';

const GoldRibbons: React.FC = () => {
  return (
    <>
      <div className="absolute inset-0 z-0 pointer-events-none">
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
        ].map((p, i) => (
          <div key={`particle-${i}`} className="absolute rounded-full" style={{
            left: p.left, top: p.top, width: `${p.size}px`, height: `${p.size}px`,
            background: 'radial-gradient(circle, rgba(255,220,80,0.8), rgba(218,165,32,0.3))',
            boxShadow: '0 0 8px rgba(218,165,32,0.4)',
            animation: `heroParticle ${p.dur} ease-in-out ${p.delay} infinite`,
          }} />
        ))}

        <style>{`
          @keyframes heroPulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.08); }
          }
          @keyframes heroParticle {
            0%   { transform: translate(0, 0) scale(1); opacity: 0.3; }
            20%  { transform: translate(15px, -25px) scale(1.3); opacity: 0.7; }
            40%  { transform: translate(-10px, -40px) scale(0.8); opacity: 0.4; }
            60%  { transform: translate(20px, -15px) scale(1.1); opacity: 0.6; }
            80%  { transform: translate(-5px, -30px) scale(0.9); opacity: 0.3; }
            100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
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
            {/* Main gold metallic gradient */}
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
            <linearGradient id="gold3d2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(140,90,10,0)" />
              <stop offset="20%" stopColor="rgba(180,120,20,0.35)" />
              <stop offset="50%" stopColor="rgba(210,155,35,0.6)" />
              <stop offset="80%" stopColor="rgba(180,120,20,0.35)" />
              <stop offset="100%" stopColor="rgba(140,90,10,0)" />
            </linearGradient>
            <linearGradient id="gold3dHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,230,120,0)" />
              <stop offset="25%" stopColor="rgba(255,240,150,0.2)" />
              <stop offset="50%" stopColor="rgba(255,250,200,0.6)" />
              <stop offset="75%" stopColor="rgba(255,240,150,0.2)" />
              <stop offset="100%" stopColor="rgba(255,230,120,0)" />
            </linearGradient>
            
            <filter id="softGlow3d">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <filter id="specular3d">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Layer 1: Deep shadow ribbon */}
          <path
            d="M-200,320 C300,450 600,180 900,350 C1200,520 1500,280 1800,400 C2100,520 2400,250 2700,380 C2900,450 3100,330 3200,380"
            fill="none"
            stroke="rgba(40,30,5,0.4)"
            strokeWidth="80"
            strokeLinecap="round"
            filter="blur(15px)"
            style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
          />
          
          {/* Layer 2: Main back ribbon */}
          <path
            d="M-200,300 C300,420 600,150 900,320 C1200,490 1500,250 1800,370 C2100,490 2400,220 2700,350 C2900,420 3100,300 3200,350"
            fill="none"
            stroke="url(#gold3d1)"
            strokeWidth="60"
            strokeLinecap="round"
            filter="url(#softGlow3d)"
            style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
          />

          {/* Layer 3: Secondary offset shadow */}
          <path
            d="M-200,380 C250,220 550,450 850,280 C1150,110 1450,420 1750,250 C2050,80 2350,400 2650,230 C2950,110 3100,320 3200,250"
            fill="none"
            stroke="rgba(60,40,10,0.3)"
            strokeWidth="65"
            strokeLinecap="round"
            filter="blur(20px)"
            style={{ animation: 'goldFlow2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
          />

          {/* Layer 4: Deep back ribbon */}
          <path
            d="M-200,350 C250,200 550,400 850,250 C1150,100 1450,380 1750,220 C2050,60 2350,350 2650,200 C2950,100 3100,280 3200,220"
            fill="none"
            stroke="url(#gold3d2)"
            strokeWidth="50"
            strokeLinecap="round"
            filter="url(#softGlow3d)"
            style={{ animation: 'goldFlow2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
          />

          {/* Layer 5: Thin accent filament */}
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
        </svg>

        {/* Warm bokeh particles for cinematic depth */}
        <div className="absolute inset-0" style={{ opacity: 0.4 }}>
          <div className="absolute rounded-full" style={{
            width: '300px', height: '300px', left: '5%', top: '5%',
            background: 'radial-gradient(circle, rgba(218,165,32,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'bokeh1 16s ease-in-out infinite',
          }} />
          <div className="absolute rounded-full" style={{
            width: '250px', height: '250px', right: '10%', top: '10%',
            background: 'radial-gradient(circle, rgba(255,200,50,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
            animation: 'bokeh2 20s ease-in-out infinite',
          }} />
        </div>

        <style>{`
          @keyframes goldFlow1 {
            0%   { transform: translateX(0%) translateY(0px); }
            50%  { transform: translateX(-2.5%) translateY(18px); }
            100% { transform: translateX(0%) translateY(0px); }
          }
          @keyframes goldFlow2 {
            0%   { transform: translateX(0%) translateY(0px); }
            50%  { transform: translateX(1.5%) translateY(-6px); }
            100% { transform: translateX(0%) translateY(0px); }
          }
          @keyframes goldFlow3 {
            0%   { transform: translateX(0%) translateY(0px); }
            50%  { transform: translateX(-1.5%) translateY(-8px); }
            100% { transform: translateX(0%) translateY(0px); }
          }
          @keyframes bokeh1 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
            50% { transform: translate(30px, -20px) scale(1.1); opacity: 0.6; }
          }
          @keyframes bokeh2 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
            50% { transform: translate(-25px, 20px) scale(1.15); opacity: 0.5; }
          }
        `}</style>
      </div>
    </>
  );
};

export default GoldRibbons;
