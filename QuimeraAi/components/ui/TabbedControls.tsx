import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('content');

    const tabs = [
        { id: 'content' as TabType, label: t('controls.contentTab'), icon: FileText, content: contentTab },
        { id: 'style' as TabType, label: t('controls.styleTab'), icon: Palette, content: styleTab },
    ];

    if (advancedTab) {
        tabs.push({ id: 'advanced' as TabType, label: t('controls.advanced'), icon: Settings, content: advancedTab });
    }

    return (
        <div className="space-y-5">
            {/* Tab Selector */}
            <div className="flex gap-1 bg-editor-bg/70 backdrop-blur-md p-1 rounded-md border border-editor-border/50 sticky top-0 z-10">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-semibold transition-all
                                ${activeTab === tab.id 
                                    ? 'bg-editor-panel-bg text-editor-accent shadow-sm ring-1 ring-editor-border/70' 
                                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg/60'
                                }
                            `}
                            title={tab.label}
                        >
                            <Icon size={15} strokeWidth={1.8} />
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
