import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../../contexts/admin';
import { useAuth } from '../../../contexts/core/AuthContext';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, Bot, Save, RotateCcw, Info, CheckCircle, AlertCircle } from 'lucide-react';

interface GlobalChatbotPromptsSettingsProps {
    onBack: () => void;
}

// Default prompts that match the current hardcoded values in ChatCore.tsx
const DEFAULT_PROMPTS = {
    identityTemplate: `You are {{agentName}}, a {{tone}} AI assistant for {{businessName}} ({{industry}}).`,

    coreInstructions: `INSTRUCTIONS:
1. Always respond in the SAME language the user is using
2. When you receive [SYSTEM CONTEXT] in a message, use that information to answer about what the user is viewing
3. Be {{tone}}, helpful, and conversational
4. When asked "what am I seeing?" or "what's this section?", describe the specific content from the SYSTEM CONTEXT
5. Available sections: {{visibleSections}}`,

    formattingGuidelines: `*** FORMATO DE RESPUESTA (MUY IMPORTANTE) ***

🚨 TUS RESPUESTAS DEBEN TENER BUEN FORMATO:

1. **ESPACIADO OBLIGATORIO** - SIEMPRE agrega líneas en blanco entre párrafos
2. **EMOJIS MODERADOS** - Usa 1-3 emojis por sección (✅, 🎨, 💡, ⚠️)
3. **USA NEGRITA** para etiquetas: **Campo:** valor
4. **ESTRUCTURA CLARA** - Headers, listas con espaciado
5. 🔹 **Emojis en Bullets** - Usa emojis en los bullets principales

❌ MAL FORMATO (nunca hagas esto):
✅ Acción completada
He cambiado el título.
💡 Tip: Puedes cambiar más.

✅ BUEN FORMATO (siempre haz esto):
✅ **Acción Completada**

He cambiado el título a "Bienvenido".

💡 **Tip:** Puedes seguir editando.

PATRONES DE RESPUESTA:

Para confirmaciones:
✅ **[Título]**

[Descripción de lo hecho]

💡 [Sugerencia opcional]

Para información:
📊 **[Título]**

[Contenido organizado con bullets si es necesario]

- 🎨 **Diseño:** descripción
- ✏️ **Contenido:** descripción

Para errores:
⚠️ **[Título]**

**Problema:** [explicación]

**Solución:** [pasos]

RECUERDA: 
1. Espaciado entre párrafos = respuestas legibles.
2. Emojis en los bullets importantes.
3. Sé amigable y profesional.`,

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

export interface GlobalChatbotPrompts {
    identityTemplate: string;
    coreInstructions: string;
    formattingGuidelines: string;
    appointmentInstructions: string;
    ecommerceInstructions: string;
    leadCaptureInstructions: string;
    updatedAt?: string;
    updatedBy?: string;
}

type TabId = 'identity' | 'core' | 'formatting' | 'appointments' | 'ecommerce' | 'leadCapture';

const TABS: { id: TabId; label: string; description: string }[] = [
    { id: 'identity', label: 'Identidad', description: 'Cómo se presenta el bot' },
    { id: 'core', label: 'Instrucciones Base', description: 'Comportamiento general' },
    { id: 'formatting', label: 'Formato', description: 'Reglas de formato de respuestas' },
    { id: 'appointments', label: 'Citas', description: 'Agendamiento de citas' },
    { id: 'ecommerce', label: 'E-commerce', description: 'Soporte para tiendas online' },
    { id: 'leadCapture', label: 'Captura de Leads', description: 'Generación de prospectos' },
];

const GlobalChatbotPromptsSettings: React.FC<GlobalChatbotPromptsSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { globalChatbotPrompts, saveGlobalChatbotPrompts, fetchGlobalChatbotPrompts } = useAdmin();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('identity');
    const [prompts, setPrompts] = useState<GlobalChatbotPrompts>(DEFAULT_PROMPTS);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load prompts on mount
    useEffect(() => {
        const loadPrompts = async () => {
            setIsLoading(true);
            try {
                await fetchGlobalChatbotPrompts();
            } catch (error) {
                console.error('Error loading global chatbot prompts:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPrompts();
    }, []);

    // Update local state when context prompts change
    useEffect(() => {
        if (globalChatbotPrompts) {
            setPrompts({
                ...DEFAULT_PROMPTS,
                ...globalChatbotPrompts,
            });
        }
    }, [globalChatbotPrompts]);

    const handlePromptChange = (field: keyof GlobalChatbotPrompts, value: string) => {
        setPrompts(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            await saveGlobalChatbotPrompts({
                ...prompts,
                updatedAt: new Date().toISOString(),
                updatedBy: user?.uid || '',
            });
            setSaveStatus('success');
            setHasChanges(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('Error saving prompts:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = (field: keyof GlobalChatbotPrompts) => {
        if (window.confirm('¿Restablecer este prompt a los valores por defecto?')) {
            setPrompts(prev => ({ ...prev, [field]: DEFAULT_PROMPTS[field as keyof typeof DEFAULT_PROMPTS] }));
            setHasChanges(true);
        }
    };

    const handleResetAll = () => {
        if (window.confirm('¿Restablecer TODOS los prompts a los valores por defecto? Esta acción no se puede deshacer.')) {
            setPrompts(DEFAULT_PROMPTS);
            setHasChanges(true);
        }
    };

    const getCurrentPromptField = (): keyof GlobalChatbotPrompts => {
        const fieldMap: Record<TabId, keyof GlobalChatbotPrompts> = {
            identity: 'identityTemplate',
            core: 'coreInstructions',
            formatting: 'formattingGuidelines',
            appointments: 'appointmentInstructions',
            ecommerce: 'ecommerceInstructions',
            leadCapture: 'leadCaptureInstructions',
        };
        return fieldMap[activeTab];
    };

    const getPlaceholders = (): string[] => {
        const placeholderMap: Record<TabId, string[]> = {
            identity: ['{{agentName}}', '{{tone}}', '{{businessName}}', '{{industry}}'],
            core: ['{{tone}}', '{{visibleSections}}'],
            formatting: [],
            appointments: [],
            ecommerce: [],
            leadCapture: [],
        };
        return placeholderMap[activeTab];
    };

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            title="Volver"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <Bot className="text-editor-accent w-5 h-5" />
                        <h1 className="text-lg font-semibold text-editor-text-primary">
                            Prompts Globales del Chatbot
                        </h1>
                        {hasChanges && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
                                Sin guardar
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleResetAll}
                            className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Restablecer Todo</span>
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasChanges}
                            className={`flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-lg transition-all ${saveStatus === 'success'
                                ? 'bg-green-500/20 text-green-400'
                                : saveStatus === 'error'
                                    ? 'bg-red-500/20 text-red-400'
                                    : hasChanges
                                        ? 'bg-editor-accent text-editor-bg hover:bg-editor-accent-hover'
                                        : 'bg-editor-border text-editor-text-secondary cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : saveStatus === 'success' ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : saveStatus === 'error' ? (
                                <AlertCircle className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isSaving ? 'Guardando...' : saveStatus === 'success' ? '¡Guardado!' : saveStatus === 'error' ? 'Error' : 'Guardar'}
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto p-6 sm:p-8">
                        {/* Description */}
                        <div className="mb-6 p-4 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-editor-accent flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-editor-text-primary mb-1">
                                        Configuración Global de Prompts
                                    </h3>
                                    <p className="text-sm text-editor-text-secondary">
                                        Estos prompts se aplican a <strong>todos los chatbots</strong> de los proyectos en la plataforma.
                                        Los cambios aquí afectan el comportamiento base de la IA.
                                        Usa los placeholders (ej: {'{{agentName}}'}) que serán reemplazados dinámicamente con los datos de cada proyecto.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-3 border-editor-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                {/* Tabs Sidebar */}
                                <div className="lg:col-span-1">
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-2 space-y-1">
                                        {TABS.map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`w-full text-left p-3 rounded-lg transition-all ${activeTab === tab.id
                                                    ? 'bg-editor-accent/15 text-editor-accent border border-editor-accent/30'
                                                    : 'text-editor-text-secondary hover:bg-editor-border/50 hover:text-editor-text-primary'
                                                    }`}
                                            >
                                                <div className="font-medium text-sm">{tab.label}</div>
                                                <div className="text-xs opacity-70 mt-0.5">{tab.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Editor */}
                                <div className="lg:col-span-3">
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg">
                                        <div className="p-4 border-b border-editor-border flex items-center justify-between">
                                            <div>
                                                <h2 className="font-semibold text-editor-text-primary">
                                                    {TABS.find(t => t.id === activeTab)?.label}
                                                </h2>
                                                <p className="text-sm text-editor-text-secondary mt-0.5">
                                                    {TABS.find(t => t.id === activeTab)?.description}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleReset(getCurrentPromptField())}
                                                className="text-sm text-editor-text-secondary hover:text-editor-accent transition-colors flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Restablecer
                                            </button>
                                        </div>

                                        {/* Placeholders Info */}
                                        {getPlaceholders().length > 0 && (
                                            <div className="px-4 py-2 border-b border-editor-border bg-editor-bg/50">
                                                <span className="text-xs text-editor-text-secondary">
                                                    Placeholders disponibles:{' '}
                                                    {getPlaceholders().map((p, i) => (
                                                        <code key={p} className="bg-editor-border px-1.5 py-0.5 rounded text-editor-accent mx-0.5">
                                                            {p}
                                                        </code>
                                                    ))}
                                                </span>
                                            </div>
                                        )}

                                        <div className="p-4">
                                            <textarea
                                                value={prompts[getCurrentPromptField()] || ''}
                                                onChange={(e) => handlePromptChange(getCurrentPromptField(), e.target.value)}
                                                className="w-full h-96 bg-editor-bg text-editor-text-primary p-4 rounded-lg border border-editor-border font-mono text-sm resize-none focus:ring-2 focus:ring-editor-accent focus:border-transparent outline-none"
                                                placeholder="Escribe el prompt aquí..."
                                            />
                                        </div>

                                        {/* Character count */}
                                        <div className="px-4 pb-4">
                                            <span className="text-xs text-editor-text-secondary">
                                                {(prompts[getCurrentPromptField()] || '').length} caracteres
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default GlobalChatbotPromptsSettings;
