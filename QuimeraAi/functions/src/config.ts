/**
 * Centralized Configuration
 * ALL API keys and secrets should be accessed through this file
 * 
 * IMPORTANT: All values come from process.env (defined in .env file)
 * The .env file is in .gitignore and NEVER committed to version control
 */

// =============================================================================
// STRIPE (Payments)
// =============================================================================
export const STRIPE_CONFIG = {
    get secretKey(): string {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            console.error('[Config] STRIPE_SECRET_KEY not configured');
        }
        return key || '';
    },
    get webhookSecret(): string {
        const key = process.env.STRIPE_WEBHOOK_SECRET;
        if (!key) {
            console.error('[Config] STRIPE_WEBHOOK_SECRET not configured');
        }
        return key || '';
    },
    get connectWebhookSecret(): string {
        return process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '';
    },
};

// =============================================================================
// RESEND (Email)
// =============================================================================
export const RESEND_CONFIG = {
    get apiKey(): string {
        const key = process.env.RESEND_API_KEY;
        if (!key) {
            console.error('[Config] RESEND_API_KEY not configured');
        }
        return key || '';
    },
    defaultFrom: 'Quimera AI <noreply@quimera.ai>',
    supportEmail: 'soporte@quimera.ai',
};

// =============================================================================
// GEMINI (AI)
// =============================================================================
export const GEMINI_CONFIG = {
    get apiKey(): string {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            console.error('[Config] GEMINI_API_KEY not configured');
        }
        return key || '';
    },
};

// =============================================================================
// CLOUDFLARE (DNS & Workers)
// =============================================================================
export const CLOUDFLARE_CONFIG = {
    get apiToken(): string {
        return process.env.CLOUDFLARE_API_TOKEN || '';
    },
    get accountId(): string {
        return process.env.CLOUDFLARE_ACCOUNT_ID || '';
    },
    get globalApiKey(): string {
        return process.env.CLOUDFLARE_GLOBAL_API_KEY || '';
    },
    get email(): string {
        return process.env.CLOUDFLARE_EMAIL || '';
    },
    get workersToken(): string {
        return process.env.CLOUDFLARE_WORKERS_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';
    },
    get zoneId(): string {
        return process.env.CLOUDFLARE_ZONE_ID || '';
    },
};

// =============================================================================
// NAME.COM (Domain Registration)
// =============================================================================
export const NAMECOM_CONFIG = {
    get username(): string {
        return process.env.NAMECOM_USERNAME || '';
    },
    get token(): string {
        return process.env.NAMECOM_TOKEN || '';
    },
    get environment(): 'production' | 'sandbox' {
        return (process.env.NAMECOM_ENVIRONMENT as 'production' | 'sandbox') || 'production';
    },
};

// =============================================================================
// META (Facebook, Instagram, WhatsApp)
// =============================================================================
export const META_CONFIG = {
    get appId(): string {
        return process.env.META_APP_ID || '';
    },
    get appSecret(): string {
        return process.env.META_APP_SECRET || '';
    },
    get redirectUri(): string {
        return process.env.META_REDIRECT_URI || 'https://us-central1-quimeraai.cloudfunctions.net/metaOAuth-callback';
    },
    get verifyToken(): string {
        return process.env.META_VERIFY_TOKEN || 'quimera_verify_token_2024';
    },
};

// =============================================================================
// ELEVENLABS (Voice AI - Outbound Calls)
// =============================================================================
export const ELEVENLABS_CONFIG = {
    get apiKey(): string {
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) {
            console.error('[Config] ELEVENLABS_API_KEY not configured');
        }
        return key || '';
    },
    get agentId(): string {
        return process.env.ELEVENLABS_AGENT_ID || '';
    },
    get phoneNumberId(): string {
        return process.env.ELEVENLABS_PHONE_NUMBER_ID || '';
    },
};

// =============================================================================
// OUTBOUND CALL AUTH
// =============================================================================
export const OUTBOUND_CALL_CONFIG = {
    get bearerToken(): string {
        const token = process.env.OUTBOUND_CALL_BEARER_TOKEN;
        if (!token) {
            console.error('[Config] OUTBOUND_CALL_BEARER_TOKEN not configured');
        }
        return token || '';
    },
};

// =============================================================================
// APP CONFIG
// =============================================================================
export const APP_CONFIG = {
    baseUrl: process.env.APP_BASE_URL || 'https://quimera.ai',
    dashboardUrl: process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/dashboard` : 'https://quimera.ai/dashboard',
};

// =============================================================================
// VALIDATION HELPER
// =============================================================================
export function validateRequiredConfig(): { valid: boolean; missing: string[] } {
    const required = [
        { name: 'STRIPE_SECRET_KEY', value: STRIPE_CONFIG.secretKey },
        { name: 'STRIPE_WEBHOOK_SECRET', value: STRIPE_CONFIG.webhookSecret },
        { name: 'GEMINI_API_KEY', value: GEMINI_CONFIG.apiKey },
    ];

    const missing = required.filter(r => !r.value).map(r => r.name);

    return {
        valid: missing.length === 0,
        missing,
    };
}




