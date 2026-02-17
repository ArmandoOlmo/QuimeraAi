import {
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Plus,
    Calendar,
    Users,
    Settings,
    MoreHorizontal,
    RefreshCw,
    Loader2,
    Ban
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';

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

    return (
        <div className={cn("flex flex-col border-b border-border bg-background", className)}>
            {/* Top Row: Date Nav & Main Actions */}
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left: Date Navigation */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-secondary/50 rounded-lg p-0.5">
                        <button
                            onClick={() => onNavigate('prev')}
                            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all shadow-sm hover:shadow"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => onNavigate('today')}
                            className="px-3 py-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                        >
                            {t('common.today', 'Hoy')}
                        </button>
                        <button
                            onClick={() => onNavigate('next')}
                            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all shadow-sm hover:shadow"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <h2 className="text-xl font-bold text-foreground capitalize tracking-tight">
                        {dateLabel}
                    </h2>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* View Switcher (Pill style) */}
                    <div className="hidden md:flex items-center bg-secondary/50 rounded-lg p-1 mr-2">
                        {[
                            { id: 'day', label: t('calendar.view.day', 'Cita') }, // Fresha calls it "Cita" or "Day" but uses specific naming
                            { id: 'week', label: t('calendar.view.week', 'Semana') },
                            { id: 'month', label: t('calendar.view.month', 'Mes') },
                        ].map((view) => (
                            <button
                                key={view.id}
                                onClick={() => onViewModeChange(view.id as any)}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
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
                            "p-2.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
                            isLoading && "opacity-50"
                        )}
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                    </button>

                    {onBlockClick && (
                        <button
                            onClick={onBlockClick}
                            className="flex items-center gap-1 h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 whitespace-nowrap"
                        >
                            <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{t('appointments.blockedDates.block', 'Bloquear')}</span>
                        </button>
                    )}

                    <button
                        onClick={onCreateClick}
                        className="flex items-center gap-1 h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all bg-primary text-primary-foreground hover:opacity-90 whitespace-nowrap"
                    >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{t('appointments.new', 'Nueva Cita')}</span>
                    </button>
                </div>
            </div>

            {/* Bottom Row: Filters & Search (Optional/Expandable) */}
            <div className="flex items-center gap-3 px-6 pb-3 overflow-x-auto">
                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-foreground transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar cita o cliente..."
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        className="h-9 w-64 bg-secondary/30 focus:bg-secondary/50 border-none outline-none rounded-full pl-9 pr-4 text-sm transition-all"
                    />
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                {/* Team Filter Button (Mocking functionality) */}
                <button className="flex items-center gap-2 px-4 py-2 bg-secondary/30 hover:bg-secondary/50 rounded-full text-sm font-medium transition-colors text-foreground">
                    <Users size={16} />
                    <span>Miembros del equipo</span>
                    <span className="bg-foreground/10 text-[10px] px-1.5 py-0.5 rounded-full ml-1">Todos</span>
                </button>

                {/* Filter Toggle */}
                <button
                    onClick={onToggleFilters}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-transparent",
                        showFilters
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary/30 hover:bg-secondary/50 text-foreground"
                    )}
                >
                    <Filter size={16} />
                    <span>Filtros</span>
                </button>
            </div>
        </div>
    );
};
