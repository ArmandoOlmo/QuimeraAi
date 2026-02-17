/**
 * AnnouncementBar Component
 * Top bar for announcements, promotions, shipping info, etc.
 * 
 * Uses unified storefront colors system
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Megaphone, Tag, Gift, Truck, Percent, Sparkles, Bell, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnnouncementBarData, AnnouncementMessage, ServiceIcon } from '../../../types/components';
import { useSafeProject } from '../../../contexts/project';
import { useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';

interface AnnouncementBarProps {
    data: AnnouncementBarData;
    storeId?: string;
}

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
    'megaphone': Megaphone,
    'tag': Tag,
    'gift': Gift,
    'truck': Truck,
    'percent': Percent,
    'sparkles': Sparkles,
    'bell': Bell,
    'info': Info,
};

const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ data, storeId }) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    
    // Unified colors system
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors);
    const [isVisible, setIsVisible] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Default messages if none provided
    const messages: AnnouncementMessage[] = data.messages?.length > 0 ? data.messages : [
        { text: '¡Envío gratis en pedidos mayores a $50!', link: '/tienda', linkText: 'Comprar ahora' },
    ];

    // Auto rotate for rotating variant
    useEffect(() => {
        if (data.variant === 'rotating' && messages.length > 1 && !isPaused) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % messages.length);
            }, data.speed || 4000);
            return () => clearInterval(interval);
        }
    }, [data.variant, messages.length, isPaused, data.speed]);

    // Style helpers
    const getPaddingY = () => {
        const map = { sm: 'py-2', md: 'py-3', lg: 'py-4' };
        return map[data.paddingY] || 'py-3';
    };

    const getPaddingX = () => {
        const map = { sm: 'px-4', md: 'px-6', lg: 'px-8' };
        return map[data.paddingX] || 'px-6';
    };

    const getFontSize = () => {
        const map = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' };
        return map[data.fontSize || 'sm'] || 'text-sm';
    };

    const IconComponent = data.icon ? iconMap[data.icon] || Megaphone : Megaphone;

    if (!isVisible) return null;

    // Get effective colors from data.colors (Web Editor) with fallbacks
    const bgColor = data.colors?.background || colors?.primary;
    const textColor = data.colors?.text || colors?.buttonText;
    const linkColor = data.colors?.linkColor || textColor;
    const iconColor = data.colors?.iconColor || textColor;
    const borderColor = data.colors?.borderColor;

    // Message content renderer
    const renderMessage = (message: AnnouncementMessage, index: number) => (
        <span key={index} className="inline-flex items-center gap-2">
            <span>{message.text}</span>
            {message.link && message.linkText && (
                <a
                    href={message.link}
                    className="font-semibold underline underline-offset-2 hover:no-underline transition-all"
                    style={{ color: linkColor }}
                >
                    {message.linkText}
                </a>
            )}
        </span>
    );

    // Static variant
    const renderStatic = () => (
        <div
            className={`${getPaddingY()} ${getPaddingX()} ${getFontSize()}`}
            style={{
                backgroundColor: bgColor,
                color: textColor,
                borderBottom: borderColor ? `1px solid ${borderColor}` : 'none',
                height: data.height ? `${data.height}px` : 'auto',
            }}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                {data.showIcon && (
                    <IconComponent size={16} style={{ color: iconColor }} />
                )}
                <div className="flex items-center gap-4">
                    {messages.map((msg, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="opacity-50">|</span>}
                            {renderMessage(msg, i)}
                        </React.Fragment>
                    ))}
                </div>
                {data.dismissible && (
                    <button
                        onClick={() => setIsVisible(false)}
                        className="ml-4 p-1 rounded hover:bg-white/10 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );

    // Scrolling (marquee) variant
    const renderScrolling = () => (
        <div
            className={`${getPaddingY()} ${getFontSize()} overflow-hidden`}
            style={{
                backgroundColor: bgColor,
                color: textColor,
                borderBottom: borderColor ? `1px solid ${borderColor}` : 'none',
                height: data.height ? `${data.height}px` : 'auto',
            }}
            onMouseEnter={() => data.pauseOnHover && setIsPaused(true)}
            onMouseLeave={() => data.pauseOnHover && setIsPaused(false)}
        >
            <div className="relative flex items-center">
                {data.showIcon && (
                    <div className={`flex-shrink-0 ${getPaddingX()} z-10`} style={{ backgroundColor: bgColor }}>
                        <IconComponent size={16} style={{ color: iconColor }} />
                    </div>
                )}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-hidden"
                >
                    <div
                        className={`flex gap-16 whitespace-nowrap ${isPaused ? '' : 'animate-marquee'}`}
                        style={{
                            animationDuration: `${(data.speed || 50) * messages.length}s`,
                            animationPlayState: isPaused ? 'paused' : 'running',
                        }}
                    >
                        {/* Duplicate messages for seamless loop */}
                        {[...messages, ...messages].map((msg, i) => (
                            <span key={i} className="inline-flex items-center gap-2">
                                <span>{msg.text}</span>
                                {msg.link && msg.linkText && (
                                    <a
                                        href={msg.link}
                                        className="font-semibold underline underline-offset-2 hover:no-underline"
                                        style={{ color: linkColor }}
                                    >
                                        {msg.linkText}
                                    </a>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
                {data.dismissible && (
                    <div className={`flex-shrink-0 ${getPaddingX()} z-10`} style={{ backgroundColor: bgColor }}>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee linear infinite;
                }
            `}</style>
        </div>
    );

    // Rotating variant
    const renderRotating = () => (
        <div
            className={`${getPaddingY()} ${getPaddingX()} ${getFontSize()}`}
            style={{
                backgroundColor: bgColor,
                color: textColor,
                borderBottom: borderColor ? `1px solid ${borderColor}` : 'none',
                height: data.height ? `${data.height}px` : 'auto',
            }}
            onMouseEnter={() => data.pauseOnHover && setIsPaused(true)}
            onMouseLeave={() => data.pauseOnHover && setIsPaused(false)}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                {messages.length > 1 && (
                    <button
                        onClick={() => setCurrentIndex((prev) => (prev - 1 + messages.length) % messages.length)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        aria-label="Anterior"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}

                {data.showIcon && (
                    <IconComponent size={16} style={{ color: iconColor }} />
                )}

                <div className="relative overflow-hidden" style={{ minWidth: '200px' }}>
                    <div
                        className="transition-all duration-500 ease-out"
                        style={{
                            transform: `translateY(${-currentIndex * 100}%)`,
                        }}
                    >
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`text-center ${i === currentIndex ? 'opacity-100' : 'opacity-0 absolute'}`}
                                style={{ height: i === currentIndex ? 'auto' : 0 }}
                            >
                                {renderMessage(msg, i)}
                            </div>
                        ))}
                    </div>
                </div>

                {messages.length > 1 && (
                    <>
                        <button
                            onClick={() => setCurrentIndex((prev) => (prev + 1) % messages.length)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            aria-label="Siguiente"
                        >
                            <ChevronRight size={16} />
                        </button>

                        {/* Dots indicator */}
                        <div className="flex gap-1 ml-2">
                            {messages.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                        i === currentIndex ? 'w-3 opacity-100' : 'opacity-50'
                                    }`}
                                    style={{ backgroundColor: textColor }}
                                    aria-label={`Ir a mensaje ${i + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {data.dismissible && (
                    <button
                        onClick={() => setIsVisible(false)}
                        className="ml-4 p-1 rounded hover:bg-white/10 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            {data.variant === 'static' && renderStatic()}
            {data.variant === 'scrolling' && renderScrolling()}
            {data.variant === 'rotating' && renderRotating()}
        </>
    );
};

export default AnnouncementBar;
