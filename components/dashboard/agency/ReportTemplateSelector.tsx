/**
 * ReportTemplateSelector
 * Component for selecting report template type
 */

import React from 'react';
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
    const templates: TemplateOption[] = [
        {
            id: 'executive',
            name: 'Resumen Ejecutivo',
            description: 'Vista general con KPIs principales y tendencias',
            icon: <FileText className="h-6 w-6" />,
            features: [
                'Métricas agregadas',
                'Tendencias vs período anterior',
                'Top 5 clientes',
                'Recomendaciones',
            ],
            recommended: true,
        },
        {
            id: 'detailed',
            name: 'Reporte Detallado',
            description: 'Análisis completo con métricas por cliente',
            icon: <List className="h-6 w-6" />,
            features: [
                'Desglose por cliente',
                'Todas las métricas',
                'Tablas detalladas',
                'Gráficos individuales',
            ],
        },
        {
            id: 'comparison',
            name: 'Comparativa',
            description: 'Comparación de rendimiento entre clientes',
            icon: <BarChart3 className="h-6 w-6" />,
            features: [
                'Ranking de clientes',
                'Comparativa lado a lado',
                'Cambios período a período',
                'Benchmarking',
            ],
        },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Plantilla de Reporte
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => onChange(template.id)}
                        className={`relative text-left p-4 rounded-lg border-2 transition-all ${
                            selected === template.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
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
                                    Recomendado
                                </span>
                            </div>
                        )}

                        {/* Icon */}
                        <div
                            className={`inline-flex items-center justify-center h-12 w-12 rounded-lg mb-3 ${
                                selected === template.id
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            {template.icon}
                        </div>

                        {/* Name */}
                        <h4
                            className={`font-semibold mb-1 ${
                                selected === template.id
                                    ? 'text-blue-900 dark:text-blue-200'
                                    : 'text-gray-900 dark:text-white'
                            }`}
                        >
                            {template.name}
                        </h4>

                        {/* Description */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {template.description}
                        </p>

                        {/* Features */}
                        <ul className="space-y-1">
                            {template.features.map((feature, index) => (
                                <li
                                    key={index}
                                    className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1"
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
