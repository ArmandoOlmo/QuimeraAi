import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistedBoolean } from '../../hooks/usePersistedState';
import ProjectCard from './ProjectCard';
import { Maximize2, Minimize2 } from 'lucide-react';

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

/**
 * Helper component: Size toggle used as `rightAction` in the draggable section.
 */
export const TemplatesSizeToggle: React.FC = () => {
    const { t } = useTranslation();
    const [compactTemplates, setCompactTemplates] = usePersistedBoolean(
        'quimera_compact_templates',
        true,
    );

    return (
        <div
            className="hidden lg:flex items-center gap-1 bg-secondary/40 rounded-lg p-1"
            role="group"
            aria-label={t('dashboard.templateSize', 'Tamaño de plantillas')}
        >
            <button
                onClick={() => setCompactTemplates(false)}
                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                    !compactTemplates
                        ? 'text-primary bg-q-bg shadow-sm'
                        : 'text-q-text-muted hover:text-foreground'
                }`}
                aria-label={t('dashboard.templateSizeLarge', 'Grande')}
                aria-pressed={!compactTemplates}
                title={t('dashboard.templateSizeLarge', 'Grande')}
            >
                <Maximize2 size={15} aria-hidden="true" />
            </button>
            <button
                onClick={() => setCompactTemplates(true)}
                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                    compactTemplates
                        ? 'text-primary bg-q-bg shadow-sm'
                        : 'text-q-text-muted hover:text-foreground'
                }`}
                aria-label={t('dashboard.templateSizeCompact', 'Compacto')}
                aria-pressed={compactTemplates}
                title={t('dashboard.templateSizeCompact', 'Compacto')}
            >
                <Minimize2 size={15} aria-hidden="true" />
            </button>
        </div>
    );
};

export default DashboardTemplatesSection;
