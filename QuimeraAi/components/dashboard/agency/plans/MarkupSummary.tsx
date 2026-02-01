/**
 * MarkupSummary
 * Table showing markup/profit summary for all agency plans
 */

import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    DollarSign,
    Users,
    RefreshCw,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { getAgencyPlanSummaries } from '../../../../services/agencyPlansService';
import { AgencyPlanSummary, QUIMERA_PROJECT_COST } from '../../../../types/agencyPlans';

interface MarkupSummaryProps {
    tenantId: string;
    compact?: boolean;
}

export function MarkupSummary({ tenantId, compact = false }: MarkupSummaryProps) {
    const [summaries, setSummaries] = useState<AgencyPlanSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(!compact);

    useEffect(() => {
        loadSummaries();
    }, [tenantId]);

    const loadSummaries = async () => {
        setLoading(true);
        try {
            const data = await getAgencyPlanSummaries(tenantId);
            setSummaries(data);
        } catch (error) {
            console.error('Error loading summaries:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const totals = summaries.reduce(
        (acc, s) => ({
            clients: acc.clients + s.clientCount,
            mrr: acc.mrr + s.mrr,
            profit: acc.profit + s.monthlyProfit,
            cost: acc.cost + (s.baseCost * s.clientCount),
        }),
        { clients: 0, mrr: 0, profit: 0, cost: 0 }
    );

    const avgMarkup = totals.cost > 0 
        ? ((totals.mrr - totals.cost) / totals.cost) * 100 
        : 0;

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (summaries.length === 0 && !loading) {
        return null;
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className={`px-6 py-4 border-b border-border flex items-center justify-between ${compact ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                onClick={() => compact && setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Resumen de Ganancias</h3>
                        <p className="text-sm text-muted-foreground">
                            Tu margen por cada plan de servicio
                        </p>
                    </div>
                </div>
                {compact && (
                    <button className="p-1 text-muted-foreground">
                        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                )}
            </div>

            {/* Content */}
            {(expanded || !compact) && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Plan
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Precio
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Costo Base
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Ganancia
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    % Markup
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Clientes
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    MRR
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-green-600 uppercase tracking-wider">
                                    Ganancia/Mes
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {summaries.map((summary) => (
                                        <tr key={summary.planId} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-medium text-foreground">{summary.planName}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-foreground">{formatCurrency(summary.price)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-muted-foreground">{formatCurrency(summary.baseCost)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                    +{formatCurrency(summary.markup)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    summary.markupPercentage >= 200 
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : summary.markupPercentage >= 100
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                    {Math.round(summary.markupPercentage)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-foreground">{summary.clientCount}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-foreground">{formatCurrency(summary.mrr)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-green-600 dark:text-green-400 font-bold">
                                                    {formatCurrency(summary.monthlyProfit)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}
                        </tbody>
                        {/* Totals Footer */}
                        {!loading && summaries.length > 0 && (
                            <tfoot className="bg-muted/70 border-t-2 border-border">
                                <tr className="font-semibold">
                                    <td className="px-6 py-4 text-foreground">
                                        TOTAL
                                    </td>
                                    <td className="px-6 py-4 text-right text-foreground">
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-right text-muted-foreground">
                                        {formatCurrency(totals.cost)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                            {Math.round(avgMarkup)}% avg
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-foreground">
                                        {totals.clients}
                                    </td>
                                    <td className="px-6 py-4 text-right text-foreground">
                                        {formatCurrency(totals.mrr)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                                            {formatCurrency(totals.profit)}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

            {/* Quick Stats (shown when collapsed) */}
            {compact && !expanded && (
                <div className="px-6 py-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{totals.clients}</p>
                        <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.mrr)}</p>
                        <p className="text-xs text-muted-foreground">MRR</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.profit)}</p>
                        <p className="text-xs text-muted-foreground">Ganancia/mes</p>
                    </div>
                </div>
            )}
        </div>
    );
}
