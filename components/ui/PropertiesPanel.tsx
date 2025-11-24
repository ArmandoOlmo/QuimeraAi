import React, { useState } from 'react';
import { PageSection } from '../../types';
import { Type, Palette, Settings, FileText } from 'lucide-react';

interface PropertiesPanelProps {
    activeSection: PageSection | null;
    children: React.ReactNode;
    sectionLabel?: string;
}

type TabType = 'content' | 'style' | 'advanced';

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    activeSection,
    children,
    sectionLabel
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('content');

    const tabs = [
        { id: 'content' as TabType, label: 'Content', icon: FileText },
        { id: 'style' as TabType, label: 'Style', icon: Palette },
        { id: 'advanced' as TabType, label: 'Advanced', icon: Settings }
    ];

    if (!activeSection) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-editor-bg p-8 text-center">
                <div className="bg-editor-panel-bg/50 rounded-full p-6 mb-4">
                    <Settings size={32} className="text-editor-text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-editor-text-primary mb-2">
                    No Section Selected
                </h3>
                <p className="text-sm text-editor-text-secondary max-w-xs">
                    Select a component from the page structure to edit its properties
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-editor-bg">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-editor-border">
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider">
                            Properties
                        </h3>
                        {sectionLabel && (
                            <p className="text-base font-semibold text-editor-text-primary mt-1">
                                {sectionLabel}
                            </p>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-editor-panel-bg p-1 rounded-lg">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
                                    ${activeTab === tab.id 
                                        ? 'bg-editor-accent text-white shadow-sm' 
                                        : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                                    }
                                `}
                            >
                                <Icon size={14} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div data-tab={activeTab} className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// HOC to wrap section controls with tab organization
export const withTabOrganization = (
    ContentControls: React.ReactNode,
    StyleControls: React.ReactNode,
    AdvancedControls?: React.ReactNode
) => {
    return (
        <div className="space-y-4">
            <div data-tab-content="content" className="[div[data-tab='content']_&]:block hidden">
                {ContentControls}
            </div>
            <div data-tab-content="style" className="[div[data-tab='style']_&]:block hidden">
                {StyleControls}
            </div>
            {AdvancedControls && (
                <div data-tab-content="advanced" className="[div[data-tab='advanced']_&]:block hidden">
                    {AdvancedControls}
                </div>
            )}
        </div>
    );
};

export default PropertiesPanel;

