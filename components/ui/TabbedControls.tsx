import React, { useState } from 'react';
import { FileText, Palette, Settings } from 'lucide-react';

interface TabbedControlsProps {
    contentTab: React.ReactNode;
    styleTab: React.ReactNode;
    advancedTab?: React.ReactNode;
}

type TabType = 'content' | 'style' | 'advanced';

const TabbedControls: React.FC<TabbedControlsProps> = ({
    contentTab,
    styleTab,
    advancedTab
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('content');

    const tabs = [
        { id: 'content' as TabType, label: 'Content', icon: FileText, content: contentTab },
        { id: 'style' as TabType, label: 'Style', icon: Palette, content: styleTab },
    ];

    if (advancedTab) {
        tabs.push({ id: 'advanced' as TabType, label: 'Advanced', icon: Settings, content: advancedTab });
    }

    return (
        <div className="space-y-4">
            {/* Tab Selector */}
            <div className="flex gap-1 bg-editor-panel-bg/95 backdrop-blur-md p-1 rounded-lg border border-editor-border/50 sticky top-0 z-10 shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all
                                ${activeTab === tab.id 
                                    ? 'bg-editor-accent text-white shadow-sm' 
                                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg/50'
                                }
                            `}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {tabs.find(tab => tab.id === activeTab)?.content}
            </div>
        </div>
    );
};

export default TabbedControls;

