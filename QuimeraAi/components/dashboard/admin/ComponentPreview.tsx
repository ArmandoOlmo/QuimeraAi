import React, { useState, useEffect } from 'react';
import { EditableComponentID, PreviewDevice, PreviewOrientation, AnimationConfig } from '../../../types';
import { initialData } from '../../../data/initialData';
import { deriveColorsFromPalette } from '../../../utils/colorUtils';
import PreviewStatesSelector, { PreviewState } from './PreviewStatesSelector';
import AnimatedPreviewWrapper from './AnimatedPreviewWrapper';
import { Loader2, AlertCircle, FileQuestion, Type, Palette } from 'lucide-react';
import Header from '../../Header';
import Hero from '../../Hero';
import HeroModern from '../../HeroModern';
import HeroGradient from '../../HeroGradient';
import HeroFitness from '../../HeroFitness';
import HeroEditorial from '../../HeroEditorial';
import HeroCinematic from '../../HeroCinematic';
import HeroMinimal from '../../HeroMinimal';
import HeroBold from '../../HeroBold';
import HeroOverlap from '../../HeroOverlap';
import HeroVerticalSplit from '../../HeroVerticalSplit';
import HeroGlass from '../../HeroGlass';
import HeroStacked from '../../HeroStacked';
import Features from '../../Features';
import Testimonials from '../../Testimonials';
import CTASection from '../../CTASection';
import Services from '../../Services';
import Team from '../../Team';
import Slideshow from '../../Slideshow';
import Pricing from '../../Pricing';
import Faq from '../../Faq';
import Portfolio from '../../Portfolio';
import Leads from '../../Leads';
import Newsletter from '../../Newsletter';
import Video from '../../Video';
import HowItWorks from '../../HowItWorks';
import Footer from '../../Footer';
import ChatbotWidget from '../../ChatbotWidget';
import BusinessMap from '../../BusinessMap';
import Menu from '../../Menu';
import Banner from '../../Banner';

interface ComponentPreviewProps {
    selectedComponentId: string;
    previewDevice: PreviewDevice;
    previewOrientation: PreviewOrientation;
}

const widthClasses: Record<PreviewDevice, Record<PreviewOrientation, string>> = {
    desktop: {
        portrait: 'w-full',
        landscape: 'w-full',
    },
    tablet: {
        portrait: 'w-full max-w-3xl',
        landscape: 'w-full max-w-4xl',
    },
    mobile: {
        portrait: 'w-full max-w-sm',
        landscape: 'w-full max-w-md',
    },
};

const ComponentPreview: React.FC<ComponentPreviewProps> = ({ selectedComponentId, previewDevice, previewOrientation }) => {
    const { componentStyles, customComponents } = useAdmin();
    const { theme } = useProject();
    const [previewState, setPreviewState] = useState<PreviewState>('normal');
    const [renderKey, setRenderKey] = useState(0);

    // Inject All Caps CSS variables from theme
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--headings-transform', theme.headingsAllCaps ? 'uppercase' : 'none');
        root.style.setProperty('--headings-spacing', theme.headingsAllCaps ? '0.05em' : 'normal');
        root.style.setProperty('--buttons-transform', theme.buttonsAllCaps ? 'uppercase' : 'none');
        root.style.setProperty('--buttons-spacing', theme.buttonsAllCaps ? '0.05em' : 'normal');
        root.style.setProperty('--navlinks-transform', theme.navLinksAllCaps ? 'uppercase' : 'none');
        root.style.setProperty('--navlinks-spacing', theme.navLinksAllCaps ? '0.05em' : 'normal');
    }, [theme.headingsAllCaps, theme.buttonsAllCaps, theme.navLinksAllCaps]);

    // Force re-render when componentStyles change
    React.useEffect(() => {
        setRenderKey(prev => prev + 1);
    }, [componentStyles, selectedComponentId]);

    const isCustom = !Object.keys(componentStyles).includes(selectedComponentId);

    const componentData = isCustom
        ? customComponents.find(c => c.id === selectedComponentId)
        : { baseComponent: selectedComponentId as EditableComponentID, styles: componentStyles[selectedComponentId as EditableComponentID] };

    if (!componentData) {
        return <div className="text-editor-text-secondary p-8 text-center">Component not found.</div>;
    }

    const { baseComponent, styles } = componentData;
    const mockContent = initialData.data[baseComponent];
    const animationConfig = (styles as any)?.animation as AnimationConfig | undefined;

    // Render state overlays
    const renderStateOverlay = () => {
        if (previewState === 'normal') return null;

        const stateConfig = {
            loading: {
                icon: <Loader2 size={48} className="animate-spin text-blue-400" />,
                title: 'Loading...',
                description: 'Please wait while content is being loaded'
            },
            error: {
                icon: <AlertCircle size={48} className="text-red-400" />,
                title: 'Error',
                description: 'Something went wrong. Please try again later.'
            },
            empty: {
                icon: <FileQuestion size={48} className="text-yellow-400" />,
                title: 'No Content',
                description: 'No data available to display'
            },
            success: {
                icon: <AlertCircle size={48} className="text-green-400" />,
                title: 'Success!',
                description: 'Operation completed successfully'
            }
        };

        const config = stateConfig[previewState as keyof typeof stateConfig];
        if (!config) return null;

        return (
            <div className="absolute inset-0 bg-editor-bg/90 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center p-8">
                    {config.icon}
                    <h3 className="text-xl font-bold text-editor-text-primary mt-4">{config.title}</h3>
                    <p className="text-sm text-editor-text-secondary mt-2">{config.description}</p>
                </div>
            </div>
        );
    };

    const renderComponent = () => {
        if (!styles || !mockContent) {
            return <div className="text-editor-text-secondary">Preview not available.</div>;
        }

        const heroVariant = (styles as any).heroVariant;

        // Merge mockContent colors with styles colors, then derive missing colors
        const mergedColors = {
            ...(mockContent as any)?.colors,
            ...(styles as any)?.colors
        };
        const derivedColors = deriveColorsFromPalette(mergedColors, baseComponent);

        // Create merged props with derived colors
        const mergedProps = {
            ...mockContent as any,
            ...styles,
            colors: derivedColors
        };

        switch (baseComponent) {
            case 'header':
                return <Header {...mergedProps} isPreviewMode={true} />;
            case 'hero':
                {
                    const hbr = (styles as any).buttonBorderRadius || theme.buttonBorderRadius;
                    if (heroVariant === 'modern') return <HeroModern {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'gradient') return <HeroGradient {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'fitness') return <HeroFitness {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'editorial') return <HeroEditorial {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'cinematic') return <HeroCinematic {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'minimal') return <HeroMinimal {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'bold') return <HeroBold {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'overlap') return <HeroOverlap {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'verticalSplit') return <HeroVerticalSplit {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'glass') return <HeroGlass {...mergedProps} borderRadius={hbr} />;
                    if (heroVariant === 'stacked') return <HeroStacked {...mergedProps} borderRadius={hbr} />;
                    return <Hero {...mergedProps} borderRadius={hbr} />;
                }
            case 'features':
                return <Features {...mergedProps} borderRadius={(styles as any).borderRadius || theme.cardBorderRadius} />;
            case 'testimonials':
                return <Testimonials {...mergedProps} borderRadius={(styles as any).borderRadius || theme.cardBorderRadius} cardShadow={(styles as any).cardShadow} borderStyle={(styles as any).borderStyle} cardPadding={(styles as any).cardPadding} testimonialsVariant={(styles as any).testimonialsVariant} />;
            case 'cta':
                return <CTASection {...mergedProps} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'services':
                return <Services {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'team':
                return <Team {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'slideshow':
                return <Slideshow {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'pricing':
                return <Pricing {...mergedProps} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'faq':
                return <Faq {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'portfolio':
                return <Portfolio {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'leads':
                return <Leads {...mergedProps} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'newsletter':
                return <Newsletter {...mergedProps} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'video':
                return <Video {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'howItWorks':
                return <HowItWorks {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'map':
                return <BusinessMap {...mergedProps} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={theme.cardBorderRadius} />;
            case 'menu':
                return <Menu {...mergedProps} borderRadius={theme.cardBorderRadius} />;
            case 'banner':
                return <Banner {...mergedProps} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'footer':
                return <Footer {...mergedProps} />;
            case 'chatbot':
                return <ChatbotWidget isPreview={true} />;
            case 'typography':
                return (
                    <div className="p-8 text-center">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-editor-text-secondary mb-4">
                                <Type size={48} className="mx-auto mb-4 text-editor-accent" />
                                <h3 className="text-xl font-bold text-editor-text-primary mb-2">Global Typography Settings</h3>
                                <p className="text-sm">Typography is configured globally through Theme Settings, not as an individual component.</p>
                            </div>
                            <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border text-left space-y-4">
                                <div>
                                    <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-header)' }}>Header Font Preview</h1>
                                    <p className="text-sm text-editor-text-secondary">Using: {theme.fontFamilyHeader}</p>
                                </div>
                                <div>
                                    <p className="text-lg mb-2" style={{ fontFamily: 'var(--font-body)' }}>Body font preview with some sample text to show how it looks in paragraphs and longer content sections.</p>
                                    <p className="text-sm text-editor-text-secondary">Using: {theme.fontFamilyBody}</p>
                                </div>
                                <div>
                                    <button className="px-6 py-3 bg-editor-accent text-editor-bg rounded-md font-semibold" style={{ fontFamily: 'var(--font-button)' }}>Button Font Preview</button>
                                    <p className="text-sm text-editor-text-secondary mt-2">Using: {theme.fontFamilyButton}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'colors':
                const globalColors = (theme.globalColors || {}) as any;
                return (
                    <div className="p-8 text-center">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-editor-text-secondary mb-4">
                                <Palette size={48} className="mx-auto mb-4 text-editor-accent" />
                                <h3 className="text-xl font-bold text-editor-text-primary mb-2">Global Color Settings</h3>
                                <p className="text-sm">Colors are configured globally through Theme Settings and applied to all components.</p>
                            </div>
                            <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { name: 'Primary', color: globalColors.primary || '#4f46e5' },
                                        { name: 'Secondary', color: globalColors.secondary || '#10b981' },
                                        { name: 'Accent', color: globalColors.accent || '#4f46e5' },
                                        { name: 'Background', color: globalColors.background || '#0f172a' },
                                        { name: 'Surface', color: globalColors.surface || '#1e293b' },
                                        { name: 'Text', color: globalColors.text || '#94a3b8' },
                                        { name: 'Heading', color: globalColors.heading || '#F9FAFB' },
                                        { name: 'Border', color: globalColors.border || '#334155' },
                                    ].map(({ name, color }) => (
                                        <div key={name} className="text-center">
                                            <div
                                                className="w-16 h-16 mx-auto rounded-lg border border-editor-border shadow-md mb-2"
                                                style={{ backgroundColor: color }}
                                            />
                                            <p className="text-xs font-semibold text-editor-text-primary">{name}</p>
                                            <p className="text-xs text-editor-text-secondary font-mono">{color}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="text-editor-text-secondary p-8 text-center">Preview not available for this component.</div>;
        }
    };

    return (
        <div className={`w-full h-full mx-auto transition-all duration-300 ease-in-out ${widthClasses[previewDevice][previewOrientation]}`}>
            <div className="bg-dark-900 rounded-lg p-4 border border-editor-border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-editor-text-secondary pl-2">Live Preview</h3>
                    <PreviewStatesSelector currentState={previewState} onStateChange={setPreviewState} />
                </div>
                <div className="bg-white dark:bg-transparent rounded-md overflow-hidden relative min-h-[300px]">
                    {/* State overlay */}
                    {renderStateOverlay()}
                    {/* This wrapper mimics the structure of LandingPage.tsx for font variables */}
                    <div
                        key={renderKey}
                        data-component-preview={selectedComponentId}
                        className="relative"
                        style={{
                            '--font-header': `var(--font-${theme.fontFamilyHeader})`,
                            '--font-body': `var(--font-${theme.fontFamilyBody})`,
                            '--font-button': `var(--font-${theme.fontFamilyButton})`,
                        } as React.CSSProperties}
                    >
                        <AnimatedPreviewWrapper animation={animationConfig}>
                            {renderComponent()}
                        </AnimatedPreviewWrapper>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentPreview;