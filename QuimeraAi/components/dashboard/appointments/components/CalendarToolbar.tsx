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
        <div className={cn("flex flex-col border-b border-border bg-background", className)}>
            {/* Row 1: Date Nav + Actions */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 gap-2">
                {/* Left: Date Navigation */}
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 shrink-0">
                        <button
                            onClick={() => onNavigate('prev')}
                            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all active:scale-95 touch-manipulation"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => onNavigate('today')}
                            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors touch-manipulation"
                        >
                            {t('common.today', 'Hoy')}
                        </button>
                        <button
                            onClick={() => onNavigate('next')}
                            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all active:scale-95 touch-manipulation"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <h2 className="text-sm sm:text-xl font-bold text-foreground capitalize tracking-tight truncate min-w-0">
                        {dateLabel}
                    </h2>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {/* View Switcher */}
                    <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 sm:p-1">
                        {viewOptions.map((view) => (
                            <button
                                key={view.id}
                                onClick={() => onViewModeChange(view.id as any)}
                                className={cn(
                                    "px-2 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all touch-manipulation",
                                    viewMode === view.id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
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
                            "hidden sm:flex p-2 sm:p-2.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
                            isLoading && "opacity-50"
                        )}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    </button>

                    {onBlockClick && (
                        <button
                            onClick={onBlockClick}
                            className="hidden sm:flex items-center gap-1 h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 whitespace-nowrap touch-manipulation"
                        >
                            <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden lg:inline">{t('appointments.blockedDates.block', 'Bloquear')}</span>
                        </button>
                    )}

                    <button
                        onClick={onCreateClick}
                        className="flex items-center gap-1 h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all bg-primary text-primary-foreground hover:opacity-90 whitespace-nowrap touch-manipulation active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('appointments.new', 'Nueva Cita')}</span>
                    </button>
                </div>
            </div>

            {/* Row 2: Search & Filters */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 pb-2 sm:pb-3">
                {/* Mobile: search toggle icon / Desktop: search input */}
                <div className="relative group flex-1 sm:flex-none">
                    {/* Mobile search - toggleable */}
                    <div className="sm:hidden">
                        {showMobileSearch ? (
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => onSearch(e.target.value)}
                                        autoFocus
                                        className="h-9 w-full bg-secondary/30 focus:bg-secondary/50 border-none outline-none rounded-full pl-9 pr-4 text-sm transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => { setShowMobileSearch(false); onSearch(''); }}
                                    className="p-2 text-muted-foreground hover:text-foreground touch-manipulation"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowMobileSearch(true)}
                                className="h-9 w-9 flex items-center justify-center bg-secondary/30 hover:bg-secondary/50 rounded-full text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                            >
                                <Search size={16} />
                            </button>
                        )}
                    </div>

                    {/* Desktop search - always visible */}
                    <div className="hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-foreground transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cita o cliente..."
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            className="h-9 w-64 bg-secondary/30 focus:bg-secondary/50 border-none outline-none rounded-full pl-9 pr-4 text-sm transition-all"
                        />
                    </div>
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={onToggleFilters}
                    className={cn(
                        "flex items-center gap-1.5 sm:gap-2 h-9 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-medium transition-colors border border-transparent shrink-0 touch-manipulation",
                        showFilters
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary/30 hover:bg-secondary/50 text-foreground"
                    )}
                >
                    <Filter size={14} className="sm:w-4 sm:h-4" />
                    <span>Filtros</span>
                </button>

                {/* Mobile-only: Block button (since it's hidden in row 1 on mobile) */}
                {onBlockClick && (
                    <button
                        onClick={onBlockClick}
                        className="sm:hidden flex items-center gap-1 h-9 px-3 rounded-full text-xs font-medium transition-all bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 shrink-0 touch-manipulation"
                    >
                        <Ban className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
};
