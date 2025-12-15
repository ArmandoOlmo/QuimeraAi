/**
 * useProjectChatStats Hook
 * Quick statistics for chat projects in the selection dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    collection, query, where, getDocs, Timestamp, orderBy, limit
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { SocialChannel } from '../../../types/socialChat';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectChatStats {
    projectId: string;
    activeConversations: number;
    totalMessages: number;
    totalLeads: number;
    avgResponseTime: number; // in seconds
    lastActivity: Date | null;
    channelBreakdown: {
        channel: SocialChannel;
        count: number;
    }[];
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
}

export interface GlobalChatStats {
    totalActiveChats: number;
    totalMessages24h: number;
    totalLeads: number;
    avgResponseTime: number;
    projectsWithActivity: number;
}

// =============================================================================
// HOOK
// =============================================================================

export const useProjectChatStats = (projectIds: string[]) => {
    const [stats, setStats] = useState<Map<string, ProjectChatStats>>(new Map());
    const [globalStats, setGlobalStats] = useState<GlobalChatStats>({
        totalActiveChats: 0,
        totalMessages24h: 0,
        totalLeads: 0,
        avgResponseTime: 0,
        projectsWithActivity: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        if (!projectIds.length) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const statsMap = new Map<string, ProjectChatStats>();

            let globalActiveChats = 0;
            let globalMessages24h = 0;
            let globalLeads = 0;
            let totalResponseTime = 0;
            let responseTimeCount = 0;
            let projectsWithActivity = 0;

            // Process each project
            for (const projectId of projectIds) {
                try {
                    // Fetch active conversations - wrapped in try-catch for permission errors
                    const conversationsRef = collection(db, 'socialConversations');
                    let activeConversations = 0;
                    
                    try {
                        const activeQuery = query(
                            conversationsRef,
                            where('projectId', '==', projectId),
                            where('status', 'in', ['active', 'pending']),
                            limit(100)
                        );
                        const activeSnapshot = await getDocs(activeQuery);
                        activeConversations = activeSnapshot.size;
                    } catch (permError: any) {
                        // Silently handle permission errors - this is expected if socialConversations doesn't exist yet
                        if (permError?.code !== 'permission-denied') {
                            console.debug(`[useProjectChatStats] Skipping conversations for ${projectId}:`, permError?.code || 'unknown');
                        }
                    }

                    // Fetch recent messages (last 7 days) - wrapped in try-catch for permission errors
                    const messagesRef = collection(db, 'socialMessages');
                    let messages: any[] = [];
                    let messages24h = 0;
                    
                    try {
                        const recentMessagesQuery = query(
                            messagesRef,
                            where('projectId', '==', projectId),
                            where('timestamp', '>=', Timestamp.fromDate(last7d)),
                            orderBy('timestamp', 'desc'),
                            limit(500)
                        );
                        const messagesSnapshot = await getDocs(recentMessagesQuery);
                        messages = messagesSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        // Count messages in last 24h
                        messages24h = messages.filter((m: any) => {
                            const msgTime = m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000) : null;
                            return msgTime && msgTime >= last24h;
                        }).length;
                    } catch (permError: any) {
                        // Silently handle permission errors
                        if (permError?.code !== 'permission-denied') {
                            console.debug(`[useProjectChatStats] Skipping messages for ${projectId}:`, permError?.code || 'unknown');
                        }
                    }

                    // Get leads count - wrapped in try-catch
                    let conversations: any[] = [];
                    let leadsCount = 0;
                    
                    try {
                        const allConversationsQuery = query(
                            conversationsRef,
                            where('projectId', '==', projectId),
                            limit(1000)
                        );
                        const allConversationsSnapshot = await getDocs(allConversationsQuery);
                        conversations = allConversationsSnapshot.docs.map(doc => doc.data());
                        leadsCount = conversations.filter((c: any) => c.leadId).length;
                    } catch (permError: any) {
                        // Silently handle permission errors
                        if (permError?.code !== 'permission-denied') {
                            console.debug(`[useProjectChatStats] Skipping leads count for ${projectId}:`, permError?.code || 'unknown');
                        }
                    }

                    // Calculate average response time
                    let projectResponseTime = 0;
                    let projectResponseCount = 0;
                    const inbound = messages.filter((m: any) => m.direction === 'inbound');
                    const outbound = messages.filter((m: any) => m.direction === 'outbound');

                    inbound.forEach((inMsg: any) => {
                        const response = outbound.find((outMsg: any) =>
                            outMsg.timestamp?.seconds > inMsg.timestamp?.seconds &&
                            outMsg.recipientId === inMsg.senderId
                        );
                        if (response) {
                            const responseTime = response.timestamp.seconds - inMsg.timestamp.seconds;
                            if (responseTime > 0 && responseTime < 3600) {
                                projectResponseTime += responseTime;
                                projectResponseCount++;
                            }
                        }
                    });

                    const avgResponseTime = projectResponseCount > 0 
                        ? projectResponseTime / projectResponseCount 
                        : 0;

                    // Channel breakdown
                    const channelCounts = new Map<SocialChannel, number>();
                    messages.forEach((m: any) => {
                        const channel = m.channel as SocialChannel;
                        channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
                    });
                    const channelBreakdown = Array.from(channelCounts.entries())
                        .map(([channel, count]) => ({ channel, count }))
                        .sort((a, b) => b.count - a.count);

                    // Last activity
                    const lastActivity = messages.length > 0 && messages[0].timestamp
                        ? new Date(messages[0].timestamp.seconds * 1000)
                        : null;

                    // Calculate trend (compare this week vs last week)
                    const midWeek = new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000);
                    const thisWeekMessages = messages.filter((m: any) => {
                        const msgTime = m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000) : null;
                        return msgTime && msgTime >= midWeek;
                    }).length;
                    const lastWeekMessages = messages.length - thisWeekMessages;
                    
                    let trend: 'up' | 'down' | 'stable' = 'stable';
                    let trendPercentage = 0;
                    if (lastWeekMessages > 0) {
                        const change = ((thisWeekMessages - lastWeekMessages) / lastWeekMessages) * 100;
                        trendPercentage = Math.abs(change);
                        if (change > 5) trend = 'up';
                        else if (change < -5) trend = 'down';
                    }

                    // Set project stats
                    statsMap.set(projectId, {
                        projectId,
                        activeConversations,
                        totalMessages: messages.length,
                        totalLeads: leadsCount,
                        avgResponseTime,
                        lastActivity,
                        channelBreakdown,
                        trend,
                        trendPercentage,
                    });

                    // Update global stats
                    globalActiveChats += activeConversations;
                    globalMessages24h += messages24h;
                    globalLeads += leadsCount;
                    if (avgResponseTime > 0) {
                        totalResponseTime += avgResponseTime;
                        responseTimeCount++;
                    }
                    if (messages.length > 0) {
                        projectsWithActivity++;
                    }

                } catch (err) {
                    console.warn(`Error fetching stats for project ${projectId}:`, err);
                    // Set empty stats for this project
                    statsMap.set(projectId, {
                        projectId,
                        activeConversations: 0,
                        totalMessages: 0,
                        totalLeads: 0,
                        avgResponseTime: 0,
                        lastActivity: null,
                        channelBreakdown: [],
                        trend: 'stable',
                        trendPercentage: 0,
                    });
                }
            }

            setStats(statsMap);
            setGlobalStats({
                totalActiveChats: globalActiveChats,
                totalMessages24h: globalMessages24h,
                totalLeads: globalLeads,
                avgResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
                projectsWithActivity,
            });

        } catch (err) {
            console.error('Error fetching project chat stats:', err);
            setError('Error al cargar estadísticas');
        } finally {
            setIsLoading(false);
        }
    }, [projectIds]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const getStatsForProject = useCallback((projectId: string): ProjectChatStats | null => {
        return stats.get(projectId) || null;
    }, [stats]);

    return {
        stats,
        globalStats,
        isLoading,
        error,
        getStatsForProject,
        refresh: fetchStats,
    };
};

export default useProjectChatStats;


