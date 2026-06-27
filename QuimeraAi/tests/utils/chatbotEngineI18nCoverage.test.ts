import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const es = JSON.parse(fs.readFileSync(path.join(rootDir, 'locales/es/translation.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(rootDir, 'locales/en/translation.json'), 'utf8'));

const requiredDashboardTabs = [
    'overview',
    'engine',
    'knowledge',
    'personality',
    'voice',
    'leadCapture',
    'customization',
    'socialChannels',
    'socialInbox',
    'settings',
];

const requiredDashboardKeys = [
    'analyticsTitle',
    'analyticsSubtitle',
    'searchProjectPlaceholder',
    'activeConversationsBadge',
    'noChannels',
    'noSearchResults',
    'noSearchResultsDesc',
    'improvementIdeas',
    'refreshStats',
    'businessInfo',
    'selectPublishedArticles',
    'cmsArticlesDesc',
    'noCmsArticles',
    'noCmsArticlesDesc',
    'published',
    'draft',
    'hideMenu',
    'showMenu',
    'mainMenu',
    'knowledgeBase',
    'knowledgeBaseStats',
    'leadCaptureStatus',
    'chatStatus',
    'statusActive',
    'statusInactive',
    'statusOnline',
    'statusOffline',
    'operatorAccessTitle',
    'operatorAccessDesc',
    'operatorInboxCta',
    'operatorAccessScope',
    'advancedControls',
    'advancedControlsDesc',
];

const requiredGlobalStats = [
    'activeChats',
    'activeChatsHint',
    'messages24h',
    'messages24hHint',
    'totalLeads',
    'totalLeadsHint',
    'responseTime',
    'responseTimeHint',
];

const requiredProjectStats = ['messages', 'leads', 'response'];

const requiredIdeas = ['weeklyGoals', 'comparisons', 'smartAlerts', 'aiInsights', 'advancedCharts', 'leaderboard'];

const requiredRuntimeKeys = [
    'reviewBlocked',
    'actionReviewSaved',
    'knowledgeReviewSaved',
    'scenarioStatusSaved',
    'surfaceDeploymentSaved',
    'voiceSettingsSaved',
    'handoffAssigned',
    'handoffResolved',
    'testLabRunSaved',
];

const requiredActionTypes = [
    'create_lead',
    'update_lead',
    'create_appointment',
    'request_restaurant_reservation',
    'request_realty_showing',
    'register_open_house',
    'check_order_status',
    'search_products',
    'recommend_products',
    'create_product_inquiry',
    'start_checkout',
    'back_in_stock_request',
    'subscribe_email_audience',
    'queue_email_follow_up',
    'create_finance_quote_request',
    'request_media_asset',
    'send_internal_alert',
    'handoff_to_human',
    'create_support_ticket',
    'answer_from_knowledge',
    'save_conversation',
    'save_message',
    'analyze_intent',
    'score_lead',
    'link_conversation_to_lead',
    'check_availability',
    'explain_shipping',
    'explain_returns',
    'record_analytics_event',
];

const requiredOwnerModules = [
    'ai-studio',
    'business-blueprint',
    'website-builder',
    'storefront-builder',
    'ecommerce',
    'crm',
    'email-marketing',
    'appointments',
    'restaurants',
    'real-estate',
    'bio-page',
    'cms',
    'media-ai',
    'finance',
    'analytics',
    'chatbot-engine',
    'chatcore',
];

const requiredKnowledgeTypes = [
    'business_blueprint',
    'ai_studio_brief',
    'project_content',
    'ecommerce_catalog',
    'appointments_services',
    'restaurant_menu',
    'realty_listings',
    'crm_leads_public',
    'email_marketing_public',
    'finance_invoices_private',
    'cms_articles',
    'uploaded_document',
    'website_url',
    'youtube',
    'manual_snippet',
    'faq',
];

const requiredFieldKeys = [
    'appearanceStatus',
    'projectTokens',
    'brandColors',
    'visualIdentity',
    'designStarAligned',
    'designStarReview',
];

const requiredGroups: Record<string, string[]> = {
    fields: requiredFieldKeys,
    actionTypes: requiredActionTypes,
    ownerModules: requiredOwnerModules,
    knowledgeTypes: requiredKnowledgeTypes,
    visibility: ['public', 'private', 'internal'],
    deploymentStatuses: ['draft', 'test', 'deployed', 'paused', 'disabled', 'missing'],
    actionStatuses: ['allowed', 'blocked', 'executed', 'observed', 'failed', 'duplicate'],
    eventTypes: [
        'chatbot_action_allowed',
        'chatbot_action_blocked',
        'chatbot_action_executed',
        'chatbot_intent_analyzed',
        'chatbot_message_saved',
        'chatbot_conversation_created',
        'chatbot_conversation_reused',
        'chatbot_participant_updated',
        'chatbot_conversation_closed',
        'chatbot_conversation_linked_to_lead',
        'chatbot_handoff_requested',
        'chatbot_handoff_assigned',
        'chatbot_handoff_resolved',
        'chatbot_test_lab_run',
        'chatbot_finance_quote_request_created',
        'chatbot_media_asset_requested',
        'chatbot_restaurant_reservation_requested',
        'chatbot_realty_showing_requested',
        'chatbot_ecommerce_product_inquiry',
        'chatbot_email_audience_subscribed',
    ],
    surfaceValues: ['website', 'storefront', 'checkout', 'bio_page', 'booking_page', 'restaurant_menu', 'realty_property_page', 'admin_preview', 'voice'],
    contextKeys: [
        'surface',
        'route',
        'visibleSections',
        'pageData',
        'utm',
        'embedId',
        'bioPageBlock',
        'bioPageLink',
        'activeProduct',
        'activeCart',
        'storefrontRoute',
        'checkoutStep',
        'bookingService',
        'bookingStep',
        'availabilityWindow',
        'activeRestaurant',
        'activeMenuItem',
        'activeProperty',
        'persona',
        'testMode',
        'voiceSessionId',
        'language',
    ],
    channels: ['web', 'website', 'whatsapp', 'instagram', 'facebook', 'messenger', 'email', 'sms', 'voice'],
    conversationStatuses: ['active', 'pending', 'escalated', 'closed', 'resolved'],
    priorities: ['low', 'normal', 'high', 'urgent'],
    handoffReasons: [
        'human_requested',
        'low_confidence',
        'unsupported_request',
        'negative_sentiment',
        'payment_or_order_issue',
        'repeated_unanswered_question',
        'high_value_lead',
        'pricing',
        'support',
    ],
    assignmentStrategies: ['unassigned', 'round_robin', 'owner', 'team_queue'],
    evaluationStatuses: ['not_run', 'passing', 'failing', 'needs_review', 'missing'],
    testStatuses: ['draft', 'passed', 'failed', 'needs_review'],
    voiceProviders: ['none', 'elevenlabs'],
};

function getPath(source: any, keys: string[]) {
    return keys.reduce((current, key) => current?.[key], source);
}

function expectTranslated(source: any, keys: string[]) {
    const value = getPath(source, keys);
    expect(typeof value, keys.join('.')).toBe('string');
    expect(value.trim().length, keys.join('.')).toBeGreaterThan(0);
}

describe('Chatbot Engine i18n coverage', () => {
    it('keeps dashboard tab labels and descriptions bilingual', () => {
        for (const locale of [es, en]) {
            for (const key of requiredDashboardKeys) {
                expectTranslated(locale, ['aiAssistant', 'dashboard', key]);
            }
            for (const tab of requiredDashboardTabs) {
                expectTranslated(locale, ['aiAssistant', 'dashboard', 'tabs', tab]);
                expectTranslated(locale, ['aiAssistant', 'dashboard', 'tabDescriptions', tab]);
            }
            for (const key of requiredGlobalStats) {
                expectTranslated(locale, ['aiAssistant', 'dashboard', 'globalStats', key]);
            }
            for (const key of requiredProjectStats) {
                expectTranslated(locale, ['aiAssistant', 'dashboard', 'projectStats', key]);
            }
            for (const idea of requiredIdeas) {
                expectTranslated(locale, ['aiAssistant', 'dashboard', 'ideas', idea, 'title']);
                expectTranslated(locale, ['aiAssistant', 'dashboard', 'ideas', idea, 'desc']);
            }
        }
    });

    it('keeps canonical Chatbot Engine dashboard tokens bilingual', () => {
        for (const locale of [es, en]) {
            for (const key of requiredRuntimeKeys) {
                expectTranslated(locale, ['aiAssistant', 'chatbotEngine', 'runtime', key]);
            }
            for (const [group, keys] of Object.entries(requiredGroups)) {
                for (const key of keys) {
                    expectTranslated(locale, ['aiAssistant', 'chatbotEngine', group, key]);
                }
            }
        }
    });
});
