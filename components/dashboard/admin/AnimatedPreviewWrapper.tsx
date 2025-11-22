import React, { useState, useEffect } from 'react';
import { AnimationConfig } from '../../../types';

interface AnimatedPreviewWrapperProps {
    children: React.ReactNode;
    animation?: AnimationConfig;
    trigger?: 'auto' | 'manual';
}

const AnimatedPreviewWrapper: React.FC<AnimatedPreviewWrapperProps> = ({ children, animation, trigger = 'auto' }) => {
    const [animationKey, setAnimationKey] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Auto-play animation when config changes
    useEffect(() => {
        if (animation && trigger === 'auto') {
            setAnimationKey(prev => prev + 1);
            setIsPlaying(true);
            const totalDuration = (animation.duration || 500) + (animation.delay || 0);
            setTimeout(() => setIsPlaying(false), totalDuration);
        }
    }, [animation, trigger]);

    if (!animation) {
        return <>{children}</>;
    }

    const getAnimationStyle = (): React.CSSProperties => {
        const easingMap: Record<string, string> = {
            linear: 'linear',
            easeIn: 'ease-in',
            easeOut: 'ease-out',
            easeInOut: 'ease-in-out',
            spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        };

        const animationName = animation.type === 'custom' ? 'customAnimation' : animation.type;
        const duration = animation.duration || 500;
        const delay = animation.delay || 0;
        const easing = easingMap[animation.easing || 'easeOut'];
        const repeat = animation.repeat === -1 ? 'infinite' : (animation.repeat || 1);
        const direction = animation.direction || 'normal';

        return {
            animation: isPlaying 
                ? `${animationName} ${duration}ms ${easing} ${delay}ms ${repeat} ${direction}`
                : 'none'
        };
    };

    return (
        <>
            <div 
                key={animationKey}
                style={getAnimationStyle()}
                className="w-full"
            >
                {children}
            </div>
            
            <style>{`
                @keyframes fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes scale {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes rotate {
                    from { transform: rotate(-5deg); opacity: 0; }
                    to { transform: rotate(0deg); opacity: 1; }
                }
                @keyframes bounce {
                    0% { transform: translateY(0); }
                    25% { transform: translateY(-20px); }
                    50% { transform: translateY(0); }
                    75% { transform: translateY(-10px); }
                    100% { transform: translateY(0); }
                }
                ${animation.type === 'custom' && animation.customKeyframes 
                    ? `@keyframes customAnimation { ${animation.customKeyframes} }` 
                    : ''}
            `}</style>
        </>
    );
};

export default AnimatedPreviewWrapper;

