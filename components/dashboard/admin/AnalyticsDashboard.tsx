import React, { useMemo, useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { PageSection, CustomComponent } from '../../../types';
import { BarChart3, TrendingUp, Package, Users, Calendar, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface ComponentAnalytics {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  usageCount: number;
  projectCount: number;
  trend: 'up' | 'down' | 'stable';
  lastUsed?: Date;
}

const AnalyticsDashboard: React.FC = () => {
  const { projects, componentStatus, customComponents } = useEditor();
  const [sortBy, setSortBy] = useState<'usage' | 'projects' | 'name'>('usage');
  const [filterType, setFilterType] = useState<'all' | 'standard' | 'custom'>('all');

  const componentNames: Record<PageSection, string> = {
    hero: 'Hero Section',
    features: 'Features Section',
    testimonials: 'Testimonials Section',
    slideshow: 'Slideshow Section',
    pricing: 'Pricing Section',
    faq: 'FAQ Section',
    portfolio: 'Portfolio Section',
    leads: 'Leads Section',
    newsletter: 'Newsletter Section',
    cta: 'CTA Section',
    services: 'Services Section',
    team: 'Team Section',
    video: 'Video Section',
    howItWorks: 'How It Works',
    chatbot: 'AI Chatbot',
    footer: 'Footer',
    header: 'Header',
    typography: 'Typography',
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    const standardComponentsAnalytics: ComponentAnalytics[] = Object.keys(componentStatus).map((key) => {
      const pageSection = key as PageSection;
      const projectsUsing = projects.filter(p => 
        p.componentOrder && 
        p.componentOrder.includes(pageSection) && 
        p.sectionVisibility && 
        p.sectionVisibility[pageSection]
      );

      return {
        id: pageSection,
        name: componentNames[pageSection] || pageSection,
        type: 'standard' as const,
        usageCount: projectsUsing.length,
        projectCount: projectsUsing.length,
        trend: 'stable' as const, // Simplified for now
        lastUsed: projectsUsing.length > 0 
          ? new Date(Math.max(...projectsUsing.map(p => new Date(p.lastUpdated).getTime())))
          : undefined,
      };
    });

    const customComponentsAnalytics: ComponentAnalytics[] = (customComponents || []).map((component: CustomComponent) => {
      const projectsUsing = component.projectsUsing || [];
      const usageCount = component.usageCount || 0;

      return {
        id: component.id,
        name: component.name,
        type: 'custom' as const,
        usageCount: usageCount,
        projectCount: projectsUsing.length,
        trend: usageCount > projectsUsing.length * 2 ? 'up' : 
               usageCount < projectsUsing.length ? 'down' : 'stable',
        lastUsed: component.lastModified ? new Date(component.lastModified) : undefined,
      };
    });

    let allAnalytics = [...standardComponentsAnalytics, ...customComponentsAnalytics];

    // Filter
    if (filterType !== 'all') {
      allAnalytics = allAnalytics.filter(a => a.type === filterType);
    }

    // Sort
    allAnalytics.sort((a, b) => {
      if (sortBy === 'usage') return b.usageCount - a.usageCount;
      if (sortBy === 'projects') return b.projectCount - a.projectCount;
      return a.name.localeCompare(b.name);
    });

    return allAnalytics;
  }, [projects, componentStatus, customComponents, sortBy, filterType]);

  // Summary stats
  const stats = useMemo(() => {
    const totalComponents = Object.keys(componentStatus).length + (customComponents?.length || 0);
    const enabledComponents = Object.values(componentStatus).filter(Boolean).length;
    const totalProjects = projects.length;
    const totalUsage = analytics.reduce((sum, a) => sum + a.usageCount, 0);
    const avgUsage = totalUsage / totalComponents;

    return {
      totalComponents,
      enabledComponents,
      customComponents: customComponents?.length || 0,
      totalProjects,
      totalUsage,
      avgUsage: avgUsage.toFixed(1),
    };
  }, [projects, componentStatus, customComponents, analytics]);

  const formatDate = (date?: Date): string => {
    if (!date) return 'Never';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-editor-text-primary mb-2 flex items-center gap-3">
            <BarChart3 className="w-7 h-7" />
            Component Analytics
          </h2>
          <p className="text-editor-text-secondary">
            Insights into component usage across all projects
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold">{stats.totalComponents}</span>
            </div>
            <p className="text-sm opacity-90">Total Components</p>
            <p className="text-xs opacity-70 mt-1">
              {stats.enabledComponents} enabled · {stats.customComponents} custom
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold">{stats.totalProjects}</span>
            </div>
            <p className="text-sm opacity-90">Total Projects</p>
            <p className="text-xs opacity-70 mt-1">Using components</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold">{stats.totalUsage}</span>
            </div>
            <p className="text-sm opacity-90">Total Usage</p>
            <p className="text-xs opacity-70 mt-1">Across all components</p>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold">{stats.avgUsage}</span>
            </div>
            <p className="text-sm opacity-90">Avg Usage</p>
            <p className="text-xs opacity-70 mt-1">Per component</p>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-editor-text-secondary font-medium">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { value: 'usage', label: 'Usage' },
                  { value: 'projects', label: 'Projects' },
                  { value: 'name', label: 'Name' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      sortBy === option.value
                        ? 'bg-editor-accent text-editor-bg'
                        : 'bg-editor-border text-editor-text-secondary hover:bg-editor-accent/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-editor-text-secondary font-medium">Type:</span>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'custom', label: 'Custom' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterType === option.value
                        ? 'bg-editor-accent text-editor-bg'
                        : 'bg-editor-border text-editor-text-secondary hover:bg-editor-accent/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Table */}
        <div className="bg-editor-panel-bg border border-editor-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-editor-border/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                    Component
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                    Last Used
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-editor-border">
                {analytics.map((item, index) => (
                  <tr key={item.id} className="hover:bg-editor-border/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          item.type === 'custom' 
                            ? 'bg-purple-600/20 text-purple-400'
                            : 'bg-blue-600/20 text-blue-400'
                        }`}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-editor-text-primary">{item.name}</p>
                          {index < 3 && item.usageCount > 0 && (
                            <span className="text-xs text-amber-500">⭐ Top performer</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.type === 'custom'
                          ? 'bg-purple-600/20 text-purple-400'
                          : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {item.type === 'custom' ? 'Custom' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-semibold text-editor-text-primary">
                        {item.usageCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-semibold text-editor-text-primary">
                        {item.projectCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        <TrendIcon trend={item.trend} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-editor-text-secondary">
                      {formatDate(item.lastUsed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {analytics.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No analytics data available yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Create projects and use components to see analytics
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

