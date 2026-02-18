import React, { useState, useMemo } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import { Lead, LeadStatus } from '../../../types';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Bot, LayoutGrid } from 'lucide-react';

interface LeadsTableViewProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onDelete: (leadId: string) => void;
    selectedLeadIds: string[];
    onToggleSelect: (leadId: string) => void;
    onToggleSelectAll: () => void;
    totalFilteredCount: number;
    allFilteredSelected: boolean;
    onSelectAllFiltered: () => void;
    onClearSelection: () => void;
}

type SortField = 'name' | 'email' | 'company' | 'value' | 'status' | 'aiScore' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
    new: 'bg-blue-500',
    contacted: 'bg-yellow-500',
    qualified: 'bg-purple-500',
    negotiation: 'bg-orange-500',
    won: 'bg-green-500',
    lost: 'bg-red-500',
};

const LeadsTableView: React.FC<LeadsTableViewProps> = ({
    leads,
    onLeadClick,
    onDelete,
    selectedLeadIds,
    onToggleSelect,
    onToggleSelectAll,
    totalFilteredCount,
    allFilteredSelected,
    onSelectAllFiltered,
    onClearSelection
}) => {
    const { t } = useTranslation();
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedLeads = useMemo(() => {
        return [...leads].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'email':
                    aValue = a.email.toLowerCase();
                    bValue = b.email.toLowerCase();
                    break;
                case 'company':
                    aValue = (a.company || '').toLowerCase();
                    bValue = (b.company || '').toLowerCase();
                    break;
                case 'value':
                    aValue = a.value || 0;
                    bValue = b.value || 0;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'aiScore':
                    aValue = a.aiScore || 0;
                    bValue = b.aiScore || 0;
                    break;
                case 'createdAt':
                    aValue = a.createdAt.seconds;
                    bValue = b.createdAt.seconds;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [leads, sortField, sortDirection]);

    const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
    const paginatedLeads = sortedLeads.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown size={14} className="text-muted-foreground" />;
        }
        return sortDirection === 'asc' ?
            <ArrowUp size={14} className="text-primary" /> :
            <ArrowDown size={14} className="text-primary" />;
    };

    const allPageLeadsSelected = paginatedLeads.length > 0 &&
        paginatedLeads.every(lead => selectedLeadIds.includes(lead.id));

    const showSelectAllBanner = allPageLeadsSelected && selectedLeadIds.length > 0 && totalFilteredCount > paginatedLeads.length;

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Select All Filtered Banner */}
            {showSelectAllBanner && (
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm">
                    {allFilteredSelected ? (
                        <>
                            <span className="text-primary font-medium">
                                {t('leads.selectAllBanner.allSelected', { count: totalFilteredCount })}
                            </span>
                            <button
                                onClick={onClearSelection}
                                className="text-primary font-bold hover:underline"
                            >
                                {t('leads.selectAllBanner.clearSelection')}
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="text-foreground">
                                {t('leads.selectAllBanner.pageSelected', { count: paginatedLeads.length })}
                            </span>
                            <button
                                onClick={onSelectAllFiltered}
                                className="text-primary font-bold hover:underline"
                            >
                                {t('leads.selectAllBanner.selectAll', { count: totalFilteredCount })}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Mobile Card View */}
            <div className="sm:hidden">
                {/* Mobile Header with Select All */}
                <div className="px-3 py-2 border-b border-border bg-secondary/20 flex items-center justify-between">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={allPageLeadsSelected}
                            onChange={onToggleSelectAll}
                            className="rounded border-border w-4 h-4"
                        />
                        <span className="text-xs font-bold text-muted-foreground uppercase">{t('leads.selectAll')}</span>
                    </label>
                    <span className="text-xs text-muted-foreground">{paginatedLeads.length} {t('leads.leads')}</span>
                </div>

                {/* Mobile Cards */}
                <div className="divide-y divide-border max-h-[calc(100vh-280px)] overflow-y-auto">
                    {paginatedLeads.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {t('leads.noLeadsFound')}
                        </div>
                    ) : (
                        paginatedLeads.map((lead) => (
                            <div
                                key={lead.id}
                                className="p-3 hover:bg-secondary/10 active:bg-secondary/20 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedLeadIds.includes(lead.id)}
                                            onChange={() => onToggleSelect(lead.id)}
                                            className="rounded border-border w-4 h-4"
                                        />
                                    </div>

                                    {/* Main Content - Clickable */}
                                    <div
                                        className="flex-1 min-w-0"
                                        onClick={() => onLeadClick(lead)}
                                    >
                                        {/* Top Row: Name + Status */}
                                        <div className="flex items-center gap-2 mb-1">
                                            {lead.emojiMarker && <span className="text-base">{lead.emojiMarker}</span>}
                                            <h4 className="font-bold text-sm text-foreground truncate flex-1">{lead.name}</h4>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase ${LEAD_STATUS_COLORS[lead.status]}`}>
                                                {lead.status}
                                            </span>
                                        </div>

                                        {/* Second Row: Email + Company */}
                                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                            <span className="truncate">{lead.email}</span>
                                            {lead.company && (
                                                <>
                                                    <span>·</span>
                                                    <span className="truncate">{lead.company}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Third Row: Value + Score + Source */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {(lead.value || 0) > 0 && (
                                                <span className="text-xs font-bold text-green-500">
                                                    ${(lead.value || 0).toLocaleString()}
                                                </span>
                                            )}
                                            {lead.aiScore !== undefined && (
                                                <div className="flex items-center gap-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${lead.aiScore > 75 ? 'bg-green-500' :
                                                        lead.aiScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`} />
                                                    <span className="text-xs font-medium">{lead.aiScore}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                {lead.source === 'chatbot' ? (
                                                    <Bot size={12} className="text-purple-500" />
                                                ) : (
                                                    <LayoutGrid size={12} className="text-blue-500" />
                                                )}
                                                <span className="capitalize">{lead.source}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="shrink-0 flex flex-col gap-1">
                                        <button
                                            onClick={() => onLeadClick(lead)}
                                            className="p-2 hover:bg-secondary rounded-lg text-primary transition-colors"
                                            title={t('leads.viewDetails')}
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(lead.id)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                                            title={t('leads.delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Mobile Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-secondary/5">
                        <span className="text-xs text-muted-foreground">
                            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedLeads.length)} / {sortedLeads.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-medium px-2">{currentPage}/{totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-secondary/20 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 text-left w-12">
                                <input
                                    type="checkbox"
                                    checked={allPageLeadsSelected}
                                    onChange={onToggleSelectAll}
                                    className="rounded border-border"
                                />
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('name')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    {t('common.name')}
                                    <SortIcon field="name" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('email')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    {t('leads.email')}
                                    <SortIcon field="email" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('company')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    {t('leads.company')}
                                    <SortIcon field="company" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('value')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    {t('leads.value')}
                                    <SortIcon field="value" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('status')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    {t('leads.status')}
                                    <SortIcon field="status" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('aiScore')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    {t('leads.score')}
                                    <SortIcon field="aiScore" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('leads.source')}</span>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('leads.actions')}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLeads.map((lead, index) => (
                            <tr
                                key={lead.id}
                                className={`border-b border-border hover:bg-secondary/10 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-secondary/5'
                                    }`}
                            >
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedLeadIds.includes(lead.id)}
                                        onChange={() => onToggleSelect(lead.id)}
                                        className="rounded border-border"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {lead.emojiMarker && <span>{lead.emojiMarker}</span>}
                                        <span className="font-medium text-foreground">{lead.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-muted-foreground">{lead.email}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-foreground">{lead.company || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm font-bold text-green-500">
                                        ${(lead.value || 0).toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white ${LEAD_STATUS_COLORS[lead.status]}`}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {lead.aiScore !== undefined ? (
                                        <div className="flex items-center gap-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${lead.aiScore > 75 ? 'bg-green-500' :
                                                lead.aiScore > 40 ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`} />
                                            <span className="text-sm font-bold">{lead.aiScore}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        {lead.source === 'chatbot' ? (
                                            <Bot size={14} className="text-purple-500" />
                                        ) : (
                                            <LayoutGrid size={14} className="text-blue-500" />
                                        )}
                                        <span className="text-xs text-muted-foreground capitalize">{lead.source}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => onLeadClick(lead)}
                                            className="p-1.5 hover:bg-secondary rounded text-primary transition-colors"
                                            title="View details"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(lead.id)}
                                            className="p-1.5 hover:bg-red-500/10 rounded text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {paginatedLeads.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        {t('leads.noLeadsFound')}
                    </div>
                )}
            </div>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
                <div className="hidden sm:flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/5">
                    <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedLeads.length)} of {sortedLeads.length} leads
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
            {/* Delete Lead Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                onConfirm={() => { if (deleteConfirmId) { onDelete(deleteConfirmId); setDeleteConfirmId(null); } }}
                onCancel={() => setDeleteConfirmId(null)}
                title={t('leads.deleteLead', 'Eliminar Lead')}
                message={t('leads.confirmDelete', '¿Estás seguro de que deseas eliminar este lead?')}
                variant="danger"
            />
        </div>
    );
};

export default LeadsTableView;

