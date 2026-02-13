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
import { TextReveal } from './components/TextReveal';
import { FeatureCard } from './components/FeatureCard';
import { MockupFrame } from './components/MockupFrame';
import { Logo } from './components/Logo';
import { colors, fonts } from './theme';

// Mini mockup for visual editor
const VisualEditorMock: React.FC = () => (
    <div style={{ width: '100%', height: 340, display: 'flex', background: colors.bgDark }}>
        <div style={{ width: 200, background: colors.bgCard, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['🏠 Hero', '⭐ Features', '💰 Pricing', '💬 Reviews', '📧 Contact'].map((s, i) => (
                <div key={s} style={{
                    padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: fonts.body,
                    color: i === 0 ? colors.accent : colors.textMuted,
                    background: i === 0 ? `${colors.primary}33` : 'transparent',
                }}>{s}</div>
            ))}
        </div>
        <div style={{ flex: 1, background: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.bgDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.textWhite, fontFamily: fonts.heading }}>Tu Landing Page</div>
            <div style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.body, textAlign: 'center' }}>Diseñada con inteligencia artificial</div>
            <div style={{ padding: '8px 20px', borderRadius: 6, background: colors.primary, color: 'white', fontSize: 12, fontFamily: fonts.body }}>CTA Button</div>
        </div>
        <div style={{ width: 220, background: colors.bgCard, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.textWhite, fontFamily: fonts.heading }}>🎨 Estilos</div>
            {['Color primario', 'Tipografía', 'Espaciado', 'Bordes'].map((l) => (
                <div key={l} style={{ fontSize: 10, color: colors.textMuted, fontFamily: fonts.body, padding: '4px 6px', borderRadius: 4, background: `${colors.bgDark}88` }}>{l}</div>
            ))}
        </div>
    </div>
);

// Mini mockup for AI generation
const AIGenerationMock: React.FC = () => (
    <div style={{ width: '100%', height: 340, background: colors.bgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <div style={{ width: 500, background: colors.bgCard, borderRadius: 16, padding: 30, border: `1px solid ${colors.primary}33` }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.textWhite, fontFamily: fonts.heading, marginBottom: 16 }}>
                🤖 Asistente AI
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                    { label: 'Negocio', value: 'Fitness Pro Gym' },
                    { label: 'Industria', value: 'Salud y Fitness' },
                    { label: 'Estilo', value: 'Bold & Modern' },
                ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: fonts.body }}>{label}</div>
                        <div style={{ padding: '8px 12px', borderRadius: 6, background: colors.bgDark, border: `1px solid ${colors.textWhite}15`, fontSize: 13, color: colors.textWhite, fontFamily: fonts.body }}>{value}</div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 16, padding: '10px 0', borderRadius: 8, background: colors.gradientPrimary, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'white', fontFamily: fonts.body }}>
                ✨ Generar Website
            </div>
        </div>
    </div>
);

// Responsive design mockup
const ResponsiveMock: React.FC = () => (
    <div style={{ width: '100%', height: 340, background: colors.bgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, padding: 30 }}>
        {/* Desktop */}
        <div style={{ width: 340, height: 220, borderRadius: 8, border: `2px solid ${colors.textWhite}20`, overflow: 'hidden' }}>
            <div style={{ height: 20, background: colors.bgCard, display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF5F57' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FEBC2E' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#28C840' }} />
            </div>
            <div style={{ height: 200, background: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.bgDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.textWhite, fontFamily: fonts.heading }}>Desktop</div>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: colors.primary }} />
            </div>
        </div>
        {/* Tablet */}
        <div style={{ width: 160, height: 220, borderRadius: 12, border: `2px solid ${colors.textWhite}20`, overflow: 'hidden' }}>
            <div style={{ height: 12, background: colors.bgCard }} />
            <div style={{ height: 208, background: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.bgDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textWhite, fontFamily: fonts.heading }}>Tablet</div>
                <div style={{ width: 40, height: 3, borderRadius: 2, background: colors.accent }} />
            </div>
        </div>
        {/* Phone */}
        <div style={{ width: 100, height: 200, borderRadius: 16, border: `2px solid ${colors.textWhite}20`, overflow: 'hidden' }}>
            <div style={{ height: 16, background: colors.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 30, height: 4, borderRadius: 2, background: `${colors.textWhite}20` }} />
            </div>
            <div style={{ height: 184, background: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.bgDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.textWhite, fontFamily: fonts.heading }}>Mobile</div>
                <div style={{ width: 30, height: 3, borderRadius: 2, background: colors.primaryLight }} />
            </div>
        </div>
    </div>
);

// Hero templates grid mockup
const HeroTemplatesMock: React.FC = () => (
    <div style={{ width: '100%', height: 340, background: colors.bgDark, display: 'flex', flexWrap: 'wrap', gap: 12, padding: 24, alignContent: 'center', justifyContent: 'center' }}>
        {[
            { name: 'Modern', color: '#6C3AFF' },
            { name: 'Glass', color: '#00D4FF' },
            { name: 'Cinematic', color: '#FF6B6B' },
            { name: 'Fitness', color: '#4ECB71' },
            { name: 'Bold', color: '#FFD93D' },
            { name: 'Editorial', color: '#FF8C42' },
            { name: 'Gradient', color: '#E040FB' },
            { name: 'Minimal', color: '#78909C' },
            { name: 'Split', color: '#26C6DA' },
            { name: 'Overlap', color: '#AB47BC' },
            { name: 'Stacked', color: '#66BB6A' },
            { name: 'Vertical', color: '#42A5F5' },
        ].map(({ name, color }) => (
            <div
                key={name}
                style={{
                    width: 140,
                    height: 90,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                    border: `1px solid ${color}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 4,
                }}
            >
                <div style={{ width: 20, height: 20, borderRadius: 4, background: color }} />
                <div style={{ fontSize: 10, color: colors.textWhite, fontFamily: fonts.body, fontWeight: 600 }}>{name}</div>
            </div>
        ))}
    </div>
);

interface FeatureSlideProps {
    emoji: string;
    title: string;
    description: string;
    mockup: React.ReactNode;
    slideFrom?: 'right' | 'left';
}

const FeatureSlide: React.FC<FeatureSlideProps> = ({ emoji, title, description, mockup, slideFrom = 'right' }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const entranceSpring = spring({ frame, fps, config: { damping: 14, stiffness: 60 } });
    const exitOpacity = interpolate(frame, [140, 170], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '60px 100px', gap: 60, opacity: exitOpacity }}>
            {/* Text side */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    transform: `translateX(${interpolate(entranceSpring, [0, 1], [-100, 0])}px)`,
                    opacity: interpolate(entranceSpring, [0, 1], [0, 1]),
                }}
            >
                <div style={{ fontSize: 64 }}>{emoji}</div>
                <div style={{ fontFamily: fonts.heading, fontSize: 42, fontWeight: 800, color: colors.textWhite, lineHeight: 1.1 }}>
                    {title}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: 20, color: colors.textMuted, lineHeight: 1.5 }}>
                    {description}
                </div>
            </div>
            {/* Mockup side */}
            <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center' }}>
                <MockupFrame delay={10} width={680} slideFrom={slideFrom}>
                    {mockup}
                </MockupFrame>
            </div>
        </AbsoluteFill>
    );
};

export const FeatureShowcase: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Closing CTA animation
    const closingOpacity = interpolate(frame, [810, 840], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const closingScale = spring({ frame: Math.max(0, frame - 810), fps, config: { damping: 12 } });

    return (
        <AbsoluteFill>
            <GradientBackground />

            {/* Title sequence */}
            <Sequence from={0} durationInFrames={90}>
                <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                    <TextReveal text="Todo lo que necesitas" fontSize={72} fontWeight={900} gradient />
                    <Sequence from={20}>
                        <TextReveal text="para crear sitios web profesionales" fontSize={32} color={colors.textMuted} fontWeight={400} />
                    </Sequence>
                </AbsoluteFill>
            </Sequence>

            {/* Feature 1: AI Generation */}
            <Sequence from={90} durationInFrames={180}>
                <FeatureSlide
                    emoji="🤖"
                    title="Generación con IA"
                    description="Describe tu negocio y nuestra IA creará un sitio web completo y personalizado en segundos."
                    mockup={<AIGenerationMock />}
                    slideFrom="right"
                />
            </Sequence>

            {/* Feature 2: Visual Editor */}
            <Sequence from={270} durationInFrames={180}>
                <FeatureSlide
                    emoji="🎨"
                    title="Editor Visual"
                    description="Personaliza cada elemento: colores, tipografía, espaciado y contenido con controles intuitivos."
                    mockup={<VisualEditorMock />}
                    slideFrom="left"
                />
            </Sequence>

            {/* Feature 3: Responsive */}
            <Sequence from={450} durationInFrames={180}>
                <FeatureSlide
                    emoji="📱"
                    title="Diseño Responsive"
                    description="Tus sitios se ven perfectos en desktop, tablet y móvil. Adaptación automática garantizada."
                    mockup={<ResponsiveMock />}
                    slideFrom="right"
                />
            </Sequence>

            {/* Feature 4: Hero Templates */}
            <Sequence from={630} durationInFrames={180}>
                <FeatureSlide
                    emoji="🎯"
                    title="12+ Hero Templates"
                    description="Elige entre más de 12 estilos de Hero: Modern, Glass, Cinematic, Fitness, Bold y más."
                    mockup={<HeroTemplatesMock />}
                    slideFrom="left"
                />
            </Sequence>

            {/* Closing CTA */}
            <Sequence from={810}>
                <AbsoluteFill
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 30,
                        opacity: closingOpacity,
                        transform: `scale(${closingScale})`,
                    }}
                >
                    <Logo delay={0} size={80} />
                    <div
                        style={{
                            padding: '18px 48px',
                            borderRadius: 14,
                            background: colors.gradientPrimary,
                            fontFamily: fonts.heading,
                            fontSize: 24,
                            fontWeight: 700,
                            color: colors.textWhite,
                            boxShadow: `0 4px 30px ${colors.primary}44`,
                        }}
                    >
                        Empieza gratis → quimera.ai
                    </div>
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
