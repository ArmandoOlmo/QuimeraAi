import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Palette, Settings } from 'lucide-react';
import { resolveProjectName } from '../../utils/resolveProjectName';
import { CollapsibleSection, useCollapsibleSections } from './CollapsibleSection';

interface TabbedControlsProps {
    contentTab?: React.ReactNode;
    styleTab?: React.ReactNode;
    advancedTab?: React.ReactNode;
    /** @deprecated Use contentTab */
    contentControls?: React.ReactNode;
}

type SectionType = 'content' | 'style' | 'advanced';
type ControlSection = {
    id: SectionType;
    label: string;
    icon: React.ReactNode;
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
    const resolveLabel = (text: unknown) => resolveProjectName(text, i18n.language);

    // Content & Style open by default, Advanced collapsed to economize space.
    const { openSections, toggle } = useCollapsibleSections<SectionType>({
        content: true,
        style: true,
        advanced: false,
    });

    const sections: ControlSection[] = [
        { id: 'content', label: resolveLabel(t('controls.contentTab')), icon: <FileText size={14} />, content: resolvedContentTab },
        { id: 'style', label: resolveLabel(t('controls.styleTab')), icon: <Palette size={14} />, content: resolvedStyleTab },
    ].filter(section => section.content !== null && section.content !== undefined && section.content !== false);

    if (advancedTab) {
        sections.push({ id: 'advanced', label: resolveLabel(t('controls.advanced')), icon: <Settings size={14} />, content: advancedTab });
    }

    if (!sections.length) return null;

    // A single section has nothing to collapse against — render it directly (matches the
    // old behavior where the tab bar only appeared when there was more than one tab).
    if (sections.length === 1) {
        return (
            <div data-editor-tabs-shell data-editor-tab-panel>
                {sections[0].content}
            </div>
        );
    }

    return (
        <div data-editor-tabs-shell className="space-y-2.5">
            {sections.map(section => (
                <CollapsibleSection
                    key={section.id}
                    title={section.label}
                    icon={section.icon}
                    isOpen={openSections[section.id]}
                    onToggle={() => toggle(section.id)}
                >
                    <div data-editor-tab-panel>{section.content}</div>
                </CollapsibleSection>
            ))}
        </div>
    );
};

export default TabbedControls;
