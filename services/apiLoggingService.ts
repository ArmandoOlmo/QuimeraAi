import { db, collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from '../firebase';
import { ApiLog } from '../types';

/**
 * Logs an API call to Firestore
 * @param logData - The API call data to log
 */
export const logApiCall = async (logData: Omit<ApiLog, 'id' | 'timestamp'>): Promise<void> => {
    try {
        await addDoc(collection(db, 'apiLogs'), {
            ...logData,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        // Log to console but don't throw to avoid breaking the main flow
        console.error('Error logging API call:', error);
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
        let q = query(collection(db, 'apiLogs'));

        // Apply filters
        if (filters?.userId) {
            q = query(q, where('userId', '==', filters.userId));
        }
        if (filters?.projectId) {
            q = query(q, where('projectId', '==', filters.projectId));
        }
        if (filters?.model) {
            q = query(q, where('model', '==', filters.model));
        }
        if (filters?.feature) {
            q = query(q, where('feature', '==', filters.feature));
        }
        if (filters?.startDate) {
            q = query(q, where('timestamp', '>=', filters.startDate));
        }
        if (filters?.endDate) {
            q = query(q, where('timestamp', '<=', filters.endDate));
        }

        // Order by timestamp descending
        q = query(q, orderBy('timestamp', 'desc'));

        // Limit results
        if (filters?.limitResults) {
            q = query(q, limit(filters.limitResults));
        }

        const snapshot = await getDocs(q);
        const logs: ApiLog[] = [];

        snapshot.forEach((doc) => {
            logs.push({
                id: doc.id,
                ...doc.data()
            } as ApiLog);
        });

        return logs;
    } catch (error) {
        console.error('Error fetching API logs:', error);
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
        console.error('Error getting API calls by model:', error);
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

        const logs = await getApiLogs(filters);
        return logs.filter(log => log.success).length;
    } catch (error) {
        console.error('Error getting total API calls:', error);
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
        console.error('Error calculating API error rate:', error);
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
        console.error('Error getting API calls by feature:', error);
        return {};
    }
};

