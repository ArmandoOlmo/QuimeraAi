/**
 * Email Service
 * Servicio principal para envío de emails usando Resend
 */

import { Resend } from 'resend';
import { RESEND_CONFIG } from '../config';

// =============================================================================
// TYPES
// =============================================================================

export interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
    tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
}

export interface EmailConfig {
    apiKey: string;
    defaultFrom: string;
    defaultReplyTo?: string;
}

// =============================================================================
// EMAIL CLIENT
// =============================================================================

let resendClient: Resend | null = null;

/**
 * Get or create Resend client instance
 */
const getResendClient = (apiKey: string): Resend => {
    if (!resendClient) {
        resendClient = new Resend(apiKey);
    }
    return resendClient;
};

/**
 * Get API key from centralized config
 */
export const getEmailApiKey = (): string | null => {
    const apiKey = RESEND_CONFIG.apiKey;
    if (!apiKey) {
        console.error('[EmailService] RESEND_API_KEY not configured in .env');
        return null;
    }
    return apiKey;
};

// =============================================================================
// SEND EMAIL
// =============================================================================

/**
 * Send an email using Resend
 */
export const sendEmail = async (
    params: SendEmailParams,
    config?: Partial<EmailConfig>
): Promise<SendEmailResult> => {
    try {
        // Get API key
        const apiKey = config?.apiKey || getEmailApiKey();
        
        if (!apiKey) {
            console.error('Email API key not configured');
            return {
                success: false,
                error: 'Email API key not configured',
                errorCode: 'NO_API_KEY',
            };
        }

        const resend = getResendClient(apiKey);

        // Prepare recipients
        const recipients = Array.isArray(params.to) ? params.to : [params.to];

        // Send email
        const { data, error } = await resend.emails.send({
            from: params.from || config?.defaultFrom || 'Quimera <noreply@quimera.ai>',
            to: recipients,
            subject: params.subject,
            html: params.html,
            reply_to: params.replyTo || config?.defaultReplyTo,
            tags: params.tags,
        });

        if (error) {
            console.error('Resend error:', error);
            return {
                success: false,
                error: error.message,
                errorCode: error.name,
            };
        }

        console.log(`Email sent successfully. Message ID: ${data?.id}`);
        return {
            success: true,
            messageId: data?.id,
        };

    } catch (err: any) {
        console.error('Email service error:', err);
        return {
            success: false,
            error: err.message || 'Unknown error',
            errorCode: 'SEND_ERROR',
        };
    }
};

/**
 * Send email to multiple recipients (batch)
 */
export const sendBatchEmails = async (
    emails: SendEmailParams[],
    config?: Partial<EmailConfig>
): Promise<SendEmailResult[]> => {
    const results: SendEmailResult[] = [];

    // Send emails in batches of 10 to avoid rate limits
    const batchSize = 10;
    
    for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
            batch.map(email => sendEmail(email, config))
        );
        
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < emails.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
};

// =============================================================================
// TEMPLATE RENDERING
// =============================================================================

/**
 * Replace template variables with actual values
 * Supports {{variable}} syntax
 */
export const renderTemplate = (
    template: string,
    variables: Record<string, any>
): string => {
    let rendered = template;

    // Replace simple variables {{varName}}
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        rendered = rendered.replace(regex, value?.toString() || '');
    });

    // Handle conditionals {{#if condition}}...{{/if}}
    rendered = processConditionals(rendered, variables);

    // Handle loops {{#each items}}...{{/each}}
    rendered = processLoops(rendered, variables);

    return rendered;
};

/**
 * Process conditional blocks in template
 */
const processConditionals = (template: string, variables: Record<string, any>): string => {
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    return template.replace(conditionalRegex, (match, condition, content) => {
        const value = variables[condition];
        if (value && value !== '' && value !== false && value !== 0) {
            return content;
        }
        return '';
    });
};

/**
 * Process loop blocks in template
 */
const processLoops = (template: string, variables: Record<string, any>): string => {
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    return template.replace(loopRegex, (match, arrayName, content) => {
        const array = variables[arrayName];
        if (!Array.isArray(array)) return '';
        
        return array.map((item, index) => {
            let itemContent = content;
            
            // Replace {{this.property}} with item properties
            Object.entries(item).forEach(([key, value]) => {
                const itemRegex = new RegExp(`{{\\s*this\\.${key}\\s*}}`, 'g');
                itemContent = itemContent.replace(itemRegex, value?.toString() || '');
            });
            
            // Replace {{@index}} with current index
            itemContent = itemContent.replace(/{{@index}}/g, index.toString());
            
            // Access parent variables with {{../varName}}
            Object.entries(variables).forEach(([key, value]) => {
                if (typeof value !== 'object') {
                    const parentRegex = new RegExp(`{{\\s*\\.\\./${key}\\s*}}`, 'g');
                    itemContent = itemContent.replace(parentRegex, value?.toString() || '');
                }
            });
            
            return itemContent;
        }).join('');
    });
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate email address format
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Filter and validate email list
 */
export const filterValidEmails = (emails: string[]): string[] => {
    return emails.filter(email => isValidEmail(email));
};

// =============================================================================
// UTILS
// =============================================================================

/**
 * Format currency for email templates
 */
export const formatCurrency = (
    amount: number,
    currency: string = 'USD',
    symbol: string = '$'
): string => {
    return `${symbol}${amount.toFixed(2)}`;
};

/**
 * Format date for email templates
 */
export const formatDate = (
    date: Date | { seconds: number },
    locale: string = 'es-ES'
): string => {
    const d = date instanceof Date 
        ? date 
        : new Date((date as any).seconds * 1000);
    
    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

/**
 * Format datetime for email templates
 */
export const formatDateTime = (
    date: Date | { seconds: number },
    locale: string = 'es-ES'
): string => {
    const d = date instanceof Date 
        ? date 
        : new Date((date as any).seconds * 1000);
    
    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};











