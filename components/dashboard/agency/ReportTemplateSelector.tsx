/**
 * ReportTemplateSelector
 * Modern component for selecting report template type
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ReportTemplate } from '../../../types/reports';
import { FileText, List, BarChart3, CheckCircle, Sparkles, Check } from 'lucide-react';

interface ReportTemplateSelectorProps {
    selected: ReportTemplate;
    onChange: (template: ReportTemplate) => void;
}

interface TemplateOption {
    id: ReportTemplate;
    name: string;
    description: string;
    icon: React.ElementType;
    features: string[];
    recommended?: boolean;
    color: string;
}

export function ReportTemplateSelector({ selected, onChange }: ReportTemplateSelectorProps) {
    const { t } = useTranslation();

    const templates: TemplateOption[] = [
        {
            id: 'executive',
            name: t('dashboard.agency.reports.templates.executive.name', 'Ejecutivo'),
            description: t('dashboard.agency.reports.templates.executive.description', 'Resumen ejecutivo con KPIs clave'),
            icon: FileText,
            features: [
                t('dashboard.agency.reports.templates.executive.features.aggregated', 'Métricas agregadas'),
                t('dashboard.agency.reports.templates.executive.features.trends', 'Tendencias visuales'),
                t('dashboard.agency.reports.templates.executive.features.top5', 'Top 5 clientes'),
                t('dashboard.agency.reports.templates.executive.features.recommendations', 'Recomendaciones AI'),
            ],
            recommended: true,
            color: 'purple',
        },
        {
            id: 'detailed',
            name: t('dashboard.agency.reports.templates.detailed.name', 'Detallado'),
            description: t('dashboard.agency.reports.templates.detailed.description', 'Análisis completo por cliente'),
            icon: List,
            features: [
                t('dashboard.agency.reports.templates.detailed.features.breakdown', 'Desglose por cliente'),
                t('dashboard.agency.reports.templates.detailed.features.allMetrics', 'Todas las métricas'),
                t('dashboard.agency.reports.templates.detailed.features.tables', 'Tablas detalladas'),
                t('dashboard.agency.reports.templates.detailed.features.charts', 'Gráficos interactivos'),
            ],
            color: 'blue',
        },
        {
            id: 'comparison',
            name: t('dashboard.agency.reports.templates.comparison.name', 'Comparativo'),
            description: t('dashboard.agency.reports.templates.comparison.description', 'Comparación entre clientes'),
            icon: BarChart3,
            features: [
                t('dashboard.agency.reports.templates.comparison.features.ranking', 'Ranking de clientes'),
                t('dashboard.agency.reports.templates.comparison.features.sideBySide', 'Análisis lado a lado'),
                t('dashboard.agency.reports.templates.comparison.features.changes', 'Cambios porcentuales'),
                t('dashboard.agency.reports.templates.comparison.features.benchmarking', 'Benchmarking'),
            ],
            color: 'green',
        },
    ];

    const getColorClasses = (color: string, isSelected: boolean) => {
        const colors: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
            purple: {
                bg: isSelected ? 'bg-purple-500/10' : 'bg-card',
                text: isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-foreground',
                border: isSelected ? 'border-purple-500' : 'border-border/50',
                iconBg: isSelected ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-muted text-muted-foreground',
            },
            blue: {
                bg: isSelected ? 'bg-blue-500/10' : 'bg-card',
                text: isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground',
                border: isSelected ? 'border-blue-500' : 'border-border/50',
                iconBg: isSelected ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground',
            },
            green: {
                bg: isSelected ? 'bg-green-500/10' : 'bg-card',
                text: isSelected ? 'text-green-600 dark:text-green-400' : 'text-foreground',
                border: isSelected ? 'border-green-500' : 'border-border/50',
                iconBg: isSelected ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground',
            },
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="p-5 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">
                            {t('dashboard.agency.reports.templates.title', 'Plantilla de Reporte')}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Selecciona el formato del reporte
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map((template) => {
                        const isSelected = selected === template.id;
                        const colors = getColorClasses(template.color, isSelected);
                        const Icon = template.icon;

                        return (
                            <button
                                key={template.id}
                                onClick={() => onChange(template.id)}
                                className={`
                                    relative text-left p-5 rounded-xl border-2 transition-all duration-300 group
                                    ${colors.bg} ${colors.border}
                                    hover:shadow-lg hover:-translate-y-0.5
                                `}
                            >
                                {/* Selected indicator */}
                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${template.color === 'purple' ? 'bg-purple-500' :
                                                template.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                                            }`}>
                                            <Check className="h-3.5 w-3.5 text-white" />
                                        </div>
                                    </div>
                                )}

                                {/* Recommended badge */}
                                {template.recommended && (
                                    <div className="absolute -top-2.5 left-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                                            <Sparkles className="h-3 w-3" />
                                            {t('dashboard.agency.reports.templates.recommended', 'Recomendado')}
                                        </span>
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`
                                    inline-flex items-center justify-center h-12 w-12 rounded-xl mb-4 transition-colors
                                    ${colors.iconBg}
                                `}>
                                    <Icon className="h-6 w-6" />
                                </div>

                                {/* Name */}
                                <h4 className={`font-semibold text-base mb-1.5 ${colors.text}`}>
                                    {template.name}
                                </h4>

                                {/* Description */}
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {template.description}
                                </p>

                                {/* Features */}
                                <ul className="space-y-1.5">
                                    {template.features.map((feature, index) => (
                                        <li
                                            key={index}
                                            className="text-xs text-muted-foreground flex items-center gap-2"
                                        >
                                            <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected
                                                    ? template.color === 'purple' ? 'text-purple-500' :
                                                        template.color === 'blue' ? 'text-blue-500' : 'text-green-500'
                                                    : 'text-muted-foreground/50'
                                                }`} />
                                            <span className="line-clamp-1">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
