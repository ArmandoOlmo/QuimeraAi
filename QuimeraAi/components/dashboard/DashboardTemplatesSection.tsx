import React from 'react';
import { usePersistedBoolean } from '../../hooks/usePersistedState';
import ProjectCard from './ProjectCard';

interface DashboardTemplatesSectionProps {
    templates: any[];
}

/**
 * DashboardTemplatesSection
 *
 * Content for the "Templates" draggable section.
 * Shows up to 4 template cards with compact/large toggle.
 * Extracted from Dashboard.tsx lines 731-786.
 */
const DashboardTemplatesSection: React.FC<DashboardTemplatesSectionProps> = ({
    templates,
}) => {
    const [compactTemplates, setCompactTemplates] = usePersistedBoolean(
        'quimera_compact_templates',
        true,
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 animate-fade-in-up">
            {templates.slice(0, 4).map((template) => (
                <ProjectCard key={template.id} project={template} compact={compactTemplates} />
            ))}
        </div>
    );
};

export default DashboardTemplatesSection;
