import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { colors } from '../theme';

interface MockupFrameProps {
    children: React.ReactNode;
    delay?: number;
    width?: number;
    slideFrom?: 'right' | 'left' | 'bottom';
}

export const MockupFrame: React.FC<MockupFrameProps> = ({
    children,
    delay = 0,
    width = 1100,
    slideFrom = 'right',
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const adjustedFrame = Math.max(0, frame - delay);
    const entranceSpring = spring({ frame: adjustedFrame, fps, config: { damping: 15, stiffness: 60 } });

    const slideOffset = 200;
    const translateX = slideFrom === 'right'
        ? interpolate(entranceSpring, [0, 1], [slideOffset, 0])
        : slideFrom === 'left'
            ? interpolate(entranceSpring, [0, 1], [-slideOffset, 0])
            : 0;
    const translateY = slideFrom === 'bottom'
        ? interpolate(entranceSpring, [0, 1], [slideOffset, 0])
        : 0;

    const opacity = interpolate(adjustedFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <div
            style={{
                width,
                opacity,
                transform: `translateX(${translateX}px) translateY(${translateY}px)`,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 40px ${colors.primary}22`,
                border: `1px solid ${colors.textWhite}15`,
            }}
        >
            {/* Browser chrome */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    background: colors.bgCard,
                    borderBottom: `1px solid ${colors.textWhite}10`,
                }}
            >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
                <div
                    style={{
                        flex: 1,
                        marginLeft: 12,
                        padding: '6px 16px',
                        borderRadius: 8,
                        background: colors.bgDark,
                        fontSize: 13,
                        color: colors.textMuted,
                        fontFamily: 'system-ui',
                    }}
                >
                    quimera.ai/editor
                </div>
            </div>
            {/* Content area */}
            <div
                style={{
                    background: colors.bgDark,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {children}
            </div>
        </div>
    );
};
