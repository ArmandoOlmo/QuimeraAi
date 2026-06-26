import {
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Plus,
    RefreshCw,
    Loader2,
    Ban,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';
import { useState } from 'react';

interface CalendarToolbarProps {
    currentDate: Date;
    viewMode: 'day' | 'week' | 'month' | 'list';
    onViewModeChange: (mode: 'day' | 'week' | 'month' | 'list') => void;
    onNavigate: (direction: 'prev' | 'next' | 'today') => void;
    dateLabel: string;
    onSearch: (query: string) => void;
    searchQuery: string;
    onToggleFilters: () => void;
    showFilters: boolean;
    onRefresh: () => void;
    isLoading: boolean;
    onCreateClick: () => void;
    onBlockClick?: () => void;
    className?: string;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
    currentDate,
    viewMode,
    onViewModeChange,
    onNavigate,
    dateLabel,
    onSearch,
    searchQuery,
    onToggleFilters,
    showFilters,
    onRefresh,
    isLoading,
    onCreateClick,
    onBlockClick,
    className
}) => {
    const { t } = useTranslation();
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    const viewOptions = [
        { id: 'day', label: t('calendar.view.day', 'Día') },
        { id: 'week', label: t('calendar.view.week', 'Semana') },
        { id: 'month', label: t('calendar.view.month', 'Mes') },
    ];

    return (
        <div className={cn("border-b border-q-border bg-q-bg px-3 py-2 sm:px-5", className)}>
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex shrink-0 items-center rounded-lg bg-secondary/50 p-0.5">
                        <button
                            onClick={() => onNavigate('prev')}
                            className="rounded-md p-1 text-q-text-muted transition-all hover:bg-q-bg hover:text-foreground active:scale-95 touch-manipulation"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => onNavigate('today')}
                            className="px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:text-[var(--quimera-status-accent-from)] touch-manipulation"
                        >
                            {t('common.today', 'Hoy')}
                        </button>
                        <button
                            onClick={() => onNavigate('next')}
                            className="rounded-md p-1 text-q-text-muted transition-all hover:bg-q-bg hover:text-foreground active:scale-95 touch-manipulation"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <h2 className="min-w-0 truncate text-sm font-bold capitalize tracking-tight text-foreground sm:text-base">
                        {dateLabel}
                    </h2>
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-2 xl:ml-4 xl:max-w-xl">
                    <div className="relative group min-w-0 flex-1 sm:max-w-sm xl:max-w-none">
                        <div className="sm:hidden">
                            {showMobileSearch ? (
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q-text-muted" />
                                        <input
                                            type="text"
                                            placeholder={t('appointments.searchPlaceholder', 'Buscar citas...')}
                                            value={searchQuery}
                                            onChange={(e) => onSearch(e.target.value)}
                                            autoFocus
                                            className="h-8 w-full rounded-full border-none bg-secondary/30 pl-9 pr-4 text-sm outline-none transition-all focus:bg-secondary/50"
                                        />
                                    </div>
                                    <button
                                        onClick={() => { setShowMobileSearch(false); onSearch(''); }}
                                        className="p-1.5 text-q-text-muted hover:text-foreground touch-manipulation"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowMobileSearch(true)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/30 text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground touch-manipulation"
                                >
                                    <Search size={16} />
                                </button>
                            )}
                        </div>

                        <div className="hidden sm:block">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q-text-muted transition-colors group-focus-within:text-foreground" />
                            <input
                                type="text"
                                placeholder={t('appointments.searchPlaceholder', 'Buscar citas...')}
                                value={searchQuery}
                                onChange={(e) => onSearch(e.target.value)}
                                className="h-8 w-full rounded-full border-none bg-secondary/30 pl-9 pr-4 text-sm outline-none transition-all focus:bg-secondary/50"
                            />
                        </div>
                    </div>

                    <button
                        onClick={onToggleFilters}
                        className={cn(
                            "flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-transparent px-3 text-xs font-medium transition-colors touch-manipulation",
                            showFilters
                                ? "border-[var(--quimera-status-accent-from)] bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text"
                                : "bg-secondary/30 text-foreground hover:bg-secondary/50"
                        )}
                    >
                        <Filter size={14} />
                        <span>{t('appointments.filters', 'Filtros')}</span>
                    </button>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center rounded-lg bg-secondary/50 p-0.5">
                        {viewOptions.map((view) => (
                            <button
                                key={view.id}
                                onClick={() => onViewModeChange(view.id as any)}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all touch-manipulation sm:px-3",
                                    viewMode === view.id
                                        ? "bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text"
                                        : "text-q-text-muted hover:bg-q-bg/50 hover:text-foreground"
                                )}
                            >
                                {view.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className={cn(
                            "hidden h-8 w-8 items-center justify-center rounded-full text-q-text-muted transition-colors hover:bg-secondary hover:text-foreground sm:flex",
                            isLoading && "opacity-50"
                        )}
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    </button>

                    {onBlockClick && (
                        <button
                            onClick={onBlockClick}
                            className="hidden h-8 items-center gap-1 rounded-md border border-destructive/20 bg-destructive/10 px-2 text-xs font-medium text-destructive transition-all hover:bg-destructive/20 sm:flex touch-manipulation"
                        >
                            <Ban className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">{t('appointments.blockedDates.block', 'Bloquear')}</span>
                        </button>
                    )}

                    <button
                        onClick={onCreateClick}
                        className="quimera-guide-cta flex h-8 items-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium sm:px-3 touch-manipulation"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('appointments.new', 'Nueva Cita')}</span>
                    </button>

                    {onBlockClick && (
                        <button
                            onClick={onBlockClick}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive transition-all hover:bg-destructive/20 sm:hidden touch-manipulation"
                        >
                            <Ban className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
