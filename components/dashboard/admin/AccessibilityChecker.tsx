import React, { useState, useMemo } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { checkComponentAccessibility, A11yReport, A11yIssue } from '../../../utils/accessibilityChecker';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Play, Download, Shield } from 'lucide-react';

const AccessibilityChecker: React.FC = () => {
    const { currentProject, data } = useEditor();
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [reports, setReports] = useState<A11yReport[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // Run accessibility scan on all components
    const runFullScan = () => {
        if (!currentProject || !data) return;

        setIsScanning(true);
        const newReports: A11yReport[] = [];

        // Scan visible components
        currentProject.componentOrder.forEach((componentId) => {
            if (currentProject.sectionVisibility[componentId]) {
                const componentData = data[componentId];
                const report = checkComponentAccessibility(
                    componentId,
                    componentId.charAt(0).toUpperCase() + componentId.slice(1),
                    componentData,
                    componentId
                );
                newReports.push(report);
            }
        });

        setReports(newReports);
        setIsScanning(false);
    };

    // Calculate overall statistics
    const stats = useMemo(() => {
        const totalIssues = reports.reduce((sum, r) => sum + r.totalIssues, 0);
        const totalErrors = reports.reduce((sum, r) => sum + r.errors, 0);
        const totalWarnings = reports.reduce((sum, r) => sum + r.warnings, 0);
        const totalInfo = reports.reduce((sum, r) => sum + r.info, 0);
        const avgScore = reports.length > 0
            ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length)
            : 100;

        return {
            totalIssues,
            totalErrors,
            totalWarnings,
            totalInfo,
            avgScore,
            componentsScanned: reports.length,
        };
    }, [reports]);

    const getSeverityIcon = (severity: A11yIssue['severity']) => {
        switch (severity) {
            case 'error':
                return <AlertCircle size={20} className="text-red-400" />;
            case 'warning':
                return <AlertTriangle size={20} className="text-yellow-400" />;
            case 'info':
                return <Info size={20} className="text-blue-400" />;
        }
    };

    const getSeverityBadge = (severity: A11yIssue['severity']) => {
        const colors = {
            error: 'bg-red-500/20 text-red-400',
            warning: 'bg-yellow-500/20 text-yellow-400',
            info: 'bg-blue-500/20 text-blue-400',
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${colors[severity]}`}>
                {severity}
            </span>
        );
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-400';
        if (score >= 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    const exportReport = () => {
        const reportData = {
            projectName: currentProject?.name || 'Unknown',
            timestamp: new Date().toISOString(),
            stats,
            reports,
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `a11y-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-editor-text-primary mb-2">Accessibility Checker</h2>
                    <p className="text-editor-text-secondary">
                        Scan your components for WCAG 2.1 Level AA compliance
                    </p>
                </div>
                <div className="flex gap-3">
                    {reports.length > 0 && (
                        <button
                            onClick={exportReport}
                            className="px-4 py-2 bg-editor-bg border border-editor-border text-editor-text-primary font-bold rounded-lg hover:bg-editor-border transition-all flex items-center gap-2"
                        >
                            <Download size={20} />
                            Export Report
                        </button>
                    )}
                    <button
                        onClick={runFullScan}
                        disabled={isScanning || !currentProject}
                        className="px-4 py-2 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Play size={20} />
                        {isScanning ? 'Scanning...' : 'Run Scan'}
                    </button>
                </div>
            </div>

            {/* No Project Warning */}
            {!currentProject && (
                <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="text-yellow-400" size={24} />
                    <div>
                        <div className="font-bold text-yellow-400">No Project Selected</div>
                        <div className="text-sm text-editor-text-secondary">
                            Please select a project to run accessibility checks
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {reports.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Shield size={24} className={getScoreColor(stats.avgScore)} />
                            <div>
                                <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
                                    {stats.avgScore}
                                </div>
                                <div className="text-sm text-editor-text-secondary">Avg. Score</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={24} className="text-red-400" />
                            <div>
                                <div className="text-2xl font-bold text-editor-text-primary">{stats.totalErrors}</div>
                                <div className="text-sm text-editor-text-secondary">Errors</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={24} className="text-yellow-400" />
                            <div>
                                <div className="text-2xl font-bold text-editor-text-primary">{stats.totalWarnings}</div>
                                <div className="text-sm text-editor-text-secondary">Warnings</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Info size={24} className="text-blue-400" />
                            <div>
                                <div className="text-2xl font-bold text-editor-text-primary">{stats.totalInfo}</div>
                                <div className="text-sm text-editor-text-secondary">Info</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                        <div className="flex items-center gap-3">
                            <CheckCircle size={24} className="text-editor-accent" />
                            <div>
                                <div className="text-2xl font-bold text-editor-text-primary">{stats.componentsScanned}</div>
                                <div className="text-sm text-editor-text-secondary">Components</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Component Reports */}
            {reports.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-editor-text-primary">Component Reports</h3>
                    
                    {reports.map((report) => (
                        <div
                            key={report.componentId}
                            className="bg-editor-panel-bg border border-editor-border rounded-lg overflow-hidden"
                        >
                            {/* Report Header */}
                            <div
                                className="p-4 cursor-pointer hover:bg-editor-bg transition-colors flex items-center justify-between"
                                onClick={() =>
                                    setSelectedComponent(
                                        selectedComponent === report.componentId ? null : report.componentId
                                    )
                                }
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`text-3xl font-bold ${getScoreColor(report.score)}`}>
                                        {report.score}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-editor-text-primary">
                                            {report.componentName}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-editor-text-secondary">
                                            <span>{report.totalIssues} issues</span>
                                            {report.errors > 0 && (
                                                <span className="text-red-400">{report.errors} errors</span>
                                            )}
                                            {report.warnings > 0 && (
                                                <span className="text-yellow-400">{report.warnings} warnings</span>
                                            )}
                                            {report.info > 0 && (
                                                <span className="text-blue-400">{report.info} info</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {report.totalIssues === 0 && (
                                    <CheckCircle size={32} className="text-green-400" />
                                )}
                            </div>

                            {/* Issues List */}
                            {selectedComponent === report.componentId && report.issues.length > 0 && (
                                <div className="border-t border-editor-border p-4 space-y-3 bg-editor-bg">
                                    {report.issues.map((issue) => (
                                        <div
                                            key={issue.id}
                                            className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg"
                                        >
                                            <div className="flex items-start gap-3 mb-2">
                                                {getSeverityIcon(issue.severity)}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {getSeverityBadge(issue.severity)}
                                                        <span className="text-xs text-editor-text-secondary uppercase">
                                                            {issue.category.replace('-', ' ')}
                                                        </span>
                                                        {issue.autoFixable && (
                                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">
                                                                AUTO-FIXABLE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-editor-text-primary font-medium mb-1">
                                                        {issue.message}
                                                    </p>
                                                    {issue.element && (
                                                        <p className="text-sm text-editor-text-secondary mb-1">
                                                            Element: {issue.element}
                                                        </p>
                                                    )}
                                                    {issue.suggestion && (
                                                        <p className="text-sm text-editor-accent">
                                                            💡 {issue.suggestion}
                                                        </p>
                                                    )}
                                                    {issue.wcagCriterion && (
                                                        <p className="text-xs text-editor-text-secondary mt-2">
                                                            {issue.wcagCriterion}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* No Issues */}
                            {selectedComponent === report.componentId && report.issues.length === 0 && (
                                <div className="border-t border-editor-border p-8 text-center bg-editor-bg">
                                    <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
                                    <p className="text-editor-text-primary font-bold">
                                        No accessibility issues found!
                                    </p>
                                    <p className="text-sm text-editor-text-secondary mt-1">
                                        This component meets WCAG 2.1 Level AA standards
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {reports.length === 0 && currentProject && (
                <div className="text-center py-16">
                    <Shield size={64} className="mx-auto text-editor-text-secondary opacity-50 mb-4" />
                    <h3 className="text-xl font-bold text-editor-text-primary mb-2">
                        Ready to Check Accessibility
                    </h3>
                    <p className="text-editor-text-secondary mb-6">
                        Click "Run Scan" to check all components in your project for WCAG 2.1 Level AA compliance
                    </p>
                    <button
                        onClick={runFullScan}
                        className="px-6 py-3 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2 mx-auto"
                    >
                        <Play size={20} />
                        Run Accessibility Scan
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccessibilityChecker;

