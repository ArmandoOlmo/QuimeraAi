/**
 * ReportsGenerator
 * Modern UI for generating consolidated reports
 * Premium design with glassmorphism and smooth animations
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { reportingService } from '../../../services/reportingService';
import { pdfReportGenerator } from '../../../services/pdfGenerator';
import type {
    ReportMetric,
    ReportTemplate,
    ReportDateRange,
    AggregatedReportData,
} from '../../../types/reports';
import {
    FileText,
    Download,
    Calendar,
    Users,
    Settings,
    Loader2,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Eye,
    DollarSign,
    Mail,
    Cpu,
    HardDrive,
    UserCheck,
    FolderOpen,
    Sparkles,
    ArrowRight,
    RotateCcw,
    FileSpreadsheet,
    Clock,
    Building2,
} from 'lucide-react';
import { ReportTemplateSelector } from './ReportTemplateSelector';

type Step = 'configure' | 'preview' | 'generating' | 'completed';

// Step indicator component
const StepIndicator = ({ currentStep }: { currentStep: Step }) => {
    const steps = [
        { id: 'configure', label: 'Configurar', icon: Settings },
        { id: 'preview', label: 'Vista Previa', icon: Eye },
        { id: 'completed', label: 'Completado', icon: CheckCircle },
    ];

    const getStepStatus = (stepId: string) => {
        const stepOrder = ['configure', 'preview', 'generating', 'completed'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(stepId === 'completed' ? 'completed' : stepId);

        if (currentStep === 'generating') {
            if (stepId === 'configure') return 'completed';
            if (stepId === 'preview') return 'current';
            return 'pending';
        }

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'pending';
    };

    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                const Icon = step.icon;

                return (
                    <React.Fragment key={step.id}>
                        <div className={`
                            flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                            ${status === 'current'
                                ? 'bg-primary/10 text-primary ring-2 ring-primary/20'
                                : status === 'completed'
                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                    : 'bg-muted text-muted-foreground'
                            }
                        `}>
                            <Icon className={`h-4 w-4 ${status === 'current' ? 'animate-pulse' : ''}`} />
                            <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`
                                w-8 h-0.5 transition-colors duration-300
                                ${status === 'completed' ? 'bg-green-500' : 'bg-border'}
                            `} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// Metric icons mapping
const metricIcons: Record<ReportMetric, React.ElementType> = {
    leads: Users,
    visits: Eye,
    sales: DollarSign,
    emails: Mail,
    ai_usage: Cpu,
    storage: HardDrive,
    users: UserCheck,
    projects: FolderOpen,
};

export function ReportsGenerator() {
    const { t } = useTranslation();
    const { subClients: clients, loadingClients: clientsLoading } = useAgency();
    const { currentTenant } = useTenant();

    // Form state
    const [step, setStep] = useState<Step>('configure');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(true);
    const [dateRange, setDateRange] = useState<ReportDateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date(),
    });
    const [selectedMetrics, setSelectedMetrics] = useState<ReportMetric[]>([
        'leads',
        'visits',
        'sales',
    ]);
    const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('executive');
    const [includeTrends, setIncludeTrends] = useState(true);
    const [includeRecommendations, setIncludeRecommendations] = useState(true);

    // Generation state
    const [reportData, setReportData] = useState<AggregatedReportData | null>(null);
    const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const allMetrics: { id: ReportMetric; label: string; description: string }[] = React.useMemo(() => [
        { id: 'leads', label: t('dashboard.agency.reports.metrics.leads', 'Leads'), description: t('dashboard.agency.reports.metrics.leadsDesc', 'Total de leads capturados') },
        { id: 'visits', label: t('dashboard.agency.reports.metrics.visits', 'Visitas'), description: t('dashboard.agency.reports.metrics.visitsDesc', 'Tráfico web total') },
        { id: 'sales', label: t('dashboard.agency.reports.metrics.sales', 'Ventas'), description: t('dashboard.agency.reports.metrics.salesDesc', 'Ingresos generados') },
        { id: 'emails', label: t('dashboard.agency.reports.metrics.emails', 'Emails'), description: t('dashboard.agency.reports.metrics.emailsDesc', 'Campañas enviadas') },
        { id: 'ai_usage', label: t('dashboard.agency.reports.metrics.ai_usage', 'Uso AI'), description: t('dashboard.agency.reports.metrics.ai_usageDesc', 'Créditos consumidos') },
        { id: 'storage', label: t('dashboard.agency.reports.metrics.storage', 'Storage'), description: t('dashboard.agency.reports.metrics.storageDesc', 'Almacenamiento usado') },
        { id: 'users', label: t('dashboard.agency.reports.metrics.users', 'Usuarios'), description: t('dashboard.agency.reports.metrics.usersDesc', 'Usuarios activos') },
        { id: 'projects', label: t('dashboard.agency.reports.metrics.projects', 'Proyectos'), description: t('dashboard.agency.reports.metrics.projectsDesc', 'Sitios activos') },
    ], [t]);

    const handleSelectAllClients = (checked: boolean) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedClients(clients.map((c) => c.id));
        } else {
            setSelectedClients([]);
        }
    };

    const handleClientToggle = (clientId: string) => {
        setSelectedClients((prev) => {
            if (prev.includes(clientId)) {
                return prev.filter((id) => id !== clientId);
            } else {
                return [...prev, clientId];
            }
        });
        setSelectAll(false);
    };

    const handleMetricToggle = (metric: ReportMetric) => {
        setSelectedMetrics((prev) => {
            if (prev.includes(metric)) {
                return prev.filter((m) => m !== metric);
            } else {
                return [...prev, metric];
            }
        });
    };

    const handleGenerateReport = async () => {
        if (selectedClients.length === 0) {
            setError(t('dashboard.agency.reports.errors.selectClient', 'Selecciona al menos un cliente'));
            return;
        }

        if (selectedMetrics.length === 0) {
            setError(t('dashboard.agency.reports.errors.selectMetric', 'Selecciona al menos una métrica'));
            return;
        }

        setError(null);
        setStep('generating');

        try {
            // Generate report data
            const data = await reportingService.aggregateClientData(
                currentTenant!.id,
                selectAll ? clients.map((c) => c.id) : selectedClients,
                dateRange,
                selectedMetrics
            );

            setReportData(data);
            setStep('preview');
        } catch (err: any) {
            console.error('Error generating report:', err);
            setError(err.message || t('dashboard.agency.reports.errors.generateError', 'Error al generar el reporte'));
            setStep('configure');
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportData || !currentTenant) return;

        setStep('generating');
        setError(null);

        try {
            const pdfBlob = await pdfReportGenerator.generateReport(
                reportData,
                currentTenant.branding || {
                    companyName: currentTenant.name,
                    primaryColor: '#3B82F6',
                    secondaryColor: '#10B981',
                },
                selectedTemplate
            );

            // Create download link
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte_consolidado_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setGeneratedPdfUrl(url);
            setStep('completed');
        } catch (err: any) {
            console.error('Error generating PDF:', err);
            setError(err.message || t('dashboard.agency.reports.errors.pdfError', 'Error al generar PDF'));
            setStep('preview');
        }
    };

    const handleExportCSV = () => {
        if (!reportData) return;

        // Create CSV content
        const headers = [
            t('dashboard.agency.reports.table.client', 'Cliente'),
            t('dashboard.agency.reports.table.leads', 'Leads'),
            t('dashboard.agency.reports.table.visits', 'Visitas'),
            t('dashboard.agency.reports.table.revenue', 'Ingresos'),
            t('dashboard.agency.reports.table.conversion', 'Conversión')
        ];
        const rows = reportData.byClient.map((client) => [
            client.clientName,
            client.totalLeads.toString(),
            client.totalVisits.toString(),
            client.totalRevenue.toFixed(2),
            client.conversionRate.toFixed(2),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        // Download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_consolidado_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setStep('configure');
        setReportData(null);
        setGeneratedPdfUrl(null);
        setError(null);
    };

    // Quick date presets
    const datePresets = [
        { label: t('dashboard.agency.reports.last7Days', '7 días'), days: 7 },
        { label: t('dashboard.agency.reports.last30Days', '30 días'), days: 30 },
        { label: t('dashboard.agency.reports.last90Days', '90 días'), days: 90 },
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-6 sm:p-8">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
                <div className="relative">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <FileText className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                                    {t('dashboard.agency.reports.generatorTitle', 'Generador de Reportes')}
                                    <Sparkles className="h-6 w-6 text-amber-500" />
                                </h1>
                                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                                    {t('dashboard.agency.reports.generatorSubtitle', 'Crea reportes consolidados para tus clientes')}
                                </p>
                            </div>
                        </div>
                        {step !== 'configure' && (
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-background transition-all duration-200"
                            >
                                <RotateCcw className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('dashboard.agency.reports.createAnother', 'Nuevo Reporte')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <StepIndicator currentStep={step} />

            {/* Error Alert */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-red-600 dark:text-red-400">Error</h3>
                        <p className="text-red-600/80 dark:text-red-400/80 text-sm mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Configuration Step */}
            {step === 'configure' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Client Selection - Left Column */}
                    <div className="lg:col-span-4">
                        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                            <div className="p-5 border-b border-border/50 bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Building2 className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">
                                            {t('dashboard.agency.reports.clients', 'Clientes')}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedClients.length} de {clients.length} seleccionados
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Select All */}
                                <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={selectedClients.length === clients.length}
                                            onChange={(e) => handleSelectAllClients(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="h-5 w-5 rounded-md border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all duration-200 flex items-center justify-center">
                                            {selectedClients.length === clients.length && (
                                                <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                        {t('dashboard.agency.reports.allClients', 'Todos los clientes')} ({clients.length})
                                    </span>
                                </label>

                                <div className="h-px bg-border/50 my-3" />

                                {/* Client List */}
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {clients.map((client) => (
                                        <label
                                            key={client.id}
                                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                                        >
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClients.includes(client.id)}
                                                    onChange={() => handleClientToggle(client.id)}
                                                    className="sr-only peer"
                                                />
                                                <div className="h-4 w-4 rounded border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all duration-200 flex items-center justify-center">
                                                    {selectedClients.includes(client.id) && (
                                                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors truncate">
                                                {client.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Options - Right Column */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Date Range */}
                        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                            <div className="p-5 border-b border-border/50 bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">
                                            {t('dashboard.agency.reports.period', 'Período')}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Selecciona el rango de fechas
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                {/* Quick Presets */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {datePresets.map((preset) => (
                                        <button
                                            key={preset.days}
                                            onClick={() =>
                                                setDateRange({
                                                    start: new Date(new Date().setDate(new Date().getDate() - preset.days)),
                                                    end: new Date(),
                                                })
                                            }
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-secondary/50 hover:bg-secondary text-secondary-foreground transition-colors"
                                        >
                                            <Clock className="h-3.5 w-3.5" />
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            {t('dashboard.agency.reports.startDate', 'Fecha Inicio')}
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.start.toISOString().split('T')[0]}
                                            onChange={(e) =>
                                                setDateRange({
                                                    ...dateRange,
                                                    start: new Date(e.target.value),
                                                })
                                            }
                                            className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            {t('dashboard.agency.reports.endDate', 'Fecha Fin')}
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.end.toISOString().split('T')[0]}
                                            onChange={(e) =>
                                                setDateRange({
                                                    ...dateRange,
                                                    end: new Date(e.target.value),
                                                })
                                            }
                                            className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Selection */}
                        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                            <div className="p-5 border-b border-border/50 bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">
                                            {t('dashboard.agency.reports.metricsTitle', 'Métricas')}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedMetrics.length} métricas seleccionadas
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {allMetrics.map((metric) => {
                                        const Icon = metricIcons[metric.id];
                                        const isSelected = selectedMetrics.includes(metric.id);

                                        return (
                                            <button
                                                key={metric.id}
                                                onClick={() => handleMetricToggle(metric.id)}
                                                className={`
                                                    relative p-4 rounded-xl border-2 transition-all duration-200 text-left group
                                                    ${isSelected
                                                        ? 'border-primary bg-primary/5 shadow-sm'
                                                        : 'border-border/50 hover:border-border hover:bg-muted/30'
                                                    }
                                                `}
                                            >
                                                <div className={`
                                                    h-9 w-9 rounded-lg flex items-center justify-center mb-2 transition-colors
                                                    ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:text-foreground'}
                                                `}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="font-medium text-sm text-foreground">
                                                    {metric.label}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                    {metric.description}
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2">
                                                        <CheckCircle className="h-4 w-4 text-primary" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Template Selection */}
                        <ReportTemplateSelector
                            selected={selectedTemplate}
                            onChange={setSelectedTemplate}
                        />

                        {/* Additional Options */}
                        <div className="bg-card rounded-2xl border border-border/50 p-5">
                            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Settings className="h-5 w-5 text-muted-foreground" />
                                {t('dashboard.agency.reports.additionalOptions', 'Opciones adicionales')}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-border cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeTrends}
                                        onChange={(e) => setIncludeTrends(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="h-5 w-5 rounded-md border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all duration-200 flex items-center justify-center">
                                        {includeTrends && <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-foreground">
                                            {t('dashboard.agency.reports.includeTrends', 'Incluir tendencias')}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Gráficos comparativos</div>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-border cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeRecommendations}
                                        onChange={(e) => setIncludeRecommendations(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="h-5 w-5 rounded-md border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all duration-200 flex items-center justify-center">
                                        {includeRecommendations && <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-foreground">
                                            {t('dashboard.agency.reports.includeRecommendations', 'Incluir recomendaciones')}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Sugerencias AI</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateReport}
                            disabled={selectedClients.length === 0 || selectedMetrics.length === 0}
                            className="w-full px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                        >
                            <FileText className="h-5 w-5" />
                            {t('dashboard.agency.reports.generateReport', 'Generar Reporte')}
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Generating Step */}
            {step === 'generating' && (
                <div className="bg-card rounded-2xl border border-border/50 p-16">
                    <div className="text-center">
                        <div className="relative inline-flex">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">
                            {t('dashboard.agency.reports.generatingReport', 'Generando Reporte')}
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {t('dashboard.agency.reports.generatingDesc', 'Estamos recopilando y procesando los datos de tus clientes...')}
                        </p>
                    </div>
                </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && reportData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: t('dashboard.agency.reports.clients', 'Clientes'), value: reportData.summary.totalClients, icon: Users, color: 'blue' },
                            { label: t('dashboard.agency.reports.totalLeads', 'Total Leads'), value: reportData.summary.totalLeads.toLocaleString(), icon: TrendingUp, color: 'green' },
                            { label: t('dashboard.agency.reports.revenue', 'Ingresos'), value: `$${reportData.summary.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'amber' },
                            { label: t('dashboard.agency.reports.avgConversion', 'Conversión'), value: `${reportData.summary.avgConversionRate.toFixed(1)}%`, icon: Eye, color: 'purple' },
                        ].map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <div key={index} className="bg-card rounded-2xl border border-border/50 p-5 hover:shadow-lg transition-shadow">
                                    <div className={`h-10 w-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center mb-3`}>
                                        <Icon className={`h-5 w-5 text-${stat.color}-500`} />
                                    </div>
                                    <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>
                                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl hover:opacity-90 transition-all font-semibold flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                        >
                            <Download className="h-5 w-5" />
                            {t('dashboard.agency.reports.downloadPDF', 'Descargar PDF')}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-semibold flex items-center justify-center gap-3"
                        >
                            <FileSpreadsheet className="h-5 w-5" />
                            {t('dashboard.agency.reports.exportCSV', 'Exportar CSV')}
                        </button>
                    </div>

                    {/* Preview Table */}
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                        <div className="px-6 py-5 border-b border-border/50 bg-muted/30">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Eye className="h-5 w-5 text-muted-foreground" />
                                {t('dashboard.agency.reports.previewTitle', 'Vista Previa del Reporte')}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t('dashboard.agency.reports.table.client', 'Cliente')}
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t('dashboard.agency.reports.table.leads', 'Leads')}
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t('dashboard.agency.reports.table.visits', 'Visitas')}
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t('dashboard.agency.reports.table.revenue', 'Ingresos')}
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t('dashboard.agency.reports.table.conversion', 'Conversión')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {reportData.byClient.map((client, index) => (
                                        <tr key={client.clientId} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                                        {client.clientName.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-foreground">{client.clientName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {client.totalLeads.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {client.totalVisits.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                                                ${client.totalRevenue.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`
                                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                                    ${client.conversionRate >= 5
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : client.conversionRate >= 2
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }
                                                `}>
                                                    {client.conversionRate.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Completed Step */}
            {step === 'completed' && (
                <div className="bg-card rounded-2xl border border-border/50 p-16 animate-in fade-in zoom-in-95 duration-500">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-500/10 mb-6">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                            {t('dashboard.agency.reports.successTitle', '¡Reporte Generado!')}
                        </h3>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            {t('dashboard.agency.reports.successDesc', 'Tu reporte ha sido generado exitosamente y está listo para descargar.')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                            <button
                                onClick={handleDownloadPDF}
                                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all font-medium flex items-center justify-center gap-2"
                            >
                                <Download className="h-5 w-5" />
                                {t('dashboard.agency.reports.downloadAgain', 'Descargar de nuevo')}
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="h-5 w-5" />
                                {t('dashboard.agency.reports.createAnother', 'Nuevo Reporte')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
