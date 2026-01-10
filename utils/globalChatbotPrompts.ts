/**
 * Global Chatbot Prompts Utility
 * 
 * This utility fetches and caches global chatbot prompts from Firestore.
 * Used by ChatCore.tsx to apply admin-configured prompts to all project chatbots.
 */

import { db, doc, getDoc } from '../firebase';
import { GlobalChatbotPrompts } from '../types';

// Default prompts (fallback when no global config exists)
const DEFAULT_PROMPTS: GlobalChatbotPrompts = {
    identityTemplate: `You are {{agentName}}, a {{tone}} AI assistant for {{businessName}} ({{industry}}).`,

    coreInstructions: `INSTRUCTIONS:
1. Always respond in the SAME language the user is using
2. When you receive [SYSTEM CONTEXT] in a message, use that information to answer about what the user is viewing
3. Be {{tone}}, helpful, and conversational
4. When asked "what am I seeing?" or "what's this section?", describe the specific content from the SYSTEM CONTEXT
5. Available sections: {{visibleSections}}`,

    formattingGuidelines: `FORMATTING:
- Use **bold** for emphasis on important points
- Use bullet points (- or *) for lists
- Use numbered lists (1. 2. 3.) when order matters
- Keep paragraphs short and readable
- Use line breaks between different topics
- Structure your responses clearly with headings if needed (## Heading)`,

    appointmentInstructions: `=== APPOINTMENT SCHEDULING (VERY IMPORTANT) ===
You CAN and SHOULD help users schedule appointments/meetings/citas.

When a user mentions wanting to:
- Schedule a meeting/appointment/cita
- Book a consultation/demo/call
- Set up a time to talk
- Agendar una cita/reunión

STEP 1: Ask for the following information:
- Their name (nombre)
- Their email (correo)
- Preferred date (fecha preferida)
- Preferred time (hora preferida)
- Type of meeting (tipo de reunión)

STEP 2: Once you have ALL the required info (name, email, date, time), you MUST include this EXACT block in your response:

[APPOINTMENT_REQUEST]
title: Cita con [client name]
date: YYYY-MM-DD
time: HH:MM
duration: 60
type: consultation
name: [Client name]
email: [Client email]
phone: [Client phone if provided]
notes: [Any notes about the appointment]
[/APPOINTMENT_REQUEST]

STEP 3: After the block, confirm: "¡Perfecto! Tu cita ha sido agendada para [date] a las [time]."

IMPORTANT: Always include the [APPOINTMENT_REQUEST] block when you have all required info.`,

    ecommerceInstructions: `=== ECOMMERCE CAPABILITIES ===
This business has an online store. You can help customers with:

ORDER INQUIRIES:
- When a customer asks about their order, ask for their order number OR email
- Once you have the information, provide: current status, tracking number (if available), estimated delivery
- If there are issues, offer to escalate to human support

PRODUCT INFORMATION:
- Help customers find products by name or description
- Provide pricing and availability information
- Explain product features and specifications

SHIPPING & RETURNS:
- Explain shipping options and delivery times
- Inform about return policies and processes
- Help with questions about exchanges

IMPORTANT:
- Always be helpful and transparent about order status
- If you don't have real-time data, acknowledge it and offer alternatives
- For complex issues (refunds, cancellations), recommend contacting support directly`,

    leadCaptureInstructions: `=== LEAD CAPTURE ===
When a user shows buying intent (asking about prices, availability, demos, etc.), try to:
1. Gather their name and email naturally through conversation
2. Be helpful first, don't rush to capture information
3. If they seem ready to buy or schedule, guide them through the process`,
};

// Cache for global prompts
let cachedPrompts: GlobalChatbotPrompts | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch global chatbot prompts with caching
 */
export async function getGlobalChatbotPrompts(): Promise<GlobalChatbotPrompts> {
    const now = Date.now();

    // Return cached version if still valid
    if (cachedPrompts && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedPrompts;
    }

    try {
        const docRef = doc(db, 'globalSettings', 'chatbotPrompts');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as GlobalChatbotPrompts;
            cachedPrompts = { ...DEFAULT_PROMPTS, ...data };
            cacheTimestamp = now;
            console.log('[GlobalChatbotPrompts] Loaded from Firestore');
            return cachedPrompts;
        }
    } catch (error) {
        console.warn('[GlobalChatbotPrompts] Error fetching, using defaults:', error);
    }

    // Return defaults if fetch fails or document doesn't exist
    return DEFAULT_PROMPTS;
}

/**
 * Get default prompts (no network call)
 */
export function getDefaultPrompts(): GlobalChatbotPrompts {
    return DEFAULT_PROMPTS;
}

/**
 * Apply template substitutions to a prompt string
 */
export function applyPromptTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}

/**
 * Invalidate the cache (call after saving new prompts)
 */
export function invalidateGlobalPromptsCache(): void {
    cachedPrompts = null;
    cacheTimestamp = 0;
}
