import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BillingData, Plan, ServiceModule } from '../../../types';
import { fetchBillingData } from '../../../data/mockBillingData';
import DashboardSidebar from '../DashboardSidebar';
import PlanEditorModal from './PlanEditorModal';
import { ArrowLeft, Menu, CreditCard, BarChart, Users, TrendingDown, Plus, Edit, Archive, CheckCircle } from 'lucide-react';
import StatCard from './StatCard';

interface BillingManagementProps {
    onBack: () => void;
}

const AnnualRevenueChart: React.FC<{ data: { month: string; revenue: number }[] }> = ({ data }) => {
    const { t } = useTranslation();
    const chartHeight = 250;
    const chartWidth = 600;
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * chartWidth;
        const y = chartHeight - (d.revenue / maxRevenue) * (chartHeight - 20);
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `M0,${chartHeight} ${points} L${chartWidth},${chartHeight} Z`;

    return (
        <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border col-span-2">
            <h3 className="text-lg font-semibold text-editor-text-primary mb-4">{t('superadmin.billing.annualRevenueTrend')}</h3>
            <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="min-w-[600px]">
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--editor-accent)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--editor-accent)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#areaGradient)" />
                    <polyline points={points} fill="none" stroke="var(--editor-accent)" strokeWidth="2" />
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * chartWidth;
                        const y = chartHeight - (d.revenue / maxRevenue) * (chartHeight - 20);
                        return (
                            <g key={i} className="group">
                                <circle cx={x} cy={y} r="8" fill="var(--editor-accent)" fillOpacity="0" className="cursor-pointer group-hover:fill-opacity-50 transition-opacity" />
                                <circle cx={x} cy={y} r="4" fill="var(--editor-accent)" className="cursor-pointer" />
                                <text x={x} y={chartHeight + 20} textAnchor="middle" className="text-xs fill-current text-editor-text-secondary">{d.month}</text>
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-10px]">
                                    <rect x={x - 40} y={y - 35} width="80" height="25" rx="5" fill="black" stroke="var(--editor-border)" />
                                    <text x={x} y={y - 18} textAnchor="middle" className="text-xs font-bold fill-current text-white">${d.revenue.toLocaleString()}</text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

const PlanDistributionChart: React.FC<{ data: { planName: string; subscribers: number; color: string }[] }> = ({ data }) => {
    const { t } = useTranslation();
    const total = data.reduce((sum, item) => sum + item.subscribers, 0);
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return (
        <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border h-full">
            <h3 className="text-lg font-semibold text-editor-text-primary mb-4">{t('superadmin.billing.subscribersByPlan')}</h3>
            <div className="flex flex-col items-center gap-6">
                <div className="relative w-48 h-48">
                    <svg viewBox="0 0 200 200" className="transform -rotate-90">
                        {data.map((item, index) => {
                            const percentage = (item.subscribers / total) * 100;
                            const strokeDashoffset = circumference - (percentage / 100) * circumference;
                            const rotation = (accumulatedOffset / total) * 360;
                            accumulatedOffset += item.subscribers;
                            return <circle key={index} cx="100" cy="100" r={radius} fill="transparent" stroke={item.color} strokeWidth="30" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform={`rotate(${rotation} 100 100)`} />;
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-editor-text-primary">{total.toLocaleString()}</span>
                        <span className="text-sm text-editor-text-secondary">{t('superadmin.billing.subscribers')}</span>
                    </div>
                </div>
                <ul className="w-full space-y-2">
                    {data.map((item) => (
                        <li key={item.planName} className="flex items-center justify-between text-sm">
                            <div className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span><span className="text-editor-text-secondary">{item.planName}</span></div>
                            <span className="font-semibold text-editor-text-primary">{item.subscribers.toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const BillingManagement: React.FC<BillingManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [data, setData] = useState<BillingData | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false);
    const [planToEdit, setPlanToEdit] = useState<Plan | null>(null);

    useEffect(() => {
        fetchBillingData().then(setData);
    }, []);

    const handleCreatePlan = () => {
        setPlanToEdit(null);
        setIsPlanEditorOpen(true);
    };

    const handleEditPlan = (plan: Plan) => {
        setPlanToEdit(plan);
        setIsPlanEditorOpen(true);
    };

    // In a real app, this would call an API. Here we just update local state.
    const handleSavePlan = (savedPlan: Plan) => {
        setData(prev => {
            if (!prev) return null;
            const isNew = !prev.plans.some(p => p.id === savedPlan.id);
            if (isNew) {
                return { ...prev, plans: [...prev.plans, { ...savedPlan, id: `plan_${Date.now()}` }] };
            } else {
                return { ...prev, plans: prev.plans.map(p => p.id === savedPlan.id ? savedPlan : p) };
            }
        });
    };

    const PlanCard: React.FC<{ plan: Plan }> = ({ plan }) => (
        <div className={`p-4 rounded-lg border ${plan.isFeatured ? 'border-editor-accent' : 'border-editor-border'} bg-editor-panel-bg`}>
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-editor-text-primary">{plan.name}</h4>
                    {plan.isFeatured && <span className="text-xs font-medium text-green-400">{t('superadmin.billing.featured')}</span>}
                </div>
                <div className="inline-flex items-center space-x-1">
                    <button onClick={() => handleEditPlan(plan)} className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-editor-accent"><Edit size={18} /></button>
                    <button className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-red-400"><Archive size={18} /></button>
                </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-editor-text-secondary">{t('superadmin.billing.monthly')}</span><span>${plan.price.monthly.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-editor-text-secondary">{t('superadmin.billing.annually')}</span><span>${plan.price.annually.toLocaleString()}</span></div>
            </div>
        </div>
    );

    if (!data) return <div className="flex h-screen bg-editor-bg items-center justify-center"><div className="w-8 h-8 border-4 border-editor-accent border-t-transparent rounded-full animate-spin"></div></div>;

    const activePlans = data.plans.filter(p => !p.isArchived);

    return (
        <>
            <PlanEditorModal
                isOpen={isPlanEditorOpen}
                onClose={() => setIsPlanEditorOpen(false)}
                planToEdit={planToEdit}
                serviceModules={data.serviceModules}
                onSave={handleSavePlan}
            />
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center">
                            <button onClick={onBack} className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2 transition-colors" title={t('common.back')}>
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <CreditCard className="text-editor-accent w-5 h-5" />
                                <h1 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.billing.title')}</h1>
                            </div>
                        </div>
                        <button onClick={onBack} className="hidden md:flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary">
                            <ArrowLeft className="w-4 h-4" />
                            {t('superadmin.backToAdmin')}
                        </button>
                    </header>
                    <main className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title={t('superadmin.billing.mrr')} value={`$${data.mrr.toLocaleString()}`} icon={<BarChart size={24} />} />
                            <StatCard title={t('superadmin.billing.activeSubs')} value={data.activeSubscriptions.toLocaleString()} icon={<Users size={24} />} />
                            <StatCard title={t('superadmin.billing.arpu')} value={`$${data.arpu.toFixed(2)}`} icon={<BarChart size={24} transform="scale(-1, 1)" />} />
                            <StatCard title={t('superadmin.billing.churnRate')} value={`${data.churnRate.toFixed(1)}%`} icon={<TrendingDown size={24} />} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <AnnualRevenueChart data={data.revenueTrend} />
                            <PlanDistributionChart data={data.planDistribution} />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-editor-text-primary">{t('superadmin.billing.subscriptionPlans')}</h3>
                                <button onClick={handleCreatePlan} className="flex items-center text-sm font-semibold py-2 px-3 text-editor-accent hover:text-editor-accent-hover transition-colors"><Plus size={16} className="mr-1.5" /> {t('superadmin.billing.createPlan')}</button>
                            </div>

                            {/* Mobile & Tablet View */}
                            <div className="lg:hidden space-y-4">
                                {activePlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
                            </div>

                            {/* Desktop View */}
                            <div className="hidden lg:block bg-editor-panel-bg border border-editor-border rounded-lg overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-editor-panel-bg/50">
                                        <tr className="border-b border-editor-border">
                                            <th className="p-4 text-sm font-semibold text-editor-text-secondary">{t('superadmin.billing.tablePlan')}</th>
                                            <th className="p-4 text-sm font-semibold text-editor-text-secondary">{t('superadmin.billing.tableMonthlyPrice')}</th>
                                            <th className="p-4 text-sm font-semibold text-editor-text-secondary">{t('superadmin.billing.tableAnnualPrice')}</th>
                                            <th className="p-4 text-sm font-semibold text-editor-text-secondary">{t('superadmin.billing.tableStatus')}</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activePlans.map(plan => (
                                            <tr key={plan.id} className="border-b border-editor-border last:border-b-0 hover:bg-editor-panel-bg/50">
                                                <td className="p-4 font-medium">{plan.name}</td>
                                                <td className="p-4 text-editor-text-secondary">${plan.price.monthly.toLocaleString()}</td>
                                                <td className="p-4 text-editor-text-secondary">${plan.price.annually.toLocaleString()}</td>
                                                <td className="p-4">{plan.isFeatured && <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-500/10 text-green-400">{t('superadmin.billing.featured')}</span>}</td>
                                                <td className="p-4 text-right">
                                                    <div className="inline-flex items-center space-x-1">
                                                        <button onClick={() => handleEditPlan(plan)} className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-editor-accent"><Edit size={18} /></button>
                                                        <button className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-red-400"><Archive size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-editor-text-primary mb-4">{t('superadmin.billing.serviceModules')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.serviceModules.map(module => (
                                    <div key={module.id} className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-editor-border rounded-md text-editor-accent"><CheckCircle size={20} /></div>
                                            <div>
                                                <h4 className="font-semibold">{module.name}</h4>
                                                <p className="text-xs text-editor-text-secondary">{module.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default BillingManagement;