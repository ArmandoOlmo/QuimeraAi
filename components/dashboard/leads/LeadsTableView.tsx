import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../../../types';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Bot, LayoutGrid } from 'lucide-react';

interface LeadsTableViewProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onDelete: (leadId: string) => void;
    selectedLeadIds: string[];
    onToggleSelect: (leadId: string) => void;
    onToggleSelectAll: () => void;
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
    onToggleSelectAll
}) => {
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
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
                                    Name
                                    <SortIcon field="name" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('email')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    Email
                                    <SortIcon field="email" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('company')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    Company
                                    <SortIcon field="company" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('value')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    Value
                                    <SortIcon field="value" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('status')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    Status
                                    <SortIcon field="status" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('aiScore')}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    Score
                                    <SortIcon field="aiScore" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</span>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLeads.map((lead, index) => (
                            <tr
                                key={lead.id}
                                className={`border-b border-border hover:bg-secondary/10 transition-colors ${
                                    index % 2 === 0 ? 'bg-card' : 'bg-secondary/5'
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
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                lead.aiScore > 75 ? 'bg-green-500' : 
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
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this lead?')) {
                                                    onDelete(lead.id);
                                                }
                                            }}
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
                        No leads found
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/5">
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
        </div>
    );
};

export default LeadsTableView;

