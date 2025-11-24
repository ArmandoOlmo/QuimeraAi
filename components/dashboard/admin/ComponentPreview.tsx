import React, { useState, useEffect } from 'react';
import { EditableComponentID, PreviewDevice, AnimationConfig } from '../../../types';
import { useEditor } from '../../../contexts/EditorContext';
import { initialData } from '../../../data/initialData';
import PreviewStatesSelector, { PreviewState } from './PreviewStatesSelector';
import AnimatedPreviewWrapper from './AnimatedPreviewWrapper';
import { Loader2, AlertCircle, FileQuestion, Type } from 'lucide-react';
import Header from '../../Header';
import Hero from '../../Hero';
import HeroModern from '../../HeroModern';
import HeroGradient from '../../HeroGradient';
import HeroFitness from '../../HeroFitness';
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

interface ComponentPreviewProps {
    selectedComponentId: string;
    previewDevice: PreviewDevice;
}

const widthClasses: Record<PreviewDevice, string> = {
  desktop: 'w-full',
  tablet: 'w-full max-w-3xl',
  mobile: 'w-full max-w-sm',
};

const ComponentPreview: React.FC<ComponentPreviewProps> = ({ selectedComponentId, previewDevice }) => {
    const { componentStyles, customComponents, theme } = useEditor();
    const [previewState, setPreviewState] = useState<PreviewState>('normal');
    const [renderKey, setRenderKey] = useState(0);
    
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
        console.log('🎨 Rendering component:', baseComponent, 'heroVariant:', heroVariant, 'Full styles:', styles);

        switch (baseComponent) {
            case 'header':
                return <Header {...mockContent as any} {...styles} isPreviewMode={true} />;
            case 'hero':
                console.log('🔍 Hero check: heroVariant=', heroVariant);
                return heroVariant === 'modern'
                    ? <HeroModern {...mockContent as any} {...styles} borderRadius={styles.buttonBorderRadius || theme.buttonBorderRadius} />
                    : heroVariant === 'gradient'
                        ? <HeroGradient {...mockContent as any} {...styles} borderRadius={styles.buttonBorderRadius || theme.buttonBorderRadius} />
                        : heroVariant === 'fitness'
                            ? <HeroFitness {...mockContent as any} {...styles} borderRadius={styles.buttonBorderRadius || theme.buttonBorderRadius} />
                            : <Hero {...mockContent as any} {...styles} borderRadius={styles.buttonBorderRadius || theme.buttonBorderRadius} />;
            case 'features':
                return <Features {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'testimonials':
                return <Testimonials {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} avatarBorderWidth={styles.avatarBorderWidth} avatarBorderColor={styles.avatarBorderColor} />;
            case 'cta':
                 return <CTASection {...mockContent as any} {...styles} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'services':
                return <Services {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'team':
                return <Team {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'slideshow':
                return <Slideshow {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'pricing':
                return <Pricing {...mockContent as any} {...styles} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'faq':
                return <Faq {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'portfolio':
                return <Portfolio {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'leads':
                return <Leads {...mockContent as any} {...styles} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'newsletter':
                return <Newsletter {...mockContent as any} {...styles} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />;
            case 'video':
                return <Video {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'howItWorks':
                return <HowItWorks {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'footer':
                return <Footer {...mockContent as any} {...styles} />;
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
            default:
                return <div className="text-editor-text-secondary p-8 text-center">Preview not available for this component.</div>;
        }
    };

    return (
        <div className={`w-full h-full mx-auto transition-all duration-300 ease-in-out ${widthClasses[previewDevice]}`}>
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