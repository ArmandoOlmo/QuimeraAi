/**
 * AIPreparationPanel
 * Panel de preparación con IA para reuniones
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Sparkles,
    Loader2,
    RefreshCw,
    Copy,
    Check,
    Lightbulb,
    MessageSquare,
    Target,
    AlertTriangle,
    Zap,
    Clock,
    TrendingUp,
    FileText,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { Appointment, AppointmentAiInsights, Lead } from '../../../../types';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useAI } from '../../../../contexts/ai';
import { useProject } from '../../../../contexts/project';
import { generateContentViaProxy, extractTextFromResponse } from '../../../../utils/geminiProxyClient';
import { logApiCall } from '../../../../services/apiLoggingService';
import { timestampToDate, formatDateOnly, formatTime } from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface AIPreparationPanelProps {
    appointment: Appointment;
    linkedLeads?: Lead[];
    onInsightsGenerated: (insights: AppointmentAiInsights) => void;
    className?: string;
}

interface ExpandableSectionProps {
    title: string;
    icon: React.ElementType;
    iconColor: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
    title,
    icon: Icon,
    iconColor,
    children,
    defaultExpanded = true,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="border border-border/50 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconColor}`}>
                        <Icon size={16} className="text-white" />
                    </div>
                    <span className="font-semibold text-foreground">{title}</span>
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {isExpanded && (
                <div className="p-4 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
        >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIPreparationPanel: React.FC<AIPreparationPanelProps> = ({
    appointment,
    linkedLeads,
    onInsightsGenerated,
    className = '',
}) => {
    const { user } = useAuth();
    const { hasApiKey, promptForKeySelection, handleApiError } = useAI();
    const { activeProject } = useProject();
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeGeneration, setActiveGeneration] = useState<string | null>(null);

    const insights = appointment.aiInsights;

    // Generate full preparation
    const generateFullPreparation = async () => {
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsGenerating(true);
        setActiveGeneration('full');

        try {
            const participantInfo = appointment.participants.map(p =>
                `- ${p.name} (${p.email})${p.company ? ` de ${p.company}` : ''}`
            ).join('\n');

            const leadInfo = linkedLeads?.map(l => `
                Lead: ${l.name}
                Empresa: ${l.company || 'No especificada'}
                Valor potencial: $${l.value || 0}
                Estado: ${l.status}
                Score: ${l.leadScore || l.aiScore || 'No calculado'}
                Notas: ${l.notes || 'Sin notas'}
            `).join('\n\n') || '';

            const prompt = `
                Eres un asistente de ventas experto. Prepara un briefing completo para esta reunión.
                
                INFORMACIÓN DE LA REUNIÓN:
                - Título: ${appointment.title}
                - Tipo: ${appointment.type}
                - Descripción: ${appointment.description || 'Sin descripción'}
                - Fecha: ${formatDateOnly(appointment.startDate)}
                - Hora: ${formatTime(appointment.startDate)} - ${formatTime(appointment.endDate)}
                
                PARTICIPANTES:
                ${participantInfo}
                
                ${leadInfo ? `INFORMACIÓN DE LEADS VINCULADOS:\n${leadInfo}` : ''}
                
                Genera un JSON con la siguiente estructura:
                {
                    "summary": "Resumen ejecutivo de 2-3 líneas sobre qué esperar de esta reunión",
                    "preparationTips": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"],
                    "suggestedQuestions": ["pregunta 1", "pregunta 2", "pregunta 3", "pregunta 4", "pregunta 5"],
                    "talkingPoints": ["punto 1", "punto 2", "punto 3"],
                    "potentialObjections": ["objeción 1 con respuesta sugerida", "objeción 2 con respuesta sugerida"],
                    "recommendedApproach": "Estrategia detallada para abordar esta reunión",
                    "successProbability": número del 0 al 100,
                    "recommendedDuration": número en minutos
                }
                
                IMPORTANTE:
                - Sé específico y práctico
                - Las preguntas deben ser abiertas y estratégicas
                - Los tips deben ser accionables
                - Las objeciones deben incluir cómo responderlas
                
                Responde SOLO con el JSON válido.
            `;

            const projectId = activeProject?.id || 'appointment-ai-prep';
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {}, user?.uid);
            let responseText = extractTextFromResponse(response);

            // Strip markdown code blocks if present (Gemini often wraps JSON in ```json...```)
            responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

            if (!responseText) {
                throw new Error('No se recibió respuesta del modelo de IA');
            }

            const data = JSON.parse(responseText);

            const newInsights: AppointmentAiInsights = {
                summary: data.summary,
                preparationTips: data.preparationTips,
                suggestedQuestions: data.suggestedQuestions,
                talkingPoints: data.talkingPoints,
                potentialObjections: data.potentialObjections,
                recommendedApproach: data.recommendedApproach,
                successProbability: data.successProbability,
                recommendedDuration: data.recommendedDuration,
                generatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                model: 'gemini-2.5-flash',
            };

            onInsightsGenerated(newInsights);

            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: 'gemini-2.5-flash',
                    feature: 'appointment-ai-preparation',
                    success: true,
                });
            }

        } catch (error: any) {
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: 'gemini-2.5-flash',
                    feature: 'appointment-ai-preparation',
                    success: false,
                    errorMessage: error.message,
                });
            }
            handleApiError(error);
        } finally {
            setIsGenerating(false);
            setActiveGeneration(null);
        }
    };

    // Generate specific section
    const generateSection = async (section: 'questions' | 'objections' | 'strategy') => {
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsGenerating(true);
        setActiveGeneration(section);

        try {
            let prompt = '';

            switch (section) {
                case 'questions':
                    prompt = `
                        Para una reunión de ${appointment.type} titulada "${appointment.title}",
                        genera 7 preguntas estratégicas y abiertas para hacer durante la reunión.
                        Las preguntas deben ayudar a:
                        1. Entender las necesidades del cliente
                        2. Descubrir pain points
                        3. Establecer urgencia
                        4. Avanzar en el proceso de venta
                        
                        Devuelve SOLO JSON válido: { "questions": ["pregunta 1", "pregunta 2", ...] }
                    `;
                    break;

                case 'objections':
                    prompt = `
                        Para una reunión de ${appointment.type} titulada "${appointment.title}",
                        genera las 5 objeciones más probables que el cliente podría presentar,
                        junto con respuestas efectivas para cada una.
                        
                        Devuelve SOLO JSON válido: { "objections": ["Objeción: X | Respuesta: Y", ...] }
                    `;
                    break;

                case 'strategy':
                    prompt = `
                        Para una reunión de ${appointment.type} titulada "${appointment.title}",
                        genera una estrategia detallada para maximizar el éxito de la reunión.
                        Incluye:
                        - Cómo abrir la conversación
                        - Qué preguntas hacer primero
                        - Cómo presentar la propuesta de valor
                        - Cómo cerrar o establecer próximos pasos
                        
                        Devuelve SOLO JSON válido: { "strategy": "Estrategia completa en un párrafo" }
                    `;
                    break;
            }

            const projectId = activeProject?.id || 'appointment-ai-section';
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {}, user?.uid);
            let responseText = extractTextFromResponse(response);

            // Strip markdown code blocks if present (Gemini often wraps JSON in ```json...```)
            responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

            if (!responseText) {
                throw new Error('No se recibió respuesta del modelo de IA');
            }

            const data = JSON.parse(responseText);

            const updates: Partial<AppointmentAiInsights> = {};

            if (section === 'questions' && data.questions) {
                updates.suggestedQuestions = data.questions;
            } else if (section === 'objections' && data.objections) {
                updates.potentialObjections = data.objections;
            } else if (section === 'strategy' && data.strategy) {
                updates.recommendedApproach = data.strategy;
            }

            onInsightsGenerated({
                ...(insights || {}),
                ...updates,
                generatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            } as AppointmentAiInsights);

        } catch (error: any) {
            handleApiError(error);
        } finally {
            setIsGenerating(false);
            setActiveGeneration(null);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl text-white">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">Preparación con IA</h3>
                        <p className="text-xs text-muted-foreground">
                            Genera briefing, preguntas y estrategia
                        </p>
                    </div>
                </div>

                <button
                    onClick={generateFullPreparation}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {isGenerating && activeGeneration === 'full' ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Generando...
                        </>
                    ) : (
                        <>
                            {insights ? <RefreshCw size={16} /> : <Sparkles size={16} />}
                            {insights ? 'Regenerar' : 'Generar'}
                        </>
                    )}
                </button>
            </div>

            {/* Quick stats */}
            {insights?.successProbability !== undefined && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-secondary/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={16} className="text-green-500" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                Probabilidad de éxito
                            </span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className={`
                                text-3xl font-bold
                                ${insights.successProbability >= 70 ? 'text-green-500' :
                                    insights.successProbability >= 40 ? 'text-yellow-500' : 'text-red-500'}
                            `}>
                                {insights.successProbability}%
                            </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`
                                    h-full transition-all duration-1000
                                    ${insights.successProbability >= 70 ? 'bg-green-500' :
                                        insights.successProbability >= 40 ? 'bg-yellow-500' : 'bg-red-500'}
                                `}
                                style={{ width: `${insights.successProbability}%` }}
                            />
                        </div>
                    </div>

                    {insights.recommendedDuration && (
                        <div className="p-4 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-blue-500" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase">
                                    Duración recomendada
                                </span>
                            </div>
                            <span className="text-3xl font-bold text-foreground">
                                {insights.recommendedDuration}
                                <span className="text-lg text-muted-foreground ml-1">min</span>
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Summary */}
            {insights?.summary && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground leading-relaxed">
                            {insights.summary}
                        </p>
                        <CopyButton text={insights.summary} />
                    </div>
                </div>
            )}

            {/* Expandable sections */}
            <div className="space-y-3">
                {/* Preparation Tips */}
                <ExpandableSection
                    title="Puntos a cubrir"
                    icon={Target}
                    iconColor="bg-blue-500"
                >
                    {insights?.preparationTips ? (
                        <ul className="space-y-2">
                            {insights.preparationTips.map((tip, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-3 p-2 bg-secondary/30 rounded-lg group"
                                >
                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
                                        {i + 1}
                                    </span>
                                    <span className="text-sm text-foreground flex-1">{tip}</span>
                                    <CopyButton text={tip} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            Genera la preparación completa para ver los puntos a cubrir.
                        </p>
                    )}
                </ExpandableSection>

                {/* Suggested Questions */}
                <ExpandableSection
                    title="Preguntas sugeridas"
                    icon={MessageSquare}
                    iconColor="bg-green-500"
                >
                    <div className="space-y-2">
                        {insights?.suggestedQuestions ? (
                            insights.suggestedQuestions.map((question, i) => (
                                <div
                                    key={i}
                                    className="p-3 bg-secondary/30 rounded-lg group flex items-start gap-2"
                                >
                                    <span className="text-sm text-foreground flex-1">{question}</span>
                                    <CopyButton text={question} />
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground italic">
                                    Aún no hay preguntas generadas.
                                </p>
                                <button
                                    onClick={() => generateSection('questions')}
                                    disabled={isGenerating}
                                    className="text-sm text-purple-500 hover:underline flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isGenerating && activeGeneration === 'questions' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={14} />
                                    )}
                                    Generar
                                </button>
                            </div>
                        )}
                    </div>
                </ExpandableSection>

                {/* Potential Objections */}
                <ExpandableSection
                    title="Posibles objeciones"
                    icon={AlertTriangle}
                    iconColor="bg-orange-500"
                >
                    <div className="space-y-2">
                        {insights?.potentialObjections ? (
                            insights.potentialObjections.map((objection, i) => (
                                <div
                                    key={i}
                                    className="p-3 bg-secondary/30 rounded-lg group"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm text-foreground flex-1">{objection}</span>
                                        <CopyButton text={objection} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground italic">
                                    Aún no hay objeciones generadas.
                                </p>
                                <button
                                    onClick={() => generateSection('objections')}
                                    disabled={isGenerating}
                                    className="text-sm text-purple-500 hover:underline flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isGenerating && activeGeneration === 'objections' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={14} />
                                    )}
                                    Generar
                                </button>
                            </div>
                        )}
                    </div>
                </ExpandableSection>

                {/* Recommended Strategy */}
                <ExpandableSection
                    title="Estrategia recomendada"
                    icon={Zap}
                    iconColor="bg-purple-500"
                >
                    {insights?.recommendedApproach ? (
                        <div className="p-3 bg-secondary/30 rounded-lg group">
                            <div className="flex items-start gap-2">
                                <p className="text-sm text-foreground leading-relaxed flex-1">
                                    {insights.recommendedApproach}
                                </p>
                                <CopyButton text={insights.recommendedApproach} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground italic">
                                Aún no hay estrategia generada.
                            </p>
                            <button
                                onClick={() => generateSection('strategy')}
                                disabled={isGenerating}
                                className="text-sm text-purple-500 hover:underline flex items-center gap-1 disabled:opacity-50"
                            >
                                {isGenerating && activeGeneration === 'strategy' ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Sparkles size={14} />
                                )}
                                Generar
                            </button>
                        </div>
                    )}
                </ExpandableSection>
            </div>

            {/* Footer */}
            {insights?.generatedAt && (
                <p className="text-xs text-muted-foreground text-center">
                    Generado el {new Date(insights.generatedAt.seconds * 1000).toLocaleString('es-ES')}
                    {insights.model && ` con ${insights.model}`}
                </p>
            )}
        </div>
    );
};

export default AIPreparationPanel;



