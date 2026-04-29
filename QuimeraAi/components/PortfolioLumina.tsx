import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuminaBackground, LuminaPanel, LuminaTypography } from './ui/lumina';
import { sanitizeHtml } from '../utils/sanitize';
import { LuminaAnimationConfig } from '../types/components';

export interface LuminaProject {
    image?: string;
    imageUrl?: string;
    title: string;
    category: string;
    link?: string;
    linkType?: string;
}

export interface PortfolioLuminaData {
    headline: string;
    subheadline?: string;
    projects: LuminaProject[];
    glassEffect?: boolean;
    luminaAnimation?: LuminaAnimationConfig;
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        panelBackground?: string;
        panelBorder?: string;
    };
}

const PortfolioLumina: React.FC<PortfolioLuminaData> = ({
    headline,
    subheadline,
    projects,
    glassEffect = true,
    luminaAnimation,
    colors
}) => {
    headline = headline || 'Our Recent Work';
    subheadline = subheadline || 'Explore some of the amazing projects we have delivered.';
    projects = projects && projects.length > 0 ? projects : [
        { title: 'Project Alpha', category: 'Web Development', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3' },
        { title: 'Project Beta', category: 'Mobile App', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3' },
        { title: 'Project Gamma', category: 'UI/UX Design', imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=2000&ixlib=rb-4.0.3' }
    ];
    const { t } = useTranslation();

    return (
        <section 
            className="relative w-full py-12 md:py-20 px-4 md:px-12"
            style={{ backgroundColor: colors?.background }}
        >
            <LuminaBackground 
                className="absolute inset-0 z-0" 
                animationEnabled={luminaAnimation?.enabled}
                animationColors={luminaAnimation?.colors}
                pulseSpeed={luminaAnimation?.pulseSpeed}
                interactionStrength={luminaAnimation?.interactionStrength}
            />
            
            <div className="relative z-10 w-full max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <LuminaTypography variant="heading-lg" className="font-header" customColor={colors?.heading}>
                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }} />
                    </LuminaTypography>
                    
                    {subheadline && (
                        <LuminaTypography variant="body-md" className="opacity-90 font-body" customColor={colors?.text}>
                            {subheadline}
                        </LuminaTypography>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {projects.map((project, idx) => {
                        const imgSrc = project.image || project.imageUrl;
                        return (
                        <a 
                            key={idx} 
                            href={project.link || '#'} 
                            className="group block relative rounded-[24px] overflow-hidden font-button button-caps"
                        >
                            <div className="aspect-[4/3] w-full relative">
                                {imgSrc ? (
                                    <img 
                                        src={imgSrc} 
                                        alt={project.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[#064E3B] flex items-center justify-center">
                                        <LuminaTypography variant="body-sm" className="opacity-50">No Image</LuminaTypography>
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-[#022C22]/90 via-[#022C22]/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                                
                                <LuminaPanel 
                                    className="absolute bottom-4 left-4 right-4 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
                                    variant={glassEffect ? 'glass' : 'solid'}
                                    customBgColor={colors?.panelBackground}
                                    customBorderColor={colors?.panelBorder}
                                >
                                    <LuminaTypography variant="label-sm" className="text-[#10B981] mb-1">
                                        {project.category}
                                    </LuminaTypography>
                                    <LuminaTypography variant="heading-sm" className="font-header" customColor={colors?.heading}>
                                        {project.title}
                                    </LuminaTypography>
                                </LuminaPanel>
                            </div>
                        </a>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default PortfolioLumina;
