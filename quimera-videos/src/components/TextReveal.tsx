import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { colors, fonts } from '../theme';

interface TextRevealProps {
    text: string;
    delay?: number;
    fontSize?: number;
    color?: string;
    fontWeight?: number;
    align?: 'left' | 'center' | 'right';
    gradient?: boolean;
}

export const TextReveal: React.FC<TextRevealProps> = ({
    text,
    delay = 0,
    fontSize = 64,
    color = colors.textWhite,
    fontWeight = 700,
    align = 'center',
    gradient = false,
}) => {
    const frame = useCurrentFrame();
    const adjustedFrame = Math.max(0, frame - delay);

    const words = text.split(' ');

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
                gap: fontSize * 0.25,
                fontFamily: fonts.heading,
                fontSize,
                fontWeight,
                lineHeight: 1.2,
            }}
        >
            {words.map((word, i) => {
                const wordDelay = i * 4; // 4 frames stagger between words
                const wordFrame = Math.max(0, adjustedFrame - wordDelay);

                const opacity = interpolate(wordFrame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
                const translateY = interpolate(wordFrame, [0, 12], [30, 0], { extrapolateRight: 'clamp' });
                const blur = interpolate(wordFrame, [0, 8], [8, 0], { extrapolateRight: 'clamp' });

                return (
                    <span
                        key={i}
                        style={{
                            display: 'inline-block',
                            opacity,
                            transform: `translateY(${translateY}px)`,
                            filter: `blur(${blur}px)`,
                            color: gradient ? 'transparent' : color,
                            backgroundImage: gradient ? colors.gradientPrimary : undefined,
                            backgroundClip: gradient ? 'text' : undefined,
                            WebkitBackgroundClip: gradient ? 'text' : undefined,
                        }}
                    >
                        {word}
                    </span>
                );
            })}
        </div>
    );
};
