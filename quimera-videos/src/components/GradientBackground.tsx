import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { colors } from '../theme';

export const GradientBackground: React.FC = () => {
    const frame = useCurrentFrame();

    const rotation = interpolate(frame, [0, 900], [0, 360]);
    const scale1 = interpolate(frame, [0, 450, 900], [1, 1.3, 1]);
    const scale2 = interpolate(frame, [0, 300, 600, 900], [1.2, 0.8, 1.2, 0.8]);

    return (
        <AbsoluteFill
            style={{
                backgroundColor: colors.bgDark,
                overflow: 'hidden',
            }}
        >
            {/* Animated gradient orb 1 */}
            <div
                style={{
                    position: 'absolute',
                    width: 800,
                    height: 800,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.primary}44 0%, transparent 70%)`,
                    top: '10%',
                    left: '5%',
                    transform: `scale(${scale1}) rotate(${rotation * 0.1}deg)`,
                    filter: 'blur(60px)',
                }}
            />
            {/* Animated gradient orb 2 */}
            <div
                style={{
                    position: 'absolute',
                    width: 600,
                    height: 600,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.accent}33 0%, transparent 70%)`,
                    bottom: '5%',
                    right: '10%',
                    transform: `scale(${scale2}) rotate(${-rotation * 0.15}deg)`,
                    filter: 'blur(80px)',
                }}
            />
            {/* Subtle gradient orb 3 */}
            <div
                style={{
                    position: 'absolute',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.primaryLight}22 0%, transparent 70%)`,
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) scale(${scale1 * 0.8})`,
                    filter: 'blur(100px)',
                }}
            />
            {/* Grid pattern overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
            linear-gradient(${colors.textWhite}06 1px, transparent 1px),
            linear-gradient(90deg, ${colors.textWhite}06 1px, transparent 1px)
          `,
                    backgroundSize: '60px 60px',
                    opacity: 0.4,
                }}
            />
        </AbsoluteFill>
    );
};
