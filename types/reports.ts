/**
 * Reports Types
 * Types for consolidated reporting system
 */

// =============================================================================
// REPORT TYPES
// =============================================================================

export type ReportMetric =
    | 'leads'
    | 'visits'
    | 'sales'
    | 'emails'
    | 'ai_usage'
    | 'storage'
    | 'users'
    | 'projects';

export type ReportTemplate = 'executive' | 'detailed' | 'comparison';

export type ReportFormat = 'pdf' | 'csv' | 'excel';

export interface ReportDateRange {
    start: Date;
    end: Date;
}

// =============================================================================
// AGGREGATED DATA TYPES
// =============================================================================

export interface ClientMetrics {
    clientId: string;
    clientName: string;

    // Lead metrics
    totalLeads: number;
    newLeads: number;
    convertedLeads: number;
    conversionRate: number;
    leadsBySource: Record<string, number>;

    // Traffic metrics
    totalVisits: number;
    uniqueVisitors: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;

    // Sales metrics
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionToSale: number;

    // Email metrics
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    openRate: number;
    clickRate: number;

    // Resource usage
    aiCreditsUsed: number;
    storageUsedGB: number;
    activeUsers: number;
    activeProjects: number;

    // Trends (vs previous period)
    trends: {
        leadsChange: number;
        visitsChange: number;
        revenueChange: number;
        emailPerformanceChange: number;
    };
}

export interface AggregatedReportData {
    // Summary totals
    summary: {
        totalClients: number;
        totalLeads: number;
        totalRevenue: number;
        totalVisits: number;
        totalEmailsSent: number;
        avgConversionRate: number;
        totalAiCreditsUsed: number;
        totalStorageUsedGB: number;
    };

    // Per-client breakdown
    byClient: ClientMetrics[];

    // Trends and insights
    trends: {
        topPerformingClients: Array<{
            clientId: string;
            clientName: string;
            metric: string;
            value: number;
        }>;
        underperformingClients: Array<{
            clientId: string;
            clientName: string;
            metric: string;
            value: number;
            recommendation: string;
        }>;
        periodOverPeriodComparison: {
            leadsGrowth: number;
            revenueGrowth: number;
            trafficGrowth: number;
        };
    };

    // Recommendations
    recommendations: string[];

    // Metadata
    generatedAt: Date;
    dateRange: ReportDateRange;
    includedClients: string[];
    metrics: ReportMetric[];
}

// =============================================================================
// SAVED REPORT TYPES
// =============================================================================

export interface SavedReport {
    id: string;
    agencyTenantId: string;
    name: string;
    description?: string;

    // Report configuration
    template: ReportTemplate;
    metrics: ReportMetric[];
    includedClients: string[];
    dateRange: {
        start: { seconds: number; nanoseconds: number };
        end: { seconds: number; nanoseconds: number };
    };

    // Generated files
    pdfUrl?: string;
    csvUrl?: string;
    excelUrl?: string;

    // Metadata
    generatedAt: { seconds: number; nanoseconds: number };
    generatedBy: string;
    generatedByName?: string;
    fileSize?: number;

    // Status
    status: 'generating' | 'completed' | 'failed';
    error?: string;

    // Access tracking
    downloadCount: number;
    lastAccessedAt?: { seconds: number; nanoseconds: number };
}

// =============================================================================
// REPORT GENERATION REQUEST
// =============================================================================

export interface GenerateReportRequest {
    agencyTenantId: string;
    name?: string;
    template: ReportTemplate;
    metrics: ReportMetric[];
    clientIds: string[];  // 'all' or specific IDs
    dateRange: ReportDateRange;
    format: ReportFormat[];  // Can generate multiple formats

    // Options
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    compareWithPreviousPeriod?: boolean;

    // Branding
    customBranding?: {
        logoUrl?: string;
        primaryColor?: string;
        companyName?: string;
    };
}

export interface GenerateReportResponse {
    reportId: string;
    status: 'queued' | 'generating' | 'completed' | 'failed';
    estimatedTime?: number;  // seconds
    pdfUrl?: string;
    csvUrl?: string;
    excelUrl?: string;
    error?: string;
}

// =============================================================================
// SCHEDULED REPORTS
// =============================================================================

export interface ScheduledReport {
    id: string;
    agencyTenantId: string;
    name: string;

    // Schedule
    frequency: 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;  // 0-6 for weekly
    dayOfMonth?: number;  // 1-31 for monthly/quarterly
    time: string;  // HH:mm format
    timezone: string;

    // Report configuration
    template: ReportTemplate;
    metrics: ReportMetric[];
    includeAllClients: boolean;
    specificClients?: string[];

    // Delivery
    recipients: string[];  // Email addresses
    format: ReportFormat[];

    // Status
    isActive: boolean;
    lastGenerated?: { seconds: number; nanoseconds: number };
    nextScheduled?: { seconds: number; nanoseconds: number };

    // Metadata
    createdAt: { seconds: number; nanoseconds: number };
    createdBy: string;
    updatedAt?: { seconds: number; nanoseconds: number };
}

// =============================================================================
// REPORT ANALYTICS
// =============================================================================

export interface ReportAnalytics {
    agencyTenantId: string;
    period: { start: Date; end: Date };

    // Usage stats
    totalReportsGenerated: number;
    reportsByFormat: Record<ReportFormat, number>;
    reportsByTemplate: Record<ReportTemplate, number>;

    // Most requested metrics
    popularMetrics: Array<{
        metric: ReportMetric;
        count: number;
    }>;

    // Performance
    avgGenerationTime: number;  // seconds
    failureRate: number;  // percentage

    // Storage
    totalStorageUsed: number;  // MB
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get label for report metric
 */
export function getMetricLabel(metric: ReportMetric): string {
    const labels: Record<ReportMetric, string> = {
        leads: 'Leads',
        visits: 'Visitas al Sitio',
        sales: 'Ventas',
        emails: 'Email Marketing',
        ai_usage: 'Uso de AI',
        storage: 'Almacenamiento',
        users: 'Usuarios',
        projects: 'Proyectos',
    };
    return labels[metric];
}

/**
 * Get description for report template
 */
export function getTemplateDescription(template: ReportTemplate): string {
    const descriptions: Record<ReportTemplate, string> = {
        executive: 'Resumen ejecutivo con KPIs principales y tendencias',
        detailed: 'Reporte detallado con métricas completas por cliente',
        comparison: 'Comparativa de rendimiento entre clientes',
    };
    return descriptions[template];
}

/**
 * Calculate date range for previous period
 */
export function getPreviousPeriodRange(dateRange: ReportDateRange): ReportDateRange {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
        start: new Date(dateRange.start.getTime() - duration),
        end: new Date(dateRange.start.getTime()),
    };
}

/**
 * Format percentage change
 */
export function formatPercentageChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
}

/**
 * Get trend indicator
 */
export function getTrendIndicator(change: number): 'up' | 'down' | 'stable' {
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate date range
 */
export function isValidDateRange(dateRange: ReportDateRange): boolean {
    return dateRange.start < dateRange.end;
}

/**
 * Get default date range (last 30 days)
 */
export function getDefaultDateRange(): ReportDateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
}
