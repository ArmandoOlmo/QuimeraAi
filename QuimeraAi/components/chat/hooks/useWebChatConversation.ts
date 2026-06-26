/**
 * useWebChatConversation Hook
 * Manages web chat conversations for persistence and Inbox display
 */

import { useState, useCallback, useRef } from 'react';
import { SocialConversation, SocialMessage } from '../../../types/socialChat';
import { buildChatbotMessageIntentMetadata } from '../../../utils/chatbotEngine/messageIntentMetadata';
import type { ChatbotEngineSurfaceContext } from '../../../utils/chatbotEngine/surfaceContext';

// =============================================================================
// TYPES
// =============================================================================

export interface WebChatMessage {
    role: 'user' | 'model';
    text: string;
    isVoiceMessage?: boolean;
}

export interface ParticipantInfo {
    name?: string;
    email?: string;
    phone?: string;
}

export interface WebChatConversationOptions {
    apiBaseUrl?: string;
    publicProjectId?: string;
    sourceSurface?: string;
    sourceModule?: string;
    chatbotEngineContext?: ChatbotEngineSurfaceContext;
}

// =============================================================================
// HOOK
// =============================================================================

export const useWebChatConversation = (projectId: string, userId?: string, options: WebChatConversationOptions = {}) => {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const messageCountRef = useRef(0);
    // Use a ref to track conversation ID for immediate access (state updates are async)
    const conversationIdRef = useRef<string | null>(null);
    const apiBaseUrl = options.apiBaseUrl?.replace(/\/$/, '');
    const publicProjectId = options.publicProjectId || projectId;
    const sourceSurface = options.sourceSurface || options.chatbotEngineContext?.sourceSurface || 'website';
    const sourceModule = options.sourceModule || options.chatbotEngineContext?.sourceModule || 'chatcore';
    const chatbotEngineContext = options.chatbotEngineContext;
    const shouldPersistToDatabase = Boolean(userId);
    const shouldPersistViaApi = Boolean(!userId && apiBaseUrl && publicProjectId);
    const shouldPersist = shouldPersistToDatabase || shouldPersistViaApi;

    const getDataHelpers = useCallback(async () => {
        const [{ db }, helpers] = await Promise.all([
            import('@/utils/compatData'),
            import('@/utils/compatData'),
        ]);
        return { db, ...helpers };
    }, []);

    const callWidgetApi = useCallback(async (path: string, init: RequestInit = {}) => {
        if (!apiBaseUrl || !publicProjectId) {
            throw new Error('Widget API is not configured');
        }

        const response = await fetch(`${apiBaseUrl}/${encodeURIComponent(publicProjectId)}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(init.headers || {}),
            },
        });

        if (!response.ok) {
            let message = `Widget API request failed (${response.status})`;
            try {
                const payload = await response.json();
                message = payload?.error || message;
            } catch {
                // Ignore malformed error bodies.
            }
            throw new Error(message);
        }

        return response.json();
    }, [apiBaseUrl, publicProjectId]);

    const buildContextPayload = useCallback((metadata: Record<string, unknown> = {}) => ({
        sourceSurface,
        sourceModule,
        chatbotEngineContext,
        metadata: {
            ...metadata,
            sourceSurface,
            sourceModule,
            chatbotEngineContext,
        },
    }), [sourceSurface, sourceModule, chatbotEngineContext]);

    // ==========================================================================
    // CREATE OR GET CONVERSATION
    // ==========================================================================

    const getOrCreateConversation = useCallback(async (
        participantInfo?: ParticipantInfo
    ): Promise<string | null> => {
        if (!projectId) {
            console.warn('[useWebChatConversation] No projectId provided');
            return null;
        }
        if (!shouldPersist) {
            return null;
        }

        // If we already have a conversation for this session, return it
        if (conversationId) {
            return conversationId;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (shouldPersistViaApi) {
                const result = await callWidgetApi('/conversations', {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionId: sessionIdRef.current,
                        participantInfo,
                        ...buildContextPayload(),
                    }),
                });

                if (result.sessionId) sessionIdRef.current = result.sessionId;
                conversationIdRef.current = result.conversationId;
                setConversationId(result.conversationId);
                messageCountRef.current = result.messageCount || 0;
                setIsLoading(false);
                return result.conversationId;
            }

            const {
                db,
                collection,
                addDoc,
                Timestamp,
                query,
                where,
                getDocs,
                limit,
            } = await getDataHelpers();
            // Check if there's an existing active conversation for this session
            const conversationsRef = collection(db, 'socialConversations');
            const existingQuery = query(
                conversationsRef,
                where('projectId', '==', projectId),
                where('channel', '==', 'web'),
                where('participantId', '==', sessionIdRef.current),
                where('status', '==', 'active'),
                limit(1)
            );

            const existingSnapshot = await getDocs(existingQuery);
            
            if (!existingSnapshot.empty) {
                const existingId = existingSnapshot.docs[0].id;
                conversationIdRef.current = existingId;
                setConversationId(existingId);
                messageCountRef.current = existingSnapshot.docs[0].data().messageCount || 0;
                setIsLoading(false);
                return existingId;
            }

            // Create new conversation
            const now = Timestamp.now();
            // Build conversation data without undefined values (Supabase doesn't accept undefined)
            const conversationData: Record<string, any> = {
                projectId,
                channel: 'web',
                participantId: sessionIdRef.current,
                participantName: participantInfo?.name || 'Visitante Web',
                status: 'active',
                startedAt: now,
                lastMessageAt: now,
                messageCount: 0,
                unreadCount: 0,
                tags: ['web-chat', `surface:${sourceSurface}`, `module:${sourceModule}`],
                metadata: {
                    sourceSurface,
                    sourceModule,
                    chatbotEngineContext,
                    sessionId: sessionIdRef.current,
                },
            };
            
            // Only add optional fields if they have values
            if (participantInfo?.email) {
                conversationData.participantEmail = participantInfo.email;
            }
            if (participantInfo?.phone) {
                conversationData.participantPhone = participantInfo.phone;
            }

            const docRef = await addDoc(conversationsRef, conversationData);
            conversationIdRef.current = docRef.id;
            setConversationId(docRef.id);
            messageCountRef.current = 0;
            
            console.log('[useWebChatConversation] Created new conversation:', docRef.id);
            setIsLoading(false);
            return docRef.id;
        } catch (err: any) {
            console.error('[useWebChatConversation] Error creating conversation:', err);
            setError(err.message || 'Error al crear conversación');
            setIsLoading(false);
            return null;
        }
    }, [projectId, conversationId, shouldPersist, shouldPersistViaApi, callWidgetApi, getDataHelpers, buildContextPayload, sourceSurface, sourceModule, chatbotEngineContext]);

    // ==========================================================================
    // SAVE MESSAGE
    // ==========================================================================

    const saveMessage = useCallback(async (
        message: WebChatMessage,
        convId?: string
    ): Promise<boolean> => {
        // Use ref for immediate access (state updates are async)
        const targetConvId = convId || conversationIdRef.current || conversationId;
        
        if (!projectId || !targetConvId) {
            return false;
        }
        if (!shouldPersist) {
            return false;
        }

        try {
            if (shouldPersistViaApi) {
                const result = await callWidgetApi(`/conversations/${encodeURIComponent(targetConvId)}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionId: sessionIdRef.current,
                        role: message.role,
                        text: message.text,
                        isVoiceMessage: message.isVoiceMessage,
                        ...buildContextPayload({
                            isVoiceMessage: message.isVoiceMessage === true,
                        }),
                    }),
                });
                messageCountRef.current = result.messageCount || messageCountRef.current + 1;
                return true;
            }

            const { db, collection, doc, addDoc, updateDoc, getDoc, Timestamp } = await getDataHelpers();
            const now = Timestamp.now();
            const conversationRef = doc(db, 'socialConversations', targetConvId);
            let previousConversationData: Partial<SocialConversation> = {};

            try {
                const conversationSnapshot = await getDoc(conversationRef);
                previousConversationData = conversationSnapshot.exists()
                    ? conversationSnapshot.data()
                    : {};
            } catch (snapshotError) {
                console.warn('[useWebChatConversation] Could not load conversation metadata before saving message:', snapshotError);
            }

            const intentMetadata = buildChatbotMessageIntentMetadata({
                role: message.role,
                text: message.text,
                isVoiceMessage: message.isVoiceMessage,
                sourceSurface,
                sourceModule,
                chatbotEngineContext,
                previousConversationMetadata: previousConversationData.metadata,
                previousConversationTags: previousConversationData.tags,
            });
            
            // Create the message document
            const messageData: Omit<SocialMessage, 'id'> = {
                conversationId: targetConvId,
                projectId,
                channel: 'web',
                direction: message.role === 'user' ? 'inbound' : 'outbound',
                senderId: message.role === 'user' ? sessionIdRef.current : 'ai-assistant',
                senderName: message.role === 'user' ? 'Visitante' : 'Asistente AI',
                recipientId: message.role === 'user' ? 'ai-assistant' : sessionIdRef.current,
                message: message.text,
                messageType: message.isVoiceMessage ? 'audio' : 'text',
                timestamp: now,
                status: 'delivered',
                processedByAI: message.role === 'model',
                metadata: intentMetadata.messageMetadata,
            };

            // Save message to socialMessages collection
            const messagesRef = collection(db, 'socialMessages');
            await addDoc(messagesRef, messageData);

            // Update conversation's lastMessageAt and messageCount
            messageCountRef.current += 1;
            await updateDoc(conversationRef, {
                lastMessageAt: now,
                messageCount: messageCountRef.current,
                // Increment unread count for user messages
                ...(message.role === 'user' ? { unreadCount: messageCountRef.current } : {}),
                ...(intentMetadata.conversationMetadata ? { metadata: intentMetadata.conversationMetadata } : {}),
                ...(intentMetadata.conversationTags ? { tags: intentMetadata.conversationTags } : {}),
            });

            return true;
        } catch (err: any) {
            console.error('[useWebChatConversation] Error saving message:', err);
            return false;
        }
    }, [projectId, conversationId, shouldPersist, shouldPersistViaApi, callWidgetApi, getDataHelpers, buildContextPayload, sourceSurface, sourceModule, chatbotEngineContext]);

    // ==========================================================================
    // UPDATE PARTICIPANT INFO
    // ==========================================================================

    const updateParticipantInfo = useCallback(async (
        info: ParticipantInfo
    ): Promise<boolean> => {
        const targetConvId = conversationIdRef.current || conversationId;
        if (!targetConvId) {
            return false;
        }
        if (!shouldPersist) {
            return false;
        }

        try {
            if (shouldPersistViaApi) {
                await callWidgetApi(`/conversations/${encodeURIComponent(targetConvId)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ participantInfo: info, ...buildContextPayload() }),
                });
                console.log('[useWebChatConversation] Updated participant info');
                return true;
            }

            const { db, doc, updateDoc } = await getDataHelpers();
            const conversationRef = doc(db, 'socialConversations', targetConvId);
            const updates: Partial<SocialConversation> = {};
            
            if (info.name) updates.participantName = info.name;
            if (info.email) updates.participantEmail = info.email;
            if (info.phone) updates.participantPhone = info.phone;

            await updateDoc(conversationRef, updates);
            console.log('[useWebChatConversation] Updated participant info');
            return true;
        } catch (err: any) {
            console.error('[useWebChatConversation] Error updating participant:', err);
            return false;
        }
    }, [conversationId, shouldPersist, shouldPersistViaApi, callWidgetApi, getDataHelpers, buildContextPayload]);

    // ==========================================================================
    // CLOSE CONVERSATION
    // ==========================================================================

    const closeConversation = useCallback(async (): Promise<boolean> => {
        const targetConvId = conversationIdRef.current || conversationId;
        if (!targetConvId) {
            return false;
        }
        if (!shouldPersist) {
            return false;
        }

        try {
            if (shouldPersistViaApi) {
                await callWidgetApi(`/conversations/${encodeURIComponent(targetConvId)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'closed', ...buildContextPayload() }),
                });
                console.log('[useWebChatConversation] Closed conversation');
                return true;
            }

            const { db, doc, updateDoc } = await getDataHelpers();
            const conversationRef = doc(db, 'socialConversations', targetConvId);
            await updateDoc(conversationRef, {
                status: 'closed',
            });
            console.log('[useWebChatConversation] Closed conversation');
            return true;
        } catch (err: any) {
            console.error('[useWebChatConversation] Error closing conversation:', err);
            return false;
        }
    }, [conversationId, shouldPersist, shouldPersistViaApi, callWidgetApi, getDataHelpers, buildContextPayload]);

    // ==========================================================================
    // LINK TO LEAD
    // ==========================================================================

    const linkToLead = useCallback(async (leadId: string): Promise<boolean> => {
        const targetConvId = conversationIdRef.current || conversationId;
        if (!targetConvId) {
            return false;
        }
        if (!shouldPersist) {
            return false;
        }

        try {
            if (shouldPersistViaApi) {
                await callWidgetApi(`/conversations/${encodeURIComponent(targetConvId)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ leadId, ...buildContextPayload() }),
                });
                console.log('[useWebChatConversation] Linked to lead:', leadId);
                return true;
            }

            const { db, doc, updateDoc } = await getDataHelpers();
            const conversationRef = doc(db, 'socialConversations', targetConvId);
            await updateDoc(conversationRef, {
                leadId,
            });
            console.log('[useWebChatConversation] Linked to lead:', leadId);
            return true;
        } catch (err: any) {
            console.error('[useWebChatConversation] Error linking to lead:', err);
            return false;
        }
    }, [conversationId, shouldPersist, shouldPersistViaApi, callWidgetApi, getDataHelpers, buildContextPayload]);

    // ==========================================================================
    // SAVE FULL TRANSCRIPT
    // ==========================================================================

    const saveTranscript = useCallback(async (
        messages: WebChatMessage[]
    ): Promise<boolean> => {
        if (!projectId) {
            return false;
        }
        if (!shouldPersist) {
            return false;
        }

        // Get or create conversation first
        const convId = await getOrCreateConversation();
        if (!convId) {
            return false;
        }

        try {
            // Save all messages
            for (const msg of messages) {
                await saveMessage(msg, convId);
            }
            return true;
        } catch (err: any) {
            console.error('[useWebChatConversation] Error saving transcript:', err);
            return false;
        }
    }, [projectId, shouldPersist, getOrCreateConversation, saveMessage]);

    // ==========================================================================
    // RETURN
    // ==========================================================================

    return {
        conversationId,
        sessionId: sessionIdRef.current,
        isLoading,
        error,
        
        // Actions
        getOrCreateConversation,
        saveMessage,
        updateParticipantInfo,
        closeConversation,
        linkToLead,
        saveTranscript,
        
        // Helpers
        clearError: () => setError(null),
    };
};

export default useWebChatConversation;
