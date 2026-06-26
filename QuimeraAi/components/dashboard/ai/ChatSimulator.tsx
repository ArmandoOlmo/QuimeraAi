import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AiAssistantConfig, Lead, Project } from '../../../types';
import { useCRM } from '../../../contexts/crm';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useSafeTenant } from '../../../contexts/tenant';
import { resolveChatAppearanceConfig } from '../../../utils/chatThemes';
import ChatCore, { ChatAppointmentData, AppointmentSlot } from '../../chat/ChatCore';
import { supabase } from '../../../supabase';
import { createAppointmentFromChat, getAppointmentsByProject } from '../../../services/appointments/appointmentEngineService';

interface ChatSimulatorProps {
    config: AiAssistantConfig;
    project: Project;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ config, project }) => {
    const { i18n } = useTranslation();
    const { addLead, updateLead } = useCRM();
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;
    const [appointments, setAppointments] = useState<AppointmentSlot[]>([]);

    // Use project.id from props (more reliable than activeProjectId)
    const projectId = project?.id;

    // Get appearance config with defaults
    const appearance = resolveChatAppearanceConfig(config.appearance, project?.theme?.globalColors);

    // Load appointments
    useEffect(() => {
        const loadAppointments = async () => {
            if (!user || !projectId) return;

            try {
                const now = new Date();
                const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                const canonicalAppointments = await getAppointmentsByProject(supabase, projectId, {
                    startDate: now,
                    endDate: rangeEnd,
                });

                const appointmentSlots: AppointmentSlot[] = canonicalAppointments.map((appointment) => ({
                    id: appointment.id,
                    title: appointment.title || 'Cita',
                    startDate: new Date(appointment.startDate.seconds * 1000),
                    endDate: new Date(appointment.endDate.seconds * 1000),
                    status: appointment.status || 'scheduled'
                }));

                setAppointments(appointmentSlots);
            } catch (error) {
                console.error('[ChatSimulator] Error loading appointments:', error);
            }
        };

        loadAppointments();
    }, [user, projectId]);

    // Handle lead capture
    const handleLeadCapture = async (leadData: Partial<any>): Promise<string | undefined> => {
        console.log('[ChatSimulator] 📝 handleLeadCapture called with:', {
            name: leadData.name,
            email: leadData.email,
            hasTranscript: !!leadData.conversationTranscript,
            transcriptLength: leadData.conversationTranscript?.length || 0,
            transcriptPreview: leadData.conversationTranscript?.substring(0, 200)
        });

        const fullLeadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'> = {
            ...leadData,
            source: 'quimera-chat',
            status: 'new',
            tags: ['quimera-chat', ...(leadData.tags || [])]
        } as Omit<Lead, 'id' | 'createdAt' | 'projectId'>;

        try {
            if (addLead) {
                const leadId = await addLead(fullLeadData);
                console.log('[ChatSimulator] ✅ Lead created via context with ID:', leadId);
                return leadId;
            }
        } catch (error) {
            console.error('[ChatSimulator] ❌ Error creating lead:', error);
        }
        return undefined;
    };

    // Handle updating lead transcript
    const handleUpdateLeadTranscript = async (leadId: string, transcript: string, notes?: string) => {
        if (updateLead) {
            await updateLead(leadId, { conversationTranscript: transcript, ...(notes ? { notes } : {}) });
        }
    };

    // Handle creating appointment from chat
    const handleCreateAppointment = async (appointmentData: ChatAppointmentData): Promise<string | undefined> => {
        console.log('[ChatSimulator] 📅 handleCreateAppointment called with:', appointmentData);
        console.log('[ChatSimulator] 📅 user:', user?.id, 'projectId:', projectId);

        if (!user || !projectId) {
            console.error('[ChatSimulator] ❌ Cannot create appointment: no user or project', { user: !!user, projectId });
            return undefined;
        }

        try {
            console.log('[ChatSimulator] 📅 Starting appointment creation...');
            console.log('[ChatSimulator] 📅 Appointment data received:', JSON.stringify(appointmentData, null, 2));

            const result = await createAppointmentFromChat(supabase, {
                projectId,
                tenantId: currentTenantId,
                title: appointmentData.title || 'Cita desde Chat',
                description: appointmentData.description || '',
                notes: appointmentData.notes,
                type: appointmentData.type || 'consultation',
                startDate: appointmentData.startDate,
                endDate: appointmentData.endDate,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                organizerId: user.id,
                organizerName: (user as any).displayName || user.email || '',
                organizerEmail: user.email || '',
                participantName: appointmentData.participantName,
                participantEmail: appointmentData.participantEmail,
                participantPhone: appointmentData.participantPhone,
                linkedLeadId: appointmentData.linkedLeadId,
                conversationTranscript: appointmentData.conversationTranscript,
                sourceConversationId: appointmentData.sourceConversationId,
                tags: ['quimera-chat', 'auto-scheduled'],
                createdBy: user.id,
                sourceComponent: 'ChatSimulator',
                sourceModule: 'chatcore',
                generatedByAI: appointmentData.generatedByAI,
                idempotencyKey: `chat-simulator:${projectId}:${appointmentData.participantEmail || appointmentData.participantName || 'guest'}:${appointmentData.startDate.toISOString()}`,
                locale: i18n.language,
                metadata: {
                    ...(appointmentData.metadata || {}),
                    simulated: true,
                    projectName: project.name,
                    locale: i18n.language,
                    bookingChannel: appointmentData.bookingChannel,
                    customerRequestSummary: appointmentData.notes,
                },
            });

            console.log('[ChatSimulator] ✅ Canonical appointment created:', result.appointmentId);
            return result.appointmentId;
        } catch (error) {
            console.error('[ChatSimulator] ❌ Error creating appointment:', error);
            return undefined;
        }
    };

    return (
        <div className="absolute inset-0 z-30 flex flex-col pointer-events-auto font-sans">
            <div
                className="w-full h-full overflow-hidden flex flex-col transition-all duration-500"
                style={{
                    backgroundColor: appearance.colors?.backgroundColor,
                }}
            >
                <ChatCore
                    config={config}
                    project={project}
                    appearance={appearance}
                    onLeadCapture={handleLeadCapture}
                    onUpdateLeadTranscript={handleUpdateLeadTranscript}
                    onCreateAppointment={handleCreateAppointment}
                    existingAppointments={appointments}
                    className="h-full"
                    showHeader={true}
                />
            </div>
        </div>
    );
};

export default ChatSimulator;
