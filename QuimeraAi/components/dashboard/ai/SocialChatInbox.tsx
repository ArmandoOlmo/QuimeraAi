/**
 * Social Chat Inbox
 * Unified inbox for managing conversations from WhatsApp, Facebook, and Instagram
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MessageCircle, Phone, Instagram, Facebook, Search, Filter,
    Send, Loader2, MoreVertical, Clock, CheckCircle,
    AlertCircle, UserPlus, X, Archive,
    Inbox, MessageSquare, Globe, Mail
} from 'lucide-react';
import { useSocialChat, ConversationWithMessages } from '../../chat/hooks/useSocialChat';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { FilterChipRow } from '../filters';
import type { FilterChipOption } from '../filters';
import { SocialChannel } from '../../../types/socialChat';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { buildEmailReviewQueueUrl } from '../../../services/email/emailReviewQueueLinkService.ts';

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

    type ChannelFilter = 'all' | SocialChannel;
    type StatusFilter = 'all' | 'active' | 'pending' | 'escalated';

    const channelFilterOptions = useMemo<FilterChipOption<ChannelFilter>[]>(() => [
        { id: 'all', label: t('common.all', 'Todos') },
        { id: 'web', label: t('socialChat.channelWeb', 'Web Chat') },
        { id: 'whatsapp', label: 'WhatsApp' },
        { id: 'facebook', label: 'Facebook' },
        { id: 'instagram', label: 'Instagram' },
    ], [t]);

    const statusFilterOptions = useMemo<FilterChipOption<StatusFilter>[]>(() => [
        { id: 'all', label: t('common.all', 'Todos') },
        { id: 'active', label: t('socialChat.statusActive', 'Activo'), color: 'green' },
        { id: 'pending', label: t('socialChat.statusPending', 'Pendiente'), color: 'gray' },
        { id: 'escalated', label: t('socialChat.statusEscalated', 'Escalado'), color: 'gray' },
    ], [t]);

    const activeChannelFilter: ChannelFilter = filter.channel ?? 'all';
    const activeStatusFilter: StatusFilter = (filter.status as StatusFilter | undefined) ?? 'all';
    const hasAnyConversations = stats.totalConversations > 0;

    const channelLabels: Record<SocialChannel, string> = {
        web: t('aiAssistant.socialInbox.channels.web', 'Web'),
        whatsapp: 'WhatsApp',
        facebook: 'Facebook',
        instagram: 'Instagram',
    };

    const participantLabel = (conversation: ConversationWithMessages) => (
        conversation.participantName
        || conversation.participantEmail
        || conversation.participantPhone
        || t('aiAssistant.socialInbox.unknownVisitor', 'Visitante')
    );

    // Get channel icon
    const getChannelIcon = (channel: SocialChannel, size: number = 16, className = '') => {
        switch (channel) {
            case 'whatsapp':
                return <Phone size={size} className={className} />;
            case 'facebook':
                return <Facebook size={size} className={className} />;
            case 'instagram':
                return <Instagram size={size} className={className} />;
            case 'web':
                return <Globe size={size} className={className} />;
            default:
                return <MessageCircle size={size} className={className} />;
        }
    };

    // Get channel color
    const getChannelColor = (channel: SocialChannel) => {
        switch (channel) {
            case 'whatsapp':
                return 'bg-q-success';
            case 'facebook':
                return 'bg-q-accent';
            case 'instagram':
                return 'bg-gradient-to-br from-q-accent via-q-accent/80 to-q-warning';
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
                return <span className="px-2 py-0.5 text-[11px] font-semibold bg-q-success/15 text-q-success rounded-full">{t('aiAssistant.socialInbox.status.active', 'Activo')}</span>;
            case 'pending':
                return <span className="px-2 py-0.5 text-[11px] font-semibold bg-q-accent/15 text-q-accent rounded-full">{t('aiAssistant.socialInbox.status.pending', 'Pendiente')}</span>;
            case 'escalated':
                return <span className="px-2 py-0.5 text-[11px] font-semibold bg-q-error/15 text-q-error rounded-full">{t('aiAssistant.socialInbox.status.escalated', 'Escalado')}</span>;
            case 'closed':
                return <span className="px-2 py-0.5 text-[11px] font-semibold bg-secondary text-q-text-muted rounded-full">{t('aiAssistant.socialInbox.status.closed', 'Cerrado')}</span>;
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
    const formatTime = (timestamp: { seconds: number; nanoseconds: number } | string | Date | undefined) => {
        if (!timestamp) return '';
        const date = timestamp instanceof Date
            ? timestamp
            : typeof timestamp === 'string'
                ? new Date(timestamp)
                : new Date(timestamp.seconds * 1000);
        if (Number.isNaN(date.getTime())) return '';
        return formatDistanceToNow(date, { addSuffix: true, locale });
    };

    // Render conversation list
    const renderConversationList = () => (
        <div className="w-full lg:w-[360px] xl:w-[420px] border-r border-q-border/70 flex flex-col bg-q-bg">
            {/* Header */}
            <div className="p-4 border-b border-q-border/70 bg-q-surface/70">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-lg text-foreground">{t('aiAssistant.socialInbox.title', 'Bandeja')}</h2>
                            <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-semibold text-q-text-muted">
                                {stats.totalConversations}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-q-text-muted line-clamp-1">
                            {t('aiAssistant.socialInbox.subtitle', 'Conversaciones de Website, Storefront, Bio y canales conectados')}
                        </p>
                        {stats.unreadMessages > 0 && (
                            <span className="mt-2 inline-flex rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                                {t('aiAssistant.socialInbox.unreadCount', '{{count}} sin leer', { count: stats.unreadMessages })}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-q-text-muted hover:text-foreground'}`}
                            aria-label={t('aiAssistant.socialInbox.filters', 'Filtros')}
                        >
                            <Filter size={16} />
                        </button>
                        {onBack && <HeaderBackButton onClick={onBack} />}
                    </div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-q-bg border border-q-border/60 rounded-lg px-3 py-2.5">
                    <Search size={16} className="text-q-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        placeholder={t('aiAssistant.socialInbox.searchPlaceholder', 'Buscar por contacto, mensaje o etiqueta...')}
                        value={filter.searchTerm || ''}
                        onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0 placeholder:text-q-text-muted"
                    />
                    {filter.searchTerm && (
                        <button onClick={() => setFilter({ ...filter, searchTerm: '' })} className="text-q-text-secondary hover:text-q-text flex-shrink-0">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="mt-3 p-3 bg-q-bg border border-q-border/60 rounded-lg space-y-3 animate-fade-in-up">
                        <div>
                            <label className="text-xs text-q-text-muted mb-1 block">{t('socialChat.channel', 'Canal')}</label>
                            <FilterChipRow
                                options={channelFilterOptions}
                                value={activeChannelFilter}
                                onChange={(value) => setFilter({ ...filter, channel: value === 'all' ? undefined : value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-q-text-muted mb-1 block">{t('socialChat.status', 'Estado')}</label>
                            <FilterChipRow
                                options={statusFilterOptions}
                                value={activeStatusFilter}
                                onChange={(value) => setFilter({ ...filter, status: value === 'all' ? undefined : value })}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            <div className="p-3 border-b border-q-border/70 grid grid-cols-4 gap-2 bg-q-surface/35">
                {[
                    { channel: 'web' as SocialChannel, icon: <Globe size={13} />, color: 'text-primary' },
                    { channel: 'whatsapp' as SocialChannel, icon: <Phone size={13} />, color: 'text-q-success' },
                    { channel: 'facebook' as SocialChannel, icon: <Facebook size={13} />, color: 'text-q-accent' },
                    { channel: 'instagram' as SocialChannel, icon: <Instagram size={13} />, color: 'text-q-accent' },
                ].map(({ channel, icon, color }) => (
                    <button
                        key={channel}
                        onClick={() => setFilter({ ...filter, channel: filter.channel === channel ? undefined : channel })}
                        className={`min-w-0 rounded-lg border px-2 py-2 text-left transition-colors ${
                            filter.channel === channel
                                ? 'border-primary/50 bg-primary/10'
                                : 'border-q-border/50 bg-q-bg hover:border-q-border'
                        }`}
                        title={channelLabels[channel]}
                    >
                        <div className={`flex items-center justify-center gap-1 ${color}`}>
                            {icon}
                            <span className="text-xs font-bold">{stats.byChannel[channel].conversations}</span>
                        </div>
                        {stats.byChannel[channel].unread > 0 && (
                            <span className="block truncate text-center text-[10px] text-q-text-muted">
                                {t('aiAssistant.socialInbox.shortUnread', '{{count}} unread', { count: stats.byChannel[channel].unread })}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mx-3 mt-3 rounded-lg border border-q-error/30 bg-q-error/10 px-3 py-2 text-xs text-q-error">
                    {error}
                </div>
            )}

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-56">
                        <Loader2 size={24} className="animate-spin text-q-text-muted" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center text-q-text-muted">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-q-border/70 bg-q-surface">
                            <Inbox size={26} className="opacity-70" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                            {hasAnyConversations
                                ? t('aiAssistant.socialInbox.noFilteredConversations', 'No hay resultados con estos filtros')
                                : t('aiAssistant.socialInbox.noConversations', 'Sin conversaciones todavía')}
                        </h3>
                        <p className="mt-2 max-w-[260px] text-xs leading-5">
                            {hasAnyConversations
                                ? t('aiAssistant.socialInbox.noFilteredConversationsDesc', 'Cambia el canal, estado o búsqueda para ver más conversaciones.')
                                : t('aiAssistant.socialInbox.noConversationsDesc', 'Cuando un visitante escriba desde el chat público, aparecerá aquí con su intención y estado.')}
                        </p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => selectConversation(conv)}
                            className={`w-full p-4 border-b border-q-border/60 text-left transition-colors ${
                                activeConversation?.id === conv.id
                                    ? 'bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]'
                                    : 'hover:bg-q-surface/70'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Avatar with channel indicator */}
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                        {conv.participantAvatar ? (
                                            <img src={conv.participantAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-q-text-muted">
                                                {participantLabel(conv).slice(0, 1).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${getChannelColor(conv.channel)}`}>
                                        {getChannelIcon(conv.channel, 10, 'text-white')}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-sm truncate text-foreground">
                                            {participantLabel(conv)}
                                        </span>
                                        <span className="text-[10px] text-q-text-muted whitespace-nowrap">
                                            {formatTime(conv.lastMessageAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-q-text-muted truncate mt-1">
                                        {conv.lastMessage?.message || t('aiAssistant.socialInbox.noMessagesYet', 'Sin mensajes todavía')}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {getStatusBadge(conv.status)}
                                        <span className="rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-q-text-muted">
                                            {channelLabels[conv.channel]}
                                        </span>
                                        {conv.leadId && (
                                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                                Lead
                                            </span>
                                        )}
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
            const emptyTitle = hasAnyConversations
                ? t('aiAssistant.socialInbox.selectConversation', 'Selecciona una conversación')
                : t('aiAssistant.socialInbox.emptyTitle', 'Aún no hay conversaciones');
            const emptyDescription = hasAnyConversations
                ? t('aiAssistant.socialInbox.selectConversationDesc', 'Abre una conversación para responder, convertir en lead o escalar a humano.')
                : t('aiAssistant.socialInbox.emptyDesc', 'ChatCore y los canales conectados guardarán conversaciones reales aquí.');

            return (
                <div className="flex min-w-0 flex-1 flex-col bg-q-bg">
                    <div className="border-b border-q-border/70 bg-q-surface/70 px-5 py-4 lg:px-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                                    {t('aiAssistant.socialInbox.detailEyebrow', 'Vista de conversación')}
                                </p>
                                <h3 className="mt-1 truncate text-base font-bold text-foreground">
                                    {emptyTitle}
                                </h3>
                                <p className="mt-1 max-w-2xl text-sm text-q-text-muted">
                                    {emptyDescription}
                                </p>
                            </div>
                            <div className="hidden shrink-0 items-center gap-2 xl:flex">
                                {(['web', 'whatsapp', 'facebook', 'instagram'] as SocialChannel[]).map(channel => (
                                    <button
                                        key={channel}
                                        onClick={() => setFilter({ ...filter, channel: filter.channel === channel ? undefined : channel })}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                                            filter.channel === channel
                                                ? 'border-primary/50 bg-primary/10 text-primary'
                                                : 'border-q-border/60 bg-q-bg text-q-text-muted hover:text-foreground'
                                        }`}
                                    >
                                        {getChannelIcon(channel, 13)}
                                        <span>{channelLabels[channel]}</span>
                                        <span className="font-bold">{stats.byChannel[channel].conversations}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 lg:p-6">
                        <div className="grid max-w-6xl gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="min-h-[300px] rounded-xl border border-q-border/70 bg-q-surface/55 p-6">
                                <div className="flex h-full min-h-[248px] flex-col justify-between">
                                    <div>
                                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <MessageSquare size={24} />
                                        </div>
                                        <h4 className="text-lg font-bold text-foreground">
                                            {hasAnyConversations
                                                ? t('aiAssistant.socialInbox.detailEmptyTitle', 'Lista lista para revisar')
                                                : t('aiAssistant.socialInbox.readyTitle', 'Bandeja lista')}
                                        </h4>
                                        <p className="mt-2 max-w-xl text-sm leading-6 text-q-text-muted">
                                            {hasAnyConversations
                                                ? t('aiAssistant.socialInbox.detailEmptyDesc', 'Las conversaciones seleccionadas se abrirán aquí con mensajes, estado, lead y acciones de handoff.')
                                                : t('aiAssistant.socialInbox.readyDesc', 'El Inbox mostrará conversaciones reales guardadas por ChatCore y canales conectados.')}
                                        </p>
                                    </div>
                                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                                        <div className="rounded-lg border border-q-border/60 bg-q-bg px-4 py-3">
                                            <div className="text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                                                {t('aiAssistant.socialInbox.emptyQueueLabel', 'Estado')}
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-foreground">
                                                {hasAnyConversations
                                                    ? t('aiAssistant.socialInbox.emptyQueueReview', 'Pendiente de selección')
                                                    : t('aiAssistant.socialInbox.emptyQueueWaiting', 'Esperando conversaciones')}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-q-border/60 bg-q-bg px-4 py-3">
                                            <div className="text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                                                {t('aiAssistant.socialInbox.emptySourceLabel', 'Superficies')}
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-foreground">
                                                Website · Storefront · Bio
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                                {[
                                    { label: t('aiAssistant.socialInbox.metrics.total', 'Conversaciones'), value: stats.totalConversations, icon: Inbox },
                                    { label: t('aiAssistant.socialInbox.metrics.active', 'Activas'), value: stats.activeConversations, icon: MessageCircle },
                                    { label: t('aiAssistant.socialInbox.metrics.unread', 'Sin leer'), value: stats.unreadMessages, icon: AlertCircle },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="rounded-xl border border-q-border/60 bg-q-surface/55 p-4">
                                            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Icon size={17} />
                                            </div>
                                            <div className="text-2xl font-bold text-foreground">{item.value}</div>
                                            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-q-text-muted">{item.label}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col bg-q-bg">
                {/* Chat Header */}
                <div className="p-4 border-b border-q-border/70 flex items-center justify-between bg-q-surface/80">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                {activeConversation.participantAvatar ? (
                                    <img src={activeConversation.participantAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <span className="text-sm font-bold text-q-text-muted">
                                        {participantLabel(activeConversation).slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${getChannelColor(activeConversation.channel)}`}>
                                {getChannelIcon(activeConversation.channel, 10, 'text-white')}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">
                                {participantLabel(activeConversation)}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-q-text-muted">
                                <span>{channelLabels[activeConversation.channel]}</span>
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
                        <div className="hidden sm:block">{getStatusBadge(activeConversation.status)}</div>
                        <div className="relative">
                            <button
                                onClick={() => setShowActions(showActions ? null : activeConversation.id)}
                                className="p-2 hover:bg-secondary rounded-lg"
                            >
                                <MoreVertical size={18} />
                            </button>
                            {showActions === activeConversation.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-q-surface border border-q-border rounded-lg shadow-lg z-10 py-1 animate-fade-in-up">
                                    <a
                                        href={buildEmailReviewQueueUrl({
                                            projectId,
                                            sourceModule: 'chatcore',
                                            sourceEntityId: activeConversation.id,
                                        })}
                                        onClick={() => setShowActions(null)}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-2"
                                    >
                                        <Mail size={14} />
                                        {t('aiAssistant.socialInbox.actions.reviewEmail', 'Revisar email')}
                                    </a>
                                    <button
                                        onClick={async () => {
                                            await convertToLead(activeConversation.id);
                                            setShowActions(null);
                                        }}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-2"
                                    >
                                        <UserPlus size={14} />
                                        {t('aiAssistant.socialInbox.actions.convertToLead', 'Convertir en Lead')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateConversationStatus(activeConversation.id, 'escalated');
                                            setShowActions(null);
                                        }}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-2"
                                    >
                                        <AlertCircle size={14} />
                                        {t('aiAssistant.socialInbox.actions.escalate', 'Escalar')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateConversationStatus(activeConversation.id, 'closed');
                                            setShowActions(null);
                                        }}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-2"
                                    >
                                        <Archive size={14} />
                                        {t('aiAssistant.socialInbox.actions.close', 'Cerrar conversación')}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="lg:hidden">
                            <HeaderBackButton onClick={clearActiveConversation} />
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
                    {activeConversation.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-q-text-muted">
                            <MessageCircle size={48} className="mb-2 opacity-30" />
                            <p className="text-sm">{t('aiAssistant.socialInbox.noMessagesYet', 'Sin mensajes todavía')}</p>
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
                                            : 'bg-q-surface border border-q-border rounded-bl-sm'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                                        msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-q-text-muted'
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
                <div className="p-4 border-t border-q-border/70 bg-q-surface/80">
                    <div className="relative">
                        <textarea
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={t('aiAssistant.socialInbox.messagePlaceholder', 'Escribe tu mensaje...')}
                            rows={1}
                            className="block w-full resize-none rounded-xl border border-q-border/70 bg-q-bg py-3 pl-4 pr-14 text-sm outline-none transition-all placeholder:text-q-text-muted focus:border-primary focus:ring-2 focus:ring-primary/50"
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || isSending}
                            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                            aria-label={t('aiAssistant.socialInbox.sendMessage', 'Enviar mensaje')}
                        >
                            {isSending ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-q-text-muted mt-2 text-center">
                        {t('aiAssistant.socialInbox.deliveryNote', 'Salida por {{channel}}', { channel: channelLabels[activeConversation.channel] })}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full min-h-0 bg-q-bg">
            {/* Conversation List - Hidden on mobile when chat is active */}
            <div className={`${activeConversation ? 'hidden lg:flex' : 'flex'} flex-col bg-q-bg`}>
                {renderConversationList()}
            </div>

            {/* Chat Area */}
            <div className={`${activeConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-q-bg`}>
                {renderChatArea()}
            </div>
        </div>
    );
};

export default SocialChatInbox;
