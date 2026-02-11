/**
 * Knowledge Links Manager
 * 
 * Component for adding and managing URLs as knowledge sources.
 * Supports both website and YouTube links.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Globe, Youtube, Link2, Plus, X, Loader2, CheckCircle,
    AlertCircle, ExternalLink, Trash2
} from 'lucide-react';
import { KnowledgeLink } from '../../../types';
import { extractLinkContent, isValidUrl, isYouTubeUrl } from '../../../utils/knowledgeLinkExtractor';

interface KnowledgeLinksManagerProps {
    links: KnowledgeLink[];
    onLinksChange: (links: KnowledgeLink[]) => void;
    projectId?: string;
}

const KnowledgeLinksManager: React.FC<KnowledgeLinksManagerProps> = ({
    links,
    onLinksChange,
    projectId
}) => {
    const { t } = useTranslation();
    const [urlInput, setUrlInput] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const detectUrlType = (url: string): 'website' | 'youtube' => {
        return isYouTubeUrl(url) ? 'youtube' : 'website';
    };

    const handleAddLink = async () => {
        const url = urlInput.trim();

        if (!url) return;

        // Auto-prepend https:// if missing protocol
        const normalizedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;

        if (!isValidUrl(normalizedUrl)) {
            setError(t('aiAssistant.knowledgeLinks.invalidUrl'));
            return;
        }

        // Check for duplicates
        if (links.some(l => l.url === normalizedUrl)) {
            setError(t('aiAssistant.knowledgeLinks.duplicateUrl'));
            return;
        }

        setError(null);
        setIsExtracting(true);

        // Add link in pending state
        const newLink: KnowledgeLink = {
            id: `link_${Date.now()}`,
            url: normalizedUrl,
            title: normalizedUrl,
            content: '',
            type: detectUrlType(normalizedUrl),
            status: 'extracting',
        };

        const updatedLinks = [...links, newLink];
        onLinksChange(updatedLinks);
        setUrlInput('');

        try {
            const extracted = await extractLinkContent(
                normalizedUrl,
                projectId || 'default'
            );

            // Update the link with extracted content
            const finalLinks = updatedLinks.map(l =>
                l.id === newLink.id
                    ? {
                        ...l,
                        title: extracted.title,
                        content: extracted.content,
                        type: extracted.type,
                        status: 'ready' as const,
                        contentLength: extracted.contentLength,
                        thumbnailUrl: extracted.thumbnailUrl,
                        extractedAt: extracted.extractedAt,
                    }
                    : l
            );
            onLinksChange(finalLinks);
        } catch (err) {
            // Update link to error state
            const errorLinks = updatedLinks.map(l =>
                l.id === newLink.id
                    ? {
                        ...l,
                        status: 'error' as const,
                        error: err instanceof Error ? err.message : 'Extraction failed',
                    }
                    : l
            );
            onLinksChange(errorLinks);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleRetryLink = async (linkId: string) => {
        const link = links.find(l => l.id === linkId);
        if (!link) return;

        setIsExtracting(true);

        // Update to extracting state
        const updatingLinks = links.map(l =>
            l.id === linkId ? { ...l, status: 'extracting' as const, error: undefined } : l
        );
        onLinksChange(updatingLinks);

        try {
            const extracted = await extractLinkContent(
                link.url,
                projectId || 'default'
            );

            const finalLinks = updatingLinks.map(l =>
                l.id === linkId
                    ? {
                        ...l,
                        title: extracted.title,
                        content: extracted.content,
                        type: extracted.type,
                        status: 'ready' as const,
                        contentLength: extracted.contentLength,
                        thumbnailUrl: extracted.thumbnailUrl,
                        extractedAt: extracted.extractedAt,
                    }
                    : l
            );
            onLinksChange(finalLinks);
        } catch (err) {
            const errorLinks = updatingLinks.map(l =>
                l.id === linkId
                    ? {
                        ...l,
                        status: 'error' as const,
                        error: err instanceof Error ? err.message : 'Extraction failed',
                    }
                    : l
            );
            onLinksChange(errorLinks);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleRemoveLink = (linkId: string) => {
        onLinksChange(links.filter(l => l.id !== linkId));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isExtracting) {
            e.preventDefault();
            handleAddLink();
        }
    };

    const getStatusIcon = (status: KnowledgeLink['status'], type: KnowledgeLink['type']) => {
        switch (status) {
            case 'extracting':
                return <Loader2 size={16} className="animate-spin text-primary" />;
            case 'ready':
                return <CheckCircle size={16} className="text-green-500" />;
            case 'error':
                return <AlertCircle size={16} className="text-red-500" />;
            default:
                return type === 'youtube'
                    ? <Youtube size={16} className="text-red-500" />
                    : <Globe size={16} className="text-blue-500" />;
        }
    };

    const getTypeIcon = (type: KnowledgeLink['type']) => {
        return type === 'youtube'
            ? <Youtube size={14} className="text-red-500" />
            : <Globe size={14} className="text-blue-500" />;
    };

    const formatContentLength = (length?: number) => {
        if (!length) return '';
        if (length < 1000) return `${length} chars`;
        return `${(length / 1000).toFixed(1)}k chars`;
    };

    const readyCount = links.filter(l => l.status === 'ready').length;

    return (
        <div className="space-y-4">
            {/* URL Input */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => {
                            setUrlInput(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={t('aiAssistant.knowledgeLinks.urlPlaceholder')}
                        className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled={isExtracting}
                    />
                    {urlInput && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isYouTubeUrl(urlInput)
                                ? <Youtube size={14} className="text-red-500" />
                                : <Globe size={14} className="text-blue-500" />
                            }
                        </div>
                    )}
                </div>
                <button
                    onClick={handleAddLink}
                    disabled={!urlInput.trim() || isExtracting}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                    {isExtracting ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Plus size={16} />
                    )}
                    {t('aiAssistant.knowledgeLinks.addLink')}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {/* Hint */}
            <p className="text-xs text-muted-foreground">
                {t('aiAssistant.knowledgeLinks.hint')}
            </p>

            {/* Links List */}
            {links.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t('aiAssistant.knowledgeLinks.addedLinks')}
                            {readyCount > 0 && (
                                <span className="ml-1 text-green-500">
                                    ({readyCount} {t('aiAssistant.knowledgeLinks.ready')})
                                </span>
                            )}
                        </span>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {links.map(link => (
                            <div
                                key={link.id}
                                className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${link.status === 'error'
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : link.status === 'ready'
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : 'bg-card border-border'
                                    }`}
                            >
                                {/* Type/Status Icon */}
                                <div className="mt-0.5 shrink-0">
                                    {getStatusIcon(link.status, link.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(link.type)}
                                        <span className="text-sm font-medium text-foreground truncate">
                                            {link.title || link.url}
                                        </span>
                                    </div>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-muted-foreground hover:text-primary truncate flex items-center gap-1 mt-0.5"
                                    >
                                        {link.url}
                                        <ExternalLink size={10} />
                                    </a>
                                    {link.status === 'ready' && link.contentLength && (
                                        <span className="text-xs text-green-600 mt-1 inline-block">
                                            ✓ {formatContentLength(link.contentLength)} {t('aiAssistant.knowledgeLinks.extracted')}
                                        </span>
                                    )}
                                    {link.status === 'extracting' && (
                                        <span className="text-xs text-primary mt-1 inline-block">
                                            {t('aiAssistant.knowledgeLinks.extracting')}
                                        </span>
                                    )}
                                    {link.status === 'error' && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-red-500">
                                                {link.error || t('aiAssistant.knowledgeLinks.extractionFailed')}
                                            </span>
                                            <button
                                                onClick={() => handleRetryLink(link.id)}
                                                disabled={isExtracting}
                                                className="text-xs text-primary hover:underline disabled:opacity-50"
                                            >
                                                {t('aiAssistant.knowledgeLinks.retry')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* YouTube Thumbnail */}
                                {link.type === 'youtube' && link.thumbnailUrl && link.status === 'ready' && (
                                    <img
                                        src={link.thumbnailUrl}
                                        alt=""
                                        className="w-16 h-12 rounded-lg object-cover shrink-0"
                                    />
                                )}

                                {/* Remove Button */}
                                <button
                                    onClick={() => handleRemoveLink(link.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                                    title={t('common.remove')}
                                >
                                    <Trash2 size={14} className="text-red-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {links.length === 0 && (
                <div className="text-center py-8 bg-secondary/10 rounded-xl border border-dashed border-border">
                    <Link2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                        {t('aiAssistant.knowledgeLinks.noLinks')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('aiAssistant.knowledgeLinks.noLinksDesc')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default KnowledgeLinksManager;
