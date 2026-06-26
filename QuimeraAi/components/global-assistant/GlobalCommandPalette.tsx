import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    Bot,
    BriefcaseBusiness,
    Calendar,
    FileText,
    FolderOpen,
    Globe,
    Home,
    Image,
    LayoutDashboard,
    Mail,
    Search,
    Settings,
    Shield,
    ShoppingBag,
    Sparkles,
    Store,
    Users,
    Utensils,
    Wallet,
    X,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { Input } from '../ui/input';
import { AppButton } from '../ui/system/AppButton';
import { useGlobalCommandPalette } from '../../hooks/useGlobalCommandPalette';
import type { GlobalCommandItem } from '../../services/globalAssistant/globalCommandSearch';

const iconForCommand = (item: GlobalCommandItem) => {
    if (item.type === 'assistant_request' || item.type === 'action') return Sparkles;
    if (item.type === 'project') return FolderOpen;
    if (item.type === 'admin') return Shield;

    switch (item.view) {
        case 'dashboard': return LayoutDashboard;
        case 'websites':
        case 'editor':
        case 'domains': return Globe;
        case 'assets': return Image;
        case 'cms':
        case 'blog-hub': return FileText;
        case 'ai-assistant': return Bot;
        case 'leads': return Users;
        case 'appointments': return Calendar;
        case 'ecommerce': return ShoppingBag;
        case 'restaurants': return Utensils;
        case 'email': return Mail;
        case 'finance': return Wallet;
        case 'settings': return Settings;
        case 'real-estate': return Home;
        case 'biopage': return Store;
        default: return BriefcaseBusiness;
    }
};

const typeLabelKey: Record<GlobalCommandItem['type'], string> = {
    assistant_request: 'globalCommandPalette.types.assistant',
    navigation: 'globalCommandPalette.types.navigation',
    project: 'globalCommandPalette.types.project',
    module: 'globalCommandPalette.types.module',
    action: 'globalCommandPalette.types.action',
    admin: 'globalCommandPalette.types.admin',
};

const typeFallback: Record<GlobalCommandItem['type'], string> = {
    assistant_request: 'Assistant',
    navigation: 'Navigation',
    project: 'Project',
    module: 'Module',
    action: 'Action',
    admin: 'Admin',
};

type CommandTranslationParams = Record<string, string | number | boolean | null | undefined>;

const safeTranslationParams = (params?: CommandTranslationParams): CommandTranslationParams => {
    if (!params) return {};

    return Object.entries(params).reduce<CommandTranslationParams>((safeParams, [key, value]) => {
        if (key === 'defaultValue' || key === 'interpolation' || key === 'nest') return safeParams;
        if (
            typeof value === 'string'
            || typeof value === 'number'
            || typeof value === 'boolean'
            || value == null
        ) {
            safeParams[key] = value;
        }
        return safeParams;
    }, {});
};

const translateSafe = (
    translate: ReturnType<typeof useTranslation>['t'],
    key: string | undefined,
    fallback: string,
    params?: CommandTranslationParams,
): string => {
    if (!key) return fallback;
    try {
        const translated = translate(key, {
            ...safeTranslationParams(params),
            defaultValue: fallback,
            interpolation: { skipOnVariables: true },
            nest: false,
        } as any);
        return typeof translated === 'string' ? translated : fallback;
    } catch {
        return fallback;
    }
};

function GlobalCommandPalette(): React.ReactElement {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const {
        isOpen,
        close,
        query,
        setQuery,
        selectedIndex,
        setSelectedIndex,
        items,
        moveSelection,
        executeCommand,
    } = useGlobalCommandPalette();

    useEffect(() => {
        if (!isOpen) return;
        const frame = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveSelection(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveSelection(-1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const selected = items[selectedIndex];
            if (selected) void executeCommand(selected);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={close} maxWidth="max-w-2xl" fullScreenMobile={false} className="rounded-[var(--radius-panel)]">
            <div className="border-b border-border-subtle px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2">
                    <Search size={18} className="text-q-text-muted" aria-hidden="true" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={translateSafe(t, 'globalCommandPalette.placeholder', 'Search, open, or ask Quimera')}
                        aria-label={translateSafe(t, 'globalCommandPalette.ariaLabel', 'Global command palette')}
                        className="h-11 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                    />
                    <AppButton
                        variant="icon"
                        size="icon-sm"
                        onClick={close}
                        aria-label={translateSafe(t, 'globalCommandPalette.close', 'Close')}
                    >
                        <X size={16} />
                    </AppButton>
                </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-2">
                {items.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                        <p className="text-sm font-medium text-q-text">
                            {translateSafe(t, 'globalCommandPalette.emptyTitle', 'No command found')}
                        </p>
                        <p className="mt-1 text-xs text-q-text-muted">
                            {translateSafe(t, 'globalCommandPalette.emptyDescription', 'Try a project, module, or request.')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {items.map((item, index) => {
                            const Icon = iconForCommand(item);
                            const isSelected = index === selectedIndex;
                            const typeKey = typeLabelKey[item.type] || typeLabelKey.action;
                            const fallbackType = typeFallback[item.type] || typeFallback.action;
                            const label = translateSafe(
                                t,
                                item.labelKey,
                                item.label || translateSafe(t, 'globalCommandPalette.untitledCommand', 'Untitled command'),
                                item.labelParams,
                            );
                            const description = translateSafe(
                                t,
                                item.descriptionKey,
                                item.description || '',
                                item.descriptionParams,
                            );

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    onClick={() => void executeCommand(item)}
                                    className={`flex w-full items-center gap-3 rounded-[var(--q-radius-md)] px-3 py-2.5 text-left transition-colors ${
                                        isSelected
                                            ? 'bg-q-surface-elevated text-q-text shadow-sm'
                                            : 'text-q-text hover:bg-q-surface-elevated/70'
                                    }`}
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--q-radius-md)] border border-border-subtle bg-q-surface">
                                        <Icon size={17} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="truncate text-sm font-semibold">{label}</span>
                                            <span className="shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-q-text-muted">
                                                {translateSafe(t, typeKey, fallbackType)}
                                            </span>
                                        </span>
                                        {description && (
                                            <span className="mt-0.5 block truncate text-xs text-q-text-muted">
                                                {description}
                                            </span>
                                        )}
                                    </span>
                                    <ArrowRight size={16} className="shrink-0 text-q-text-muted" aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default GlobalCommandPalette;
