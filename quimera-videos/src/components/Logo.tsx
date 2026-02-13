import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { colors, fonts } from '../theme';

interface LogoProps {
    delay?: number;
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ delay = 0, size = 120 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const adjustedFrame = Math.max(0, frame - delay);
    const scaleSpring = spring({ frame: adjustedFrame, fps, config: { damping: 12, stiffness: 100 } });
    const glowPulse = interpolate(frame, [0, 60, 120], [0.4, 0.8, 0.4], { extrapolateRight: 'extend' });

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
                transform: `scale(${scaleSpring})`,
            }}
        >
            {/* Logo icon - Chimera-inspired abstract shape */}
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: size * 0.25,
                    background: colors.gradientPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 ${60 * glowPulse}px ${30 * glowPulse}px ${colors.accentGlow}`,
                    position: 'relative',
                }}
            >
                {/* Q letter inside */}
                <span
                    style={{
                        fontFamily: fonts.heading,
                        fontSize: size * 0.55,
                        fontWeight: 900,
                        color: colors.textWhite,
                        letterSpacing: -2,
                        textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                    }}
                >
                    Q
                </span>
                {/* Decorative dot */}
                <div
                    style={{
                        position: 'absolute',
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: '50%',
                        backgroundColor: colors.accent,
                        bottom: size * 0.12,
                        right: size * 0.12,
                        boxShadow: `0 0 20px ${colors.accent}`,
                    }}
                />
            </div>

            {/* Brand name */}
            <div
                style={{
                    fontFamily: fonts.heading,
                    fontSize: size * 0.4,
                    fontWeight: 800,
                    color: colors.textWhite,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                }}
            >
                Quimera
                <span style={{ color: colors.accent }}>.ai</span>
            </div>
        </div>
    );
};
