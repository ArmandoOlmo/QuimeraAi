import React, { useState, useMemo } from 'react';
import { useCRM } from '../../../contexts/crm';
import {
    Search, Plus, Trash2, Download, Upload,
    Users, CheckCircle2, Clock, Filter, MoreVertical,
    FileDown, RefreshCw
} from 'lucide-react';
import { LibraryLead, Lead } from '../../../types';
import AddLeadModal from './AddLeadModal';

const LeadsLibrary: React.FC = () => {
    const { libraryLeads, isLoadingLibraryLeads, addLibraryLead, deleteLibraryLead, importLibraryLead } = useCRM();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // New Lead Form State
    const [newLeadForm, setNewLeadForm] = useState<Partial<LibraryLead>>({
        name: '',
        email: '',
        phone: '',
        company: '',
        source: 'manual',
        tags: []
    });

    // Metrics
    const metrics = useMemo(() => {
        const total = libraryLeads.length;
        const imported = libraryLeads.filter(l => l.isImported).length;
        const notImported = total - imported;
        const importRate = total > 0 ? ((imported / total) * 100).toFixed(1) : '0.0';

        return { total, imported, notImported, importRate };
    }, [libraryLeads]);

    // Filtered Leads
    const filteredLeads = useMemo(() => {
        return libraryLeads.filter(lead => {
            const searchLower = searchQuery.toLowerCase();
            return (
                lead.name.toLowerCase().includes(searchLower) ||
                lead.email.toLowerCase().includes(searchLower) ||
                lead.company?.toLowerCase().includes(searchLower)
            );
        });
    }, [libraryLeads, searchQuery]);

    // Handlers
    const handleAddSubmit = async (leadData: Partial<Lead>) => {
        if (!leadData.name || !leadData.email) return;

        await addLibraryLead({
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            company: leadData.company,
            source: leadData.source || 'manual',
            tags: leadData.tags || [],
            notes: leadData.notes
        });

        setIsAddModalOpen(false);
    };

    const handleImportSelected = async () => {
        if (selectedLeadIds.length === 0) return;

        setIsImporting(true);
        try {
            await Promise.all(selectedLeadIds.map(id => importLibraryLead(id)));
            setSelectedLeadIds([]);
        } catch (error) {
            console.error("Failed to import leads", error);
        } finally {
            setIsImporting(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedLeadIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} leads from the library?`)) return;

        try {
            await Promise.all(selectedLeadIds.map(id => deleteLibraryLead(id)));
            setSelectedLeadIds([]);
        } catch (error) {
            console.error("Failed to delete leads", error);
        }
    };

    const toggleSelectAll = () => {
        if (selectedLeadIds.length === filteredLeads.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(filteredLeads.map(l => l.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header & Metrics */}
            <div className="p-6 border-b border-border space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Leads Library</h2>
                        <p className="text-muted-foreground">Repository for all your potential leads</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                            <Plus size={18} />
                            Add Lead
                        </button>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground font-medium">Total Leads</span>
                            <Users size={16} className="text-primary" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground font-medium">Imported</span>
                            <CheckCircle2 size={16} className="text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{metrics.imported}</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground font-medium">Pending</span>
                            <Clock size={16} className="text-yellow-500" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{metrics.notImported}</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground font-medium">Import Rate</span>
                            <RefreshCw size={16} className="text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{metrics.importRate}%</p>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 bg-background border border-border rounded-lg pl-9 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>

                {selectedLeadIds.length > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                        <span className="text-sm font-medium text-muted-foreground mr-2">
                            {selectedLeadIds.length} selected
                        </span>
                        <button
                            onClick={handleImportSelected}
                            disabled={isImporting}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <Upload size={14} />
                            {isImporting ? 'Importing...' : 'Import to CRM'}
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-md text-sm font-medium transition-colors"
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-border text-primary focus:ring-primary/20"
                                    />
                                </th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Company</th>
                                <th className="p-4">Source</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Date Added</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoadingLibraryLeads ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                        Loading leads...
                                    </td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                        No leads found in library
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeadIds.includes(lead.id)}
                                                onChange={() => toggleSelect(lead.id)}
                                                className="rounded border-border text-primary focus:ring-primary/20"
                                            />
                                        </td>
                                        <td className="p-4 font-medium text-foreground">{lead.name}</td>
                                        <td className="p-4 text-muted-foreground">{lead.email}</td>
                                        <td className="p-4 text-muted-foreground">{lead.company || '-'}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-full bg-secondary/50 text-xs font-medium">
                                                {lead.source}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {lead.isImported ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
                                                    <CheckCircle2 size={12} /> Imported
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-full">
                                                    <Clock size={12} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {new Date(lead.createdAt.seconds * 1000).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Lead Modal */}
            {/* Add Lead Modal */}
            <AddLeadModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddSubmit}
            />
        </div>
    );
};

export default LeadsLibrary;
