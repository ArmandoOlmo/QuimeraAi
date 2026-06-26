import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X } from 'lucide-react';
import { AiAssistantConfig, Project, ChatAppearanceConfig } from '../../types';
import { getDefaultAppearanceConfig, getSizeClasses, getButtonSizeClasses, getShadowClasses, getButtonStyleClasses } from '../../utils/chatThemes';
import ChatCore, { ChatAppointmentData, type ChatAppointmentHandlerResult, AppointmentSlot } from './ChatCore';
import {
    buildChatCoreAppointmentPayloadNotes,
    buildChatCoreLeadPayloadNotes,
} from '../../utils/chatbotEngine/chatCorePayloadNotes';
import { canRenderChatbotSurface } from '../../utils/chatbotEngine/deploymentGuard';
import { buildChatbotEngineSurfaceContext } from '../../utils/chatbotEngine/surfaceContext';

interface EmbedWidgetProps {
    projectId: string;
    apiUrl?: string;
}

const DEFAULT_WIDGET_API_URL = (import.meta.env.VITE_WIDGET_API_BASE_URL || '/api/widget').replace(/\/$/, '');

const EmbedWidget: React.FC<EmbedWidgetProps> = ({ 
    projectId,
    apiUrl = DEFAULT_WIDGET_API_URL
}) => {
    const [config, setConfig] = useState<AiAssistantConfig | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [appearance, setAppearance] = useState<ChatAppearanceConfig>(getDefaultAppearanceConfig());
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appointments, setAppointments] = useState<AppointmentSlot[]>([]);
    const { i18n } = useTranslation();
    const encodedProjectId = encodeURIComponent(projectId);
    const embeddedChatbotEngineContext = useMemo(() => buildChatbotEngineSurfaceContext({
        sourceSurface: 'website',
        sourceModule: 'chatcore',
        route: typeof window !== 'undefined' ? window.location.pathname : undefined,
        entityType: 'project',
        entityId: project?.id || projectId,
        contextKeys: ['embedded-widget', 'website'],
        metadata: {
            embeddedWidget: true,
            widgetApiProjectId: projectId,
            projectId: project?.id || projectId,
            tenantId: (project as any)?.tenantId || (project as any)?.tenant_id || null,
        },
    }), [project, projectId]);
    const chatbotSurfaceVisible = useMemo(() => canRenderChatbotSurface(
        project as any,
        embeddedChatbotEngineContext.sourceSurface,
    ), [project, embeddedChatbotEngineContext.sourceSurface]);

    // Load configuration from API
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await fetch(`${apiUrl}/${encodedProjectId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to load widget configuration');
                }
                
                const data = await response.json();
                
                setConfig(data.config);
                setProject(data.project);
                setAppearance(data.config.appearance || getDefaultAppearanceConfig());
                setIsLoading(false);
            } catch (err) {
                console.error('Error loading widget config:', err);
                setError('Failed to load chat widget');
                setIsLoading(false);
            }
        };

        loadConfig();
    }, [encodedProjectId, apiUrl]);

    useEffect(() => {
        if (!isOpen || !projectId) return;

        const loadAppointments = async () => {
            try {
                const response = await fetch(`${apiUrl}/${encodedProjectId}/appointments`);
                if (!response.ok) return;

                const payload = await response.json();
                const now = new Date();
                const slots: AppointmentSlot[] = (payload.appointments || [])
                    .map((item: any) => ({
                        id: item.id,
                        title: item.title || 'Reservado',
                        startDate: new Date(item.startDate),
                        endDate: new Date(item.endDate),
                        status: item.status || 'scheduled',
                    }))
                    .filter((item: AppointmentSlot) =>
                        item.startDate >= now &&
                        !Number.isNaN(item.startDate.getTime()) &&
                        !Number.isNaN(item.endDate.getTime()) &&
                        item.status !== 'cancelled'
                    );

                setAppointments(slots);
            } catch (err) {
                console.warn('Error loading embedded widget availability:', err);
            }
        };

        loadAppointments();
    }, [isOpen, projectId, apiUrl, encodedProjectId]);

    // Handle lead capture for embedded widget
    const handleLeadCapture = async (leadData: any): Promise<string> => {
        const customerRequestNotes = buildChatCoreLeadPayloadNotes({
            leadData,
            projectName: project?.name,
            agentName: config?.agentName,
            sourceSurface: embeddedChatbotEngineContext.sourceSurface,
            sourceModule: embeddedChatbotEngineContext.sourceModule,
            chatbotEngineContext: embeddedChatbotEngineContext,
            locale: i18n.language,
        });

        try {
            const response = await fetch(`${apiUrl}/${encodedProjectId}/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...leadData,
                    notes: customerRequestNotes,
                    source: 'embedded-widget',
                    status: 'new',
                    tags: ['embedded-widget', ...(leadData.tags || [])],
                    metadata: {
                        ...(leadData.metadata || {}),
                        customerRequestSummary: customerRequestNotes,
                        sourceSurface: embeddedChatbotEngineContext.sourceSurface,
                        sourceModule: embeddedChatbotEngineContext.sourceModule,
                        chatbotEngineContext: embeddedChatbotEngineContext,
                    },
                })
            });
            if (response.ok) {
                const payload = await response.json();
                return payload.leadId || '';
            }
        } catch (err) {
            console.error('Error capturing lead:', err);
        }
        return '';
    };

    const handleCreateAppointment = async (appointmentData: ChatAppointmentData): Promise<ChatAppointmentHandlerResult> => {
        const customerRequestNotes = buildChatCoreAppointmentPayloadNotes({
            appointmentData: appointmentData as unknown as Record<string, unknown>,
            projectName: project?.name,
            agentName: config?.agentName,
            sourceSurface: embeddedChatbotEngineContext.sourceSurface,
            sourceModule: embeddedChatbotEngineContext.sourceModule,
            chatbotEngineContext: embeddedChatbotEngineContext,
            locale: appointmentData.locale || i18n.language,
        });

        try {
            const response = await fetch(`${apiUrl}/${encodedProjectId}/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: appointmentData.title,
                    description: appointmentData.description,
                    notes: customerRequestNotes,
                    type: appointmentData.type,
                    startDate: appointmentData.startDate.toISOString(),
                    endDate: appointmentData.endDate.toISOString(),
                    participantName: appointmentData.participantName,
                    participantEmail: appointmentData.participantEmail,
                    participantPhone: appointmentData.participantPhone,
                    linkedLeadId: appointmentData.linkedLeadId,
                    conversationTranscript: appointmentData.conversationTranscript,
                    sourceConversationId: appointmentData.sourceConversationId,
                    source: 'chatbot',
                    sourceComponent: 'ChatCore',
                    sourceModule: embeddedChatbotEngineContext.sourceModule,
                    sourceSurface: embeddedChatbotEngineContext.sourceSurface,
                    generatedByAI: appointmentData.generatedByAI,
                    bookingChannel: appointmentData.bookingChannel,
                    locale: appointmentData.locale || i18n.language,
                    metadata: {
                        ...(appointmentData.metadata || {}),
                        embeddedWidget: true,
                        bookingChannel: appointmentData.bookingChannel,
                        customerRequestSummary: customerRequestNotes,
                        sourceSurface: embeddedChatbotEngineContext.sourceSurface,
                        sourceModule: embeddedChatbotEngineContext.sourceModule,
                        chatbotEngineContext: embeddedChatbotEngineContext,
                    },
                }),
            });

            if (!response.ok) return undefined;
            const payload = await response.json();

            return {
                appointmentId: payload.appointmentId,
                leadId: payload.leadId,
                duplicate: payload.duplicate,
                warnings: payload.warnings,
            };
        } catch (err) {
            console.error('Error creating embedded widget appointment:', err);
            return undefined;
        }
    };

    // Apply custom position
    const getPositionStyle = () => {
        const { position, offsetX, offsetY } = appearance.behavior;
        const positionMap: Record<string, any> = {
            'bottom-right': { bottom: `${offsetY}px`, right: `${offsetX}px` },
            'bottom-left': { bottom: `${offsetY}px`, left: `${offsetX}px` },
            'top-right': { top: `${offsetY}px`, right: `${offsetX}px` },
            'top-left': { top: `${offsetY}px`, left: `${offsetX}px` }
        };
        return positionMap[position] || positionMap['bottom-right'];
    };

    // Don't render if loading or error
    if (isLoading) return null;
    if (error || !config || !project) {
        console.error('Widget error:', error);
        return null;
    }

    // Don't render if not active
    if (!config.isActive) return null;
    if (!chatbotSurfaceVisible) return null;

    const sizeClasses = getSizeClasses(appearance.behavior.width);

    return (
        <div className={`fixed z-50 flex flex-col items-end font-sans`} style={getPositionStyle()}>
            {/* Chat Window */}
            <div 
                className={`
                    mb-4 ${sizeClasses.width} rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'}
                `}
                style={{ 
                    maxHeight: sizeClasses.height,
                    backgroundColor: appearance.colors?.backgroundColor,
                    borderColor: appearance.colors?.inputBorder
                }}
            >
                {isOpen && (
                    <ChatCore
                        config={config}
                        project={project}
                        appearance={appearance}
                        onLeadCapture={handleLeadCapture}
                        onCreateAppointment={handleCreateAppointment}
                        existingAppointments={appointments}
                        onClose={() => setIsOpen(false)}
                        className="w-full h-full flex flex-col"
                        showHeader={true}
                        autoOpen={isOpen}
                        isEmbedded={true}
                        chatbotEngineContext={embeddedChatbotEngineContext}
                    />
                )}
            </div>

            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    ${getButtonSizeClasses(appearance.button.buttonSize)}
                    ${getButtonStyleClasses(appearance.button.buttonStyle)}
                    ${getShadowClasses(appearance.button.shadowSize)}
                    ${appearance.button.pulseEffect && !isOpen ? 'animate-pulse' : ''}
                    hover:scale-110 transition-all duration-300 flex items-center justify-center group relative
                `}
                style={{ 
                    backgroundColor: appearance.colors?.primaryColor,
                    color: appearance.colors?.headerText
                }}
                title={appearance.button.showTooltip ? appearance.button.tooltipText : undefined}
            >
                {appearance.button.buttonIcon === 'custom-emoji' && appearance.button.customEmoji ? (
                    <span className={isOpen ? 'rotate-180 scale-0 transition-transform duration-300' : 'scale-100 transition-transform duration-300'}>
                        {appearance.button.customEmoji}
                    </span>
                ) : (
                    <MessageSquare size={28} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0' : 'scale-100'}`} />
                )}
                <X size={28} className={`absolute transition-transform duration-300 ${isOpen ? 'scale-100' : 'rotate-180 scale-0'}`} />
                
                {/* Notification Badge */}
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">1</span>
                    </div>
                )}
            </button>
        </div>
    );
};

export default EmbedWidget;























