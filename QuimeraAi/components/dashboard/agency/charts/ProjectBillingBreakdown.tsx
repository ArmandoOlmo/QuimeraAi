/**
 * ProjectBillingBreakdown
 * Visual breakdown of agency billing: base fee + projects
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { Building2, FolderKanban, DollarSign, Calculator } from 'lucide-react';

interface ProjectBreakdown {
    clientId: string;
    clientName: string;
    projectCount: number;
}

interface ProjectBillingBreakdownProps {
    plan: string;
    baseFee: number;
    projectCost: number;
    breakdown: ProjectBreakdown[];
    isLoading?: boolean;
}

export function ProjectBillingBreakdown({
    plan,
    baseFee,
    projectCost,
    breakdown,
    isLoading,
}: ProjectBillingBreakdownProps) {
    const { t } = useTranslation();
    const totalProjects = breakdown.reduce((sum, client) => sum + client.projectCount, 0);
    const projectsTotal = totalProjects * projectCost;
    const totalBill = baseFee + projectsTotal;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getPlanLabel = (planId: string) => {
        const labels: Record<string, string> = {
            agency_starter: 'Agency Starter',
            agency_pro: 'Agency Pro',
            agency_scale: 'Agency Scale',
        };
        return labels[planId] || planId;
    };

    if (isLoading) {
        return (
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <div className="animate-pulse">
                    <div className="h-6 w-48 bg-editor-border rounded mb-4" />
                    <div className="space-y-3">
                        <div className="h-12 bg-editor-border rounded" />
                        <div className="h-12 bg-editor-border rounded" />
                        <div className="h-12 bg-editor-border rounded" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-editor-panel-bg border border-editor-border rounded-xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-editor-text-primary flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-400" />
                        {t('dashboard.agency.charts.billingBreakdown.title', 'Desglose de Facturación')}
                    </h3>
                    <p className="text-sm text-editor-text-secondary">
                        {t('dashboard.agency.charts.billingBreakdown.plan', 'Plan')}: {getPlanLabel(plan)}
                    </p>
                </div>
            </div>

            {/* Billing breakdown */}
            <div className="space-y-4">
                {/* Base Fee */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-between p-4 bg-editor-bg rounded-lg border border-editor-border"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="font-medium text-editor-text-primary">{t('dashboard.agency.charts.billingBreakdown.monthlyBaseFee', 'Fee Base Mensual')}</p>
                            <p className="text-xs text-editor-text-secondary">{t('dashboard.agency.charts.billingBreakdown.fixedCharge', 'Cargo fijo del plan')}</p>
                        </div>
                    </div>
                    <span className="text-lg font-semibold text-editor-text-primary">
                        {formatCurrency(baseFee)}
                    </span>
                </motion.div>

                {/* Projects */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 bg-editor-bg rounded-lg border border-editor-border"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <FolderKanban className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-medium text-editor-text-primary">
                                    {t('dashboard.agency.charts.billingBreakdown.activeProjects', 'Proyectos Activos')}
                                </p>
                                <p className="text-xs text-editor-text-secondary">
                                    {totalProjects} {t('dashboard.agency.charts.billingBreakdown.projects', 'proy.')} × {formatCurrency(projectCost)}
                                </p>
                            </div>
                        </div>
                        <span className="text-lg font-semibold text-editor-text-primary">
                            {formatCurrency(projectsTotal)}
                        </span>
                    </div>

                    {/* Client breakdown */}
                    {breakdown.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-editor-border space-y-2">
                            {breakdown
                                .filter((client) => client.projectCount > 0)
                                .slice(0, 5)
                                .map((client, index) => (
                                    <motion.div
                                        key={client.clientId}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + index * 0.05 }}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="text-editor-text-secondary truncate max-w-[200px]">
                                            {client.clientName}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-editor-text-secondary">
                                                {client.projectCount} {t('dashboard.agency.charts.billingBreakdown.projects', 'proy.')}
                                            </span>
                                            <span className="text-editor-text-primary font-medium">
                                                {formatCurrency(client.projectCount * projectCost)}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            {breakdown.filter((c) => c.projectCount > 0).length > 5 && (
                                <p className="text-xs text-editor-text-secondary text-center pt-2">
                                    +{breakdown.filter((c) => c.projectCount > 0).length - 5} {t('dashboard.agency.charts.billingBreakdown.more', 'más...')}
                                </p>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Divider */}
                <div className="border-t-2 border-dashed border-editor-border" />

                {/* Total */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-lg border border-emerald-500/30"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-editor-text-primary">{t('dashboard.agency.charts.billingBreakdown.monthlyTotal', 'Total Mensual')}</p>
                            <p className="text-xs text-editor-text-secondary">
                                {t('dashboard.agency.charts.billingBreakdown.nextAutomaticCharge', 'Próximo cobro automático')}
                            </p>
                        </div>
                    </div>
                    <span className="text-2xl font-bold text-emerald-400">
                        <CountUp
                            start={0}
                            end={totalBill}
                            duration={1}
                            separator=","
                            prefix="$"
                        />
                    </span>
                </motion.div>
            </div>

            {/* Formula */}
            <div className="mt-4 p-3 bg-editor-bg/50 rounded-lg">
                <p className="text-xs text-editor-text-secondary text-center font-mono">
                    {formatCurrency(baseFee)} (base) + {totalProjects} × {formatCurrency(projectCost)} (proyectos) = {formatCurrency(totalBill)}
                </p>
            </div>
        </motion.div>
    );
}

export default ProjectBillingBreakdown;
