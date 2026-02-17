import React, { useState, useEffect } from 'react';
import { AiAssistantConfig, Project } from '../../../types';
import { useCRM } from '../../../contexts/crm';
import { useAuth } from '../../../contexts/core/AuthContext';
import { getDefaultAppearanceConfig } from '../../../utils/chatThemes';
import ChatCore, { ChatAppointmentData, AppointmentSlot } from '../../chat/ChatCore';
import { db, collection, addDoc, getDocs, query, orderBy } from '../../../firebase';

interface ChatSimulatorProps {
    config: AiAssistantConfig;
    project: Project;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ config, project }) => {
    const { addLead, updateLead } = useCRM();
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentSlot[]>([]);

    // Use project.id from props (more reliable than activeProjectId)
    const projectId = project?.id;

    // Get appearance config with defaults
    const appearance = config.appearance || getDefaultAppearanceConfig();

    // Load appointments
    useEffect(() => {
        const loadAppointments = async () => {
            if (!user || !projectId) return;

            try {
                const appointmentsRef = collection(db, 'users', user.uid, 'projects', projectId, 'appointments');
                const q = query(appointmentsRef, orderBy('startDate', 'asc'));
                const snapshot = await getDocs(q);

                const appointmentSlots: AppointmentSlot[] = [];
                const now = new Date();

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const startDate = data.startDate?.seconds
                        ? new Date(data.startDate.seconds * 1000)
                        : new Date();
                    const endDate = data.endDate?.seconds
                        ? new Date(data.endDate.seconds * 1000)
                        : new Date(startDate.getTime() + 60 * 60000);

                    if (startDate >= now && data.status !== 'cancelled') {
                        appointmentSlots.push({
                            id: doc.id,
                            title: data.title || 'Cita',
                            startDate,
                            endDate,
                            status: data.status || 'scheduled'
                        });
                    }
                });

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

        const leadId = await addLead({
            ...leadData,
            source: 'quimera-chat',
            status: 'new',
            tags: ['quimera-chat', ...(leadData.tags || [])]
        });

        console.log('[ChatSimulator] ✅ Lead created with ID:', leadId);
        return leadId;
    };

    // Handle updating lead transcript
    const handleUpdateLeadTranscript = async (leadId: string, transcript: string) => {
        if (updateLead) {
            await updateLead(leadId, { conversationTranscript: transcript });
        }
    };

    // Handle creating appointment from chat
    const handleCreateAppointment = async (appointmentData: ChatAppointmentData): Promise<string | undefined> => {
        console.log('[ChatSimulator] 📅 handleCreateAppointment called with:', appointmentData);
        console.log('[ChatSimulator] 📅 user:', user?.uid, 'projectId:', projectId);

        if (!user || !projectId) {
            console.error('[ChatSimulator] ❌ Cannot create appointment: no user or project', { user: !!user, projectId });
            return undefined;
        }

        try {
            console.log('[ChatSimulator] 📅 Starting appointment creation...');
            console.log('[ChatSimulator] 📅 Appointment data received:', JSON.stringify(appointmentData, null, 2));

            const dateToTimestamp = (date: Date) => ({
                seconds: Math.floor(date.getTime() / 1000),
                nanoseconds: 0
            });

            const now = dateToTimestamp(new Date());

            const participants = [];
            if (appointmentData.participantName || appointmentData.participantEmail) {
                participants.push({
                    id: `participant_${Date.now()}`,
                    name: appointmentData.participantName || 'Cliente',
                    email: appointmentData.participantEmail || '',
                    phone: appointmentData.participantPhone || '',
                    role: 'attendee',
                    status: 'pending',
                    isRequired: true,
                });
            }

            // Build appointment document - ensure no undefined values
            const appointmentDoc: Record<string, any> = {
                title: appointmentData.title || 'Cita desde Chat',
                description: appointmentData.description || '',
                type: appointmentData.type || 'consultation',
                status: 'scheduled',
                priority: 'medium',
                startDate: dateToTimestamp(appointmentData.startDate),
                endDate: dateToTimestamp(appointmentData.endDate),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                organizerId: user.uid,
                organizerName: user.displayName || '',
                organizerEmail: user.email || '',
                participants,
                location: { type: 'virtual' },
                reminders: [
                    { id: `reminder_1_${Date.now()}`, type: 'email', minutes: 60, sent: false },
                    { id: `reminder_2_${Date.now()}`, type: 'email', minutes: 1440, sent: false }
                ],
                attachments: [],
                notes: [],
                followUpActions: [],
                aiPrepEnabled: true,
                linkedLeadIds: [],
                tags: ['quimera-chat', 'auto-scheduled'],
                createdAt: now,
                createdBy: user.uid,
                projectId: projectId,
            };

            // Only add linkedLeadId if it exists
            if (appointmentData.linkedLeadId) {
                appointmentDoc.linkedLeadIds = [appointmentData.linkedLeadId];
            }

            console.log('[ChatSimulator] 📅 Appointment document to save:', JSON.stringify(appointmentDoc, null, 2));

            const appointmentPath = `users/${user.uid}/projects/${projectId}/appointments`;
            console.log('[ChatSimulator] 📍 Saving appointment to path:', appointmentPath);

            const appointmentsRef = collection(db, 'users', user.uid, 'projects', projectId, 'appointments');
            const docRef = await addDoc(appointmentsRef, appointmentDoc);

            console.log('[ChatSimulator] ✅ Appointment created:', docRef.id, 'at path:', docRef.path);

            // Create lead if contact info provided (in separate try/catch so it doesn't affect appointment)
            if (appointmentData.participantEmail || appointmentData.participantName) {
                try {
                    const leadData: any = {
                        name: appointmentData.participantName || 'Cliente desde Chat',
                        source: 'quimera-chat',
                        status: 'new',
                        message: `Cita agendada: ${appointmentData.title}`,
                        tags: ['quimera-chat', 'appointment-scheduled'],
                        notes: `Cita programada para ${appointmentData.startDate.toLocaleDateString()}`,
                    };
                    // Only add conversationTranscript if it has content
                    if (appointmentData.conversationTranscript && appointmentData.conversationTranscript.length > 0) {
                        leadData.conversationTranscript = appointmentData.conversationTranscript;
                    }
                    // Only add email/phone if they have values (Firebase doesn't accept undefined)
                    if (appointmentData.participantEmail) leadData.email = appointmentData.participantEmail;
                    if (appointmentData.participantPhone) leadData.phone = appointmentData.participantPhone;

                    console.log('[ChatSimulator] 📝 Creating lead from appointment with transcript:', {
                        hasTranscript: !!appointmentData.conversationTranscript,
                        transcriptLength: appointmentData.conversationTranscript?.length || 0
                    });

                    await addLead(leadData);
                    console.log('[ChatSimulator] ✅ Lead created for appointment with transcript');
                } catch (leadError) {
                    console.error('[ChatSimulator] ⚠️ Error creating lead (appointment still created):', leadError);
                }
            }

            return docRef.id;
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
