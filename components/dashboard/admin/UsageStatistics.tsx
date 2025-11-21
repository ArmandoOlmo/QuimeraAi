import React, { useEffect, useState } from 'react';
import { fetchUsageData } from '../../../data/mockUsageData';
import { UsageData, MonthlyData, ApiCallStat, UserActivity, TemplateUsage } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, Menu, Users, BarChart3, Bot, Copy, LayoutTemplate } from 'lucide-react';
import StatCard from './StatCard';

interface UsageStatisticsProps {
    onBack: () => void;
}

const UserGrowthChart: React.FC<{ data: MonthlyData[] }> = ({ data }) => {
    const maxCount = Math.max(...data.map(d => d.count), 0);
    const chartHeight = 200;
    const barWidth = 30;
    const barMargin = 15;

    return (
        <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border">
            <h3 className="text-lg font-semibold text-editor-text-primary mb-4">New Users (Last 6 Months)</h3>
            <div className="w-full overflow-x-auto">
                <svg width={data.length * (barWidth + barMargin)} height={chartHeight + 40}>
                    {data.map((item, index) => {
                        const barHeight = maxCount > 0 ? (item.count / maxCount) * chartHeight : 0;
                        const x = index * (barWidth + barMargin);
                        const y = chartHeight - barHeight;
                        return (
                            <g key={item.month} className="group">
                                <rect 
                                    x={x} 
                                    y={y} 
                                    width={barWidth} 
                                    height={barHeight} 
                                    fill="currentColor" 
                                    className="text-editor-accent/30 group-hover:text-editor-accent/60 transition-colors" 
                                    rx="4"
                                />
                                <text x={x + barWidth / 2} y={chartHeight + 20} textAnchor="middle" className="text-xs fill-current text-editor-text-secondary">{item.month}</text>
                                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="text-sm font-bold fill-current text-editor-text-primary opacity-0 group-hover:opacity-100 transition-opacity">{item.count}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

const ApiUsageByModelChart: React.FC<{ data: ApiCallStat[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    let accumulatedOffset = 0;

    return (
        <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border h-full">
            <h3 className="text-lg font-semibold text-editor-text-primary mb-4">API Calls by Model</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-48 h-48">
                    <svg viewBox="0 0 200 200" className="transform -rotate-90">
                        {data.map((item, index) => {
                            const percentage = (item.count / total) * 100;
                            const strokeDashoffset = circumference - (percentage / 100) * circumference;
                            const rotation = (accumulatedOffset / total) * 360;
                            accumulatedOffset += item.count;
                            return (
                                <circle
                                    key={index}
                                    cx="100" cy="100" r={radius}
                                    fill="transparent"
                                    stroke={item.color}
                                    strokeWidth="30"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    transform={`rotate(${rotation} 100 100)`}
                                />
                            );
                        })}
                    </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-editor-text-primary">{total.toLocaleString()}</span>
                        <span className="text-sm text-editor-text-secondary">Total Calls</span>
                    </div>
                </div>
                <div className="flex-1">
                    <ul className="space-y-2">
                        {data.map((item) => (
                            <li key={item.model} className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-editor-text-secondary">{item.model}</span>
                                </div>
                                <span className="font-semibold text-editor-text-primary">{item.count.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const UsageStatistics: React.FC<UsageStatisticsProps> = ({ onBack }) => {
    const [data, setData] = useState<UsageData | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        fetchUsageData().then(setData);
    }, []);

    if (!data) {
        return (
            <div className="flex h-screen bg-editor-bg items-center justify-center">
                <div className="w-8 h-8 border-4 border-editor-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                        <button onClick={onBack} className="p-2 text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2" title="Back to Admin">
                            <ArrowLeft />
                        </button>
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="text-editor-accent" />
                            <h1 className="text-xl font-bold text-editor-text-primary">Usage Statistics</h1>
                        </div>
                    </div>
                    <button onClick={onBack} className="hidden md:flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors">
                        <ArrowLeft size={16} className="mr-1.5" />
                        Back to Admin
                    </button>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Users" value={data.totalUsers.toLocaleString()} icon={<Users size={24} />} />
                        <StatCard title="Total Projects" value={data.totalProjects.toLocaleString()} icon={<Copy size={24} />} />
                        <StatCard title="Total API Calls" value={data.totalApiCalls.toLocaleString()} icon={<Bot size={24} />} />
                        <StatCard title="Popular Template" value={data.popularTemplates[0].name} icon={<LayoutTemplate size={24} />} />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <UserGrowthChart data={data.userGrowth} />
                        <ApiUsageByModelChart data={data.apiCallsByModel} />
                    </div>

                    {/* Data Tables */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border">
                            <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Top 5 Active Users</h3>
                            <ul className="space-y-3">
                                {data.topUsers.map(user => (
                                    <li key={user.id} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <img src={user.photoURL} alt={user.name} className="w-9 h-9 rounded-full" />
                                            <div>
                                                <p className="font-medium text-sm text-editor-text-primary">{user.name}</p>
                                                <p className="text-xs text-editor-text-secondary">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-sm text-editor-text-primary">{user.projectCount}</p>
                                            <p className="text-xs text-editor-text-secondary">Projects</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                         <div className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border">
                            <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Most Used Templates</h3>
                            <ul className="space-y-3">
                                {data.popularTemplates.map(template => (
                                    <li key={template.id} className="flex items-center justify-between">
                                        <p className="font-medium text-sm text-editor-text-primary">{template.name}</p>
                                        <p className="font-semibold text-sm text-editor-text-secondary">{template.count.toLocaleString()} uses</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default UsageStatistics;