import { supabase } from '@/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { isSupabaseUuid } from './ecommerce/storeIdentity';
import { uploadPlatformAsset } from './platformAssetUpload';

type AnyRecord = Record<string, any>;
type Direction = 'asc' | 'desc';
type Operator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in';

type DataRef = {
    kind: 'collection' | 'document';
    path: string[];
    id: string;
    ref?: DataRef;
};

type QueryConstraint =
    | { type: 'where'; field: string; op: Operator; value: any }
    | { type: 'order'; field: string; direction: Direction }
    | { type: 'limit'; count: number };

type DataQuery = DataRef & {
    constraints: QueryConstraint[];
};

export type DocumentSnapshot = {
    id: string;
    ref: DataRef;
    exists: () => boolean;
    data: () => AnyRecord;
};

export type QueryDocumentSnapshot = {
    id: string;
    ref: DataRef;
    data: () => AnyRecord;
};

type ResolvedPath = {
    table: string;
    id?: string;
    filters: Array<{ field: string; op: Operator; value: any }>;
    parent?: { kind: string; id: string };
};

const KNOWN_COLUMNS: Record<string, string[]> = {
    users: ['id', 'email', 'name', 'full_name', 'display_name', 'role', 'photo_url', 'avatar_url', 'phone', 'username', 'metadata', 'created_at', 'updated_at'],
    tenants: ['id', 'name', 'slug', 'type', 'owner_user_id', 'owner_tenant_id', 'subscription_plan', 'status', 'limits', 'usage', 'branding', 'settings', 'billing', 'created_at', 'updated_at'],
    tenant_members: ['id', 'tenant_id', 'user_id', 'role', 'permissions', 'status', 'joined_at', 'created_at', 'updated_at'],
    tenant_invites: ['id', 'tenant_id', 'email', 'role', 'permissions', 'token', 'status', 'expires_at', 'created_at', 'updated_at'],
    projects: ['id', 'user_id', 'tenant_id', 'name', 'status', 'data', 'published_data', 'thumbnail_url', 'theme', 'brand_identity', 'component_order', 'section_visibility', 'pages', 'menus', 'categories', 'ai_assistant_config', 'seo_config', 'crm_config', 'last_updated', 'published_at', 'created_at', 'updated_at'],
    leads: ['id', 'tenant_id', 'project_id', 'name', 'email', 'phone', 'company', 'status', 'source', 'value', 'tags', 'notes', 'custom_data', 'created_at', 'updated_at'],
    lead_activities: ['id', 'tenant_id', 'lead_id', 'project_id', 'type', 'description', 'created_at'],
    lead_tasks: ['id', 'tenant_id', 'lead_id', 'project_id', 'title', 'description', 'due_date', 'status', 'created_at', 'updated_at'],
    files: ['id', 'tenant_id', 'project_id', 'name', 'url', 'size', 'type', 'metadata', 'created_at'],
    global_files: ['id', 'name', 'url', 'size', 'type', 'metadata', 'created_at'],
    admin_assets: ['id', 'name', 'url', 'size', 'type', 'category', 'metadata', 'created_at'],
    custom_domains: ['domain_name', 'domain', 'project_id', 'user_id', 'status', 'ssl_status', 'dns_verified', 'cloud_run_target', 'data', 'created_at', 'updated_at'],
    subdomains: ['id', 'subdomain', 'project_id', 'user_id', 'type', 'status', 'data', 'created_at', 'updated_at'],
    settings: ['id', 'config', 'updated_at', 'updated_by'],
    global_settings: ['id', 'key', 'value', 'data', 'created_at', 'updated_at'],
    service_config: ['id', 'key', 'config', 'created_at', 'updated_at'],
    service_audit_logs: ['id', 'service_key', 'action', 'details', 'created_at'],
    prompts: ['id', 'name', 'description', 'content', 'type', 'category', 'is_active', 'created_at', 'updated_at'],
    custom_components: ['id', 'tenant_id', 'name', 'description', 'type', 'icon', 'data', 'is_global', 'created_at', 'updated_at'],
    component_defaults: ['id', 'type', 'data', 'created_at', 'updated_at'],
    restaurants: ['id', 'tenant_id', 'project_id', 'owner_id', 'name', 'logo_url', 'hero_image_url', 'address', 'phone', 'cuisine_type', 'hours', 'reservation_enabled', 'max_party_size', 'reservation_interval', 'average_table_duration', 'languages_enabled', 'currency', 'service_fee', 'tax_rate', 'qr_menu_enabled', 'public_slug', 'created_at', 'updated_at'],
    restaurant_menu_items: ['id', 'tenant_id', 'restaurant_id', 'name', 'description', 'category', 'price', 'currency', 'image_url', 'dietary_tags', 'allergens', 'ingredients', 'preparation_time', 'is_available', 'is_featured', 'upsell_items', 'ai_generated', 'position', 'created_at', 'updated_at'],
    restaurant_reservations: ['id', 'tenant_id', 'project_id', 'restaurant_id', 'customer_name', 'customer_email', 'customer_phone', 'date', 'time', 'party_size', 'table_preference', 'status', 'notes', 'source', 'created_at', 'updated_at'],
    restaurant_marketing_outputs: ['id', 'tenant_id', 'restaurant_id', 'type', 'prompt', 'output', 'created_by', 'created_at'],
    restaurant_review_templates: ['id', 'tenant_id', 'restaurant_id', 'type', 'title', 'content', 'created_at', 'updated_at'],
    restaurant_analytics_events: ['id', 'tenant_id', 'project_id', 'restaurant_id', 'event_name', 'metadata', 'created_at'],
    properties: ['id', 'tenant_id', 'project_id', 'title', 'description', 'price', 'address', 'city', 'state', 'country', 'property_type', 'status', 'bedrooms', 'bathrooms', 'area', 'images', 'features', 'metadata', 'created_at', 'updated_at'],
    store_users: ['id', 'project_id', 'auth_user_id', 'public_store_id', 'email', 'display_name', 'first_name', 'last_name', 'photo_url', 'phone', 'role', 'status', 'segments', 'tags', 'customer_id', 'total_orders', 'total_spent', 'average_order_value', 'last_login_at', 'last_order_at', 'metadata', 'accepts_marketing', 'preferred_language', 'internal_notes', 'created_at', 'updated_at'],
    store_user_segments: ['id', 'project_id', 'name', 'description', 'color', 'type', 'rules', 'user_count', 'created_at', 'updated_at'],
    store_user_activities: ['id', 'project_id', 'user_id', 'type', 'description', 'metadata', 'ip_address', 'user_agent', 'created_at'],
    public_stores: ['id', 'project_id', 'user_id', 'data', 'created_at', 'updated_at'],
    store_products: ['id', 'project_id', 'store_id', 'public_store_id', 'category_id', 'name', 'slug', 'description', 'short_description', 'price', 'compare_at_price', 'cost_price', 'currency', 'sku', 'barcode', 'quantity', 'inventory_quantity', 'track_inventory', 'low_stock_threshold', 'images', 'tags', 'has_variants', 'variants', 'options', 'status', 'is_digital', 'is_featured', 'weight', 'weight_unit', 'data', 'created_at', 'updated_at'],
    store_categories: ['id', 'project_id', 'store_id', 'public_store_id', 'name', 'slug', 'data', 'created_at', 'updated_at'],
    store_orders: ['id', 'project_id', 'store_id', 'public_store_id', 'customer_id', 'order_number', 'customer_email', 'customer_name', 'customer_phone', 'items', 'subtotal', 'discount', 'discount_code', 'discount_amount', 'shipping_cost', 'shipping_amount', 'tax_amount', 'total', 'total_amount', 'currency', 'pricing', 'checkout_idempotency_key', 'cart_hash', 'stripe', 'shipping_address', 'billing_address', 'status', 'payment_status', 'fulfillment_status', 'payment_method', 'payment_intent_id', 'stripe_payment_intent_id', 'shipping_method', 'tracking_number', 'tracking_url', 'carrier', 'notes', 'customer_notes', 'internal_notes', 'data', 'created_at', 'updated_at', 'paid_at', 'shipped_at', 'delivered_at', 'cancelled_at', 'refunded_at'],
    store_reviews: ['id', 'project_id', 'store_id', 'public_store_id', 'product_id', 'customer_id', 'customer_name', 'customer_email', 'rating', 'title', 'comment', 'verified_purchase', 'status', 'helpful_votes', 'admin_response', 'admin_response_at', 'data', 'created_at', 'updated_at'],
    store_discounts: ['id', 'project_id', 'store_id', 'public_store_id', 'code', 'type', 'value', 'minimum_amount', 'usage_limit', 'usage_count', 'starts_at', 'ends_at', 'is_active', 'data', 'created_at', 'updated_at'],
    store_stock_notifications: ['id', 'project_id', 'product_id', 'email', 'status', 'created_at', 'notified_at'],
    store_wishlists: ['id', 'project_id', 'user_id', 'product_id', 'created_at'],
    email_campaigns: ['id', 'project_id', 'store_id', 'tenant_id', 'user_id', 'name', 'subject', 'preview_text', 'type', 'html_content', 'email_document', 'audience_type', 'audience_segment_id', 'custom_recipient_emails', 'status', 'stats', 'tags', 'created_by', 'generated_by_ai', 'needs_review', 'user_modified', 'safe_to_edit', 'approved_at', 'approved_by', 'send_mode', 'source_module', 'source_component', 'source_event', 'source_entity_type', 'source_entity_id', 'correlation_id', 'idempotency_key', 'readiness', 'metadata', 'created_at', 'updated_at'],
    email_audiences: ['id', 'project_id', 'store_id', 'tenant_id', 'user_id', 'name', 'description', 'filters', 'accepts_marketing', 'has_ordered', 'min_orders', 'max_orders', 'min_total_spent', 'max_total_spent', 'tags', 'exclude_tags', 'last_order_days_ago', 'source', 'static_members', 'static_member_count', 'estimated_count', 'last_count_update', 'is_default', 'created_by', 'generated_by_ai', 'needs_review', 'user_modified', 'safe_to_edit', 'source_module', 'source_component', 'source_event', 'source_entity_type', 'source_entity_id', 'source_map', 'correlation_id', 'idempotency_key', 'readiness', 'metadata', 'created_at', 'updated_at'],
    email_automations: ['id', 'project_id', 'store_id', 'tenant_id', 'user_id', 'name', 'description', 'type', 'category', 'status', 'trigger_config', 'audience_id', 'steps', 'template_id', 'subject', 'delay_minutes', 'stats', 'generated_by_ai', 'needs_review', 'user_modified', 'safe_to_edit', 'activated_at', 'activated_by', 'source_module', 'source_component', 'source_event', 'source_entity_type', 'source_entity_id', 'source_map', 'correlation_id', 'idempotency_key', 'readiness', 'metadata', 'created_at', 'updated_at'],
    email_logs: ['id', 'project_id', 'store_id', 'tenant_id', 'user_id', 'type', 'template_id', 'campaign_id', 'automation_id', 'automation_step_id', 'recipient_email', 'recipient_name', 'customer_id', 'subject', 'status', 'provider_message_id', 'provider', 'open_count', 'click_count', 'bounce_type', 'bounce_message', 'error_message', 'error_code', 'order_id', 'lead_id', 'email_kind', 'suppression_checked', 'skipped_reason', 'source_module', 'source_component', 'source_event', 'source_entity_type', 'source_entity_id', 'correlation_id', 'idempotency_key', 'metadata', 'sent_at', 'delivered_at', 'opened_at', 'clicked_links', 'clicked_at', 'bounced_at', 'complained_at', 'created_at', 'updated_at'],
    bio_pages: ['id', 'tenant_id', 'project_id', 'user_id', 'slug', 'title', 'description', 'profile', 'theme', 'seo', 'settings', 'status', 'published_at', 'created_at', 'updated_at'],
    bio_page_blocks: ['id', 'tenant_id', 'project_id', 'bio_page_id', 'type', 'title', 'description', 'order_index', 'visible', 'data', 'settings', 'source_module', 'source_entity_id', 'generated_by_ai', 'needs_review', 'user_modified', 'locked_from_regeneration', 'created_at', 'updated_at'],
    bio_page_links: ['id', 'tenant_id', 'project_id', 'bio_page_id', 'block_id', 'title', 'url', 'description', 'icon', 'image_url', 'platform', 'link_type', 'order_index', 'visible', 'click_tracking_enabled', 'metadata', 'created_at', 'updated_at'],
    bio_page_events: ['id', 'tenant_id', 'project_id', 'bio_page_id', 'block_id', 'link_id', 'event_type', 'source', 'referrer', 'utm', 'user_agent', 'ip_hash', 'metadata', 'created_at'],
    bio_page_qr_codes: ['id', 'tenant_id', 'project_id', 'bio_page_id', 'url', 'color', 'background_color', 'logo_url', 'metadata', 'created_at', 'updated_at'],
    bio_page_subscribers: ['id', 'tenant_id', 'project_id', 'bio_page_id', 'email', 'name', 'consent', 'source', 'audience_id', 'metadata', 'subscribed_at', 'created_at'],
    social_conversations: ['id', 'tenant_id', 'project_id', 'channel', 'participant_id', 'participant_name', 'participant_avatar', 'participant_email', 'participant_phone', 'status', 'started_at', 'last_message_at', 'message_count', 'unread_count', 'assigned_to', 'tags', 'notes', 'lead_id', 'metadata', 'created_at', 'updated_at'],
    social_messages: ['id', 'tenant_id', 'project_id', 'conversation_id', 'channel', 'direction', 'sender_id', 'sender_name', 'sender_avatar', 'recipient_id', 'message', 'message_type', 'media_url', 'timestamp', 'status', 'response', 'response_timestamp', 'processed_by_ai', 'ai_confidence', 'escalated_to_human', 'error_code', 'error_message', 'retry_count', 'metadata', 'created_at', 'updated_at'],
    assistant_memories: ['id', 'tenant_id', 'user_id', 'project_id', 'scope', 'module', 'title', 'summary', 'data', 'embedding_id', 'importance', 'source', 'source_entity_type', 'source_entity_id', 'expires_at', 'created_at', 'updated_at'],
    assistant_memory_items: ['id', 'memory_id', 'tenant_id', 'user_id', 'project_id', 'scope', 'module', 'title', 'summary', 'data', 'embedding_id', 'importance', 'source', 'source_entity_type', 'source_entity_id', 'expires_at', 'created_at', 'updated_at'],
    assistant_conversations: ['id', 'user_id', 'tenant_id', 'project_id', 'mode', 'title', 'active_task_id', 'metadata', 'created_at', 'updated_at'],
    assistant_messages: ['id', 'conversation_id', 'role', 'text', 'context_snapshot_id', 'memory_ids', 'action_ids', 'metadata', 'created_at'],
    assistant_tasks: ['id', 'user_id', 'tenant_id', 'project_id', 'module', 'intent', 'status', 'request', 'plan', 'draft_changes', 'result', 'errors', 'metadata', 'created_at', 'updated_at'],
    assistant_actions: ['id', 'task_id', 'user_id', 'tenant_id', 'project_id', 'mode', 'module', 'action_type', 'target', 'input', 'before_snapshot', 'after_snapshot', 'diff', 'requires_confirmation', 'confirmed_at', 'status', 'metadata', 'model_used', 'tool_used', 'latency_ms', 'cost_usd', 'error', 'created_at', 'updated_at'],
    assistant_runtime_events: ['id', 'type', 'user_id', 'tenant_id', 'project_id', 'task_id', 'action_id', 'metadata', 'created_at'],
    assistant_context_snapshots: ['id', 'conversation_id', 'user_id', 'tenant_id', 'project_id', 'active_route', 'active_module', 'active_entity_type', 'active_entity_id', 'current_surface', 'snapshot', 'created_at'],
    assistant_project_summaries: ['id', 'tenant_id', 'project_id', 'summary', 'readiness', 'updated_by', 'created_at', 'updated_at'],
    assistant_module_summaries: ['id', 'tenant_id', 'project_id', 'module', 'summary', 'readiness', 'updated_by', 'created_at', 'updated_at'],
    assistant_user_preferences: ['user_id', 'preferences', 'pinned_memory_ids', 'created_at', 'updated_at'],
    assistant_admin_events: ['id', 'tenant_id', 'user_id', 'event_type', 'target_type', 'target_id', 'metadata', 'created_at'],
    agency_landings: ['id', 'tenant_id', 'data', 'subdomain', 'custom_domain', 'is_published', 'published_at', 'last_updated', 'created_at', 'updated_at', 'updated_by'],
};

const EMAIL_TABLES = new Set(['email_campaigns', 'email_audiences', 'email_automations', 'email_logs']);

const COLLECTION_TABLES: Record<string, string> = {
    adminEmailCampaigns: 'email_campaigns',
    userEmailCampaigns: 'email_campaigns',
    adminEmailAudiences: 'email_audiences',
    userEmailAudiences: 'email_audiences',
    adminEmailAutomations: 'email_automations',
    userEmailAutomations: 'email_automations',
    adminEmailLogs: 'email_logs',
    userEmailLogs: 'email_logs',
    bioPages: 'bio_pages',
    bio_pages: 'bio_pages',
    bioPageBlocks: 'bio_page_blocks',
    bio_page_blocks: 'bio_page_blocks',
    bioPageLinks: 'bio_page_links',
    bio_page_links: 'bio_page_links',
    bioPageEvents: 'bio_page_events',
    bio_page_events: 'bio_page_events',
    bioPageQrCodes: 'bio_page_qr_codes',
    bio_page_qr_codes: 'bio_page_qr_codes',
    bioPageSubscribers: 'bio_page_subscribers',
    bio_page_subscribers: 'bio_page_subscribers',
    socialConversations: 'social_conversations',
    social_conversations: 'social_conversations',
    socialMessages: 'social_messages',
    social_messages: 'social_messages',
    assistantMemories: 'assistant_memories',
    assistant_memories: 'assistant_memories',
    assistantMemoryItems: 'assistant_memory_items',
    assistant_memory_items: 'assistant_memory_items',
    assistantConversations: 'assistant_conversations',
    assistant_conversations: 'assistant_conversations',
    assistantMessages: 'assistant_messages',
    assistant_messages: 'assistant_messages',
    assistantTasks: 'assistant_tasks',
    assistant_tasks: 'assistant_tasks',
    assistantActions: 'assistant_actions',
    assistant_actions: 'assistant_actions',
    assistantRuntimeEvents: 'assistant_runtime_events',
    assistant_runtime_events: 'assistant_runtime_events',
    assistantContextSnapshots: 'assistant_context_snapshots',
    assistant_context_snapshots: 'assistant_context_snapshots',
    assistantProjectSummaries: 'assistant_project_summaries',
    assistant_project_summaries: 'assistant_project_summaries',
    assistantModuleSummaries: 'assistant_module_summaries',
    assistant_module_summaries: 'assistant_module_summaries',
    assistantUserPreferences: 'assistant_user_preferences',
    assistant_user_preferences: 'assistant_user_preferences',
    assistantAdminEvents: 'assistant_admin_events',
    assistant_admin_events: 'assistant_admin_events',
    agencyLandings: 'agency_landings',
    agency_landings: 'agency_landings',
    publicStores: 'public_stores',
    public_stores: 'public_stores',
    storeUsers: 'store_users',
    users: 'users',
    tenants: 'tenants',
    members: 'tenant_members',
    invites: 'tenant_invites',
    projects: 'projects',
    leads: 'leads',
    activities: 'lead_activities',
    tasks: 'lead_tasks',
    files: 'files',
    globalFiles: 'global_files',
    adminAssets: 'admin_assets',
    domains: 'custom_domains',
    customDomains: 'custom_domains',
    subdomains: 'subdomains',
    settings: 'settings',
    globalSettings: 'global_settings',
    service_config: 'service_config',
    serviceConfig: 'service_config',
    service_audit_log: 'service_audit_logs',
    serviceAuditLog: 'service_audit_logs',
    prompts: 'prompts',
    customComponents: 'custom_components',
    componentDefaults: 'component_defaults',
    restaurants: 'restaurants',
    menuItems: 'restaurant_menu_items',
    reservations: 'restaurant_reservations',
    marketingOutputs: 'restaurant_marketing_outputs',
    reviewTemplates: 'restaurant_review_templates',
    analyticsEvents: 'restaurant_analytics_events',
    properties: 'properties',
    products: 'store_products',
    categories: 'store_categories',
    orders: 'store_orders',
    reviews: 'store_reviews',
    discounts: 'store_discounts',
    stockNotifications: 'store_stock_notifications',
    wishlists: 'store_wishlists',
    payments: 'accounting_transactions',
    invoices: 'accounting_invoices',
    publicRestaurantMenus: 'restaurants',
    appInfo: 'global_settings',
};

const JSON_FALLBACK_COLUMN: Record<string, string> = {
    projects: 'data',
    custom_domains: 'data',
    subdomains: 'data',
    custom_components: 'data',
    component_defaults: 'data',
    settings: 'config',
    global_settings: 'data',
    service_config: 'config',
    leads: 'custom_data',
    files: 'metadata',
    admin_assets: 'metadata',
    restaurants: 'metadata',
    restaurant_analytics_events: 'metadata',
    properties: 'metadata',
    public_stores: 'data',
    store_products: 'data',
    store_categories: 'data',
    store_orders: 'data',
    store_reviews: 'data',
    store_discounts: 'data',
    store_users: 'metadata',
    store_user_activities: 'metadata',
    email_logs: 'metadata',
    email_campaigns: 'email_document',
    bio_page_links: 'metadata',
    bio_page_events: 'metadata',
    bio_page_qr_codes: 'metadata',
    social_conversations: 'metadata',
    social_messages: 'metadata',
    assistant_memories: 'data',
    assistant_memory_items: 'data',
    assistant_conversations: 'metadata',
    assistant_messages: 'metadata',
    assistant_tasks: 'metadata',
    assistant_actions: 'metadata',
    assistant_runtime_events: 'metadata',
    assistant_context_snapshots: 'snapshot',
    assistant_project_summaries: 'summary',
    assistant_module_summaries: 'summary',
    assistant_user_preferences: 'preferences',
    assistant_admin_events: 'metadata',
    agency_landings: 'data',
};

const FIELD_ALIASES: Record<string, string> = {
    userId: 'user_id',
    ownerId: 'owner_id',
    ownerUserId: 'owner_user_id',
    tenantId: 'tenant_id',
    projectId: 'project_id',
    storeId: 'store_id',
    publicStoreId: 'public_store_id',
    restaurantId: 'restaurant_id',
    leadId: 'lead_id',
    user_id: 'user_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    publishedAt: 'published_at',
    lastUpdated: 'last_updated',
    updatedBy: 'updated_by',
    customDomain: 'custom_domain',
    isPublished: 'is_published',
    photoURL: 'photo_url',
    photoUrl: 'photo_url',
    avatarURL: 'avatar_url',
    avatarUrl: 'avatar_url',
    displayName: 'display_name',
    firstName: 'first_name',
    lastName: 'last_name',
    internalNotes: 'internal_notes',
    acceptsMarketing: 'accepts_marketing',
    preferredLanguage: 'preferred_language',
    totalOrders: 'total_orders',
    totalSpent: 'total_spent',
    averageOrderValue: 'average_order_value',
    lastLoginAt: 'last_login_at',
    lastOrderAt: 'last_order_at',
    previewText: 'preview_text',
    htmlContent: 'html_content',
    emailDocument: 'email_document',
    audienceType: 'audience_type',
    audienceSegmentId: 'audience_segment_id',
    customRecipientEmails: 'custom_recipient_emails',
    createdBy: 'created_by',
    triggerConfig: 'trigger_config',
    templateId: 'template_id',
    delayMinutes: 'delay_minutes',
    staticMembers: 'static_members',
    staticMemberCount: 'static_member_count',
    estimatedCount: 'estimated_count',
    lastCountUpdate: 'last_count_update',
    isDefault: 'is_default',
    generatedByAI: 'generated_by_ai',
    needsReview: 'needs_review',
    userModified: 'user_modified',
    safeToEdit: 'safe_to_edit',
    approvedAt: 'approved_at',
    approvedBy: 'approved_by',
    activatedAt: 'activated_at',
    activatedBy: 'activated_by',
    sendMode: 'send_mode',
    sourceModule: 'source_module',
    sourceComponent: 'source_component',
    sourceEvent: 'source_event',
    sourceEntityType: 'source_entity_type',
    sourceEntityId: 'source_entity_id',
    sourceMap: 'source_map',
    correlationId: 'correlation_id',
    idempotencyKey: 'idempotency_key',
    automationId: 'automation_id',
    automationStepId: 'automation_step_id',
    emailKind: 'email_kind',
    suppressionChecked: 'suppression_checked',
    skippedReason: 'skipped_reason',
    bioPageId: 'bio_page_id',
    blockId: 'block_id',
    linkId: 'link_id',
    orderIndex: 'order_index',
    imageUrl: 'image_url',
    linkType: 'link_type',
    clickTrackingEnabled: 'click_tracking_enabled',
    generatedByAi: 'generated_by_ai',
    lockedFromRegeneration: 'locked_from_regeneration',
    subscribedAt: 'subscribed_at',
};

const SERVER_NOW = Symbol('serverNow');
const UUID_EQUALITY_COLUMNS = new Set([
    'projects.id',
    'projects.user_id',
    'projects.tenant_id',
    'custom_domains.project_id',
    'subdomains.project_id',
    'store_settings.project_id',
    'store_categories.project_id',
    'store_products.project_id',
    'store_users.project_id',
    'store_user_segments.project_id',
    'store_user_activities.project_id',
    'store_orders.project_id',
    'store_reviews.project_id',
    'store_discounts.project_id',
    'store_stock_notifications.project_id',
    'store_wishlists.project_id',
]);

function partsFrom(input: unknown[]): string[] {
    const out: string[] = [];
    for (const item of input) {
        if (!item) continue;
        if (typeof item === 'string') {
            out.push(...item.split('/').filter(Boolean));
        } else if (typeof item === 'object' && Array.isArray((item as DataRef).path)) {
            out.push(...(item as DataRef).path);
        }
    }
    return out;
}

export const db = { provider: 'supabase' };
export const storage = { bucket: 'platform-assets' };

export interface User extends SupabaseUser {
    uid: string;
    displayName?: string;
    photoURL?: string;
    getIdToken: () => Promise<string>;
}

export const auth = {
    get currentUser() {
        return currentCompatUser;
    },
};

let currentCompatUser: any = null;

export function toCompatUser(user: SupabaseUser | null): User | null {
    if (!user) return null;
    return {
        ...user,
        uid: user.id,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || '',
        photoURL: user.user_metadata?.avatar_url || user.user_metadata?.photoURL || '',
        getIdToken: async () => {
            const { data } = await supabase.auth.getSession();
            return data.session?.access_token || '';
        },
    } as User;
}

function toAppRecord(row: AnyRecord | null | undefined): AnyRecord {
    if (!row) return {};
    const merged = { ...(row.data || {}), ...(row.config || {}), ...(row.custom_data || {}), ...(row.metadata || {}), ...row };
    for (const [key, value] of Object.entries(row)) {
        const camel = snakeToCamel(key);
        if (merged[camel] === undefined) merged[camel] = value;
    }
    return merged;
}

function snakeToCamel(value: string): string {
    return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function camelToSnake(value: string): string {
    return FIELD_ALIASES[value] || value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function resolveTableName(collectionName: string): string {
    return COLLECTION_TABLES[collectionName] || collectionName;
}

function resolvePath(path: string[]): ResolvedPath {
    if (!path.length) throw new Error('Invalid empty data path');

    const lastCollectionIndex = path.length % 2 === 0 ? path.length - 2 : path.length - 1;
    const collectionName = path[lastCollectionIndex];
    const table = resolveTableName(collectionName);
    const id = path.length % 2 === 0 ? path[path.length - 1] : undefined;
    const filters: ResolvedPath['filters'] = [];

    for (let i = 0; i < lastCollectionIndex; i += 2) {
        const parentName = path[i];
        const parentId = path[i + 1];
        if (!parentId) continue;
        if (parentName === 'users') filters.push({ field: 'user_id', op: '==', value: parentId });
        if (parentName === 'tenants') filters.push({ field: 'tenant_id', op: '==', value: parentId });
        if (parentName === 'projects') filters.push({ field: 'project_id', op: '==', value: parentId });
        if (parentName === 'restaurants') filters.push({ field: 'restaurant_id', op: '==', value: parentId });
        if (parentName === 'storeUsers') filters.push({ field: 'project_id', op: '==', value: parentId });
        if (parentName === 'leads') filters.push({ field: 'lead_id', op: '==', value: parentId });
    }

    if (table === 'tenant_members' && path[0] === 'tenants' && path[1]) {
        filters.push({ field: 'tenant_id', op: '==', value: path[1] });
    }

    return {
        table,
        id,
        filters,
        parent: path.length >= 2 ? { kind: path[path.length - 2], id: path[path.length - 1] } : undefined,
    };
}

function applyEqId(query: any, resolved: ResolvedPath) {
    if (!resolved.id) return query;
    if (resolved.table === 'custom_domains') return query.eq('domain_name', resolved.id);
    return applyEqComparison(query, resolved.table, 'id', resolved.id);
}

function isInvalidUuidComparison(table: string, column: string, value: any): boolean {
    return typeof value === 'string'
        && value.trim().length > 0
        && UUID_EQUALITY_COLUMNS.has(`${table}.${column}`)
        && !isSupabaseUuid(value);
}

function applyEqComparison(query: any, table: string, column: string, value: any) {
    const normalizedValue = normalizeValue(value);
    if (isInvalidUuidComparison(table, column, normalizedValue)) return query.is(column, null);
    return query.eq(column, normalizedValue);
}

function applyInComparison(query: any, table: string, column: string, value: any) {
    const normalizedValue = normalizeValue(value);
    const values = Array.isArray(normalizedValue) ? normalizedValue : [normalizedValue];

    if (UUID_EQUALITY_COLUMNS.has(`${table}.${column}`)) {
        const validValues = values.filter(isSupabaseUuid);
        return validValues.length > 0 ? query.in(column, validValues) : query.is(column, null);
    }

    return query.in(column, values);
}

function applyFilter(query: any, table: string, field: string, op: Operator, value: any) {
    const column = camelToSnake(field);
    const normalizedValue = normalizeValue(value);
    switch (op) {
        case '==':
            return applyEqComparison(query, table, column, normalizedValue);
        case '!=':
            return query.neq(column, normalizedValue);
        case '<':
            return query.lt(column, normalizedValue);
        case '<=':
            return query.lte(column, normalizedValue);
        case '>':
            return query.gt(column, normalizedValue);
        case '>=':
            return query.gte(column, normalizedValue);
        case 'in':
            return applyInComparison(query, table, column, normalizedValue);
        case 'array-contains':
            return query.contains(column, [normalizedValue]);
        default:
            return query;
    }
}

function buildSelect(ref: DataRef | DataQuery) {
    const resolved = resolvePath(ref.path);
    let q = supabase.from(resolved.table).select('*');
    q = applyEqId(q, resolved);
    for (const filter of resolved.filters) q = applyFilter(q, resolved.table, filter.field, filter.op, filter.value);
    for (const constraint of ((ref as DataQuery).constraints || [])) {
        if (constraint.type === 'where') q = applyFilter(q, resolved.table, constraint.field, constraint.op, constraint.value);
        if (constraint.type === 'order') q = q.order(camelToSnake(constraint.field), { ascending: constraint.direction !== 'desc' });
        if (constraint.type === 'limit') q = q.limit(constraint.count);
    }
    return { resolved, query: q };
}

function buildMutation(table: string, ref: DataRef) {
    const resolved = resolvePath(ref.path);
    let q = supabase.from(table);
    return { resolved, tableQuery: q };
}

function applyMutationFilters(query: any, resolved: ResolvedPath) {
    let q = applyEqId(query, resolved);
    for (const filter of resolved.filters) q = applyFilter(q, resolved.table, filter.field, filter.op, filter.value);
    return q;
}

function isServerNow(value: any): boolean {
    return value === SERVER_NOW || value?.__op === 'now';
}

function normalizeValue(value: any): any {
    if (isServerNow(value)) return new Date().toISOString();
    if (value?.__op === 'inc') return value;
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(normalizeValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
    }
    return value;
}

function normalizeWrite(table: string, data: AnyRecord, existing: AnyRecord = {}): AnyRecord {
    const normalizedRaw = normalizeValue(data);
    const known = new Set(KNOWN_COLUMNS[table] || []);
    const fallbackColumn = JSON_FALLBACK_COLUMN[table];
    const out: AnyRecord = {};
    const extra: AnyRecord = {};

    for (const [key, value] of Object.entries(normalizedRaw)) {
        const column = camelToSnake(key);
        if (known.has(column)) out[column] = value;
        else extra[key] = value;
    }

    if (fallbackColumn && Object.keys(extra).length > 0) {
        const previous = existing[fallbackColumn] && typeof existing[fallbackColumn] === 'object' ? existing[fallbackColumn] : {};
        out[fallbackColumn] = { ...previous, ...extra };
    }

    if (EMAIL_TABLES.has(table)) {
        const projectId = out.project_id || out.store_id;
        if (projectId) {
            if (known.has('project_id') && out.project_id === undefined) out.project_id = projectId;
            if (known.has('store_id') && out.store_id === undefined) out.store_id = projectId;
        }
        if (known.has('created_by') && out.created_by === undefined && out.user_id) {
            out.created_by = out.user_id;
        }
    }

    if (known.has('updated_at') && out.updated_at === undefined) out.updated_at = new Date().toISOString();
    if (known.has('created_at') && out.created_at === undefined && !existing.created_at) out.created_at = new Date().toISOString();

    return Object.keys(out).length ? out : normalizedRaw;
}

function generatedId() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function collection(...args: any[]): DataRef {
    const path = partsFrom(args);
    return { kind: 'collection', path, id: path[path.length - 1] || '' };
}

export function doc(...args: any[]): DataRef {
    const path = partsFrom(args);
    if (path.length % 2 === 1) path.push(generatedId());
    return { kind: 'document', path, id: path[path.length - 1] || '' };
}

export function where(field: string, op: Operator, value: any): QueryConstraint {
    return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: Direction = 'asc'): QueryConstraint {
    return { type: 'order', field, direction };
}

export function limit(count: number): QueryConstraint {
    return { type: 'limit', count };
}

export function query(ref: DataRef, ...constraints: QueryConstraint[]): DataQuery {
    return { ...ref, constraints };
}

export class Timestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds = 0) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }

    static now() {
        return Timestamp.fromDate(new Date());
    }

    static fromDate(date: Date) {
        return new Timestamp(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1_000_000);
    }

    toDate() {
        return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000));
    }
}

export function serverTimestamp() {
    return { __op: 'now', value: SERVER_NOW };
}

export function increment(by: number) {
    return { __op: 'inc', by };
}

export async function getDoc(ref: DataRef) {
    const { query: q } = buildSelect(ref);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return {
        id: ref.id || ref.path[ref.path.length - 1],
        ref,
        exists: () => Boolean(data),
        data: () => toAppRecord(data),
    };
}

export async function getDocs(ref: DataRef | DataQuery) {
    const { resolved, query: q } = buildSelect(ref);
    const { data, error } = await q;
    if (error) throw error;
    const docs = (data || []).map((row: AnyRecord) => {
        const id = row.id || row.domain_name || row.key;
        const rowRef = doc(db, resolved.table, id);
        return {
            id,
            ref: rowRef,
            data: () => toAppRecord(row),
        };
    });
    return {
        docs,
        empty: docs.length === 0,
        size: docs.length,
        forEach: (callback: (doc: QueryDocumentSnapshot) => void) => docs.forEach(callback),
    };
}

export async function addDoc(ref: DataRef, data: AnyRecord) {
    const resolved = resolvePath(ref.path);
    const parentDefaults = Object.fromEntries(resolved.filters.filter(f => f.op === '==').map(f => [f.field, f.value]));
    const payload = normalizeWrite(resolved.table, { ...parentDefaults, ...data });
    const { data: inserted, error } = await supabase.from(resolved.table).insert(payload).select('*').single();
    if (error) throw error;
    return doc(db, resolved.table, inserted.id || inserted.domain_name || inserted.key);
}

export async function setDoc(ref: DataRef, data: AnyRecord, options?: { merge?: boolean }) {
    const resolved = resolvePath(ref.path);
    const existing = options?.merge && resolved.id ? (await getDoc(ref)).data() : {};
    const payload = normalizeWrite(resolved.table, data, existing);
    if (resolved.id) {
        if (resolved.table === 'custom_domains') payload.domain_name = resolved.id;
        else payload.id = resolved.id;
    }
    const { error } = await supabase.from(resolved.table).upsert(payload);
    if (error) throw error;
}

export async function updateDoc(ref: DataRef, data: AnyRecord) {
    const resolved = resolvePath(ref.path);
    let existing: AnyRecord = {};
    if (Object.values(data).some((value) => value?.__op === 'inc') || JSON_FALLBACK_COLUMN[resolved.table]) {
        existing = (await getDoc(ref)).data();
    }
    const expanded: AnyRecord = {};
    for (const [key, value] of Object.entries(data)) {
        if (value?.__op === 'inc') {
            expanded[key] = Number(existing[key] || 0) + Number(value.by || 0);
        } else {
            expanded[key] = value;
        }
    }
    const payload = normalizeWrite(resolved.table, expanded, existing);
    const { tableQuery } = buildMutation(resolved.table, ref);
    const { error } = await applyMutationFilters(tableQuery.update(payload), resolved);
    if (error) throw error;
}

export async function deleteDoc(ref: DataRef) {
    const resolved = resolvePath(ref.path);
    let q = supabase.from(resolved.table).delete();
    q = applyEqId(q, resolved);
    for (const filter of resolved.filters) q = applyFilter(q, resolved.table, filter.field, filter.op, filter.value);
    const { error } = await q;
    if (error) throw error;
}

export function onSnapshot(ref: DataRef | DataQuery, onNext: (snapshot: any) => void, onError?: (error: any) => void) {
    let active = true;
    const resolved = resolvePath(ref.path);
    const load = async () => {
        try {
            const snapshot = ref.kind === 'document' ? await getDoc(ref) : await getDocs(ref);
            if (active) onNext(snapshot);
        } catch (error) {
            if (active) onError?.(error);
        }
    };
    void load();
    const channel = supabase
        .channel(`compat:${resolved.table}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: resolved.table }, () => void load())
        .subscribe();
    return () => {
        active = false;
        void supabase.removeChannel(channel);
    };
}

export const writeBatch = (..._args: unknown[]) => {
    const operations: Array<() => Promise<void>> = [];
    return {
        set: (ref: DataRef, data: AnyRecord, options?: { merge?: boolean }) => operations.push(() => setDoc(ref, data, options)),
        update: (ref: DataRef, data: AnyRecord) => operations.push(() => updateDoc(ref, data)),
        delete: (ref: DataRef) => operations.push(() => deleteDoc(ref)),
        commit: async () => {
            for (const operation of operations) await operation();
        },
    };
};

export function startAfter(_value: any): QueryConstraint {
    return { type: 'limit', count: Number.MAX_SAFE_INTEGER };
}

export function endBefore(_value: any): QueryConstraint {
    return { type: 'limit', count: Number.MAX_SAFE_INTEGER };
}

export const ref = (_storage: unknown, path: string) => ({ bucket: 'platform-assets', path });

export async function uploadBytes(storageRef: { bucket: string; path: string }, file: Blob | ArrayBuffer | Uint8Array) {
    if (storageRef.bucket === 'platform-assets') {
        await uploadPlatformAsset(storageRef.path, file, { upsert: true });
        return { ref: storageRef };
    }

    const { error } = await supabase.storage.from(storageRef.bucket).upload(storageRef.path, file, { upsert: true });
    if (error) throw error;
    return { ref: storageRef };
}

export async function getDownloadURL(storageRef: { bucket: string; path: string }) {
    const { data } = supabase.storage.from(storageRef.bucket).getPublicUrl(storageRef.path);
    return data.publicUrl;
}

export async function deleteObject(storageRef: { bucket: string; path: string }) {
    const { error } = await supabase.storage.from(storageRef.bucket).remove([storageRef.path]);
    if (error) throw error;
}

export async function listAll(_storageRef: { bucket: string; path: string }) {
    return { items: [], prefixes: [] };
}

export const getStorageInstance = () => storage;

export function getAuth() {
    return auth;
}

export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw Object.assign(error, { code: `auth/${error.status || 'invalid-credential'}` });
    currentCompatUser = toCompatUser(data.user);
    return { user: currentCompatUser };
}

export async function createUserWithEmailAndPassword(_auth: unknown, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw Object.assign(error, { code: `auth/${error.status || 'signup-failed'}` });
    currentCompatUser = toCompatUser(data.user);
    return { user: currentCompatUser };
}

export async function sendPasswordResetEmail(_auth: unknown, email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined,
    });
    if (error) throw Object.assign(error, { code: `auth/${error.status || 'reset-failed'}` });
}

export async function signOut(_auth?: unknown) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentCompatUser = null;
}

export function onAuthStateChanged(_auth: unknown, callback: (user: any) => void) {
    supabase.auth.getSession().then(({ data }) => {
        currentCompatUser = toCompatUser(data.session?.user || null);
        callback(currentCompatUser);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        currentCompatUser = toCompatUser(session?.user || null);
        callback(currentCompatUser);
    });
    return () => subscription.subscription.unsubscribe();
}

export const EmailAuthProvider = {
    credential: (email: string, password: string) => ({ email, password }),
};

export class GoogleAuthProvider {}

export async function reauthenticateWithCredential(user: any, credential: { email: string; password: string }) {
    const email = credential.email || user?.email;
    if (!email) throw Object.assign(new Error('Missing email'), { code: 'auth/invalid-credential' });
    return signInWithEmailAndPassword(auth, email, credential.password);
}

export async function deleteUser(user: any) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    if (currentCompatUser?.id === user?.id) currentCompatUser = null;
}

export async function updateProfile(user: any, updates: { displayName?: string; photoURL?: string }) {
    const { data, error } = await supabase.auth.updateUser({
        data: {
            ...user?.user_metadata,
            full_name: updates.displayName,
            avatar_url: updates.photoURL,
            photoURL: updates.photoURL,
        },
    });
    if (error) throw error;
    currentCompatUser = toCompatUser(data.user);
}

export async function sendEmailVerification() {
    return undefined;
}

export async function signInWithPopup() {
    const { signInWithGoogle } = await import('./googleAuth');
    return signInWithGoogle();
}

export function getAnalytics(_app?: unknown) {
    return { provider: 'supabase-era-noop' };
}

export function logEvent(_analytics: unknown, _eventName: string, _params?: AnyRecord) {
    return undefined;
}

export function setUserProperties(_analytics: unknown, _properties?: AnyRecord) {
    return undefined;
}

export const app = { provider: 'supabase' };
export const CACHE_SIZE_UNLIMITED = -1;
