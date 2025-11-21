import React from 'react';
import { EditableComponentID, PreviewDevice } from '../../../types';
import { useEditor } from '../../../contexts/EditorContext';
import { initialData } from '../../../data/initialData';
import Hero from '../../Hero';
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
    
    const isCustom = !Object.keys(componentStyles).includes(selectedComponentId);
    
    const componentData = isCustom
        ? customComponents.find(c => c.id === selectedComponentId)
        : { baseComponent: selectedComponentId as EditableComponentID, styles: componentStyles[selectedComponentId as EditableComponentID] };
    
    if (!componentData) {
        return <div className="text-editor-text-secondary p-8 text-center">Component not found.</div>;
    }

    const { baseComponent, styles } = componentData;
    const mockContent = initialData.data[baseComponent];

    const renderComponent = () => {
        if (!styles || !mockContent) {
            return <div className="text-editor-text-secondary">Preview not available.</div>;
        }

        switch (baseComponent) {
            case 'hero':
                return <Hero {...mockContent as any} {...styles} borderRadius={theme.buttonBorderRadius} />;
            case 'features':
                return <Features {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
            case 'testimonials':
                return <Testimonials {...mockContent as any} {...styles} borderRadius={theme.cardBorderRadius} />;
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
            default:
                return <div className="text-editor-text-secondary p-8 text-center">Preview not available for this component.</div>;
        }
    };

    return (
        <div className={`w-full h-full mx-auto transition-all duration-300 ease-in-out ${widthClasses[previewDevice]}`}>
            <div className="bg-dark-900 rounded-lg p-4 border border-editor-border">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-editor-text-secondary mb-4 pl-2">Live Preview</h3>
                <div className="bg-white dark:bg-transparent rounded-md overflow-hidden">
                    {/* This wrapper mimics the structure of LandingPage.tsx for font variables */}
                    <div style={{
                        '--font-header': `var(--font-${theme.fontFamilyHeader})`,
                        '--font-body': `var(--font-${theme.fontFamilyBody})`,
                        '--font-button': `var(--font-${theme.fontFamilyButton})`,
                    } as React.CSSProperties}>
                        {renderComponent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentPreview;