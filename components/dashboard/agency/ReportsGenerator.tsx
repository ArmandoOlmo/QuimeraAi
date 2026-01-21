/**
 * ReportsGenerator
 * UI for generating consolidated reports
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
} from 'lucide-react';
import { ReportTemplateSelector } from './ReportTemplateSelector';

type Step = 'configure' | 'preview' | 'generating' | 'completed';

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
        { id: 'leads', label: t('dashboard.agency.reports.metrics.leads'), description: t('dashboard.agency.reports.metrics.leadsDesc') },
        { id: 'visits', label: t('dashboard.agency.reports.metrics.visits'), description: t('dashboard.agency.reports.metrics.visitsDesc') },
        { id: 'sales', label: t('dashboard.agency.reports.metrics.sales'), description: t('dashboard.agency.reports.metrics.salesDesc') },
        { id: 'emails', label: t('dashboard.agency.reports.metrics.emails'), description: t('dashboard.agency.reports.metrics.emailsDesc') },
        { id: 'ai_usage', label: t('dashboard.agency.reports.metrics.ai_usage'), description: t('dashboard.agency.reports.metrics.ai_usageDesc') },
        { id: 'storage', label: t('dashboard.agency.reports.metrics.storage'), description: t('dashboard.agency.reports.metrics.storageDesc') },
        { id: 'users', label: t('dashboard.agency.reports.metrics.users'), description: t('dashboard.agency.reports.metrics.usersDesc') },
        { id: 'projects', label: t('dashboard.agency.reports.metrics.projects'), description: t('dashboard.agency.reports.metrics.projectsDesc') },
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
            setError(t('dashboard.agency.reports.errors.selectClient'));
            return;
        }

        if (selectedMetrics.length === 0) {
            setError(t('dashboard.agency.reports.errors.selectMetric'));
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
            setError(err.message || t('dashboard.agency.reports.errors.generateError'));
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
            setError(err.message || t('dashboard.agency.reports.errors.pdfError'));
            setStep('preview');
        }
    };

    const handleExportCSV = () => {
        if (!reportData) return;

        // Create CSV content
        const headers = [
            t('dashboard.agency.reports.table.client'),
            t('dashboard.agency.reports.table.leads'),
            t('dashboard.agency.reports.table.visits'),
            t('dashboard.agency.reports.table.revenue'),
            t('dashboard.agency.reports.table.conversion')
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

    return (
        <div className="max-w-7xl mx-auto space-y-6">


            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        {t('dashboard.agency.reports.generatorTitle')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('dashboard.agency.reports.generatorSubtitle')}
                    </p>
                </div>
                {step !== 'configure' && (
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-foreground bg-card border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        {t('dashboard.agency.reports.createAnother')}
                    </button>
                )}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-200">Error</h3>
                        <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Configuration Step */}
            {step === 'configure' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Client Selection */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-lg border border-border p-6">
                            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                {t('dashboard.agency.reports.clients')}
                            </h4>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                                    <input
                                        type="checkbox"
                                        checked={selectedClients.length === clients.length}
                                        onChange={(e) => handleSelectAllClients(e.target.checked)}
                                        className="rounded border-input text-primary focus:ring-primary"
                                    />
                                    <span className="text-foreground font-medium">
                                        {t('dashboard.agency.reports.allClients')} ({clients.length})
                                    </span>
                                </label>

                                <div className="max-h-80 overflow-y-auto space-y-2">
                                    {clients.map((client) => (
                                        <label
                                            key={client.id}
                                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedClients.includes(client.id)}
                                                onChange={() => handleClientToggle(client.id)}
                                                className="h-4 w-4 text-primary rounded border-input focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">
                                                {client.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Options */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Date Range */}
                        <div className="bg-card rounded-lg border border-border p-6">
                            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                {t('dashboard.agency.reports.period')}
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('dashboard.agency.reports.startDate')}
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
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('dashboard.agency.reports.endDate')}
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
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Quick presets */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() =>
                                        setDateRange({
                                            start: new Date(new Date().setDate(new Date().getDate() - 7)),
                                            end: new Date(),
                                        })
                                    }
                                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                >
                                    {t('dashboard.agency.reports.last7Days')}
                                </button>
                                <button
                                    onClick={() =>
                                        setDateRange({
                                            start: new Date(new Date().setDate(new Date().getDate() - 30)),
                                            end: new Date(),
                                        })
                                    }
                                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                >
                                    {t('dashboard.agency.reports.last30Days')}
                                </button>
                                <button
                                    onClick={() =>
                                        setDateRange({
                                            start: new Date(new Date().setDate(new Date().getDate() - 90)),
                                            end: new Date(),
                                        })
                                    }
                                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                >
                                    {t('dashboard.agency.reports.last90Days')}
                                </button>
                            </div>
                        </div>

                        {/* Metrics Selection */}
                        <div className="bg-muted p-6 rounded-lg border border-border/50">
                            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                                <Settings className="h-5 w-5 text-blue-500" />
                                {t('dashboard.agency.reports.metricsTitle')}
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allMetrics.map((metric) => (
                                    <label
                                        key={metric.id}
                                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMetrics.includes(metric.id)}
                                            onChange={() => handleMetricToggle(metric.id)}
                                            className="h-4 w-4 text-primary rounded border-input focus:ring-primary mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-foreground text-sm">
                                                {metric.label}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {metric.description}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Template Selection */}
                        <ReportTemplateSelector
                            selected={selectedTemplate}
                            onChange={setSelectedTemplate}
                        />

                        {/* Additional Options */}
                        <div className="bg-card rounded-lg border border-border p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                                {t('dashboard.agency.reports.additionalOptions')}
                            </h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={includeTrends}
                                        onChange={(e) => setIncludeTrends(e.target.checked)}
                                        className="h-4 w-4 text-primary rounded border-input focus:ring-primary"
                                    />
                                    <span className="text-sm text-foreground">
                                        {t('dashboard.agency.reports.includeTrends')}
                                    </span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={includeRecommendations}
                                        onChange={(e) => setIncludeRecommendations(e.target.checked)}
                                        className="h-4 w-4 text-primary rounded border-input focus:ring-primary"
                                    />
                                    <span className="text-sm text-foreground">
                                        {t('dashboard.agency.reports.includeRecommendations')}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateReport}
                            disabled={selectedClients.length === 0 || selectedMetrics.length === 0}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                        >
                            <FileText className="h-5 w-5" />
                            {t('dashboard.agency.reports.generateReport')}
                        </button>
                    </div>
                </div>
            )}

            {/* Generating Step */}
            {step === 'generating' && (
                <div className="bg-card rounded-lg border border-border p-12">
                    <div className="text-center">
                        <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            {t('dashboard.agency.reports.generatingReport')}
                        </h3>
                        <p className="text-muted-foreground">
                            {t('dashboard.agency.reports.generatingDesc')}
                        </p>
                    </div>
                </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && reportData && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card rounded-lg border border-border p-4">
                            <div className="text-sm text-muted-foreground mb-1">
                                {t('dashboard.agency.reports.clients')}
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                {reportData.summary.totalClients}
                            </div>
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                            <div className="text-sm text-muted-foreground mb-1">
                                {t('dashboard.agency.reports.totalLeads')}
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                {reportData.summary.totalLeads.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                            <div className="text-sm text-muted-foreground mb-1">
                                {t('dashboard.agency.reports.revenue')}
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                ${reportData.summary.totalRevenue.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                            <div className="text-sm text-muted-foreground mb-1">
                                {t('dashboard.agency.reports.avgConversion')}
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                {reportData.summary.avgConversionRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <Download className="h-5 w-5" />
                            {t('dashboard.agency.reports.downloadPDF')}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <Download className="h-5 w-5" />
                            {t('dashboard.agency.reports.exportCSV')}
                        </button>
                    </div>

                    {/* Preview Table */}
                    <div className="bg-card rounded-lg border border-border overflow-hidden">
                        <div className="px-6 py-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground">
                                {t('dashboard.agency.reports.previewTitle')}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                            {t('dashboard.agency.reports.table.client')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                            {t('dashboard.agency.reports.table.leads')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                            {t('dashboard.agency.reports.table.visits')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                            {t('dashboard.agency.reports.table.revenue')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                            {t('dashboard.agency.reports.table.conversion')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {reportData.byClient.map((client) => (
                                        <tr key={client.clientId}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                                {client.clientName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {client.totalLeads.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {client.totalVisits.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                ${client.totalRevenue.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {client.conversionRate.toFixed(1)}%
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
                <div className="bg-card rounded-lg border border-border p-12">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            {t('dashboard.agency.reports.successTitle')}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            {t('dashboard.agency.reports.successDesc')}
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={handleDownloadPDF}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {t('dashboard.agency.reports.downloadAgain')}
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                {t('dashboard.agency.reports.createAnother')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
