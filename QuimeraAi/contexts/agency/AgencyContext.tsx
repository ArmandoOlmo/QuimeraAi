/**
 * AgencyContext
 * Global state management for agency dashboard
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../core/AuthContext';
import { useTenant } from '../tenant/TenantContext';
import { useAgencyMetrics } from '../../hooks/useAgencyMetrics';
import type { Tenant } from '../../types/multiTenant';
import type {
    AggregatedMetrics,
    ResourceAlert,
    UpcomingRenewal,
    ActivityEvent,
    ClientMetricsSummary,
} from '../../hooks/useAgencyMetrics';

// =============================================================================
// TYPES
// =============================================================================

export interface AgencyContextValue {
    // Sub-clients
    subClients: Tenant[];
    loadingClients: boolean;

    // Aggregated metrics
    aggregatedMetrics: AggregatedMetrics;

    // Alerts and notifications
    resourceAlerts: ResourceAlert[];
    upcomingRenewals: UpcomingRenewal[];

    // Activity feed
    recentActivity: ActivityEvent[];

    // Functions
    refreshMetrics: () => Promise<void>;
    getClientMetrics: (clientId: string) => ClientMetricsSummary | null;
    exportClientData: (clientId: string) => Promise<void>;

    // Error state
    error: Error | null;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AgencyContext = createContext<AgencyContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AgencyProviderProps {
    children: React.ReactNode;
}

export function AgencyProvider({ children }: AgencyProviderProps) {
    const { user } = useAuth();
    const { currentTenant } = useTenant();
    const [isAgencyPlan, setIsAgencyPlan] = useState(false);

    // Check if current tenant is an agency plan
    useEffect(() => {
        if (currentTenant) {
            const agencyPlans = ['agency_starter', 'agency_pro', 'agency_scale', 'enterprise'];
            setIsAgencyPlan(agencyPlans.includes(currentTenant.subscriptionPlan));
        } else {
            setIsAgencyPlan(false);
        }
    }, [currentTenant]);

    // Use the agency metrics hook
    const {
        subClients,
        aggregatedMetrics,
        resourceAlerts,
        upcomingRenewals,
        recentActivity,
        loading: loadingClients,
        error,
        getClientMetrics,
        refreshMetrics,
    } = useAgencyMetrics(isAgencyPlan ? (currentTenant?.id || '') : '');

    // Export client data (CSV format)
    const exportClientData = async (clientId: string): Promise<void> => {
        const clientMetrics = getClientMetrics(clientId);
        if (!clientMetrics) {
            throw new Error('Client not found');
        }

        // Create CSV content
        const csvRows: string[] = [
            // Header
            'Métrica,Valor,Límite,Porcentaje',
            // Data rows
            `Proyectos,${clientMetrics.usage.projectCount},${clientMetrics.limits.maxProjects},${clientMetrics.usagePercentages.projects.toFixed(1)}%`,
            `Usuarios,${clientMetrics.usage.userCount},${clientMetrics.limits.maxUsers},${clientMetrics.usagePercentages.users.toFixed(1)}%`,
            `Storage (GB),${clientMetrics.usage.storageUsedGB.toFixed(2)},${clientMetrics.limits.maxStorageGB},${clientMetrics.usagePercentages.storage.toFixed(1)}%`,
            `AI Credits,${clientMetrics.usage.aiCreditsUsed},${clientMetrics.limits.maxAiCredits},${clientMetrics.usagePercentages.aiCredits.toFixed(1)}%`,
        ];

        const csvContent = csvRows.join('\n');

        // Create blob and download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${clientMetrics.clientName.replace(/\s+/g, '_')}_metrics_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const value: AgencyContextValue = {
        subClients,
        loadingClients,
        aggregatedMetrics,
        resourceAlerts,
        upcomingRenewals,
        recentActivity,
        refreshMetrics,
        getClientMetrics,
        exportClientData,
        error,
    };

    // Always provide context, even if not on agency plan
    // The routing system will handle access control
    return (
        <AgencyContext.Provider value={value}>
            {children}
        </AgencyContext.Provider>
    );
}

// =============================================================================
// HOOK
// =============================================================================

export function useAgency(): AgencyContextValue {
    const context = useContext(AgencyContext);
    if (context === undefined) {
        throw new Error('useAgency must be used within an AgencyProvider');
    }
    return context;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if user has access to agency dashboard
 */
export function canAccessAgencyDashboard(
    tenant: Tenant | null,
    role: string | undefined
): boolean {
    if (!tenant || !role) return false;

    // Must be on agency plan (new structure: agency_starter, agency_pro, agency_scale)
    const agencyPlans = ['agency_starter', 'agency_pro', 'agency_scale', 'enterprise'];
    if (!agencyPlans.includes(tenant.subscriptionPlan)) return false;

    // Must be owner or admin
    return role === 'agency_owner' || role === 'agency_admin';
}

/**
 * Get alert severity color
 */
export function getAlertColor(severity: ResourceAlert['severity']): string {
    return severity === 'critical'
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
}

/**
 * Get alert icon
 */
export function getAlertIcon(severity: ResourceAlert['severity']): string {
    return severity === 'critical' ? 'AlertTriangle' : 'AlertCircle';
}

/**
 * Format resource name
 */
export function formatResourceName(resource: ResourceAlert['resource']): string {
    const names: Record<ResourceAlert['resource'], string> = {
        projects: 'Proyectos',
        storage: 'Almacenamiento',
        aiCredits: 'AI Credits',
        users: 'Usuarios',
    };
    return names[resource];
}

/**
 * Get activity icon
 */
export function getActivityIcon(type: ActivityEvent['type']): string {
    const icons: Record<ActivityEvent['type'], string> = {
        client_created: 'UserPlus',
        client_updated: 'UserCheck',
        report_generated: 'FileText',
        payment_received: 'DollarSign',
        project_created: 'FolderPlus',
        project_published: 'Globe',
    };
    return icons[type] || 'Activity';
}

/**
 * Get activity color
 */
export function getActivityColor(type: ActivityEvent['type']): string {
    const colors: Record<ActivityEvent['type'], string> = {
        client_created: 'text-green-400',
        client_updated: 'text-blue-400',
        report_generated: 'text-purple-400',
        payment_received: 'text-emerald-400',
        project_created: 'text-cyan-400',
        project_published: 'text-orange-400',
    };
    return colors[type] || 'text-gray-400';
}

/**
 * Format time ago
 */
export function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
    if (seconds < 2592000) return `Hace ${Math.floor(seconds / 604800)} semanas`;
    return `Hace ${Math.floor(seconds / 2592000)} meses`;
}
