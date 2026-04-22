import React, { useState, useEffect, useRef } from 'react';
import {
  X, Megaphone, Tag, Gift, Truck, Percent, Sparkles, Bell, Info,
  Star, Zap, Heart, ShieldCheck, Clock, Flame, Award, Crown,
  ChevronLeft, ChevronRight, Phone, Mail, MapPin, ExternalLink,
} from 'lucide-react';

// ─── Types ───
export interface TopBarMessage {
  text: string;
  icon?: string;
  link?: string;
  linkText?: string;
}

export interface TopBarData {
  messages: TopBarMessage[];
  /** Scrolling marquee or static */
  scrollEnabled?: boolean;
  /** Scroll speed in seconds for one full loop */
  scrollSpeed?: number;
  /** Pause marquee on hover */
  pauseOnHover?: boolean;
  /** Allow user to dismiss */
  dismissible?: boolean;
  /** Use gradient background */
  useGradient?: boolean;
  /** Gradient start color */
  gradientFrom?: string;
  /** Gradient end color */
  gradientTo?: string;
  /** Gradient angle in degrees */
  gradientAngle?: number;
  /** Solid background color (when not gradient) */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Link color */
  linkColor?: string;
  /** Icon color */
  iconColor?: string;
  /** Font size */
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** Separator between messages */
  separator?: 'dot' | 'pipe' | 'star' | 'none';
  /** Top bar height */
  height?: number;
  /** Show rotating arrows when multiple messages & not scrolling */
  showRotatingArrows?: boolean;
  /** Auto-rotate speed for non-scrolling mode (ms) */
  rotateSpeed?: number;
}

// ─── Icon map ───
const iconMap: Record<string, React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  megaphone: Megaphone, tag: Tag, gift: Gift, truck: Truck, percent: Percent,
  sparkles: Sparkles, bell: Bell, info: Info, star: Star, zap: Zap,
  heart: Heart, shield: ShieldCheck, clock: Clock, flame: Flame,
  award: Award, crown: Crown, phone: Phone, mail: Mail, pin: MapPin,
  link: ExternalLink,
};

export const topBarIconOptions = Object.keys(iconMap);

// ─── Font size map ───
const fontSizeMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' };

// ─── Separator renderers ───
const separatorMap: Record<string, string> = {
  dot: '•',
  pipe: '|',
  star: '★',
  none: '',
};

// ─── Component ───
interface TopBarProps extends TopBarData {
  onNavigate?: (href: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  messages = [],
  scrollEnabled = false,
  scrollSpeed = 30,
  pauseOnHover = true,
  dismissible = false,
  useGradient = false,
  gradientFrom = '#4f46e5',
  gradientTo = '#7c3aed',
  gradientAngle = 90,
  backgroundColor = '#1a1a1a',
  textColor = '#ffffff',
  linkColor = '#fbbf24',
  iconColor = '#fbbf24',
  fontSize = 'sm',
  separator = 'dot',
  height,
  showRotatingArrows = true,
  rotateSpeed = 4000,
  onNavigate,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const validMessages = messages.length > 0 ? messages : [
    { text: 'Free shipping on orders over $50!', icon: 'truck', link: '', linkText: 'Shop Now' },
  ];

  const hasMultiple = validMessages.length > 1;

  // Auto-rotate in static mode
  useEffect(() => {
    if (scrollEnabled || !hasMultiple || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % validMessages.length);
    }, rotateSpeed);
    return () => clearInterval(interval);
  }, [scrollEnabled, hasMultiple, isPaused, rotateSpeed, validMessages.length]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  if (!isVisible) return null;

  // Background style
  const bgStyle: React.CSSProperties = useGradient
    ? { background: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})` }
    : { backgroundColor };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = iconMap[iconName];
    if (!Icon) return null;
    return <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />;
  };

  const renderMessageContent = (msg: TopBarMessage) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {renderIcon(msg.icon)}
      <span>{msg.text}</span>
      {msg.link && msg.linkText && (
        <a
          href={msg.link}
          onClick={(e) => handleClick(e, msg.link!)}
          className="font-semibold underline underline-offset-2 hover:no-underline transition-all"
          style={{ color: linkColor }}
        >
          {msg.linkText}
        </a>
      )}
    </span>
  );

  const separatorChar = separatorMap[separator] || '';

  // ─── Marquee ref for animation ───
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Force-start animation via JS when scroll mode activates
  useEffect(() => {
    if (!scrollEnabled || !marqueeRef.current) return;
    const el = marqueeRef.current;
    const duration = (scrollSpeed || 30) * 1000; // convert seconds to ms

    // Use Web Animations API for maximum reliability
    try {
      // Cancel any existing animations
      el.getAnimations().forEach(a => a.cancel());

      const anim = el.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-33.333%)' }
        ],
        {
          duration,
          iterations: Infinity,
          easing: 'linear',
        }
      );

      // Handle pause/unpause
      if (isPaused) {
        anim.pause();
      }

      return () => {
        anim.cancel();
      };
    } catch {
      // Fallback: CSS animation (already defined in main.css @keyframes topbar-scroll)
      el.style.animation = `topbar-scroll ${scrollSpeed || 30}s linear infinite`;
      el.style.animationPlayState = isPaused ? 'paused' : 'running';
    }
  }, [scrollEnabled, scrollSpeed, isPaused]);

  // ─── Scrolling (Marquee) mode ───
  if (scrollEnabled) {
    return (
      <div
        id="site-topbar"
        className={`relative overflow-hidden z-30 ${fontSizeMap[fontSize]}`}
        style={{
          ...bgStyle,
          color: textColor,
          height: height ? `${height}px` : 'auto',
          padding: '8px 0',
        }}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      >
        <div
          ref={marqueeRef}
          className="flex items-center gap-12 h-full"
          style={{ width: 'max-content' }}
        >
          {/* Triple repeat for seamless loop */}
          {[...Array(3)].flatMap((_, rep) =>
            validMessages.map((msg, i) => (
              <React.Fragment key={`${rep}-${i}`}>
                {(rep > 0 || i > 0) && separatorChar && (
                  <span className="opacity-50 mx-2">{separatorChar}</span>
                )}
                {renderMessageContent(msg)}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors z-10"
            title="Dismiss"
          >
            <X size={14} style={{ color: textColor }} />
          </button>
        )}
      </div>
    );
  }

  // ─── Static / Rotating mode ───
  return (
    <div
      id="site-topbar"
      className={`relative z-30 ${fontSizeMap[fontSize]}`}
      style={{
        ...bgStyle,
        color: textColor,
        height: height ? `${height}px` : 'auto',
        padding: '8px 16px',
      }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 h-full">
        {/* Left arrow */}
        {hasMultiple && showRotatingArrows && (
          <button
            onClick={() => setCurrentIndex(prev => (prev - 1 + validMessages.length) % validMessages.length)}
            className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            title="Previous"
          >
            <ChevronLeft size={14} style={{ color: textColor }} />
          </button>
        )}

        {/* Current message */}
        <div className="overflow-hidden text-center">
          <div
            className="transition-all duration-400 ease-out"
            key={currentIndex}
            style={{ animation: 'topbar-fade-in 0.35s ease-out' }}
          >
            {renderMessageContent(validMessages[currentIndex])}
          </div>
        </div>

        {/* Right arrow */}
        {hasMultiple && showRotatingArrows && (
          <button
            onClick={() => setCurrentIndex(prev => (prev + 1) % validMessages.length)}
            className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            title="Next"
          >
            <ChevronRight size={14} style={{ color: textColor }} />
          </button>
        )}

        {/* Dismiss */}
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className="ml-2 p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            title="Dismiss"
          >
            <X size={14} style={{ color: textColor }} />
          </button>
        )}
      </div>

      {/* Dots for multiple messages */}
      {hasMultiple && (
        <div className="flex justify-center gap-1 mt-1">
          {validMessages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="transition-all duration-300"
              style={{
                width: i === currentIndex ? '12px' : '4px',
                height: '4px',
                borderRadius: '999px',
                backgroundColor: i === currentIndex ? textColor : `${textColor}60`,
              }}
              title={`Message ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes topbar-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TopBar;
