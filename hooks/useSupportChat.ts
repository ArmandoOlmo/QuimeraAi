/**
 * useSupportChat
 * Real-time chat between agencies and their clients
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

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
    readAt?: Timestamp;
    createdAt: Timestamp;
}

export interface SupportChat {
    id: string;
    agencyTenantId: string;
    clientTenantId: string;
    clientName: string;
    status: 'open' | 'closed' | 'pending';
    lastMessageAt?: Timestamp;
    lastMessage?: string;
    unreadCount: {
        agency: number;
        client: number;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

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

        const field = role === 'agency' ? 'agencyTenantId' : 'clientTenantId';
        
        const q = query(
            collection(db, 'supportChats'),
            where(field, '==', tenantId),
            orderBy('lastMessageAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const chatList: SupportChat[] = [];
                snapshot.forEach((doc) => {
                    chatList.push({ id: doc.id, ...doc.data() } as SupportChat);
                });
                setChats(chatList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading chats:', err);
                setError('Error cargando chats');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
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

        const unsubscribe = onSnapshot(
            doc(db, 'supportChats', chatId),
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setChat({ id: docSnapshot.id, ...docSnapshot.data() } as SupportChat);
                }
            }
        );

        return () => unsubscribe();
    }, [chatId]);

    // Subscribe to messages
    useEffect(() => {
        if (!chatId) {
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, 'supportChats', chatId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(200)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const messageList: ChatMessage[] = [];
                snapshot.forEach((doc) => {
                    messageList.push({ id: doc.id, ...doc.data() } as ChatMessage);
                });
                setMessages(messageList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading messages:', err);
                setError('Error cargando mensajes');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
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
            // Add message
            await addDoc(collection(db, 'supportChats', chatId, 'messages'), {
                chatId,
                senderId,
                senderName,
                senderType,
                message: message.trim(),
                createdAt: serverTimestamp(),
            });

            // Update chat metadata
            const unreadField = senderType === 'agency' ? 'unreadCount.client' : 'unreadCount.agency';
            await updateDoc(doc(db, 'supportChats', chatId), {
                lastMessage: message.trim().slice(0, 100),
                lastMessageAt: serverTimestamp(),
                [unreadField]: (chat?.unreadCount[senderType === 'agency' ? 'client' : 'agency'] || 0) + 1,
                updatedAt: serverTimestamp(),
            });

        } catch (err) {
            console.error('Error sending message:', err);
            setError('Error enviando mensaje');
        }

        setIsSending(false);
    }, [chatId, chat]);

    // Mark messages as read
    const markAsRead = useCallback(async (readerType: 'agency' | 'client') => {
        if (!chatId) return;

        const unreadField = `unreadCount.${readerType}`;
        await updateDoc(doc(db, 'supportChats', chatId), {
            [unreadField]: 0,
        });
    }, [chatId]);

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
        // Check if chat already exists
        const existingQuery = await getDoc(doc(db, 'supportChats', `${agencyTenantId}_${clientTenantId}`));
        
        if (existingQuery.exists()) {
            return existingQuery.id;
        }

        // Create new chat
        const chatRef = await addDoc(collection(db, 'supportChats'), {
            agencyTenantId,
            clientTenantId,
            clientName,
            status: 'open',
            unreadCount: { agency: 0, client: 0 },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return chatRef.id;
    } catch (err) {
        console.error('Error creating chat:', err);
        return null;
    }
}

export default useSupportChat;
