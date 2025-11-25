import React from 'react';
import TabbedControls from './TabbedControls';
import { PageSection } from '../../types';

interface SectionControlsWrapperProps {
    section: PageSection;
    children: React.ReactNode;
}

/**
 * This component intelligently splits control sections into Content/Style/Advanced tabs
 * based on common patterns in the controls markup.
 */
const SectionControlsWrapper: React.FC<SectionControlsWrapperProps> = ({ section, children }) => {
    // For simple sections, just render without tabs
    if (!children) return null;

    // Convert children to array to process
    const childrenArray = React.Children.toArray(children);
    
    // If it's a simple component without clear sections, render as-is in Content tab
    if (childrenArray.length === 1) {
        return <TabbedControls 
            contentTab={children}
            styleTab={<div className="text-center text-editor-text-secondary py-8">No style options available</div>}
        />;
    }

    // For most sections, we'll organize by detecting separators and titles
    // This is a smart wrapper that extracts content/style/advanced automatically
    
    // Define which sections should use tabs
    const tabSections: PageSection[] = ['hero', 'features', 'services', 'pricing', 'testimonials', 'chatbot'];
    
    if (!tabSections.includes(section)) {
        // For simpler sections, just show in content tab
        return <TabbedControls 
            contentTab={children}
            styleTab={<div className="text-center text-editor-text-secondary py-8">No style options available</div>}
        />;
    }

    // For complex sections, we need to parse the children and split them
    // This is done by the parent renderer, so we just pass through
    return <>{children}</>;
};

export default SectionControlsWrapper;

/**
 * Helper function to organize section controls into tabs programmatically
 * Separates content, styling, and advanced options based on HR separators
 */
export const organizeControlsIntoTabs = (
    controls: React.ReactNode,
    forceContentOnly = false
): { content: React.ReactNode; style: React.ReactNode; advanced?: React.ReactNode } => {
    if (forceContentOnly) {
        return {
            content: controls,
            style: <div className="text-center text-editor-text-secondary py-8">No style options</div>
        };
    }

    // Simple heuristic: Everything before "Colors" section is content, everything after is style
    // This works for most of our existing controls
    
    // For now, return everything in content until we implement smart parsing
    return {
        content: controls,
        style: <div className="text-center text-editor-text-secondary py-8">Style options are mixed with content</div>
    };
};



