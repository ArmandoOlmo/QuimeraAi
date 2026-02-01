/**
 * Social Chat Inbox
 * Unified inbox for managing conversations from WhatsApp, Facebook, and Instagram
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MessageCircle, Phone, Instagram, Facebook, Search, Filter,
    Send, Loader2, MoreVertical, User, Clock, CheckCircle,
    AlertCircle, UserPlus, Tag, X, ChevronRight, Archive,
    RefreshCw, Inbox, MessageSquare, Globe, ArrowLeft
} from 'lucide-react';
import { useSocialChat, ConversationWithMessages } from '../../chat/hooks/useSocialChat';
import { SocialChannel } from '../../../types/socialChat';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface SocialChatInboxProps {
    projectId: string;
    userId?: string;
    onBack?: () => void;
}

const SocialChatInbox: React.FC<SocialChatInboxProps> = ({
    projectId,
    userId,
    onBack
}) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'es' ? es : enUS;
    
    const {
        conversations,
        activeConversation,
        isLoading,
        error,
        stats,
        filter,
        setFilter,
        selectConversation,
        clearActiveConversation,
        sendMessage,
        updateConversationStatus,
        convertToLead,
        addTag,
    } = useSocialChat(projectId, userId);

    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showActions, setShowActions] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConversation?.messages]);

    // Get channel icon
    const getChannelIcon = (channel: SocialChannel, size: number = 16) => {
        switch (channel) {
            case 'whatsapp':
                return <Phone size={size} />;
            case 'facebook':
                return <Facebook size={size} />;
            case 'instagram':
                return <Instagram size={size} />;
            case 'web':
                return <Globe size={size} />;
            default:
                return <MessageCircle size={size} />;
        }
    };

    // Get channel color
    const getChannelColor = (channel: SocialChannel) => {
        switch (channel) {
            case 'whatsapp':
                return 'bg-green-500';
            case 'facebook':
                return 'bg-blue-600';
            case 'instagram':
                return 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400';
            case 'web':
                return 'bg-primary';
            default:
                return 'bg-muted';
        }
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-500 rounded-full">Activo</span>;
            case 'pending':
                return <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full">Pendiente</span>;
            case 'escalated':
                return <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-500 rounded-full">Escalado</span>;
            case 'closed':
                return <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">Cerrado</span>;
            default:
                return null;
        }
    };

    // Handle send message
    const handleSendMessage = async () => {
        if (!messageInput.trim() || !activeConversation || isSending) return;

        setIsSending(true);
        const success = await sendMessage({
            conversationId: activeConversation.id,
            channel: activeConversation.channel,
            recipientId: activeConversation.participantId,
            message: messageInput.trim(),
        });

        if (success) {
            setMessageInput('');
        }
        setIsSending(false);
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Format timestamp
    const formatTime = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
        if (!timestamp) return '';
        const date = new Date(timestamp.seconds * 1000);
        return formatDistanceToNow(date, { addSuffix: true, locale });
    };

    // Render conversation list
    const renderConversationList = () => (
        <div className="w-full lg:w-80 xl:w-96 border-r border-border flex flex-col bg-secondary/20">
            {/* Header */}
            <div className="p-4 border-t border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <h2 className="font-bold text-lg">Inbox</h2>
                        {stats.unreadMessages > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                                {stats.unreadMessages}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                    >
                        <Filter size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                    <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Buscar conversaciones..."
                        value={filter.searchTerm || ''}
                        onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                    />
                    {filter.searchTerm && (
                        <button onClick={() => setFilter({ ...filter, searchTerm: '' })} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="mt-3 p-3 bg-secondary/30 rounded-lg space-y-3 animate-fade-in-up">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Canal</label>
                            <div className="flex gap-1 flex-wrap">
                                {(['all', 'web', 'whatsapp', 'facebook', 'instagram'] as const).map((ch) => (
                                    <button
                                        key={ch}
                                        onClick={() => setFilter({ ...filter, channel: ch === 'all' ? undefined : ch })}
                                        className={`flex-1 min-w-[60px] p-2 rounded-lg text-xs font-medium transition-colors ${
                                            (ch === 'all' && !filter.channel) || filter.channel === ch
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary/50 hover:bg-secondary'
                                        }`}
                                    >
                                        {ch === 'all' ? 'Todos' : ch === 'web' ? 'Web Chat' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                            <div className="flex gap-1">
                                {(['all', 'active', 'pending', 'escalated'] as const).map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setFilter({ ...filter, status: st === 'all' ? undefined : st })}
                                        className={`flex-1 p-2 rounded-lg text-xs font-medium transition-colors ${
                                            (st === 'all' && !filter.status) || filter.status === st
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary/50 hover:bg-secondary'
                                        }`}
                                    >
                                        {st === 'all' ? 'Todos' : st.charAt(0).toUpperCase() + st.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            <div className="p-3 border-b border-border grid grid-cols-4 gap-2">
                {[
                    { channel: 'whatsapp' as SocialChannel, icon: <Phone size={12} />, color: 'text-green-500' },
                    { channel: 'facebook' as SocialChannel, icon: <Facebook size={12} />, color: 'text-blue-500' },
                    { channel: 'instagram' as SocialChannel, icon: <Instagram size={12} />, color: 'text-pink-500' },
                    { channel: 'web' as SocialChannel, icon: <Globe size={12} />, color: 'text-primary' },
                ].map(({ channel, icon, color }) => (
                    <div key={channel} className="text-center p-2 bg-secondary/30 rounded-lg">
                        <div className={`flex items-center justify-center gap-1 ${color}`}>
                            {icon}
                            <span className="text-xs font-bold">{stats.byChannel[channel].conversations}</span>
                        </div>
                        {stats.byChannel[channel].unread > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                                {stats.byChannel[channel].unread} sin leer
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Inbox size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">No hay conversaciones</p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => selectConversation(conv)}
                            className={`w-full p-4 border-b border-border text-left hover:bg-secondary/50 transition-colors ${
                                activeConversation?.id === conv.id ? 'bg-secondary' : ''
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Avatar with channel indicator */}
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        {conv.participantAvatar ? (
                                            <img src={conv.participantAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${getChannelColor(conv.channel)}`}>
                                        {React.cloneElement(getChannelIcon(conv.channel, 10) as React.ReactElement, { className: 'text-white' })}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-sm truncate">
                                            {conv.participantName || conv.participantPhone || 'Unknown'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatTime(conv.lastMessageAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {conv.lastMessage?.message || 'Sin mensajes'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {getStatusBadge(conv.status)}
                                        {conv.unreadCount > 0 && (
                                            <span className="px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    // Render chat area
    const renderChatArea = () => {
        if (!activeConversation) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 text-muted-foreground">
                    <MessageSquare size={64} className="mb-4 opacity-30" />
                    <h3 className="text-lg font-medium mb-1">Selecciona una conversación</h3>
                    <p className="text-sm">Elige una conversación del panel izquierdo para comenzar</p>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col bg-background">
                {/* Chat Header */}
                <div className="p-4 border-t border-b border-border flex items-center justify-between bg-card">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={clearActiveConversation}
                            className="lg:hidden p-2 hover:bg-secondary rounded-lg"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                {activeConversation.participantAvatar ? (
                                    <img src={activeConversation.participantAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <User size={20} className="text-muted-foreground" />
                                )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${getChannelColor(activeConversation.channel)}`}>
                                {React.cloneElement(getChannelIcon(activeConversation.channel, 10) as React.ReactElement, { className: 'text-white' })}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold">
                                {activeConversation.participantName || activeConversation.participantPhone || 'Unknown'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="capitalize">{activeConversation.channel}</span>
                                {activeConversation.participantEmail && (
                                    <>
                                        <span>•</span>
                                        <span>{activeConversation.participantEmail}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {getStatusBadge(activeConversation.status)}
                        <div className="relative">
                            <button
                                onClick={() => setShowActions(showActions ? null : activeConversation.id)}
                                className="p-2 hover:bg-secondary rounded-lg"
                            >
                                <MoreVertical size={18} />
                            </button>
                            {showActions === activeConversation.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 py-1 animate-fade-in-up">
                                    <button
                                        onClick={async () => {
                                            await convertToLead(activeConversation.id);
                                            setShowActions(null);
                                        }}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-2"
                                    >
                                        <UserPlus size={14} />
                                        Convertir en Lead
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateConversationStatus(activeConversation.id, 'escalated');
                                            setShowActions(null);
                                        }}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-2"
                                    >
                                        <AlertCircle size={14} />
                                        Escalar
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateConversationStatus(activeConversation.id, 'closed');
                                            setShowActions(null);
                                        }}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-2"
                                    >
                                        <Archive size={14} />
                                        Cerrar conversación
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeConversation.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <MessageCircle size={48} className="mb-2 opacity-30" />
                            <p className="text-sm">No hay mensajes aún</p>
                        </div>
                    ) : (
                        activeConversation.messages.map((msg, idx) => (
                            <div
                                key={msg.id || idx}
                                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                        msg.direction === 'outbound'
                                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                                            : 'bg-card border border-border rounded-bl-sm'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                                        msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    }`}>
                                        <Clock size={10} />
                                        {formatTime(msg.timestamp)}
                                        {msg.direction === 'outbound' && msg.status === 'delivered' && (
                                            <CheckCircle size={10} className="ml-1" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border bg-card">
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Escribe tu mensaje..."
                                rows={1}
                                className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                            />
                        </div>
                        <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || isSending}
                            className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        Los mensajes se envían a través de la API de {activeConversation.channel}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex bg-background">
            {/* Conversation List - Hidden on mobile when chat is active */}
            <div className={`${activeConversation ? 'hidden lg:flex' : 'flex'} flex-col bg-muted/30 border-r border-border`}>
                {renderConversationList()}
            </div>

            {/* Chat Area */}
            <div className={`${activeConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-background`}>
                {renderChatArea()}
            </div>
        </div>
    );
};

export default SocialChatInbox;

