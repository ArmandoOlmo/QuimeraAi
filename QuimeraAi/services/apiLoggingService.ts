import { supabase } from '../supabase';
import { ApiLog } from '../types';

/**
 * Logs an API call to Supabase
 * @param logData - The API call data to log
 */
export const logApiCall = async (logData: Omit<ApiLog, 'id' | 'timestamp'>): Promise<void> => {
    try {
        const { error } = await supabase
            .from('api_logs')
            .insert([{
                user_id: logData.userId,
                project_id: logData.projectId,
                model: logData.model,
                feature: logData.feature,
                success: logData.success,
                error: logData.error,
                prompt_tokens: logData.promptTokens,
                completion_tokens: logData.completionTokens,
                total_tokens: logData.totalTokens,
                latency_ms: logData.latencyMs,
                endpoint: logData.endpoint,
                metadata: logData.metadata,
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;
    } catch (error) {
        console.error('[apiLoggingService] Error logging API call:', error);
    }
};

/**
 * Get API logs with optional filters
 * @param filters - Optional filters for querying logs
 * @returns Array of API logs
 */
export const getApiLogs = async (filters?: {
    userId?: string;
    projectId?: string;
    model?: string;
    feature?: string;
    startDate?: Date;
    endDate?: Date;
    limitResults?: number;
}): Promise<ApiLog[]> => {
    try {
        let query = supabase.from('api_logs').select('*');

        if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters?.projectId) {
            query = query.eq('project_id', filters.projectId);
        }
        if (filters?.model) {
            query = query.eq('model', filters.model);
        }
        if (filters?.feature) {
            query = query.eq('feature', filters.feature);
        }
        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate.toISOString());
        }
        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate.toISOString());
        }

        query = query.order('created_at', { ascending: false });

        if (filters?.limitResults) {
            query = query.limit(filters.limitResults);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(doc => ({
            id: doc.id,
            userId: doc.user_id,
            projectId: doc.project_id,
            model: doc.model,
            feature: doc.feature,
            success: doc.success,
            error: doc.error,
            promptTokens: doc.prompt_tokens,
            completionTokens: doc.completion_tokens,
            totalTokens: doc.total_tokens,
            latencyMs: doc.latency_ms,
            endpoint: doc.endpoint,
            metadata: doc.metadata,
            timestamp: doc.created_at, // Use created_at as timestamp for backwards compatibility
        })) as unknown as ApiLog[];
    } catch (error) {
        console.error('[apiLoggingService] Error fetching API logs:', error);
        return [];
    }
};

/**
 * Get API call statistics grouped by model
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Object with model names as keys and call counts as values
 */
export const getApiCallsByModel = async (startDate?: Date, endDate?: Date): Promise<Record<string, number>> => {
    try {
        const filters: any = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const logs = await getApiLogs(filters);
        
        const modelCounts: Record<string, number> = {};
        logs.forEach((log) => {
            if (log.success) {
                modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
            }
        });

        return modelCounts;
    } catch (error) {
        console.error('[apiLoggingService] Error getting API calls by model:', error);
        return {};
    }
};

/**
 * Get total API calls count
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Total count of API calls
 */
export const getTotalApiCalls = async (startDate?: Date, endDate?: Date): Promise<number> => {
    try {
        const filters: any = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        // Count query is more efficient if supported, but fallback to existing pattern
        let query = supabase.from('api_logs').select('id', { count: 'exact', head: true }).eq('success', true);
        if (startDate) query = query.gte('created_at', startDate.toISOString());
        if (endDate) query = query.lte('created_at', endDate.toISOString());
        
        const { count, error } = await query;
        if (error) throw error;
        
        if (count !== null) return count;

        const logs = await getApiLogs(filters);
        return logs.filter(log => log.success).length;
    } catch (error) {
        console.error('[apiLoggingService] Error getting total API calls:', error);
        return 0;
    }
};

/**
 * Get API error rate
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Error rate as percentage (0-100)
 */
export const getApiErrorRate = async (startDate?: Date, endDate?: Date): Promise<number> => {
    try {
        const filters: any = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const logs = await getApiLogs(filters);
        
        if (logs.length === 0) return 0;
        
        const errorCount = logs.filter(log => !log.success).length;
        return (errorCount / logs.length) * 100;
    } catch (error) {
        console.error('[apiLoggingService] Error calculating API error rate:', error);
        return 0;
    }
};

/**
 * Get API calls by feature
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Object with feature names as keys and call counts as values
 */
export const getApiCallsByFeature = async (startDate?: Date, endDate?: Date): Promise<Record<string, number>> => {
    try {
        const filters: any = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const logs = await getApiLogs(filters);
        
        const featureCounts: Record<string, number> = {};
        logs.forEach((log) => {
            if (log.success) {
                featureCounts[log.feature] = (featureCounts[log.feature] || 0) + 1;
            }
        });

        return featureCounts;
    } catch (error) {
        console.error('[apiLoggingService] Error getting API calls by feature:', error);
        return {};
    }
};































