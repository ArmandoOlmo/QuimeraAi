import React from 'react';
import {
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    useVideoConfig,
    spring,
    Sequence,
} from 'remotion';
import { GradientBackground } from './components/GradientBackground';
import { Logo } from './components/Logo';
import { TextReveal } from './components/TextReveal';
import { MockupFrame } from './components/MockupFrame';
import { colors, fonts } from './theme';

// Simulated editor mockup content (pure React rendering)
const EditorMockup: React.FC = () => (
    <div style={{ width: '100%', height: 520, display: 'flex', background: colors.bgDark }}>
        {/* Sidebar */}
        <div
            style={{
                width: 260,
                background: colors.bgCard,
                borderRight: `1px solid ${colors.textWhite}10`,
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}
        >
            <div style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 700, color: colors.textWhite, padding: '8px 12px' }}>
                📄 Secciones
            </div>
            {['Hero', 'Features', 'Pricing', 'Testimonials', 'Contact', 'Footer'].map((section, i) => (
                <div
                    key={section}
                    style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: i === 0 ? `${colors.primary}33` : 'transparent',
                        border: i === 0 ? `1px solid ${colors.primary}66` : '1px solid transparent',
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: i === 0 ? colors.accent : colors.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <span style={{ fontSize: 16 }}>
                        {['🏠', '⭐', '💰', '💬', '📧', '🔗'][i]}
                    </span>
                    {section}
                </div>
            ))}
        </div>

        {/* Main preview area */}
        <div style={{ flex: 1, position: 'relative' }}>
            {/* Mock hero section */}
            <div
                style={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.bgDark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 16,
                    padding: 40,
                }}
            >
                <div
                    style={{
                        fontFamily: fonts.heading,
                        fontSize: 36,
                        fontWeight: 800,
                        color: colors.textWhite,
                        textAlign: 'center',
                    }}
                >
                    Tu Negocio Increíble
                </div>
                <div
                    style={{
                        fontFamily: fonts.body,
                        fontSize: 16,
                        color: colors.textMuted,
                        textAlign: 'center',
                        maxWidth: 400,
                    }}
                >
                    Creamos experiencias digitales que transforman tu marca
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: 12,
                        marginTop: 8,
                    }}
                >
                    <div
                        style={{
                            padding: '10px 24px',
                            borderRadius: 8,
                            background: colors.gradientPrimary,
                            fontFamily: fonts.body,
                            fontSize: 14,
                            fontWeight: 600,
                            color: colors.textWhite,
                        }}
                    >
                        Comenzar
                    </div>
                    <div
                        style={{
                            padding: '10px 24px',
                            borderRadius: 8,
                            border: `1px solid ${colors.textWhite}33`,
                            fontFamily: fonts.body,
                            fontSize: 14,
                            color: colors.textWhite,
                        }}
                    >
                        Ver Demo
                    </div>
                </div>
            </div>
        </div>

        {/* Right panel - controls */}
        <div
            style={{
                width: 280,
                background: colors.bgCard,
                borderLeft: `1px solid ${colors.textWhite}10`,
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}
        >
            <div style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 700, color: colors.textWhite, padding: '4px 8px' }}>
                🎨 Estilos
            </div>
            {/* Color picker mock */}
            <div style={{ padding: '8px', borderRadius: 8, background: `${colors.bgDark}88` }}>
                <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Colores</div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {['#6C3AFF', '#00D4FF', '#FF6B6B', '#4ECB71', '#FFD93D'].map((c) => (
                        <div
                            key={c}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                background: c,
                                border: c === '#6C3AFF' ? '2px solid white' : '2px solid transparent',
                            }}
                        />
                    ))}
                </div>
            </div>
            {/* Slider mocks */}
            {['Padding', 'Border Radius', 'Font Size'].map((label) => (
                <div key={label} style={{ padding: '6px 8px' }}>
                    <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>{label}</div>
                    <div style={{ height: 4, borderRadius: 2, background: `${colors.textWhite}15`, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, width: '60%', height: '100%', borderRadius: 2, background: colors.primary }} />
                        <div style={{ position: 'absolute', left: '58%', top: -5, width: 14, height: 14, borderRadius: '50%', background: colors.textWhite, border: `2px solid ${colors.primary}` }} />
                    </div>
                </div>
            ))}
            {/* Toggle mock */}
            <div style={{ padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted }}>Animaciones</span>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: colors.primary, position: 'relative' }}>
                    <div style={{ position: 'absolute', right: 2, top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white' }} />
                </div>
            </div>
        </div>
    </div>
);

export const ProductIntro: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // CTA animation
    const ctaOpacity = interpolate(frame, [360, 390], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const ctaScale = spring({ frame: Math.max(0, frame - 360), fps, config: { damping: 12 } });

    return (
        <AbsoluteFill>
            <GradientBackground />

            <AbsoluteFill
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 80,
                }}
            >
                {/* Logo entrance */}
                <Sequence from={30}>
                    <div style={{ marginBottom: 40 }}>
                        <Logo delay={0} size={100} />
                    </div>
                </Sequence>

                {/* Tagline */}
                <Sequence from={90}>
                    <div style={{ marginBottom: 50 }}>
                        <TextReveal
                            text="Construye sitios web impresionantes con IA"
                            fontSize={56}
                            fontWeight={800}
                            gradient
                        />
                    </div>
                </Sequence>

                {/* Subtitle */}
                <Sequence from={140}>
                    <TextReveal
                        text="Editor visual • Generación AI • Publicación instantánea"
                        fontSize={24}
                        color={colors.textMuted}
                        fontWeight={400}
                    />
                </Sequence>

                {/* Editor mockup slides in */}
                <Sequence from={200}>
                    <div style={{ marginTop: 50 }}>
                        <MockupFrame delay={0} width={1000} slideFrom="bottom">
                            <EditorMockup />
                        </MockupFrame>
                    </div>
                </Sequence>

                {/* CTA */}
                <Sequence from={360}>
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 60,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            opacity: ctaOpacity,
                            transform: `scale(${ctaScale})`,
                        }}
                    >
                        <div
                            style={{
                                padding: '16px 40px',
                                borderRadius: 12,
                                background: colors.gradientPrimary,
                                fontFamily: fonts.heading,
                                fontSize: 22,
                                fontWeight: 700,
                                color: colors.textWhite,
                                boxShadow: `0 4px 20px ${colors.primary}44`,
                            }}
                        >
                            Comienza gratis → quimera.ai
                        </div>
                    </div>
                </Sequence>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
