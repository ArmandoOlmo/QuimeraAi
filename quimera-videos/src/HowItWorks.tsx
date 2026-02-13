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
import { StepIndicator } from './components/StepIndicator';
import { MockupFrame } from './components/MockupFrame';
import { Logo } from './components/Logo';
import { colors, fonts } from './theme';

// Step 1 mockup: Describe your business
const DescribeMockup: React.FC = () => {
    const frame = useCurrentFrame();
    const typingProgress = interpolate(frame, [20, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    const fullText = 'Somos un gimnasio moderno enfocado en entrenamiento funcional y bienestar integral...';
    const displayedText = fullText.substring(0, Math.floor(fullText.length * typingProgress));

    return (
        <div style={{ width: '100%', height: 360, background: colors.bgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            <div style={{ width: 520, background: colors.bgCard, borderRadius: 16, padding: 30, border: `1px solid ${colors.primary}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.gradientPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
                    <div>
                        <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, color: colors.textWhite }}>Asistente Quimera AI</div>
                        <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted }}>Cuéntanos sobre tu negocio</div>
                    </div>
                </div>
                {/* Form fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: fonts.body, marginBottom: 4 }}>Nombre del negocio</div>
                        <div style={{ padding: '8px 12px', borderRadius: 6, background: colors.bgDark, border: `1px solid ${colors.primary}44`, fontSize: 13, color: colors.accent, fontFamily: fonts.body }}>
                            Fitness Pro Gym
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: fonts.body, marginBottom: 4 }}>Descripción</div>
                        <div style={{ padding: '8px 12px', borderRadius: 6, background: colors.bgDark, border: `1px solid ${colors.textWhite}15`, fontSize: 13, color: colors.textWhite, fontFamily: fonts.body, minHeight: 60, lineHeight: 1.5 }}>
                            {displayedText}
                            <span style={{ borderRight: `2px solid ${colors.accent}`, animation: 'blink 1s infinite' }}>&#8203;</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['Bold', 'Minimalist', 'Elegant'].map((style, i) => (
                            <div key={style} style={{
                                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontFamily: fonts.body,
                                background: i === 0 ? colors.primary : 'transparent',
                                color: i === 0 ? 'white' : colors.textMuted,
                                border: `1px solid ${i === 0 ? colors.primary : colors.textWhite + '20'}`,
                            }}>{style}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step 2 mockup: Customize everything
const CustomizeMockup: React.FC = () => {
    const frame = useCurrentFrame();
    // Animate a color change
    const hue = interpolate(frame, [0, 120], [270, 200]);

    return (
        <div style={{ width: '100%', height: 360, display: 'flex', background: colors.bgDark }}>
            {/* Preview */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
                background: `linear-gradient(135deg, hsl(${hue}, 60%, 15%), ${colors.bgDark})`,
                padding: 20,
            }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: colors.textWhite, fontFamily: fonts.heading }}>Fitness Pro Gym</div>
                <div style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.body }}>Transforma tu cuerpo y mente</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <div style={{ padding: '8px 20px', borderRadius: 6, background: `hsl(${hue}, 70%, 50%)`, color: 'white', fontSize: 12, fontFamily: fonts.body, fontWeight: 600 }}>Únete Ahora</div>
                    <div style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 12, fontFamily: fonts.body }}>Ver Clases</div>
                </div>
            </div>
            {/* Controls panel */}
            <div style={{ width: 240, background: colors.bgCard, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.textWhite, fontFamily: fonts.heading }}>🎨 Personalizar</div>
                {/* Animated slider */}
                <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: fonts.body }}>Color Principal</div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {['#6C3AFF', '#00D4FF', '#FF6B6B', '#4ECB71', '#FFD93D'].map((c, i) => (
                        <div key={c} style={{
                            width: 24, height: 24, borderRadius: '50%', background: c,
                            border: i === 0 ? '2px solid white' : 'none',
                            transform: i === 0 ? 'scale(1.2)' : 'scale(1)',
                        }} />
                    ))}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: fonts.body, marginTop: 4 }}>Tipografía</div>
                <div style={{ padding: '6px 10px', borderRadius: 4, background: colors.bgDark, fontSize: 12, color: colors.textWhite, fontFamily: fonts.body }}>Inter ▾</div>
                <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: fonts.body, marginTop: 4 }}>Tamaño Título</div>
                <div style={{ height: 4, borderRadius: 2, background: `${colors.textWhite}15`, position: 'relative' }}>
                    <div style={{ width: '70%', height: '100%', borderRadius: 2, background: `hsl(${hue}, 70%, 50%)` }} />
                    <div style={{
                        position: 'absolute', left: '68%', top: -5, width: 14, height: 14,
                        borderRadius: '50%', background: 'white', border: '2px solid ' + `hsl(${hue}, 70%, 50%)`,
                    }} />
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: fonts.body, marginTop: 8 }}>Espaciado</div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {['S', 'M', 'L', 'XL'].map((s, i) => (
                        <div key={s} style={{
                            flex: 1, textAlign: 'center', padding: '4px 0', borderRadius: 4, fontSize: 10,
                            background: i === 2 ? colors.primary : `${colors.bgDark}`,
                            color: i === 2 ? 'white' : colors.textMuted,
                            fontFamily: fonts.body,
                        }}>{s}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Step 3 mockup: Publish
const PublishMockup: React.FC = () => {
    const frame = useCurrentFrame();
    const checkScale = spring({ frame: Math.max(0, frame - 40), fps: 30, config: { damping: 10, stiffness: 120 } });
    const progressWidth = interpolate(frame, [0, 40], [0, 100], { extrapolateRight: 'clamp' });

    return (
        <div style={{ width: '100%', height: 360, background: colors.bgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                {/* Progress circle */}
                <div style={{
                    width: 120, height: 120, borderRadius: '50%',
                    background: progressWidth >= 100 ? colors.gradientPrimary : colors.bgCard,
                    border: `3px solid ${progressWidth >= 100 ? colors.accent : colors.primary}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: progressWidth >= 100 ? `0 0 30px ${colors.accentGlow}` : 'none',
                    transform: `scale(${progressWidth >= 100 ? checkScale : 1})`,
                }}>
                    {progressWidth >= 100 ? (
                        <span style={{ fontSize: 48, color: 'white' }}>✓</span>
                    ) : (
                        <span style={{ fontSize: 20, fontWeight: 700, color: colors.textWhite, fontFamily: fonts.heading }}>
                            {Math.floor(progressWidth)}%
                        </span>
                    )}
                </div>
                <div style={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 700, color: colors.textWhite }}>
                    {progressWidth >= 100 ? '¡Publicado!' : 'Publicando...'}
                </div>
                {progressWidth >= 100 && (
                    <div style={{
                        padding: '10px 24px', borderRadius: 8, background: `${colors.bgCard}`,
                        border: `1px solid ${colors.accent}44`, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: 14, color: colors.accent, fontFamily: fonts.mono }}>
                            fitnesspro.quimera.ai
                        </span>
                        <span style={{ fontSize: 12, color: colors.textMuted }}>🔗</span>
                    </div>
                )}
                {/* Progress bar */}
                <div style={{ width: 300, height: 6, borderRadius: 3, background: `${colors.textWhite}15` }}>
                    <div style={{ width: `${progressWidth}%`, height: '100%', borderRadius: 3, background: colors.gradientPrimary, transition: 'width 0.1s' }} />
                </div>
            </div>
        </div>
    );
};

export const HowItWorks: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Determine active step
    const activeStep = frame < 60 ? 0 : frame < 210 ? 1 : frame < 360 ? 2 : 3;

    // CTA animation
    const ctaOpacity = interpolate(frame, [510, 540], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const ctaScale = spring({ frame: Math.max(0, frame - 510), fps, config: { damping: 12 } });

    return (
        <AbsoluteFill>
            <GradientBackground />

            {/* Title */}
            <Sequence from={0} durationInFrames={60}>
                <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                    <TextReveal text="Cómo funciona" fontSize={72} fontWeight={900} gradient />
                    <Sequence from={15}>
                        <TextReveal text="3 simples pasos para tu sitio web" fontSize={28} color={colors.textMuted} />
                    </Sequence>
                </AbsoluteFill>
            </Sequence>

            {/* Step 1: Describe */}
            <Sequence from={60} durationInFrames={150}>
                <AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '60px 80px', gap: 50 }}>
                    <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: 30 }}>
                        <StepIndicator
                            number={1}
                            title="Describe tu negocio"
                            description="Cuéntale a nuestra IA sobre tu negocio, industria y el estilo visual que prefieres."
                            isActive={activeStep === 1}
                        />
                        <div style={{ marginLeft: 36, width: 2, height: 30, background: `${colors.primary}44` }} />
                        <div style={{ opacity: 0.3 }}>
                            <StepIndicator number={2} title="Personaliza todo" description="" />
                        </div>
                        <div style={{ marginLeft: 36, width: 2, height: 30, background: `${colors.primary}22` }} />
                        <div style={{ opacity: 0.2 }}>
                            <StepIndicator number={3} title="Publica en un click" description="" />
                        </div>
                    </div>
                    <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center' }}>
                        <MockupFrame delay={10} width={620} slideFrom="right">
                            <DescribeMockup />
                        </MockupFrame>
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Step 2: Customize */}
            <Sequence from={210} durationInFrames={150}>
                <AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '60px 80px', gap: 50 }}>
                    <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: 30 }}>
                        <div style={{ opacity: 0.3 }}>
                            <StepIndicator number={1} title="Describe tu negocio" description="" />
                        </div>
                        <div style={{ marginLeft: 36, width: 2, height: 30, background: `${colors.primary}44` }} />
                        <StepIndicator
                            number={2}
                            title="Personaliza todo"
                            description="Ajusta colores, tipografía, imágenes, secciones y contenido con el editor visual."
                            isActive={activeStep === 2}
                        />
                        <div style={{ marginLeft: 36, width: 2, height: 30, background: `${colors.primary}22` }} />
                        <div style={{ opacity: 0.2 }}>
                            <StepIndicator number={3} title="Publica en un click" description="" />
                        </div>
                    </div>
                    <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center' }}>
                        <MockupFrame delay={10} width={620} slideFrom="right">
                            <CustomizeMockup />
                        </MockupFrame>
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Step 3: Publish */}
            <Sequence from={360} durationInFrames={150}>
                <AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '60px 80px', gap: 50 }}>
                    <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: 30 }}>
                        <div style={{ opacity: 0.3 }}>
                            <StepIndicator number={1} title="Describe tu negocio" description="" />
                        </div>
                        <div style={{ marginLeft: 36, width: 2, height: 30, background: `${colors.primary}44` }} />
                        <div style={{ opacity: 0.3 }}>
                            <StepIndicator number={2} title="Personaliza todo" description="" />
                        </div>
                        <div style={{ marginLeft: 36, width: 2, height: 30, background: `${colors.primary}44` }} />
                        <StepIndicator
                            number={3}
                            title="Publica en un click"
                            description="Tu sitio web estará en línea al instante con dominio personalizado incluido."
                            isActive={activeStep === 3}
                        />
                    </div>
                    <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center' }}>
                        <MockupFrame delay={10} width={620} slideFrom="right">
                            <PublishMockup />
                        </MockupFrame>
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Closing CTA */}
            <Sequence from={510}>
                <AbsoluteFill
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 30,
                        opacity: ctaOpacity,
                        transform: `scale(${ctaScale})`,
                    }}
                >
                    <Logo delay={0} size={80} />
                    <div
                        style={{
                            fontFamily: fonts.heading,
                            fontSize: 36,
                            fontWeight: 800,
                            color: colors.textWhite,
                            textAlign: 'center',
                        }}
                    >
                        Pruébalo gratis hoy
                    </div>
                    <div
                        style={{
                            padding: '18px 48px',
                            borderRadius: 14,
                            background: colors.gradientPrimary,
                            fontFamily: fonts.heading,
                            fontSize: 22,
                            fontWeight: 700,
                            color: colors.textWhite,
                            boxShadow: `0 4px 30px ${colors.primary}44`,
                        }}
                    >
                        quimera.ai
                    </div>
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
