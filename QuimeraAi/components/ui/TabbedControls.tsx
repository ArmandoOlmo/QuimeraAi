import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Palette, Settings } from 'lucide-react';
import { resolveProjectName } from '../../utils/resolveProjectName';

interface TabbedControlsProps {
    contentTab?: React.ReactNode;
    styleTab?: React.ReactNode;
    advancedTab?: React.ReactNode;
    /** @deprecated Use contentTab */
    contentControls?: React.ReactNode;
}

type TabType = 'content' | 'style' | 'advanced';
type ControlTab = {
    id: TabType;
    label: string;
    icon: React.ElementType;
    content: React.ReactNode;
};

const TabbedControls: React.FC<TabbedControlsProps> = ({
    contentTab,
    styleTab,
    advancedTab,
    contentControls,
}) => {
    const resolvedContentTab = contentTab ?? contentControls ?? null;
    const resolvedStyleTab = styleTab ?? null;
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('content');
    const resolveLabel = (text: unknown) => resolveProjectName(text, i18n.language);

    const tabs: ControlTab[] = [
        { id: 'content' as TabType, label: resolveLabel(t('controls.contentTab')), icon: FileText, content: resolvedContentTab },
        { id: 'style' as TabType, label: resolveLabel(t('controls.styleTab')), icon: Palette, content: resolvedStyleTab },
    ].filter(tab => tab.content !== null && tab.content !== undefined && tab.content !== false);

    if (advancedTab) {
        tabs.push({ id: 'advanced' as TabType, label: resolveLabel(t('controls.advanced')), icon: Settings, content: advancedTab });
    }

    const activeTabExists = tabs.some(tab => tab.id === activeTab);
    const currentTab = activeTabExists ? activeTab : tabs[0]?.id;
    const currentContent = tabs.find(tab => tab.id === currentTab)?.content;
    const tabIds = tabs.map(tab => tab.id).join('|');

    useEffect(() => {
        if (tabs.length > 0 && !tabs.some(tab => tab.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [activeTab, tabIds]);

    if (!tabs.length) return null;

    return (
        <div data-editor-tabs-shell className="space-y-3">
            {/* Tab Selector */}
            {tabs.length > 1 && (
                <div
                    data-editor-control-tabs
                    role="tablist"
                    className="flex gap-1 bg-[var(--editor-control-surface-muted)] backdrop-blur-md p-1 rounded-[var(--editor-control-radius)] border border-[var(--editor-control-border)] sticky top-0 z-10"
                >
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = currentTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                data-editor-control-tab
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex-1 min-h-9 flex items-center justify-center gap-2 px-3 py-1.5 rounded-[var(--editor-control-radius-sm)] text-xs font-bold transition-all
                                    ${isActive
                                        ? 'bg-q-surface text-q-accent shadow-sm ring-1 ring-[var(--editor-control-border)]'
                                        : 'text-q-text-secondary hover:text-q-text hover:bg-q-surface/70'
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
            )}

            {/* Tab Content */}
            <div data-editor-tab-panel>
                {currentContent}
            </div>
        </div>
    );
};

export default TabbedControls;
