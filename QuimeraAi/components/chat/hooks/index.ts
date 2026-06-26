/**
 * Chat Hooks
 * Exports all hooks for chat functionality
 */

export { useEcommerceChat } from './useEcommerceChat';
export type {
    OrderStatus,
    ProductInfo,
    ShippingInfo,
    ReturnPolicy,
    EcommerceChatContext,
    EcommerceChatOptions,
    OrderVerification,
    BackInStockRequest,
} from './useEcommerceChat';

export { useChatbotBusinessActions } from './useChatbotBusinessActions';
export type {
    ChatbotBusinessActionOptions,
    ChatbotHandoffPriority,
    HumanHandoffRequest,
    HumanHandoffResult,
} from './useChatbotBusinessActions';

export { useSocialChat } from './useSocialChat';
export type {
    ConversationWithMessages,
    SocialChatStats,
    SendMessageParams,
} from './useSocialChat';

export { useSocialChatAnalytics } from './useSocialChatAnalytics';
export type {
    DateRange,
    ChannelMetrics,
    DailyMetrics,
    ResponseTimeMetrics,
    ConversationInsights,
    TopKeywords,
    ChatAnalyticsSummary,
    AnalyticsPeriod,
} from './useSocialChatAnalytics';
