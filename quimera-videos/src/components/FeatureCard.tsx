import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { colors, fonts } from '../theme';

interface FeatureCardProps {
    emoji: string;
    title: string;
    description: string;
    delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
    emoji,
    title,
    description,
    delay = 0,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const adjustedFrame = Math.max(0, frame - delay);
    const scaleSpring = spring({ frame: adjustedFrame, fps, config: { damping: 14, stiffness: 80 } });
    const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '40px 32px',
                borderRadius: 24,
                background: `linear-gradient(135deg, ${colors.bgCard}CC, ${colors.bgCardHover}99)`,
                border: `1px solid ${colors.primary}33`,
                backdropFilter: 'blur(20px)',
                width: 320,
                opacity,
                transform: `scale(${scaleSpring})`,
                boxShadow: `0 8px 32px ${colors.primary}22, inset 0 1px 0 ${colors.textWhite}08`,
            }}
        >
            <div
                style={{
                    fontSize: 56,
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${colors.primary}33, ${colors.accent}22)`,
                }}
            >
                {emoji}
            </div>
            <div
                style={{
                    fontFamily: fonts.heading,
                    fontSize: 22,
                    fontWeight: 700,
                    color: colors.textWhite,
                    textAlign: 'center',
                }}
            >
                {title}
            </div>
            <div
                style={{
                    fontFamily: fonts.body,
                    fontSize: 16,
                    color: colors.textMuted,
                    textAlign: 'center',
                    lineHeight: 1.5,
                }}
            >
                {description}
            </div>
        </div>
    );
};
