/**
 * useSupportChat
 * Real-time chat between agencies and their clients
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    senderType: 'agency' | 'client';
    message: string;
    attachments?: {
        type: 'image' | 'file';
        url: string;
        name: string;
    }[];
    readAt?: any;
    createdAt: any;
}

export interface SupportChat {
    id: string;
    agencyTenantId: string;
    clientTenantId: string;
    clientName: string;
    status: 'open' | 'closed' | 'pending';
    lastMessageAt?: any;
    lastMessage?: string;
    unreadCount: {
        agency: number;
        client: number;
    };
    createdAt: any;
    updatedAt: any;
}

// Helper to map DB record to SupportChat interface
const mapChatDoc = (data: any): SupportChat => ({
    id: data.id,
    agencyTenantId: data.agency_tenant_id,
    clientTenantId: data.client_tenant_id,
    clientName: data.client_name,
    status: data.status,
    lastMessageAt: data.last_message_at,
    lastMessage: data.last_message,
    unreadCount: data.unread_count || { agency: 0, client: 0 },
    createdAt: data.created_at,
    updatedAt: data.updated_at,
});

// Helper to map DB record to ChatMessage interface
const mapMessageDoc = (data: any): ChatMessage => ({
    id: data.id,
    chatId: data.chat_id,
    senderId: data.sender_id,
    senderName: data.sender_name,
    senderType: data.sender_type,
    message: data.message,
    attachments: data.attachments,
    readAt: data.read_at,
    createdAt: data.created_at,
});

// =============================================================================
// HOOK: Chat List
// =============================================================================

export function useSupportChats(tenantId: string | undefined, role: 'agency' | 'client') {
    const [chats, setChats] = useState<SupportChat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        const field = role === 'agency' ? 'agency_tenant_id' : 'client_tenant_id';

        const fetchChats = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('support_chats')
                    .select('*')
                    .eq(field, tenantId)
                    .order('last_message_at', { ascending: false, nullsFirst: false })
                    .limit(50);

                if (!isMounted) return;

                if (fetchError) throw fetchError;

                if (data) {
                    setChats(data.map(mapChatDoc));
                }
                setIsLoading(false);
            } catch (err) {
                if (!isMounted) return;
                console.error('Error loading chats:', err);
                setError('Error cargando chats');
                setIsLoading(false);
            }
        };

        fetchChats();

        const channelId = `support_chats_${tenantId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'support_chats', filter: `${field}=eq.${tenantId}` },
                () => {
                    if (isMounted) fetchChats();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [tenantId, role]);

    const totalUnread = chats.reduce(
        (sum, chat) => sum + (role === 'agency' ? chat.unreadCount.agency : chat.unreadCount.client),
        0
    );

    return { chats, totalUnread, isLoading, error };
}

// =============================================================================
// HOOK: Single Chat
// =============================================================================

export function useSupportChat(chatId: string | undefined) {
    const [chat, setChat] = useState<SupportChat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to chat metadata
    useEffect(() => {
        if (!chatId) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchChat = async () => {
            const { data } = await supabase
                .from('support_chats')
                .select('*')
                .eq('id', chatId)
                .maybeSingle();

            if (isMounted && data) {
                setChat(mapChatDoc(data));
            }
        };

        fetchChat();

        const channelId = `support_chat_${chatId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'support_chats', filter: `id=eq.${chatId}` },
                () => {
                    if (isMounted) fetchChat();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [chatId]);

    // Subscribe to messages
    useEffect(() => {
        if (!chatId) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchMessages = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('support_chat_messages')
                    .select('*')
                    .eq('chat_id', chatId)
                    .order('created_at', { ascending: true })
                    .limit(200);

                if (!isMounted) return;

                if (fetchError) throw fetchError;

                if (data) {
                    setMessages(data.map(mapMessageDoc));
                }
                setIsLoading(false);
            } catch (err) {
                if (!isMounted) return;
                console.error('Error loading messages:', err);
                setError('Error cargando mensajes');
                setIsLoading(false);
            }
        };

        fetchMessages();

        const channelId = `support_chat_messages_${chatId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'support_chat_messages', filter: `chat_id=eq.${chatId}` },
                () => {
                    if (isMounted) fetchMessages();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [chatId]);

    // Send message
    const sendMessage = useCallback(async (
        message: string,
        senderId: string,
        senderName: string,
        senderType: 'agency' | 'client'
    ) => {
        if (!chatId || !message.trim()) return;

        setIsSending(true);

        try {
            const now = new Date().toISOString();

            // Add message
            await supabase
                .from('support_chat_messages')
                .insert({
                    chat_id: chatId,
                    sender_id: senderId,
                    sender_name: senderName,
                    sender_type: senderType,
                    message: message.trim(),
                    created_at: now,
                });

            // Update chat metadata
            const otherType = senderType === 'agency' ? 'client' : 'agency';
            const currentUnread = chat?.unreadCount || { agency: 0, client: 0 };
            const newUnread = { ...currentUnread, [otherType]: (currentUnread[otherType as keyof typeof currentUnread] || 0) + 1 };

            await supabase
                .from('support_chats')
                .update({
                    last_message: message.trim().slice(0, 100),
                    last_message_at: now,
                    unread_count: newUnread,
                    updated_at: now,
                })
                .eq('id', chatId);

        } catch (err) {
            console.error('Error sending message:', err);
            setError('Error enviando mensaje');
        }

        setIsSending(false);
    }, [chatId, chat]);

    // Mark messages as read
    const markAsRead = useCallback(async (readerType: 'agency' | 'client') => {
        if (!chatId || !chat) return;

        const currentUnread = chat.unreadCount || { agency: 0, client: 0 };
        const newUnread = { ...currentUnread, [readerType]: 0 };

        await supabase
            .from('support_chats')
            .update({
                unread_count: newUnread,
            })
            .eq('id', chatId);
    }, [chatId, chat]);

    return {
        chat,
        messages,
        isLoading,
        isSending,
        error,
        sendMessage,
        markAsRead,
    };
}

// =============================================================================
// CREATE CHAT
// =============================================================================

export async function createSupportChat(
    agencyTenantId: string,
    clientTenantId: string,
    clientName: string
): Promise<string | null> {
    try {
        const id = `${agencyTenantId}_${clientTenantId}`;

        // Check if chat already exists
        const { data: existingChat, error: existingError } = await supabase
            .from('support_chats')
            .select('id')
            .eq('id', id)
            .maybeSingle();
        
        if (!existingError && existingChat) {
            return existingChat.id;
        }

        const now = new Date().toISOString();

        // Create new chat
        const { data, error } = await supabase
            .from('support_chats')
            .insert({
                id, // custom ID for easy lookup
                agency_tenant_id: agencyTenantId,
                client_tenant_id: clientTenantId,
                client_name: clientName,
                status: 'open',
                unread_count: { agency: 0, client: 0 },
                created_at: now,
                updated_at: now,
            })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    } catch (err) {
        console.error('Error creating chat:', err);
        return null;
    }
}

export default useSupportChat;
