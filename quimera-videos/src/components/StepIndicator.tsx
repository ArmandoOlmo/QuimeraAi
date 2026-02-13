import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { colors, fonts } from '../theme';

interface StepIndicatorProps {
    number: number;
    title: string;
    description: string;
    delay?: number;
    isActive?: boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
    number,
    title,
    description,
    delay = 0,
    isActive = false,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const adjustedFrame = Math.max(0, frame - delay);
    const entranceSpring = spring({ frame: adjustedFrame, fps, config: { damping: 12, stiffness: 80 } });
    const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

    const glowIntensity = isActive
        ? interpolate(frame, [0, 30, 60], [0.5, 1, 0.5], { extrapolateRight: 'extend' })
        : 0.3;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                opacity,
                transform: `translateX(${interpolate(entranceSpring, [0, 1], [-60, 0])}px)`,
            }}
        >
            {/* Step number circle */}
            <div
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: isActive ? colors.gradientPrimary : `${colors.bgCard}`,
                    border: `2px solid ${isActive ? colors.accent : colors.primary}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: fonts.heading,
                    fontSize: 28,
                    fontWeight: 900,
                    color: colors.textWhite,
                    boxShadow: isActive ? `0 0 ${30 * glowIntensity}px ${colors.accentGlow}` : 'none',
                    flexShrink: 0,
                }}
            >
                {number}
            </div>

            {/* Text content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                    style={{
                        fontFamily: fonts.heading,
                        fontSize: 28,
                        fontWeight: 700,
                        color: colors.textWhite,
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontFamily: fonts.body,
                        fontSize: 18,
                        color: colors.textMuted,
                        lineHeight: 1.4,
                    }}
                >
                    {description}
                </div>
            </div>
        </div>
    );
};
