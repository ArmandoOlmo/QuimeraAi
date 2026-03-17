/**
 * FinancialInsights
 * AI-powered financial analysis component using generateContentViaProxy.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, TrendingUp, AlertTriangle, Loader2, RefreshCw, DollarSign, Target, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { logApiCall } from '../../../services/apiLoggingService';
import { Skeleton } from '../../ui/skeleton';
import type { Transaction, CashFlowSummary } from '../../../types/finance';

interface FinancialInsightsProps {
    transactions: Transaction[];
    cashFlow: CashFlowSummary[];
    isLoading?: boolean;
}

const FinancialInsights: React.FC<FinancialInsightsProps> = ({ transactions, cashFlow, isLoading }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProject } = useProject();

    const [insights, setInsights] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateInsights = useCallback(async () => {
        if (!user || transactions.length === 0) return;
        setIsGenerating(true);
        setError(null);

        // Build summary data for the AI prompt
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const netIncome = totalIncome - totalExpenses;

        const categoryBreakdown = transactions.reduce((acc, tx) => {
            const key = `${tx.type}:${tx.category}`;
            acc[key] = (acc[key] || 0) + tx.amount;
            return acc;
        }, {} as Record<string, number>);

        const monthlyCashFlow = cashFlow.map(cf => `${cf.period}: Income $${cf.income.toFixed(2)}, Expenses $${cf.expenses.toFixed(2)}, Net $${cf.netCashFlow.toFixed(2)}`).join('\n');

        const prompt = `You are a financial analyst AI for a small business. Analyze the following financial data and give actionable insights in markdown format.

DATA SUMMARY:
- Total Income: $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Income: $${netIncome.toFixed(2)}
- Number of Transactions: ${transactions.length}

CATEGORY BREAKDOWN:
${Object.entries(categoryBreakdown).map(([k, v]) => `  ${k}: $${v.toFixed(2)}`).join('\n')}

MONTHLY CASH FLOW:
${monthlyCashFlow || 'No monthly data yet'}

Provide:
1. **Cash Flow Health** — Is the business generating positive cash flow? Any concerning trends?
2. **Top 3 Savings Opportunities** — Specific areas where expenses could be reduced.
3. **Revenue Growth Areas** — Where is income growing and where are opportunities?
4. **3-Month Forecast** — Based on current trends, project the next 3 months.
5. **Action Items** — 3 specific actions the business owner should take now.

Keep the response concise, professional, and under 500 words. Use bullet points and bold text for clarity. Respond in the same language as this instruction: ${t('accounting.insightsPromptLang', 'English')}.`;

        try {
            const response = await generateContentViaProxy(
                activeProject?.id || 'accounting-insights',
                prompt,
                'gemini-2.5-flash',
                { temperature: 0.4 },
                user.uid,
            );

            const text = extractTextFromResponse(response);
            setInsights(text);

            logApiCall({
                userId: user.uid,
                projectId: activeProject?.id,
                model: 'gemini-2.5-flash',
                feature: 'accounting-financial-insights',
                success: true,
            });
        } catch (err: any) {
            console.error('[FinancialInsights] generation error:', err);
            setError(err.message || t('accounting.insightsError', 'Could not generate insights'));
            logApiCall({
                userId: user.uid,
                projectId: activeProject?.id,
                model: 'gemini-2.5-flash',
                feature: 'accounting-financial-insights',
                success: false,
                errorMessage: err.message,
            });
        } finally {
            setIsGenerating(false);
        }
    }, [user, transactions, cashFlow, activeProject, t]);

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-xl p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/[0.06] bg-gradient-to-r from-primary/10 via-transparent to-purple-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/30 to-purple-500/30 rounded-xl">
                            <Sparkles size={20} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">{t('accounting.financialInsights', 'AI Financial Insights')}</h3>
                            <p className="text-xs text-muted-foreground">{t('accounting.insightsSubtitle', 'Powered by AI analysis of your data')}</p>
                        </div>
                    </div>
                    <button
                        onClick={generateInsights}
                        disabled={isGenerating || transactions.length === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {t('accounting.generating', 'Generating...')}
                            </>
                        ) : insights ? (
                            <>
                                <RefreshCw size={16} />
                                {t('accounting.regenerate', 'Regenerate')}
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                {t('accounting.generateInsights', 'Generate Insights')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {error && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
                        <AlertTriangle size={18} className="text-destructive flex-shrink-0" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {insights ? (
                    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-ul:text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {insights}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <Target size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">{t('accounting.noTransactionsForInsights', 'Add transactions to unlock AI-powered insights')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-white/[0.04]">
                            <TrendingUp size={20} className="text-green-400" />
                            <div>
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('accounting.cashFlowHealth', 'Cash Flow')}</p>
                                <p className="text-sm text-foreground font-medium">{t('accounting.clickGenerate', 'Click generate to analyze')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-white/[0.04]">
                            <DollarSign size={20} className="text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('accounting.savingsOpps', 'Savings')}</p>
                                <p className="text-sm text-foreground font-medium">{t('accounting.clickGenerate', 'Click generate to analyze')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-white/[0.04]">
                            <ShieldCheck size={20} className="text-purple-400" />
                            <div>
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('accounting.forecast', '3-Month Forecast')}</p>
                                <p className="text-sm text-foreground font-medium">{t('accounting.clickGenerate', 'Click generate to analyze')}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialInsights;
