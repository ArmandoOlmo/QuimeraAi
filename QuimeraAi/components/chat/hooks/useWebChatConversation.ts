/**
 * useWebChatConversation Hook
 * Manages web chat conversations for persistence and Inbox display
 */

import { useState, useCallback, useRef } from 'react';
import { 
    collection, doc, addDoc, updateDoc, getDoc, setDoc,
    Timestamp, query, where, getDocs, limit
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { SocialConversation, SocialMessage } from '../../../types/socialChat';

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

// =============================================================================
// HOOK
// =============================================================================

export const useWebChatConversation = (projectId: string, userId?: string) => {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const messageCountRef = useRef(0);
    // Use a ref to track conversation ID for immediate access (state updates are async)
    const conversationIdRef = useRef<string | null>(null);

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

        // If we already have a conversation for this session, return it
        if (conversationId) {
            return conversationId;
        }

        setIsLoading(true);
        setError(null);

        try {
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
            // Build conversation data without undefined values (Firestore doesn't accept undefined)
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
                tags: ['web-chat'],
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
    }, [projectId, conversationId]);

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
            console.warn('[useWebChatConversation] Cannot save message: missing projectId or conversationId');
            return false;
        }

        try {
            const now = Timestamp.now();
            
            // Create the message document
            const messageData: Omit<SocialMessage, 'id'> = {
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
            };

            // Save message to socialMessages collection
            const messagesRef = collection(db, 'socialMessages');
            await addDoc(messagesRef, messageData);

            // Update conversation's lastMessageAt and messageCount
            messageCountRef.current += 1;
            const conversationRef = doc(db, 'socialConversations', targetConvId);
            await updateDoc(conversationRef, {
                lastMessageAt: now,
                messageCount: messageCountRef.current,
                // Increment unread count for user messages
                ...(message.role === 'user' ? { unreadCount: messageCountRef.current } : {}),
            });

            return true;
        } catch (err: any) {
            console.error('[useWebChatConversation] Error saving message:', err);
            return false;
        }
    }, [projectId, conversationId]);

    // ==========================================================================
    // UPDATE PARTICIPANT INFO
    // ==========================================================================

    const updateParticipantInfo = useCallback(async (
        info: ParticipantInfo
    ): Promise<boolean> => {
        const targetConvId = conversationIdRef.current || conversationId;
        if (!targetConvId) {
            console.warn('[useWebChatConversation] No conversation to update');
            return false;
        }

        try {
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
    }, [conversationId]);

    // ==========================================================================
    // CLOSE CONVERSATION
    // ==========================================================================

    const closeConversation = useCallback(async (): Promise<boolean> => {
        const targetConvId = conversationIdRef.current || conversationId;
        if (!targetConvId) {
            return false;
        }

        try {
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
    }, [conversationId]);

    // ==========================================================================
    // LINK TO LEAD
    // ==========================================================================

    const linkToLead = useCallback(async (leadId: string): Promise<boolean> => {
        const targetConvId = conversationIdRef.current || conversationId;
        if (!targetConvId) {
            return false;
        }

        try {
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
    }, [conversationId]);

    // ==========================================================================
    // SAVE FULL TRANSCRIPT
    // ==========================================================================

    const saveTranscript = useCallback(async (
        messages: WebChatMessage[]
    ): Promise<boolean> => {
        if (!projectId) {
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
    }, [projectId, getOrCreateConversation, saveMessage]);

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

