/**
 * useSocialChat Hook
 * Hook for managing social media conversations across all channels
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    collection, query, where, orderBy, limit, onSnapshot, 
    doc, updateDoc, addDoc, getDocs, Timestamp, writeBatch
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { SocialChannel, SocialMessage, SocialConversation } from '../../../types/socialChat';

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationWithMessages extends SocialConversation {
    messages: SocialMessage[];
    lastMessage?: SocialMessage;
}

export interface SocialChatStats {
    totalConversations: number;
    activeConversations: number;
    unreadMessages: number;
    byChannel: Record<SocialChannel, {
        conversations: number;
        unread: number;
    }>;
}

export interface SendMessageParams {
    conversationId: string;
    channel: SocialChannel;
    recipientId: string;
    message: string;
    messageType?: 'text' | 'image' | 'template';
}

// =============================================================================
// HOOK
// =============================================================================

export const useSocialChat = (projectId: string, userId?: string) => {
    const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
    const [activeConversation, setActiveConversation] = useState<ConversationWithMessages | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<{
        channel?: SocialChannel;
        status?: 'active' | 'closed' | 'pending' | 'escalated';
        searchTerm?: string;
    }>({});

    // ==========================================================================
    // FETCH CONVERSATIONS
    // ==========================================================================

    useEffect(() => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Subscribe to conversations
        const conversationsRef = collection(db, 'socialConversations');
        let conversationsQuery = query(
            conversationsRef,
            where('projectId', '==', projectId),
            orderBy('lastMessageAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(
            conversationsQuery,
            async (snapshot) => {
                const conversationsData: ConversationWithMessages[] = [];

                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    
                    // Get last message for each conversation - wrapped in try-catch
                    let lastMessage: SocialMessage | undefined;
                    try {
                        const messagesRef = collection(db, 'socialMessages');
                        const messagesQuery = query(
                            messagesRef,
                            where('projectId', '==', projectId),
                            where('channel', '==', data.channel),
                            orderBy('timestamp', 'desc'),
                            limit(1)
                        );
                        
                        const messagesSnap = await getDocs(messagesQuery);
                        lastMessage = messagesSnap.docs[0]?.data() as SocialMessage | undefined;
                    } catch (msgError) {
                        // Silently handle errors fetching last message
                        console.debug('[useSocialChat] Could not fetch last message:', msgError);
                    }

                    conversationsData.push({
                        id: docSnap.id,
                        projectId: data.projectId,
                        channel: data.channel,
                        participantId: data.participantId,
                        participantName: data.participantName,
                        participantAvatar: data.participantAvatar,
                        participantEmail: data.participantEmail,
                        participantPhone: data.participantPhone,
                        status: data.status || 'active',
                        startedAt: data.startedAt,
                        lastMessageAt: data.lastMessageAt,
                        messageCount: data.messageCount || 0,
                        unreadCount: data.unreadCount || 0,
                        assignedTo: data.assignedTo,
                        tags: data.tags || [],
                        notes: data.notes,
                        leadId: data.leadId,
                        messages: [],
                        lastMessage,
                    });
                }

                setConversations(conversationsData);
                setIsLoading(false);
            },
            (err: any) => {
                // Handle permission-denied errors silently (expected when collections don't exist)
                if (err?.code === 'permission-denied') {
                    console.debug('[useSocialChat] No permission to access socialConversations - this is normal if no chats exist yet');
                    setConversations([]);
                    setIsLoading(false);
                    return;
                }
                console.error('Error fetching conversations:', err);
                setError('Error al cargar conversaciones');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [projectId]);

    // ==========================================================================
    // LOAD CONVERSATION MESSAGES
    // ==========================================================================

    const loadConversationMessages = useCallback(async (conversationId: string, participantId: string, channel: SocialChannel) => {
        if (!projectId) return;

        try {
            const messagesRef = collection(db, 'socialMessages');
            const messagesQuery = query(
                messagesRef,
                where('projectId', '==', projectId),
                where('channel', '==', channel),
                orderBy('timestamp', 'asc'),
                limit(100)
            );

            const snapshot = await getDocs(messagesQuery);
            const messages: SocialMessage[] = snapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    return data.senderId === participantId || data.recipientId === participantId;
                })
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SocialMessage));

            // Find and update the conversation
            const conversation = conversations.find(c => c.id === conversationId);
            if (conversation) {
                const updatedConversation = { ...conversation, messages };
                setActiveConversation(updatedConversation);
                
                // Mark as read
                if (conversation.unreadCount > 0) {
                    await markAsRead(conversationId);
                }
            }

            return messages;
        } catch (err) {
            console.error('Error loading messages:', err);
            setError('Error al cargar mensajes');
            return [];
        }
    }, [projectId, conversations]);

    // ==========================================================================
    // SEND MESSAGE
    // ==========================================================================

    const sendMessage = useCallback(async (params: SendMessageParams): Promise<boolean> => {
        const { conversationId, channel, recipientId, message, messageType = 'text' } = params;

        if (!projectId || !userId) {
            setError('No autorizado');
            return false;
        }

        try {
            // Store message locally first
            const messagesRef = collection(db, 'socialMessages');
            await addDoc(messagesRef, {
                projectId,
                channel,
                direction: 'outbound',
                senderId: 'business',
                senderName: 'Business',
                recipientId,
                message,
                messageType,
                timestamp: Timestamp.now(),
                status: 'pending',
                createdAt: Timestamp.now(),
            });

            // Update conversation
            const conversationRef = doc(db, 'socialConversations', conversationId);
            await updateDoc(conversationRef, {
                lastMessageAt: Timestamp.now(),
                messageCount: (activeConversation?.messageCount || 0) + 1,
            });

            // Call Cloud Function to actually send the message
            // This would be done via Firebase callable function
            // For now, we'll simulate success

            return true;
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Error al enviar mensaje');
            return false;
        }
    }, [projectId, userId, activeConversation]);

    // ==========================================================================
    // MARK AS READ
    // ==========================================================================

    const markAsRead = useCallback(async (conversationId: string) => {
        try {
            const conversationRef = doc(db, 'socialConversations', conversationId);
            await updateDoc(conversationRef, {
                unreadCount: 0,
            });

            // Update local state
            setConversations(prev => 
                prev.map(c => 
                    c.id === conversationId ? { ...c, unreadCount: 0 } : c
                )
            );
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    }, []);

    // ==========================================================================
    // UPDATE CONVERSATION STATUS
    // ==========================================================================

    const updateConversationStatus = useCallback(async (
        conversationId: string, 
        status: 'active' | 'closed' | 'pending' | 'escalated'
    ) => {
        try {
            const conversationRef = doc(db, 'socialConversations', conversationId);
            await updateDoc(conversationRef, { status });

            setConversations(prev =>
                prev.map(c =>
                    c.id === conversationId ? { ...c, status } : c
                )
            );

            if (activeConversation?.id === conversationId) {
                setActiveConversation(prev => prev ? { ...prev, status } : null);
            }
        } catch (err) {
            console.error('Error updating conversation status:', err);
            setError('Error al actualizar estado');
        }
    }, [activeConversation]);

    // ==========================================================================
    // ASSIGN CONVERSATION
    // ==========================================================================

    const assignConversation = useCallback(async (conversationId: string, agentId: string | null) => {
        try {
            const conversationRef = doc(db, 'socialConversations', conversationId);
            await updateDoc(conversationRef, { 
                assignedTo: agentId,
                status: agentId ? 'escalated' : 'active'
            });

            setConversations(prev =>
                prev.map(c =>
                    c.id === conversationId ? { ...c, assignedTo: agentId || undefined, status: agentId ? 'escalated' : 'active' } : c
                )
            );
        } catch (err) {
            console.error('Error assigning conversation:', err);
            setError('Error al asignar conversación');
        }
    }, []);

    // ==========================================================================
    // ADD TAGS
    // ==========================================================================

    const addTag = useCallback(async (conversationId: string, tag: string) => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        const newTags = [...(conversation.tags || []), tag];
        
        try {
            const conversationRef = doc(db, 'socialConversations', conversationId);
            await updateDoc(conversationRef, { tags: newTags });

            setConversations(prev =>
                prev.map(c =>
                    c.id === conversationId ? { ...c, tags: newTags } : c
                )
            );
        } catch (err) {
            console.error('Error adding tag:', err);
        }
    }, [conversations]);

    // ==========================================================================
    // CONVERT TO LEAD
    // ==========================================================================

    const convertToLead = useCallback(async (conversationId: string): Promise<string | null> => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation || !userId) return null;

        try {
            // Create lead in the user's leads collection
            const leadsRef = collection(db, 'users', userId, 'projects', projectId, 'leads');
            const leadDoc = await addDoc(leadsRef, {
                name: conversation.participantName || 'Unknown',
                email: conversation.participantEmail || '',
                phone: conversation.participantPhone || '',
                status: 'new',
                source: `social-${conversation.channel}`,
                message: `Converted from ${conversation.channel} conversation`,
                createdAt: Timestamp.now(),
                tags: ['social-chat', conversation.channel],
                notes: `Social chat conversation ID: ${conversationId}`,
            });

            // Update conversation with lead reference
            const conversationRef = doc(db, 'socialConversations', conversationId);
            await updateDoc(conversationRef, { leadId: leadDoc.id });

            setConversations(prev =>
                prev.map(c =>
                    c.id === conversationId ? { ...c, leadId: leadDoc.id } : c
                )
            );

            return leadDoc.id;
        } catch (err) {
            console.error('Error converting to lead:', err);
            setError('Error al convertir en lead');
            return null;
        }
    }, [conversations, projectId, userId]);

    // ==========================================================================
    // COMPUTED VALUES
    // ==========================================================================

    const filteredConversations = useMemo(() => {
        return conversations.filter(conv => {
            if (filter.channel && conv.channel !== filter.channel) return false;
            if (filter.status && conv.status !== filter.status) return false;
            if (filter.searchTerm) {
                const searchLower = filter.searchTerm.toLowerCase();
                const nameMatch = conv.participantName?.toLowerCase().includes(searchLower);
                const emailMatch = conv.participantEmail?.toLowerCase().includes(searchLower);
                const phoneMatch = conv.participantPhone?.includes(filter.searchTerm);
                if (!nameMatch && !emailMatch && !phoneMatch) return false;
            }
            return true;
        });
    }, [conversations, filter]);

    const stats = useMemo((): SocialChatStats => {
        const byChannel: Record<SocialChannel, { conversations: number; unread: number }> = {
            facebook: { conversations: 0, unread: 0 },
            whatsapp: { conversations: 0, unread: 0 },
            instagram: { conversations: 0, unread: 0 },
            web: { conversations: 0, unread: 0 },
        };

        let totalUnread = 0;
        let activeCount = 0;

        conversations.forEach(conv => {
            byChannel[conv.channel].conversations++;
            byChannel[conv.channel].unread += conv.unreadCount;
            totalUnread += conv.unreadCount;
            if (conv.status === 'active' || conv.status === 'pending') {
                activeCount++;
            }
        });

        return {
            totalConversations: conversations.length,
            activeConversations: activeCount,
            unreadMessages: totalUnread,
            byChannel,
        };
    }, [conversations]);

    // ==========================================================================
    // RETURN
    // ==========================================================================

    return {
        // State
        conversations: filteredConversations,
        allConversations: conversations,
        activeConversation,
        isLoading,
        error,
        stats,
        filter,

        // Actions
        setActiveConversation,
        setFilter,
        loadConversationMessages,
        sendMessage,
        markAsRead,
        updateConversationStatus,
        assignConversation,
        addTag,
        convertToLead,

        // Helpers
        selectConversation: (conv: ConversationWithMessages) => {
            setActiveConversation(conv);
            loadConversationMessages(conv.id, conv.participantId, conv.channel);
        },
        clearActiveConversation: () => setActiveConversation(null),
        clearError: () => setError(null),
    };
};

export default useSocialChat;

