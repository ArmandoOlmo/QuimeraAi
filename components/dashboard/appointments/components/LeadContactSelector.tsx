/**
 * LeadContactSelector
 * Componente para importar contactos de leads a las citas
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Users,
    Check,
    X,
    Building2,
    Mail,
    Phone,
    Star,
    Filter,
    ChevronDown,
    UserPlus,
} from 'lucide-react';
import { Lead, AppointmentParticipant } from '../../../../types';
import {
    getInitials,
    getAvatarColor,
    generateParticipantId,
} from '../utils/appointmentHelpers';
import { getLeadScoreLabel, getSourceConfig } from '../../../../utils/leadScoring';

// =============================================================================
// TYPES
// =============================================================================

interface LeadContactSelectorProps {
    leads: Lead[];
    selectedLeadIds: string[];
    onSelectionChange: (leadIds: string[]) => void;
    onImport: (participants: AppointmentParticipant[], leadIds: string[]) => void;
    maxSelection?: number;
    className?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface LeadCardProps {
    lead: Lead;
    isSelected: boolean;
    onToggle: () => void;
    isDisabled?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, isSelected, onToggle, isDisabled }) => {
    const [isHovered, setIsHovered] = useState(false);
    const scoreInfo = lead.leadScore !== undefined ? getLeadScoreLabel(lead.leadScore) : null;
    const sourceConfig = lead.source ? getSourceConfig(lead.source) : null;

    return (
        <div
            onClick={() => !isDisabled && onToggle()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                relative p-4 rounded-xl border-2 cursor-pointer
                transition-all duration-200
                ${isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : isDisabled
                        ? 'border-border/50 bg-muted/20 opacity-50 cursor-not-allowed'
                        : 'border-border hover:border-primary/30 hover:bg-secondary/30'
                }
            `}
        >
            {/* Selection indicator */}
            <div className={`
                absolute top-3 right-3 w-5 h-5 rounded-full border-2
                flex items-center justify-center
                transition-all duration-200
                ${isSelected
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/30'
                }
            `}>
                {isSelected && <Check size={12} className="text-primary-foreground" />}
            </div>

            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
                    ${getAvatarColor(lead.name || '')}
                    ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                `}>
                    {getInitials(lead.name || '')}

                    {/* Score indicator */}
                    {scoreInfo && (
                        <div className={`
                            absolute -bottom-1 -right-1 w-5 h-5 rounded-full
                            ${scoreInfo.color} text-white text-[8px] font-bold
                            flex items-center justify-center shadow-sm
                        `}>
                            {lead.leadScore}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-6">
                    <h4 className="font-semibold text-foreground text-sm truncate">
                        {lead.name}
                    </h4>

                    {lead.company && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 size={10} />
                            {lead.company}
                        </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                        {lead.email && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail size={10} />
                                <span className="truncate max-w-[120px]">{lead.email}</span>
                            </span>
                        )}
                        {lead.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone size={10} />
                                {lead.phone}
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2 mt-2">
                        {sourceConfig && (
                            <span className={`
                                ${sourceConfig.color} text-white text-[10px] px-1.5 py-0.5 rounded font-medium
                            `}>
                                {sourceConfig.label}
                            </span>
                        )}
                        {lead.status && (
                            <span className={`
                                text-[10px] px-1.5 py-0.5 rounded font-medium
                                ${lead.status === 'new' ? 'bg-blue-500/10 text-blue-500' :
                                    lead.status === 'qualified' ? 'bg-purple-500/10 text-purple-500' :
                                        lead.status === 'won' ? 'bg-green-500/10 text-green-500' :
                                            lead.status === 'lost' ? 'bg-red-500/10 text-red-500' :
                                                'bg-muted text-muted-foreground'}
                            `}>
                                {lead.status}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover preview */}
            {isHovered && !isDisabled && lead.notes && (
                <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {lead.notes}
                    </p>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LeadContactSelector: React.FC<LeadContactSelectorProps> = ({
    leads,
    selectedLeadIds,
    onSelectionChange,
    onImport,
    maxSelection,
    className = '',
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Filter leads
    const filteredLeads = useMemo(() => {
        let result = leads;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(lead =>
                lead.name?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query) ||
                lead.company?.toLowerCase().includes(query) ||
                lead.phone?.includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(lead => lead.status === statusFilter);
        }

        // Sort by score and name
        result = [...result].sort((a, b) => {
            // First by score (higher first)
            const scoreA = a.leadScore || 0;
            const scoreB = b.leadScore || 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            // Then by name
            return (a.name || '').localeCompare(b.name || '');
        });

        return result;
    }, [leads, searchQuery, statusFilter]);

    // Toggle selection
    const toggleLead = (leadId: string) => {
        if (selectedLeadIds.includes(leadId)) {
            onSelectionChange(selectedLeadIds.filter(id => id !== leadId));
        } else {
            if (maxSelection && selectedLeadIds.length >= maxSelection) {
                return; // Max reached
            }
            onSelectionChange([...selectedLeadIds, leadId]);
        }
    };

    // Select all visible
    const selectAll = () => {
        const visibleIds = filteredLeads.map(l => l.id);
        const newSelection = maxSelection
            ? visibleIds.slice(0, maxSelection)
            : visibleIds;
        onSelectionChange(newSelection);
    };

    // Clear selection
    const clearSelection = () => {
        onSelectionChange([]);
    };

    // Import selected leads
    const handleImport = () => {
        const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
        const participants: AppointmentParticipant[] = selectedLeads.map(lead => ({
            id: generateParticipantId(),
            type: 'lead' as const,
            name: lead.name || '',
            email: lead.email || '',
            phone: lead.phone,
            company: lead.company,
            leadId: lead.id,
            role: 'attendee' as const,
            status: 'pending' as const,
        }));

        onImport(participants, selectedLeadIds);
    };

    const reachedMax = maxSelection ? selectedLeadIds.length >= maxSelection : false;

    return (
        <div className={`flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    <h3 className="font-semibold text-foreground">Importar Leads</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {leads.length} disponibles
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {selectedLeadIds.length > 0 && (
                        <button
                            onClick={clearSelection}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                    <button
                        onClick={selectAll}
                        disabled={reachedMax}
                        className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Seleccionar todos
                    </button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex gap-2 mb-4">
                <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre, email, empresa..."
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`
                        h-10 px-3 rounded-xl border flex items-center gap-2 text-sm
                        transition-colors
                        ${showFilters
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                        }
                    `}
                >
                    <Filter size={14} />
                    Filtros
                    <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Filters panel */}
            {showFilters && (
                <div className="mb-4 p-3 bg-secondary/30 rounded-xl border border-border animate-scale-in">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Estado del lead
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {['all', 'new', 'contacted', 'qualified', 'negotiation', 'won'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-xs font-medium
                                    transition-colors
                                    ${statusFilter === status
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                                    }
                                `}
                            >
                                {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Selection summary */}
            {selectedLeadIds.length > 0 && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                            {selectedLeadIds.length}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                            lead{selectedLeadIds.length !== 1 ? 's' : ''} seleccionado{selectedLeadIds.length !== 1 ? 's' : ''}
                        </span>
                        {maxSelection && (
                            <span className="text-xs text-muted-foreground">
                                (máx. {maxSelection})
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleImport}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <UserPlus size={16} />
                        Importar
                    </button>
                </div>
            )}

            {/* Leads grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredLeads.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {searchQuery || statusFilter !== 'all'
                                ? 'No se encontraron leads con esos criterios'
                                : 'No hay leads disponibles'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {filteredLeads.map(lead => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                isSelected={selectedLeadIds.includes(lead.id)}
                                onToggle={() => toggleLead(lead.id)}
                                isDisabled={reachedMax && !selectedLeadIds.includes(lead.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Selected chips */}
            {selectedLeadIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Seleccionados
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {selectedLeadIds.map(id => {
                            const lead = leads.find(l => l.id === id);
                            if (!lead) return null;
                            return (
                                <span
                                    key={id}
                                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-2"
                                >
                                    {lead.name}
                                    <button
                                        onClick={() => toggleLead(id)}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadContactSelector;














