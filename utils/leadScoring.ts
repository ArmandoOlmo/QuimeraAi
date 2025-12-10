import { Lead, LeadStatus } from '../types';

/**
 * Lead Scoring System
 * Calculates a score from 0-100 based on lead quality indicators
 */

export interface LeadScoringFactors {
    hasEmail: boolean;
    hasPhone: boolean;
    hasName: boolean;
    hasCompany: boolean;
    messageLength: number;
    conversationLength: number;
    hasHighIntentKeywords: boolean;
    source: Lead['source'];
    tags: string[];
}

export const HIGH_INTENT_KEYWORDS = [
    // Spanish
    'precio', 'costo', 'cotización', 'comprar', 'contratar', 'disponibilidad',
    'agendar', 'reunión', 'demostración', 'demo', 'presupuesto', 'invertir',
    'adquirir', 'necesito', 'urgente', 'inmediato', 'cuando', 'cuanto cuesta',
    
    // English
    'price', 'buy', 'quote', 'purchase', 'order', 'interested', 'schedule',
    'meeting', 'demo', 'budget', 'invest', 'acquire', 'need', 'urgent',
    'immediate', 'when', 'how much'
];

export const detectHighIntent = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return HIGH_INTENT_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

export const calculateLeadScore = (factors: Partial<LeadScoringFactors>): number => {
    let score = 0;
    
    // Contact Information (max 45 points)
    if (factors.hasEmail) score += 20;
    if (factors.hasPhone) score += 15;
    if (factors.hasName) score += 10;
    
    // Company Info (max 10 points)
    if (factors.hasCompany) score += 10;
    
    // Engagement (max 25 points)
    if (factors.conversationLength) {
        score += Math.min(factors.conversationLength * 2, 15);
    }
    if (factors.messageLength && factors.messageLength > 50) {
        score += 5;
    }
    if (factors.messageLength && factors.messageLength > 150) {
        score += 5;
    }
    
    // Intent (max 20 points)
    if (factors.hasHighIntentKeywords) {
        score += 20;
    }
    
    // Source Quality Bonus (max 10 points)
    const sourceScores: Record<Lead['source'], number> = {
        'contact-form': 10,
        'chatbot-widget': 8,
        'referral': 10,
        'linkedin': 7,
        'chatbot': 8,
        'form': 10,
        'manual': 5,
        'cold_call': 3,
        'voice-call': 9,
        'quimera-chat': 8
    };
    
    if (factors.source) {
        score += sourceScores[factors.source] || 5;
    }
    
    // Tags bonus (max 5 points)
    if (factors.tags) {
        const valuableTags = ['high-intent', 'has-company', 'repeat-visitor', 'engaged'];
        const matchingTags = factors.tags.filter(tag => valuableTags.includes(tag));
        score += Math.min(matchingTags.length * 2, 5);
    }
    
    return Math.min(Math.round(score), 100);
};

export const getLeadScoreLabel = (score: number): { label: string; color: string; emoji: string } => {
    if (score >= 80) return { label: 'Hot Lead', color: 'bg-red-500', emoji: '🔥' };
    if (score >= 60) return { label: 'Warm Lead', color: 'bg-orange-500', emoji: '🌟' };
    if (score >= 40) return { label: 'Cool Lead', color: 'bg-yellow-500', emoji: '💡' };
    return { label: 'Cold Lead', color: 'bg-blue-500', emoji: '❄️' };
};

export const getSourceConfig = (source: Lead['source']) => {
    const configs: Record<Lead['source'], { icon: string; color: string; label: string }> = {
        'chatbot-widget': { icon: '💬', color: 'bg-purple-500', label: 'Chat Widget' },
        'contact-form': { icon: '📝', color: 'bg-blue-500', label: 'Formulario' },
        'chatbot': { icon: '🤖', color: 'bg-purple-600', label: 'Chatbot' },
        'form': { icon: '📋', color: 'bg-blue-600', label: 'Form' },
        'voice-call': { icon: '📞', color: 'bg-green-500', label: 'Llamada' },
        'referral': { icon: '🤝', color: 'bg-indigo-500', label: 'Referido' },
        'linkedin': { icon: '💼', color: 'bg-blue-700', label: 'LinkedIn' },
        'manual': { icon: '✍️', color: 'bg-gray-500', label: 'Manual' },
        'cold_call': { icon: '☎️', color: 'bg-gray-600', label: 'Cold Call' },
        'quimera-chat': { icon: '🤖', color: 'bg-indigo-600', label: 'Quimera Chat' }
    };
    
    return configs[source] || { icon: '❓', color: 'bg-gray-500', label: 'Otro' };
};

export const recommendNextAction = (lead: Lead): string => {
    const score = lead.leadScore || lead.aiScore || 0;
    const status = lead.status;
    
    if (score >= 80 && status === 'new') {
        return '🚨 ¡Contactar URGENTE! Lead de alta calidad';
    }
    
    if (score >= 60 && status === 'new') {
        return '📞 Llamar en las próximas 24 horas';
    }
    
    if (score >= 40 && status === 'contacted') {
        return '📧 Enviar seguimiento con información adicional';
    }
    
    if (status === 'qualified') {
        return '💼 Agendar reunión de negocios';
    }
    
    if (status === 'negotiation') {
        return '📄 Preparar propuesta formal';
    }
    
    return '📋 Agregar a campaña de nurturing';
};

export const calculateConversionProbability = (lead: Lead): number => {
    let probability = 0;
    
    // Base score contribution
    const score = lead.leadScore || lead.aiScore || 0;
    probability += (score / 100) * 40; // Max 40% from score
    
    // Status contribution
    const statusProbability: Record<LeadStatus, number> = {
        'new': 10,
        'contacted': 20,
        'qualified': 40,
        'negotiation': 70,
        'won': 100,
        'lost': 0
    };
    probability += statusProbability[lead.status] * 0.3; // Max 30% from status
    
    // Engagement contribution
    if (lead.conversationTranscript && lead.conversationTranscript.length > 500) {
        probability += 10;
    }
    
    // Source contribution
    const sourceBonus: Record<Lead['source'], number> = {
        'referral': 10,
        'contact-form': 8,
        'chatbot-widget': 7,
        'chatbot': 7,
        'form': 8,
        'linkedin': 6,
        'voice-call': 9,
        'manual': 5,
        'cold_call': 3,
        'quimera-chat': 8
    };
    probability += sourceBonus[lead.source] || 5;
    
    // Time factor (leads get colder over time)
    const daysSinceCreation = (Date.now() / 1000 - lead.createdAt.seconds) / 86400;
    if (daysSinceCreation > 7 && lead.status === 'new') {
        probability -= 10;
    }
    
    return Math.max(0, Math.min(100, Math.round(probability)));
};

export const enrichLeadData = (lead: Partial<Lead>): Partial<Lead> => {
    const enriched = { ...lead };
    
    // Calculate score if not present
    if (!enriched.leadScore) {
        enriched.leadScore = calculateLeadScore({
            hasEmail: !!enriched.email,
            hasPhone: !!enriched.phone,
            hasName: !!enriched.name,
            hasCompany: !!enriched.company,
            messageLength: enriched.notes?.length || 0,
            conversationLength: enriched.conversationTranscript ? 
                enriched.conversationTranscript.split('\n').length : 0,
            hasHighIntentKeywords: detectHighIntent(
                `${enriched.notes || ''} ${enriched.conversationTranscript || ''}`
            ),
            source: enriched.source!,
            tags: enriched.tags || []
        });
    }
    
    // Add recommended action
    if (!enriched.recommendedAction && enriched.id) {
        enriched.recommendedAction = recommendNextAction(enriched as Lead);
    }
    
    // Calculate probability
    if (!enriched.probability && enriched.id) {
        enriched.probability = calculateConversionProbability(enriched as Lead);
    }
    
    return enriched;
};

