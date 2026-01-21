/**
 * ReportTemplateSelector
 * Component for selecting report template type
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ReportTemplate } from '../../../types/reports';
import { FileText, List, BarChart3, CheckCircle } from 'lucide-react';

interface ReportTemplateSelectorProps {
    selected: ReportTemplate;
    onChange: (template: ReportTemplate) => void;
}

interface TemplateOption {
    id: ReportTemplate;
    name: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    recommended?: boolean;
}

export function ReportTemplateSelector({ selected, onChange }: ReportTemplateSelectorProps) {
    const { t } = useTranslation();
    const templates: TemplateOption[] = [
        {
            id: 'executive',
            name: t('dashboard.agency.reports.templates.executive.name'),
            description: t('dashboard.agency.reports.templates.executive.description'),
            icon: <FileText className="h-6 w-6" />,
            features: [
                t('dashboard.agency.reports.templates.executive.features.aggregated'),
                t('dashboard.agency.reports.templates.executive.features.trends'),
                t('dashboard.agency.reports.templates.executive.features.top5'),
                t('dashboard.agency.reports.templates.executive.features.recommendations'),
            ],
            recommended: true,
        },
        {
            id: 'detailed',
            name: t('dashboard.agency.reports.templates.detailed.name'),
            description: t('dashboard.agency.reports.templates.detailed.description'),
            icon: <List className="h-6 w-6" />,
            features: [
                t('dashboard.agency.reports.templates.detailed.features.breakdown'),
                t('dashboard.agency.reports.templates.detailed.features.allMetrics'),
                t('dashboard.agency.reports.templates.detailed.features.tables'),
                t('dashboard.agency.reports.templates.detailed.features.charts'),
            ],
        },
        {
            id: 'comparison',
            name: t('dashboard.agency.reports.templates.comparison.name'),
            description: t('dashboard.agency.reports.templates.comparison.description'),
            icon: <BarChart3 className="h-6 w-6" />,
            features: [
                t('dashboard.agency.reports.templates.comparison.features.ranking'),
                t('dashboard.agency.reports.templates.comparison.features.sideBySide'),
                t('dashboard.agency.reports.templates.comparison.features.changes'),
                t('dashboard.agency.reports.templates.comparison.features.benchmarking'),
            ],
        },
    ];

    return (
        <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
                {t('dashboard.agency.reports.templates.title')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => onChange(template.id)}
                        className={`relative text-left p-4 rounded-lg border-2 transition-all ${selected === template.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-border hover:border-input'
                            }`}
                    >
                        {/* Selected indicator */}
                        {selected === template.id && (
                            <div className="absolute top-3 right-3">
                                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        )}

                        {/* Recommended badge */}
                        {template.recommended && (
                            <div className="absolute -top-2 -right-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                                    {t('dashboard.agency.reports.templates.recommended')}
                                </span>
                            </div>
                        )}

                        {/* Icon */}
                        <div
                            className={`inline-flex items-center justify-center h-12 w-12 rounded-lg mb-3 ${selected === template.id
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            {template.icon}
                        </div>

                        {/* Name */}
                        <h4
                            className={`font-semibold mb-1 ${selected === template.id
                                ? 'text-blue-900 dark:text-blue-200'
                                : 'text-foreground'
                                }`}
                        >
                            {template.name}
                        </h4>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-3">
                            {template.description}
                        </p>

                        {/* Features */}
                        <ul className="space-y-1">
                            {template.features.map((feature, index) => (
                                <li
                                    key={index}
                                    className="text-xs text-muted-foreground flex items-center gap-1"
                                >
                                    <span className="text-blue-500">•</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </button>
                ))}
            </div>
        </div>
    );
}
