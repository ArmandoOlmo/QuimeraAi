/**
 * useSocialChatAnalytics Hook
 * Analytics and metrics for social chat conversations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    collection, query, where, getDocs, orderBy, Timestamp,
    limit, startAfter, endBefore
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { SocialChannel, SocialChatAnalytics } from '../../../types/socialChat';

// =============================================================================
// TYPES
// =============================================================================

export interface DateRange {
    start: Date;
    end: Date;
}

export interface ChannelMetrics {
    channel: SocialChannel;
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    uniqueConversations: number;
    avgResponseTime: number; // in seconds
    aiHandledCount: number;
    escalatedCount: number;
}

export interface DailyMetrics {
    date: string;
    messages: number;
    conversations: number;
    leads: number;
}

export interface ResponseTimeMetrics {
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    medianResponseTime: number;
    percentile95: number;
}

export interface ConversationInsights {
    totalConversations: number;
    activeConversations: number;
    closedConversations: number;
    escalatedConversations: number;
    avgMessagesPerConversation: number;
    avgConversationDuration: number; // in minutes
    conversionRate: number; // percentage converted to leads
}

export interface TopKeywords {
    keyword: string;
    count: number;
    sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ChatAnalyticsSummary {
    period: string;
    dateRange: DateRange;
    totalMessages: number;
    totalConversations: number;
    uniqueUsers: number;
    leadsGenerated: number;
    aiHandledPercentage: number;
    avgResponseTime: number;
    channelBreakdown: ChannelMetrics[];
    dailyMetrics: DailyMetrics[];
    responseTimeMetrics: ResponseTimeMetrics;
    conversationInsights: ConversationInsights;
    topKeywords: TopKeywords[];
}

export type AnalyticsPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDateRangeForPeriod(period: AnalyticsPeriod, customRange?: DateRange): DateRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
        case 'today':
            return {
                start: today,
                end: now
            };
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return {
                start: yesterday,
                end: today
            };
        case 'last7days':
            const last7 = new Date(today);
            last7.setDate(last7.getDate() - 7);
            return {
                start: last7,
                end: now
            };
        case 'last30days':
            const last30 = new Date(today);
            last30.setDate(last30.getDate() - 30);
            return {
                start: last30,
                end: now
            };
        case 'thisMonth':
            return {
                start: new Date(now.getFullYear(), now.getMonth(), 1),
                end: now
            };
        case 'lastMonth':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            return {
                start: lastMonthStart,
                end: lastMonthEnd
            };
        case 'custom':
            return customRange || { start: today, end: now };
        default:
            return { start: today, end: now };
    }
}

function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

// =============================================================================
// HOOK
// =============================================================================

export const useSocialChatAnalytics = (projectId: string) => {
    const [analytics, setAnalytics] = useState<ChatAnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<AnalyticsPeriod>('last7days');
    const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);

    // ==========================================================================
    // FETCH ANALYTICS DATA
    // ==========================================================================

    const fetchAnalytics = useCallback(async () => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const dateRange = getDateRangeForPeriod(period, customDateRange || undefined);
            
            // Fetch messages
            const messagesRef = collection(db, 'socialMessages');
            const messagesQuery = query(
                messagesRef,
                where('projectId', '==', projectId),
                where('timestamp', '>=', Timestamp.fromDate(dateRange.start)),
                where('timestamp', '<=', Timestamp.fromDate(dateRange.end)),
                orderBy('timestamp', 'desc'),
                limit(10000)
            );

            const messagesSnapshot = await getDocs(messagesQuery);
            const messages = messagesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Fetch conversations
            const conversationsRef = collection(db, 'socialConversations');
            const conversationsQuery = query(
                conversationsRef,
                where('projectId', '==', projectId),
                limit(1000)
            );

            const conversationsSnapshot = await getDocs(conversationsQuery);
            const conversations = conversationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Calculate metrics
            const channelBreakdown = calculateChannelMetrics(messages);
            const dailyMetrics = calculateDailyMetrics(messages, dateRange);
            const responseTimeMetrics = calculateResponseTimeMetrics(messages);
            const conversationInsights = calculateConversationInsights(conversations, messages);
            const topKeywords = extractTopKeywords(messages);

            // Unique users (by senderId)
            const uniqueUsers = new Set(
                messages
                    .filter((m: any) => m.direction === 'inbound')
                    .map((m: any) => m.senderId)
            ).size;

            // Leads generated (conversations with leadId)
            const leadsGenerated = conversations.filter((c: any) => c.leadId).length;

            // AI handled percentage
            const aiHandledMessages = messages.filter((m: any) => m.processedByAI).length;
            const totalInbound = messages.filter((m: any) => m.direction === 'inbound').length;
            const aiHandledPercentage = totalInbound > 0 
                ? (aiHandledMessages / totalInbound) * 100 
                : 0;

            // Set analytics
            setAnalytics({
                period,
                dateRange,
                totalMessages: messages.length,
                totalConversations: conversations.length,
                uniqueUsers,
                leadsGenerated,
                aiHandledPercentage,
                avgResponseTime: responseTimeMetrics.avgResponseTime,
                channelBreakdown,
                dailyMetrics,
                responseTimeMetrics,
                conversationInsights,
                topKeywords,
            });

        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Error al cargar métricas');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, period, customDateRange]);

    // Fetch on mount and when period changes
    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // ==========================================================================
    // CALCULATION FUNCTIONS
    // ==========================================================================

    function calculateChannelMetrics(messages: any[]): ChannelMetrics[] {
        const channels: SocialChannel[] = ['whatsapp', 'facebook', 'instagram', 'web'];
        
        return channels.map(channel => {
            const channelMessages = messages.filter((m: any) => m.channel === channel);
            const inbound = channelMessages.filter((m: any) => m.direction === 'inbound');
            const outbound = channelMessages.filter((m: any) => m.direction === 'outbound');
            const conversations = new Set(channelMessages.map((m: any) => m.senderId)).size;
            const aiHandled = channelMessages.filter((m: any) => m.processedByAI).length;
            const escalated = channelMessages.filter((m: any) => m.escalatedToHuman).length;

            // Calculate average response time
            let totalResponseTime = 0;
            let responseCount = 0;

            inbound.forEach((inMsg: any) => {
                const response = outbound.find((outMsg: any) => 
                    outMsg.timestamp?.seconds > inMsg.timestamp?.seconds &&
                    outMsg.recipientId === inMsg.senderId
                );
                if (response) {
                    const responseTime = response.timestamp.seconds - inMsg.timestamp.seconds;
                    if (responseTime > 0 && responseTime < 3600) { // Ignore responses > 1 hour
                        totalResponseTime += responseTime;
                        responseCount++;
                    }
                }
            });

            return {
                channel,
                totalMessages: channelMessages.length,
                inboundMessages: inbound.length,
                outboundMessages: outbound.length,
                uniqueConversations: conversations,
                avgResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
                aiHandledCount: aiHandled,
                escalatedCount: escalated,
            };
        });
    }

    function calculateDailyMetrics(messages: any[], dateRange: DateRange): DailyMetrics[] {
        const dailyMap = new Map<string, DailyMetrics>();
        
        // Initialize all days in range
        const currentDate = new Date(dateRange.start);
        while (currentDate <= dateRange.end) {
            const dateKey = formatDateKey(currentDate);
            dailyMap.set(dateKey, {
                date: dateKey,
                messages: 0,
                conversations: 0,
                leads: 0,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Count messages per day
        const conversationsByDay = new Map<string, Set<string>>();
        
        messages.forEach((msg: any) => {
            if (!msg.timestamp) return;
            const date = new Date(msg.timestamp.seconds * 1000);
            const dateKey = formatDateKey(date);
            
            const existing = dailyMap.get(dateKey);
            if (existing) {
                existing.messages++;
                
                // Track unique conversations
                if (!conversationsByDay.has(dateKey)) {
                    conversationsByDay.set(dateKey, new Set());
                }
                conversationsByDay.get(dateKey)?.add(msg.senderId);
            }
        });

        // Update conversation counts
        conversationsByDay.forEach((senders, dateKey) => {
            const existing = dailyMap.get(dateKey);
            if (existing) {
                existing.conversations = senders.size;
            }
        });

        return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    function calculateResponseTimeMetrics(messages: any[]): ResponseTimeMetrics {
        const responseTimes: number[] = [];
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
                    responseTimes.push(responseTime);
                }
            }
        });

        if (responseTimes.length === 0) {
            return {
                avgResponseTime: 0,
                minResponseTime: 0,
                maxResponseTime: 0,
                medianResponseTime: 0,
                percentile95: 0,
            };
        }

        responseTimes.sort((a, b) => a - b);
        const sum = responseTimes.reduce((a, b) => a + b, 0);

        return {
            avgResponseTime: sum / responseTimes.length,
            minResponseTime: responseTimes[0],
            maxResponseTime: responseTimes[responseTimes.length - 1],
            medianResponseTime: responseTimes[Math.floor(responseTimes.length / 2)],
            percentile95: responseTimes[Math.floor(responseTimes.length * 0.95)],
        };
    }

    function calculateConversationInsights(conversations: any[], messages: any[]): ConversationInsights {
        const total = conversations.length;
        const active = conversations.filter((c: any) => c.status === 'active' || c.status === 'pending').length;
        const closed = conversations.filter((c: any) => c.status === 'closed').length;
        const escalated = conversations.filter((c: any) => c.status === 'escalated').length;
        const withLeads = conversations.filter((c: any) => c.leadId).length;

        // Average messages per conversation
        const avgMessages = total > 0 ? messages.length / total : 0;

        // Average conversation duration
        let totalDuration = 0;
        let durationCount = 0;

        conversations.forEach((conv: any) => {
            if (conv.startedAt && conv.lastMessageAt) {
                const duration = (conv.lastMessageAt.seconds - conv.startedAt.seconds) / 60;
                if (duration > 0 && duration < 1440) { // Max 24 hours
                    totalDuration += duration;
                    durationCount++;
                }
            }
        });

        return {
            totalConversations: total,
            activeConversations: active,
            closedConversations: closed,
            escalatedConversations: escalated,
            avgMessagesPerConversation: Math.round(avgMessages * 10) / 10,
            avgConversationDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
            conversionRate: total > 0 ? (withLeads / total) * 100 : 0,
        };
    }

    function extractTopKeywords(messages: any[]): TopKeywords[] {
        const keywordCounts = new Map<string, number>();
        const commonWords = new Set(['el', 'la', 'de', 'en', 'y', 'a', 'que', 'es', 'un', 'una', 'the', 'is', 'a', 'an', 'to', 'in', 'of', 'and', 'for']);
        
        const interestingKeywords = [
            // Product/Service related
            'precio', 'price', 'costo', 'cost', 'disponible', 'available', 'stock',
            'envío', 'shipping', 'entrega', 'delivery', 'comprar', 'buy', 'order',
            // Questions
            'cómo', 'how', 'cuándo', 'when', 'dónde', 'where', 'qué', 'what',
            // Sentiment
            'gracias', 'thanks', 'excelente', 'excellent', 'bueno', 'good', 'malo', 'bad',
            'problema', 'problem', 'ayuda', 'help', 'urgente', 'urgent'
        ];

        messages
            .filter((m: any) => m.direction === 'inbound')
            .forEach((msg: any) => {
                const words = (msg.message || '').toLowerCase().split(/\s+/);
                words.forEach((word: string) => {
                    const cleanWord = word.replace(/[^\wáéíóúñ]/g, '');
                    if (cleanWord.length > 2 && !commonWords.has(cleanWord)) {
                        keywordCounts.set(cleanWord, (keywordCounts.get(cleanWord) || 0) + 1);
                    }
                });
            });

        // Sort and get top keywords
        const sortedKeywords = Array.from(keywordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([keyword, count]) => {
                // Determine sentiment
                const positiveWords = ['gracias', 'thanks', 'excelente', 'excellent', 'bueno', 'good', 'perfecto', 'perfect'];
                const negativeWords = ['malo', 'bad', 'problema', 'problem', 'urgente', 'urgent', 'queja', 'complaint'];
                
                let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
                if (positiveWords.includes(keyword)) sentiment = 'positive';
                if (negativeWords.includes(keyword)) sentiment = 'negative';

                return { keyword, count, sentiment };
            });

        return sortedKeywords;
    }

    // ==========================================================================
    // RETURN
    // ==========================================================================

    return {
        analytics,
        isLoading,
        error,
        period,
        setPeriod,
        customDateRange,
        setCustomDateRange,
        refresh: fetchAnalytics,
    };
};

export default useSocialChatAnalytics;








