/**
 * ReportGenerator
 * P&L and Balance Sheet reports with AI Narrative layer.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Sparkles, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { logApiCall } from '../../../services/apiLoggingService';
import { Skeleton } from '../../ui/skeleton';
import type { Transaction, FinancialReport } from '../../../types/finance';

interface ReportGeneratorProps {
    transactions: Transaction[];
    isLoading: boolean;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ transactions, isLoading }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProject } = useProject();

    const [reportType, setReportType] = useState<'profit_loss' | 'balance_sheet'>('profit_loss');
    const [report, setReport] = useState<FinancialReport | null>(null);
    const [aiNarrative, setAiNarrative] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isNarrating, setIsNarrating] = useState(false);

    // Build report data from transactions
    const buildReport = useCallback((): FinancialReport => {
        const incomeByCategory: Record<string, number> = {};
        const expenseByCategory: Record<string, number> = {};

        transactions.forEach(tx => {
            if (tx.type === 'income') incomeByCategory[tx.category || 'Other'] = (incomeByCategory[tx.category || 'Other'] || 0) + tx.amount;
            else expenseByCategory[tx.category || 'Other'] = (expenseByCategory[tx.category || 'Other'] || 0) + tx.amount;
        });

        const incomeArr = Object.entries(incomeByCategory).map(([category, amount]) => ({ category, amount }));
        const expenseArr = Object.entries(expenseByCategory).map(([category, amount]) => ({ category, amount }));
        const totalIncome = incomeArr.reduce((s, i) => s + i.amount, 0);
        const totalExpenses = expenseArr.reduce((s, i) => s + i.amount, 0);

        return {
            type: reportType,
            periodStart: transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString().split('T')[0],
            periodEnd: transactions.length > 0 ? transactions[0].date : new Date().toISOString().split('T')[0],
            generatedAt: new Date().toISOString(),
            data: {
                income: incomeArr.sort((a, b) => b.amount - a.amount),
                expenses: expenseArr.sort((a, b) => b.amount - a.amount),
                totalIncome,
                totalExpenses,
                netIncome: totalIncome - totalExpenses,
                ...(reportType === 'balance_sheet' ? {
                    assets: [{ name: 'Cash & Equivalents', amount: totalIncome - totalExpenses }],
                    totalAssets: totalIncome - totalExpenses,
                    liabilities: [],
                    totalLiabilities: 0,
                    equity: [{ name: 'Retained Earnings', amount: totalIncome - totalExpenses }],
                    totalEquity: totalIncome - totalExpenses,
                } : {}),
            },
        };
    }, [transactions, reportType]);

    const handleGenerate = () => {
        setIsGenerating(true);
        setAiNarrative(null);
        setTimeout(() => { setReport(buildReport()); setIsGenerating(false); }, 500);
    };

    const handleAiNarrative = useCallback(async () => {
        if (!user || !report) return;
        setIsNarrating(true);
        try {
            const prompt = `You are a financial reporting AI. Given this ${reportType === 'profit_loss' ? 'Profit & Loss' : 'Balance Sheet'} report, write a clear executive narrative.

REPORT DATA:
- Period: ${report.periodStart} to ${report.periodEnd}
- Total Income: $${report.data.totalIncome.toFixed(2)}
- Total Expenses: $${report.data.totalExpenses.toFixed(2)}
- Net Income: $${report.data.netIncome.toFixed(2)}

Income by category:
${report.data.income.map(i => `  ${i.category}: $${i.amount.toFixed(2)}`).join('\n')}

Expenses by category:
${report.data.expenses.map(e => `  ${e.category}: $${e.amount.toFixed(2)}`).join('\n')}

Write a 3-paragraph executive summary: 1) Financial health overview, 2) Key observations about income/expenses, 3) Recommendations.
Keep it professional. Language: ${t('accounting.insightsPromptLang', 'English')}.`;

            const resp = await generateContentViaProxy(activeProject?.id || 'accounting', prompt, 'gemini-2.5-flash', { temperature: 0.4 }, user.uid);
            setAiNarrative(extractTextFromResponse(resp));
            logApiCall({ userId: user.uid, projectId: activeProject?.id, model: 'gemini-2.5-flash', feature: 'accounting-report-narrative', success: true });
        } catch (err: any) {
            console.error('[ReportGenerator] AI narrative error:', err);
            logApiCall({ userId: user.uid, projectId: activeProject?.id, model: 'gemini-2.5-flash', feature: 'accounting-report-narrative', success: false, errorMessage: err.message });
        } finally { setIsNarrating(false); }
    }, [user, activeProject, report, reportType, t]);

    if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

    return (
        <div className="space-y-5">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 bg-secondary/30 rounded-xl p-1">
                    <button onClick={() => setReportType('profit_loss')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportType === 'profit_loss' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                        {t('accounting.profitLoss', 'Profit & Loss')}
                    </button>
                    <button onClick={() => setReportType('balance_sheet')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportType === 'balance_sheet' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                        {t('accounting.balanceSheet', 'Balance Sheet')}
                    </button>
                </div>
                <button onClick={handleGenerate} disabled={isGenerating || transactions.length === 0} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2">
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    {t('accounting.generateReport', 'Generate Report')}
                </button>
            </div>

            {transactions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                    <PieChartIcon size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-foreground">{t('accounting.noDataForReports', 'No data for reports')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('accounting.addTransactionsFirst', 'Add transactions to generate reports')}</p>
                </div>
            )}

            {report && (
                <div className="space-y-5">
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5">
                            <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-green-400" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('accounting.totalIncome', 'Total Income')}</span></div>
                            <p className="text-2xl font-bold text-green-400">${report.data.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5">
                            <div className="flex items-center gap-2 mb-2"><TrendingDown size={18} className="text-red-400" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('accounting.totalExpenses', 'Total Expenses')}</span></div>
                            <p className="text-2xl font-bold text-red-400">${report.data.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5">
                            <div className="flex items-center gap-2 mb-2"><DollarSign size={18} className="text-primary" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('accounting.netIncome', 'Net Income')}</span></div>
                            <p className={`text-2xl font-bold ${report.data.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>${report.data.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    {/* Category breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5">
                            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-green-400" />{t('accounting.incomeBreakdown', 'Income Breakdown')}</h4>
                            {report.data.income.length === 0 ? <p className="text-sm text-muted-foreground">{t('accounting.noIncome', 'No income recorded')}</p> : (
                                <div className="space-y-3">{report.data.income.map(item => (
                                    <div key={item.category} className="flex items-center justify-between">
                                        <span className="text-sm text-foreground">{item.category}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden"><div className="h-full bg-green-400 rounded-full" style={{ width: `${(item.amount / report.data.totalIncome) * 100}%` }} /></div>
                                            <span className="text-sm font-semibold text-foreground min-w-[80px] text-right">${item.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5">
                            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-red-400" />{t('accounting.expenseBreakdown', 'Expense Breakdown')}</h4>
                            {report.data.expenses.length === 0 ? <p className="text-sm text-muted-foreground">{t('accounting.noExpenses', 'No expenses recorded')}</p> : (
                                <div className="space-y-3">{report.data.expenses.map(item => (
                                    <div key={item.category} className="flex items-center justify-between">
                                        <span className="text-sm text-foreground">{item.category}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${(item.amount / report.data.totalExpenses) * 100}%` }} /></div>
                                            <span className="text-sm font-semibold text-foreground min-w-[80px] text-right">${item.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                    </div>

                    {/* AI Narrative */}
                    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden">
                        <div className="p-5 border-b border-border/40 bg-gradient-to-r from-purple-500/10 via-transparent to-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500/30 to-primary/30 rounded-xl"><Sparkles size={18} className="text-purple-400" /></div><div><h4 className="font-bold text-foreground">{t('accounting.aiNarrative', 'AI Narrative')}</h4><p className="text-xs text-muted-foreground">{t('accounting.narrativeSubtitle', 'AI explains your results in plain language')}</p></div></div>
                            <button onClick={handleAiNarrative} disabled={isNarrating} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-primary text-white shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50">
                                {isNarrating ? <Loader2 size={14} className="animate-spin" /> : aiNarrative ? <RefreshCw size={14} /> : <Sparkles size={14} />}
                                {aiNarrative ? t('accounting.regenerate', 'Regenerate') : t('accounting.generateNarrative', 'Generate Narrative')}
                            </button>
                        </div>
                        <div className="p-5">
                            {aiNarrative ? (
                                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">{aiNarrative}</div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">{t('accounting.clickToGenerateNarrative', 'Click "Generate Narrative" for an AI-powered executive summary')}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportGenerator;
