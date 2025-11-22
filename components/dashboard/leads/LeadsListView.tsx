import React from 'react';
import { Lead, LeadStatus } from '../../../types';
import { Mail, Phone, Building2, DollarSign, Bot, LayoutGrid, Star, Circle } from 'lucide-react';

interface LeadsListViewProps {
    leads: Lead[];
    selectedLeadId: string | null;
    onLeadClick: (lead: Lead) => void;
    selectedLeadIds: string[];
    onToggleSelect: (leadId: string) => void;
}

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
    new: 'bg-blue-500',
    contacted: 'bg-yellow-500',
    qualified: 'bg-purple-500',
    negotiation: 'bg-orange-500',
    won: 'bg-green-500',
    lost: 'bg-red-500',
};

const LeadsListView: React.FC<LeadsListViewProps> = ({ 
    leads, 
    selectedLeadId, 
    onLeadClick,
    selectedLeadIds,
    onToggleSelect
}) => {
    const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
        const date = new Date(timestamp.seconds * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-secondary/10 flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    All Leads ({leads.length})
                </span>
            </div>

            {/* List */}
            <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                {leads.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No leads found
                    </div>
                ) : (
                    leads.map((lead) => {
                        const isSelected = selectedLeadId === lead.id;
                        const isChecked = selectedLeadIds.includes(lead.id);
                        
                        return (
                            <div
                                key={lead.id}
                                className={`group flex items-center gap-3 px-4 py-3 hover:bg-secondary/10 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                                }`}
                                onClick={() => onLeadClick(lead)}
                            >
                                {/* Checkbox */}
                                <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => onToggleSelect(lead.id)}
                                        className="rounded border-border"
                                    />
                                </div>

                                {/* Source Icon */}
                                <div className="shrink-0">
                                    {lead.source === 'chatbot' ? (
                                        <div className="p-2 rounded-full bg-purple-500/10 text-purple-500">
                                            <Bot size={16} />
                                        </div>
                                    ) : (
                                        <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                                            <LayoutGrid size={16} />
                                        </div>
                                    )}
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {lead.emojiMarker && <span className="text-base">{lead.emojiMarker}</span>}
                                        <h4 className="font-bold text-sm text-foreground truncate">{lead.name}</h4>
                                        {lead.company && (
                                            <>
                                                <span className="text-muted-foreground">·</span>
                                                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                    <Building2 size={10} />
                                                    {lead.company}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1 truncate">
                                            <Mail size={10} />
                                            {lead.email}
                                        </span>
                                        {lead.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone size={10} />
                                                {lead.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side Info */}
                                <div className="shrink-0 flex items-center gap-3">
                                    {/* Value */}
                                    {lead.value && lead.value > 0 && (
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-green-500 flex items-center gap-1">
                                                <DollarSign size={10} />
                                                {lead.value.toLocaleString()}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Score */}
                                    {lead.aiScore !== undefined && (
                                        <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded">
                                            <Star size={10} className={
                                                lead.aiScore > 75 ? 'text-green-500' : 
                                                lead.aiScore > 40 ? 'text-yellow-500' : 
                                                'text-red-500'
                                            } />
                                            <span className="text-xs font-bold">{lead.aiScore}</span>
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className={`w-2 h-2 rounded-full ${LEAD_STATUS_COLORS[lead.status]}`} title={lead.status} />

                                    {/* Date */}
                                    <span className="text-[10px] text-muted-foreground w-12 text-right">
                                        {formatDate(lead.createdAt)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LeadsListView;

